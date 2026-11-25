// Saída: bloom, exposição, mapeamento de tons, nitidez leve, vinheta, grão e pontilhado contra faixas.
#include fsq
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var tCol: texture_2d<f32>;
@group(0) @binding(2) var tBloom: texture_2d<f32>;
@group(0) @binding(3) var tExp: texture_2d<f32>;
@group(0) @binding(4) var s: sampler;
@group(0) @binding(5) var gD: texture_depth_2d;
// AgX (aproximação polinomial) com visual "punchy"
fn agxContrast(x: vec3f) -> vec3f {
  let x2 = x * x; let x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
fn agx(c: vec3f) -> vec3f {
  let m = mat3x3f(0.842479062253094, 0.0423282422610123, 0.0423756549057051, 0.0784335999999992, 0.878468636469772, 0.0784336, 0.0792237451477643, 0.0791661274605434, 0.879142973793104);
  let mi = mat3x3f(1.19687900512017, -0.0528968517574562, -0.0529716355144438, -0.0980208811401368, 1.15190312990417, -0.0980434501171241, -0.0990297440797205, -0.0989611768448433, 1.15107367264116);
  var v = m * c;
  v = clamp(log2(max(v, vec3f(1e-10))), vec3f(-12.47393), vec3f(4.026069));
  v = (v + 12.47393) / (4.026069 + 12.47393);
  v = agxContrast(v);
  // visual: mais contraste e saturação
  let l = dot(v, vec3f(0.2126, 0.7152, 0.0722));
  v = pow(max(v, vec3f(0.0)), vec3f(1.12));
  v = mix(vec3f(dot(v, vec3f(0.2126, 0.7152, 0.0722))), v, 1.32);
  v = mi * v;
  return sat3(v);   // já em codificação de exibição (≈ sRGB 2.2)
}
fn tone(c: vec3f) -> vec3f { return agx(c); }
@fragment fn fs(in: FsV) -> @location(0) vec4f {
  let p = vec2i(in.pos.xy); let dim = vec2i(F.screen.xy) - 1;
  // exposição automática parcial: compensa ~50% da variação de luminância (cenas escuras continuam um pouco mais escuras)
  let lavg = clamp(textureLoad(tExp, vec2i(0), 0).r, 0.008, 3.0);
  let ex = F.misc.z * 0.094 * pow(0.16 / lavg, 0.5) / 0.16;
  var c = textureLoad(tCol, p, 0).rgb;
  // nitidez (em espaço de tons) com os 4 vizinhos
  let n = textureLoad(tCol, clamp(p + vec2i(0, -1), vec2i(0), dim), 0).rgb + textureLoad(tCol, clamp(p + vec2i(0, 1), vec2i(0), dim), 0).rgb
        + textureLoad(tCol, clamp(p + vec2i(-1, 0), vec2i(0), dim), 0).rgb + textureLoad(tCol, clamp(p + vec2i(1, 0), vec2i(0), dim), 0).rgb;
  let bl = textureSampleLevel(tBloom, s, in.uv, 0.0).rgb * (1.0 / 6.0);
  let lc = lum(c); let ln = lum(n) * 0.25;
  let sharp = clamp((lc - ln) * 0.8, -0.3 * lc, 0.4 * lc);
  c = c * (1.0 + sharp / max(lc, 1e-4));
  c = mix(c, bl, 0.055);
  // brilho de lente do sol: halo + raios finos, proporcional à fração do disco solar visível (não encoberta por geometria)
  if (F.sunScr.z > 0.5 && F.sunScr.x > -0.3 && F.sunScr.x < 1.3 && F.sunScr.y > -0.3 && F.sunScr.y < 1.3) {
    var vis = 0.0;
    for (var i = 0; i < 6; i++) {
      let a = f32(i) * 1.0472; let q = F.sunScr.xy + vec2f(cos(a), sin(a) * F.post.z) * 0.006 * f32(1 + (i & 1));
      if (q.x > 0.0 && q.y > 0.0 && q.x < 1.0 && q.y < 1.0) { vis += select(0.0, 1.0, textureLoad(gD, vec2i(q * F.screen.xy), 0) <= 0.0); }
    }
    vis /= 6.0;
    if (vis > 0.0) {
      let dv = (in.uv - F.sunScr.xy) * vec2f(F.post.z, 1.0); let r = length(dv); let an = atan2(dv.y, dv.x);
      let halo = 0.05 / (1.0 + pow(r / 0.045, 2.0)) + 0.012 / (1.0 + pow(r / 0.25, 2.0));
      let rays = (pow(abs(cos(an * 3.0 + 0.4)), 40.0) * 0.5 + pow(abs(cos(an * 7.0 + 1.1)), 90.0) * 0.25) * 0.05 / (1.0 + pow(r / 0.16, 2.0));
      let streak = 0.03 * exp(-abs(dv.y) * 90.0) / (1.0 + pow(abs(dv.x) / 0.3, 2.0));
      c += F.sunCol.rgb * (halo + rays + streak) * vis * 0.32 * F.clima.w;
    }
  }
  // clarão de raio (tempestade): o quadro inteiro clareia por um instante
  c = c * (1.0 + F.clima.z * 2.5) + vec3f(0.55, 0.6, 0.75) * F.clima.z * lavg * 0.6;
  // chuva: riscos finos inclinados caindo em duas camadas (perto mais rápida e grossa), sobre a imagem
  if (F.clima.y > 0.001) {
    let t = F.wind.w; var rs = 0.0;
    for (var k = 0; k < 2; k++) {
      let fk = f32(k); let sc = vec2f(mix(90.0, 170.0, fk), mix(5.0, 9.0, fk));
      var q = vec2f(in.uv.x * F.post.z + in.uv.y * 0.12, in.uv.y) * sc; q.y = q.y - t * mix(9.0, 13.0, fk);
      let cell = floor(q); let f = fract(q); let h = hash21(cell + fk * 17.0);
      let on = step(1.0 - F.clima.y * mix(0.35, 0.22, fk), h);
      let x0 = 0.2 + 0.6 * fract(h * 7.31); let len = 0.35 + 0.5 * fract(h * 3.7);
      rs += on * smoothstep(0.09, 0.0, abs(f.x - x0)) * smoothstep(0.0, 0.2, f.y) * step(f.y, len) * mix(0.8, 0.5, fk);
    }
    c = mix(c, c * 0.92 + vec3f(lavg * 0.9 + 0.02), sat(rs) * 0.35);
  }
  // vinheta
  let q = (in.uv - 0.5) * vec2f(F.post.z / 1.7778, 1.0); let vg = 1.0 - smoothstep(0.35, 1.25, length(q) * 1.45) * 0.42;
  // balanço de branco: neutraliza parte do tom alaranjado do sol baixo (o resto fica como clima de fim de tarde)
  let sc = F.sunCol.rgb / lum(F.sunCol.rgb);
  c *= pow(sc, vec3f(-0.5));
  c *= ex * vg;
  var o = tone(c);
  // grão fino + pontilhado triangular
  let h = hash22(in.pos.xy + vec2f(F.misc.y * 37.0, F.misc.y * 17.0));
  let tri = (h.x + h.y - 1.0);
  o += vec3f(tri) * (1.2 / 255.0);
#ifndef MOBILE_CLEAR
  o += (h.x - 0.5) * 0.012 * (1.0 - o) * o * 4.0 * 0.5;
#endif
  return vec4f(o, 1.0);
}
