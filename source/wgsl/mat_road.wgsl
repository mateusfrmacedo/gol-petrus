// Ruas de Nova Aliança. uv = (s, d) nas vias; xz nos cruzamentos e calçadas.
// cor: r = meia largura/8, g = pintura/4 (1 amarela tracejada, 2 branca tracejada), b = bordas brancas. peso = comprimento/1000.
// material: 0 asfalto | 1 asfalto do cruzamento | 2 concreto (a = 0 meio-fio, 1 calçada) | 3 chão | 4 terra | 5 terra do cruzamento
// byte a do asfalto = faixas de pedestre (bit 0 no início da via, bit 1 no fim)
#include mesh_vert
#include world_ground
fn aaL(x: f32, halfW: f32, aa: f32) -> f32 { return 1.0 - smoothstep(halfW - aa, halfW + aa, abs(x)); }
fn camD(wp: vec3f) -> f32 {
#ifdef PASS_CUBE
  return distance(wp, P.camPos.xyz);
#else
  return distance(wp, F.camPos.xyz);
#endif
}
fn roadAsphalt(in: V2F, junction: bool) -> Surface {
  var sf = surfDefault(normalize(in.nrm));
  let Ng = sf.normal; let xz = in.wpos.xz; let dist = camD(in.wpos);
  var s = in.uv.x; var d = in.uv.y;
  if (junction) { s = xz.x; d = 0.0; }
  let near = 1.0 - smoothstep(15.0, 80.0, dist); let near2 = 1.0 - smoothstep(3.0, 22.0, dist);
  let aaD = max(fwidth(d), 0.0015); let aaS = max(fwidth(s), 0.0015);
  let n1 = textureSample(tNoise, sLin, xz * 0.0293);
  let n2 = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8) * 0.33);
  let n3 = (textureSample(tNoise, sLin, xz * 0.93) + textureSample(tNoise, sLin, vec2f(xz.x * 0.342 - xz.y * 0.94, xz.x * 0.94 + xz.y * 0.342) * 0.71 + 0.41)) * 0.5;
  let n4 = (textureSample(tNoise, sLin, vec2f(xz.x * 0.6 + xz.y * 0.8, -xz.x * 0.8 + xz.y * 0.6) * 3.1) + textureSample(tNoise, sLin, vec2f(xz.x * 0.966 + xz.y * 0.259, -xz.x * 0.259 + xz.y * 0.966) * 2.37 + 0.23)) * 0.5;
  let nM = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 + xz.y * 0.6, -xz.x * 0.6 + xz.y * 0.8) * 0.0061 + 0.27);
  // remendos de recapeamento (manchas largas, em xz: atravessam ruas e cruzamentos sem emenda)
  let pn = textureSample(tNoise, sLin, xz * 0.021 + 0.53);
  let patchM = smoothstep(0.6, 0.63, pn.r);
  let tone = mix(0.9 + 0.25 * n1.g, 0.78 + 0.3 * pn.g, patchM);
  var alb = vec3f(0.135, 0.132, 0.126) * tone * (0.74 + 0.52 * n2.r) * (0.66 + 0.68 * n1.r) * (0.76 + 0.48 * nM.g);
  let stain = smoothstep(0.6, 0.76, n2.b * 0.55 + n3.g * 0.5);
  let dust = smoothstep(0.58, 0.8, n2.g * 0.6 + n1.b * 0.5);
  alb *= (1.0 - 0.42 * stain) * (1.0 + 0.4 * dust);
  let n5 = textureSample(tNoise, sLin, xz * 9.7 + 0.13);
  let n6 = textureSample(tNoise, sLin, vec2f(xz.x * 0.6 + xz.y * 0.8, -xz.x * 0.8 + xz.y * 0.6) * 5.9 + 0.19);
  let grain = (n5.b - 0.55) + (n6.b - 0.55) * 0.8;
  alb *= 1.0 + grain * 0.085 + (n3.b - 0.5) * 0.05;
  let cav = smoothstep(-0.3, 0.2, grain);
  var rough = 0.88 - 0.05 * smoothstep(0.58, 0.8, n4.b) - 0.06 * stain + 0.02 * cav;
  // trincas e borda do remendo
  let cv = n1.b * 0.55 + n2.g * 0.45 - 0.5; let cw = max(fwidth(cv), 1e-4);
  var tar = (1.0 - smoothstep(0.0, cw * 0.9 + 0.0003, abs(cv))) * smoothstep(0.5, 0.66, n1.r) * smoothstep(0.45, 0.6, n2.r) * 0.75;
  let pw = max(fwidth(pn.r), 1e-4); tar = max(tar, (1.0 - smoothstep(0.0, pw * 1.5, abs(pn.r - 0.615))) * 0.5);
  tar *= 1.0 - smoothstep(25.0, 90.0, dist) * 0.7;
  // trilhas de roda mais escuras e polidas (sem pintura de corrida: só o uso)
  if (!junction) {
    let hw = in.col.r * 8.0; let lane = select(hw * 0.5, 0.0, in.col.g > 0.4 && in.col.g < 0.6);
    let ad = abs(d);
    let rut = exp(-pow(abs(ad - abs(lane - 0.0)) - 0.7, 2.0) / 0.08) * 0.35 * (0.5 + 0.5 * textureSample(tNoise, sLin, vec2f(d * 0.9, s * 0.02)).r);
    alb = mix(alb, alb * 0.6, rut); rough = mix(rough, 0.8, rut);
    // borda: terra e folhas acumuladas junto ao meio-fio
    let eN = ad - hw + 0.25 + (n2.g - 0.5) * 0.3 + (n3.r - 0.5) * 0.1;
    alb = mix(alb, vec3f(0.11, 0.075, 0.05) * (0.7 + 0.6 * n4.g), smoothstep(-0.1, 0.2, eN) * 0.55);
  }
  alb = mix(alb, alb * 0.38 + vec3f(0.004), tar); rough = mix(rough, 0.74, tar);
  // ---- pintura ----
  var paint = 0.0; var yel = 0.0;
  if (!junction) {
    let hw = in.col.r * 8.0; let mode = in.col.g * 4.0; let Lc = in.ext.w * 1000.0;
    let chip = 0.7 + 0.3 * smoothstep(0.25, 0.55, n3.b + (n2.g - 0.5) * 0.6);
    let dash = step(fract(s / 12.0), 0.34);
    let ctr = aaL(d, 0.06, aaD) * dash * chip;
    if (mode > 0.5 && mode < 1.5) { yel = ctr; }
    if (mode > 1.5 && mode < 2.5) { paint = max(paint, ctr); }
    if (in.col.b > 0.5) { paint = max(paint, aaL(abs(d) - (hw - 0.28), 0.06, aaD) * chip); }
    // faixas de pedestre a 1–4 m do cruzamento
    let zf = (in.mat >> 8u) & 255u;
    let zs = select(1e3, s, (zf & 1u) != 0u); let ze = select(1e3, Lc - s, (zf & 2u) != 0u);
    let zd = min(zs, ze);
    let inZ = smoothstep(0.8 - aaS, 0.8 + aaS, zd) * (1.0 - smoothstep(3.8 - aaS, 3.8 + aaS, zd)) * step(abs(d), hw - 0.35);
    let stripe = smoothstep(0.5 - aaD * 2.0, 0.5 + aaD * 2.0, abs(fract((d + 20.0) / 1.0) - 0.5) * 2.0);
    paint = max(paint, inZ * stripe * chip);
  }
  let white = vec3f(0.62, 0.62, 0.59) * (0.8 + 0.2 * n2.r);
  let yellow = vec3f(0.62, 0.38, 0.03) * (0.8 + 0.2 * n2.r);
  alb = mix(alb, white, paint * 0.92); alb = mix(alb, yellow, yel * 0.9);
  rough = mix(rough, 0.55, max(paint, yel) * 0.8);
  var grad = (n3.rg - 0.5) * 0.14 * near + (n4.rg - 0.5) * 0.4 * near2 + (n2.rg - 0.5) * 0.04 * near + ((n5.rg - 0.5) * 0.75 + (n6.rg - 0.5) * 0.55) * near2;
  grad *= 1.0 - 0.6 * max(max(paint, yel), tar);
  rough += 0.05 * (1.0 - near2);
  sf.albedo = alb; sf.rough = rough; sf.normal = bumpXZ(Ng, grad);
  sf.ao = (1.0 - tar * 0.3) * (0.84 + 0.16 * cav);
  return sf;
}
// estrada de terra (terra vermelha da região): trilhos de roda, pedriscos, capim no meio e nas bordas
fn roadDirt(in: V2F, junction: bool) -> Surface {
  var sf = surfDefault(normalize(in.nrm));
  let Ng = sf.normal; let xz = in.wpos.xz; let dist = camD(in.wpos);
  let near2 = 1.0 - smoothstep(3.0, 25.0, dist);
  let n1 = textureSample(tNoise, sLin, xz * 0.045);
  let n2 = textureSample(tNoise, sLin, vec2f(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8) * 0.41);
  let n3 = textureSample(tNoise, sLin, xz * 2.7 + 0.31);
  let n4 = textureSample(tNoise, sLin, xz * 7.9 + 0.17);
  var alb = vec3f(0.3, 0.15, 0.08) * (0.75 + 0.45 * n1.r) * (0.85 + 0.3 * n2.g);
  alb = mix(alb, vec3f(0.36, 0.26, 0.17), smoothstep(0.5, 0.75, n2.b) * 0.5);      // poeira mais clara
  var grassy = 0.0;
  if (!junction) {
    let hw = in.col.r * 8.0; let ad = abs(in.uv.y);
    let rut = exp(-pow(ad - hw * 0.42, 2.0) / 0.09);
    alb = mix(alb, alb * vec3f(0.78, 0.74, 0.72), rut * 0.6);
    grassy = (1.0 - smoothstep(0.25, 0.6, ad)) * smoothstep(0.35, 0.6, n2.r) * step(hw, 2.6) + smoothstep(hw - 0.6, hw, ad + (n2.g - 0.5) * 0.5);
  }
  let peb = smoothstep(0.7, 0.85, n3.b) * near2;
  alb = mix(alb, vec3f(0.42, 0.36, 0.3) * (0.7 + 0.6 * n4.r), peb * 0.6);
  alb = mix(alb, COL_GRASS * (0.8 + 0.5 * n3.g), sat(grassy) * 0.8);
  let grad = (n3.rg - 0.5) * 0.9 * near2 + (n4.rg - 0.5) * 1.2 * near2 + (n1.rg - 0.5) * 0.3;
  sf.albedo = alb; sf.rough = 0.95; sf.normal = bumpXZ(Ng, grad); sf.ao = 0.85 + 0.15 * n3.r;
  return sf;
}
// concreto do meio-fio e da calçada (placas de 1 m na calçada, juntas, manchas e sujeira)
fn roadConcrete(in: V2F) -> Surface {
  var sf = surfDefault(normalize(in.nrm));
  let wp = in.wpos; let dist = camD(wp);
  let pu = wp.xz + wp.yy * vec2f(0.71, -0.53);
  let n1 = textureSample(tNoise, sLin, pu * 0.19); let n2 = textureSample(tNoise, sLin, pu * 2.3); let n3 = textureSample(tNoise, sLin, pu * 0.033 + 0.4);
  var c = vec3f(0.42, 0.405, 0.38) * (0.82 + 0.3 * n1.r) * (0.9 + 0.2 * n2.a) * (0.8 + 0.35 * n3.g);
  let walk = ((in.mat >> 8u) & 255u) == 1u || ((in.mat >> 8u) & 255u) == 3u;
  let tile = ((in.mat >> 8u) & 255u) == 3u;
  var ao = 1.0;
  if (walk) {
    let q = in.uv / 1.2; let jf = abs(fract(q) - 0.5); let jd = (0.5 - max(jf.x, jf.y)) * 1.2;
    let joint = (1.0 - smoothstep(0.01, 0.01 + max(fwidth(jd), 0.003), jd)) * (1.0 - smoothstep(20.0, 70.0, dist));
    let cell = floor(q); let h = fract(sin(dot(cell, vec2f(12.9898, 78.233))) * 43758.5453);
    c *= 0.86 + 0.24 * h;
    c = mix(c, c * 0.45, joint * 0.7); ao = 1.0 - joint * 0.3;
    c = mix(c, vec3f(0.12, 0.09, 0.06), smoothstep(0.62, 0.8, n1.g * 0.6 + n3.b * 0.5) * 0.5);   // terra e folhas
    if (tile) {
      // ladrilho hidráulico 20 x 20 cm: desenho de quadrados alternando vermelho e cinza, gasto
      let t = in.uv / 0.2; let tc = floor(t); let tf = abs(fract(t) - 0.5);
      let red = f32((i32(tc.x) + i32(tc.y)) & 1); let inner = step(max(tf.x, tf.y), 0.3);
      var tcol = mix(vec3f(0.42, 0.41, 0.39), vec3f(0.42, 0.13, 0.08), red);
      tcol = mix(tcol, mix(vec3f(0.42, 0.13, 0.08), vec3f(0.45, 0.44, 0.42), red), inner * 0.8);
      let jt = 1.0 - smoothstep(0.46, 0.49, max(tf.x, tf.y));
      c = mix(c, tcol * (0.8 + 0.3 * n1.r) * (0.7 + 0.3 * jt), 0.85 * (1.0 - smoothstep(10.0, 60.0, dist) * 0.3));
    }
  } else if (((in.mat >> 8u) & 255u) == 2u) {
    // valeta: calha de concreto mais escura e úmida no meio, juntas transversais a cada 1 m, terra acumulada
    let a = abs(in.uv.x); let wet = 1.0 - smoothstep(0.1, 0.55, a);
    c *= 0.9; c = mix(c, c * 0.55, wet * 0.7); c = mix(c, vec3f(0.14, 0.09, 0.06), smoothstep(0.6, 0.8, n1.g) * wet * 0.6);
    let j = 1.0 - smoothstep(0.015, 0.03, abs(fract(in.uv.y) - 0.5) * 1.0 - 0.47);
    c = mix(c, c * 0.5, j * 0.6);
  } else {
    c *= 1.15; c = mix(c, vec3f(0.1, 0.08, 0.06), (1.0 - smoothstep(0.0, 0.1, in.uv.y)) * 0.5);
  }
  sf.albedo = c; sf.rough = 0.86; sf.ao = ao;
  sf.normal = bumpXZ(sf.normal, (n2.rg - 0.5) * 0.3 * (1.0 - smoothstep(4.0, 25.0, dist)));
  return sf;
}
// lombada: asfalto com faixas amarelas inclinadas (uv = posição ao longo e lateral)
fn roadBump(in: V2F) -> Surface {
  var sf = roadAsphalt(in, true);
  let a = in.uv.x; let d = in.uv.y; let aa = max(fwidth(d) + fwidth(a), 0.002);
  let st = fract((d + a * 0.7) / 1.1);
  let paint = smoothstep(0.5 - aa, 0.5 + aa, st) * (1.0 - smoothstep(1.6, 1.75, abs(a)));
  let n = textureSample(tNoise, sLin, in.wpos.xz * 0.9);
  let chip = smoothstep(0.3, 0.6, n.b + 0.2);
  sf.albedo = mix(sf.albedo, vec3f(0.62, 0.42, 0.04) * (0.8 + 0.25 * n.r), paint * chip * 0.9); sf.rough = mix(sf.rough, 0.6, paint * chip);
  return sf;
}
// buraco: asfalto quebrado, fundo escuro com pedrisco solto e água empoçada às vezes; borda irregular
fn roadHole(in: V2F) -> Surface {
  var sf = roadAsphalt(in, true);
  let r = length(in.uv); let n = textureSample(tNoise, sLin, in.wpos.xz * 2.3); let n2 = textureSample(tNoise, sLin, in.wpos.xz * 7.1);
  let e = r + (n.r - 0.5) * 0.35;
  let inside = 1.0 - smoothstep(0.62, 0.78, e);
  let rim = smoothstep(0.55, 0.72, e) * (1.0 - smoothstep(0.8, 0.98, e));
  var c = mix(sf.albedo, vec3f(0.05, 0.045, 0.04) * (0.6 + 0.8 * n2.b), inside);
  c = mix(c, c * 1.4 + 0.02, rim * 0.5);
  sf.albedo = mix(sf.albedo, c, 1.0 - smoothstep(0.92, 1.0, r));
  sf.rough = mix(sf.rough, 0.97, inside);
  let g = normalize(in.uv + vec2f(1e-4)) * inside * 1.6 * (1.0 - smoothstep(0.3, 0.75, r)) + (n2.rg - 0.5) * 1.4 * inside;
  sf.normal = bumpXZ(normalize(in.nrm), -g); sf.ao *= 1.0 - 0.45 * inside;
  return sf;
}
fn surf(in: V2F, ff: bool) -> Surface {
  var sf = surfRoad(in);
  sf.emissive = max(sf.emissive, wmZone(in.wpos.xz).g * 0.5 * F.sunDir.w);   // luz dos postes à noite
  return sf;
}
fn surfRoad(in: V2F) -> Surface {
  let id = matId(in.mat);
  if (id == 6u) { return roadBump(in); }
  if (id == 7u) { return roadHole(in); }
  if (id == 0u) { return roadAsphalt(in, false); }
  if (id == 1u) { return roadAsphalt(in, true); }
  if (id == 2u) { return roadConcrete(in); }
  if (id == 4u) { return roadDirt(in, false); }
  if (id == 5u) { return roadDirt(in, true); }
  return groundSurf(in.wpos, normalize(in.nrm), 0.0);
}
