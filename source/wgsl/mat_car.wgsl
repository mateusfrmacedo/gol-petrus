// Materiais do carro (VW Gol; os casos 1..17 vêm do Uno com escada, de onde o jogo partiu): pintura metálica com verniz, plásticos, borracha, pneus, calotas, lentes, alumínio...
// id (mat.x): 1 pintura | 2 plástico preto | 3 borracha | 4 pneu | 5 calota | 6 aço | 7 cromado | 8 interior | 9 lente opaca
//             10 alumínio | 11 cinta | 12 decalque do atlas | 13 fundo | 14 refletor do farol | 15 espelho | 16 palhetas da grade
//             17 pintura lisa brilhante (capacete; a=1 preto vítreo)
// O.p0 da carroceria: x = luz de freio, y = luz de ré, z = faróis. O.p0.x das rodas = |velocidade angular|.
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;
@group(3) @binding(1) var tFoto: texture_2d<f32>;   // insertos fotográficos do Gol (frente e traseira)
const PAINT_COL = vec3f(0.168, 0.275, 0.425);   // azul-claro metálico de estúdio: mais escuro e acinzentado (o sol do jogo é forte)
fn carBulgeW(x: f32) -> f32 { return 0.055 * smoothstep(-0.15, 0.25, x) - 0.036 * smoothstep(-1.15, -1.42, x); }
// ---------- VW Gol G6: regiões da carroceria (mesmas fórmulas de modelo/regions.py) ----------
fn gsmax(a: f32, b: f32, k: f32) -> f32 { let h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0); return a * h + b * (1.0 - h) + k * h * (1.0 - h); }
fn grr(a: f32, b: f32, ha: f32, hb: f32, r: f32) -> f32 { let q = vec2f(abs(a) - ha + r, abs(b) - hb + r); return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r; }
fn gbelt(x: f32) -> f32 { return 0.921 + 0.05 * clamp((0.545 - x) / 1.6, 0.0, 1.0); }   // medida na foto 11.26.25
fn gwg(y: f32) -> f32 { return 0.785 - 0.19 * pow(clamp((y - 0.95) / 0.45, 0.0, 1.2), 1.1); }
fn gseg(p: vec2f, a: vec2f, b: vec2f) -> f32 { let ab = b - a; let t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
fn gcov(d: f32) -> f32 { let w = max(fwidth(d), 1e-5); return clamp(0.5 - d / w, 0.0, 1.0); }
// vãos entre painéis: distância à linha mais próxima (portas, capô, tampa traseira, para-choques, tampa de combustível)
fn gseam(p: vec3f, n: vec3f) -> f32 {
  let az = abs(p.z); var d = 1.0; let q = p.xy;
  if (abs(n.z) > 0.45 && az > 0.55) {
    let bl = gbelt(p.x);
    d = min(d, gseg(q, vec2f(0.575, 0.28), vec2f(0.575, gbelt(0.575))));    // frente da porta dianteira (foto 11.26.25)
    d = min(d, gseg(q, vec2f(-0.21, 0.28), vec2f(-0.21, gbelt(-0.21))));     // coluna B
    d = min(d, gseg(q, vec2f(-0.99, 0.66), vec2f(-0.99, gbelt(-0.99))));      // traseira da porta de trás
    if (p.x < -0.99 && p.x > -1.25 && p.y > 0.3 && p.y < 0.68) { d = min(d, abs(length(q - vec2f(-1.2335, 0.298)) - 0.40)); }
    d = min(d, gseg(q, vec2f(-1.0, 0.28), vec2f(0.575, 0.28)));              // base das portas
    if (p.z > 0.0) { d = min(d, abs(length(q - vec2f(-1.37, 0.835)) - 0.072)); }   // tampa de combustível (lado direito)
  }
  if (p.x > 1.5 && p.y < 0.7) { d = min(d, abs(p.y - 0.668)); }                // para-choque dianteiro × farol/para-lama
  if (p.x < -1.5 && p.y < 0.62) { d = min(d, abs(p.y - 0.57)); }               // para-choque traseiro
  if (n.y > 0.3 && p.x > 0.95 && p.y > 0.72) {                                   // capô
    d = min(d, select(1.0, abs(p.x - 1.02), az < 0.66));
    d = min(d, select(1.0, abs(az - 0.66), p.x > 1.02 && p.x < 1.78));
  }
  if (p.x < -1.6 && n.x < -0.3) {                                               // tampa traseira em volta das lanternas
    d = min(d, select(1.0, abs(az - 0.505), p.y > 0.57 && p.y < 0.88));
    d = min(d, select(1.0, abs(p.y - 0.885), az > 0.505 && az < gwg(0.885)));
  }
  return d;
}
fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  let id = matId(in.mat); let pa = matA(in.mat) * 255.0;
  let lp = in.ext.xyz;
  s.albedo = in.col.rgb;
  switch (id) {
    case 1u: {   // pintura azul-claro metálica com verniz
      // flocos metálicos: ruído 3D no espaço do carro (sem estrias em nenhum painel)
      // (ruído 2D com mips, projetado pelos três eixos do carro: com a distância ou em ângulo rasante os mips levam à média
      //  e o floco some sozinho — o ruído 3D sem mips virava uma trama diagonal no capô)
      let nO = normalize((vec4f(s.normal, 0.0) * O.model).xyz); let wt = abs(nO) / (abs(nO.x) + abs(nO.y) + abs(nO.z));
      let fl = textureSample(tNoise, sLin, lp.zy * 23.0).a * wt.x + textureSample(tNoise, sLin, lp.xz * 23.0).a * wt.y + textureSample(tNoise, sLin, lp.xy * 23.0).a * wt.z - 0.5;
      s.albedo = PAINT_COL * (1.0 + 0.08 * fl); s.metal = 0.58; s.rough = 0.3 + 0.04 * fl; s.coat = 1.0;
      // abas dos recortes junto ao chão (base das caixas de roda): escuras, para não sobrar lasca clara pendurada
      { let under = (1.0 - smoothstep(0.31, 0.345, lp.y)) * smoothstep(1.4, 1.5, abs(lp.x)); s.albedo = mix(s.albedo, vec3f(0.01), under); s.coat *= 1.0 - under; s.metal *= 1.0 - under; s.rough = mix(s.rough, 0.95, under); }
      if (pa > 0.5) { let low = max(1.0 - smoothstep(0.2, 0.26, lp.y), (1.0 - smoothstep(0.54, 0.6, lp.y)) * smoothstep(1.2, 1.3, abs(lp.x))); s.albedo = mix(s.albedo, vec3f(0.012), low); s.coat *= 1.0 - low; s.metal *= 1.0 - low; s.rough = mix(s.rough, 0.9, low); }
      if (pa < 0.5) {
        var d = abs(in.uv.x);
        // tampa de combustível (lado esquerdo)
        if (lp.z < -0.5) { d = min(d, abs(length(vec2f(lp.x + 1.04, lp.y - 0.715)) - 0.062)); }
        // vão entre painéis: núcleo escuro de ~4 mm + sombra suave em volta (lê como fresta, não como traço);
        // quando fica menor que o pixel, some por cobertura em vez de engrossar
        let w = max(fwidth(d), 1e-5); let hw = 0.002;
        let line = sat((hw - d) / w + 0.5) * min(1.0, 2.0 * hw / w);
        let halo = (1.0 - smoothstep(hw, hw + 0.007, d)) * sat(0.0035 / w);
        s.albedo *= 1.0 - 0.22 * halo; s.ao = min(s.ao, 1.0 - 0.4 * halo);
        // faixa lateral mais escura entre os dois vincos + friso fino escuro na borda de cima + soleira sombreada
        let side = step(in.uv.y, 0.4);
        // (nas fotos de estúdio tudo abaixo do friso é um tom mais escuro)
        let band = smoothstep(0.215, 0.25, lp.y) * (1.0 - smoothstep(0.575, 0.59, lp.y)) * side;
        s.albedo *= 1.0 - 0.3 * band; s.rough += 0.03 * band;
        let wy = max(fwidth(lp.y), 1e-5);
        // friso lateral: faixa larga de borracha preta (~5 cm) na altura do topo dos para-choques, entre as caixas de roda
        let sx = smoothstep(-0.83, -0.80, lp.x) * (1.0 - smoothstep(0.80, 0.83, lp.x));
        let sdy = lp.y - 0.607; let strip = sat((0.025 - abs(sdy)) / wy + 0.5) * min(1.0, 0.05 / wy) * side * sx;
        { let upS = normalize((O.model * vec4f(0.0, 1.0, 0.0, 0.0)).xyz); let eb = smoothstep(0.014, 0.024, abs(sdy)) * strip; s.normal = normalize(s.normal + upS * sign(sdy) * eb * 0.8); }
        // soleira: faixa preta fosca sob a porta, entre as caixas de roda
        let sill = (1.0 - smoothstep(0.222, 0.234, lp.y)) * side;
        s.albedo = mix(s.albedo, vec3f(0.014), sill * 0.92); s.coat *= 1.0 - sill; s.metal *= 1.0 - sill; s.rough = mix(s.rough, 0.85, sill); s.ao = min(s.ao, 1.0 - 0.3 * sill);
        // vinco horizontal da tampa traseira (na altura do topo das lanternas): dobra a normal numa faixa estreita
        if (lp.x < -1.5 && in.uv.y > 0.66) {
          let t = (lp.y - 0.836) / 0.007; let upW = normalize((O.model * vec4f(0.0, 1.0, 0.0, 0.0)).xyz);
          s.normal = normalize(s.normal + upW * (t * exp(-t * t) * 0.55) * (1.0 - smoothstep(0.44, 0.48, abs(lp.z))));
          // rebaixo da placa: degrau sombreado em volta da placa (retângulo arredondado) e fundo levemente mais escuro
          let q = abs(vec2f(lp.z, lp.y - 0.717)) - vec2f(0.203, 0.064); let pr = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - 0.014;
          let stepb = 1.0 - smoothstep(0.0, 0.007, abs(pr));
          s.albedo *= 1.0 - 0.3 * stepb - 0.07 * (1.0 - smoothstep(-0.004, 0.0, pr)); s.ao = min(s.ao, 1.0 - 0.5 * stepb);
        }
        var black = max(line, strip); var lvShade = 1.0;
        if (in.uv.y > 0.66) {
          let zz = lp.z / 0.72; let xe = lp.x - carBulgeW(lp.x) * (1.0 - zz * zz);
          // grade plástica na base do para-brisa
          let cowl = smoothstep(0.6, 0.61, xe) * (1.0 - smoothstep(0.741, 0.745, xe));
          black = max(black, cowl);
          // grelha de ventilação do capô: fileira de aletas ~10 cm à frente da borda traseira, centrada (como na foto)
          let lz = lp.z / 0.021; let cz = fract(lz) - 0.5; let slot = smoothstep(0.3, 0.42, abs(cz) * 2.0);
          let lin = smoothstep(0.843, 0.846, xe) * (1.0 - smoothstep(0.876, 0.879, xe)) * (1.0 - smoothstep(0.218, 0.222, abs(lp.z)));
          let lv = (1.0 - slot) * lin;
          // rebaixo: a borda de cada aleta dobra a normal (pega brilho de um lado, sombra do outro) e o fundo tem degradê
          let rightW = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz); let fwdW = normalize((O.model * vec4f(1.0, 0.0, 0.0, 0.0)).xyz);
          let bev = smoothstep(0.22, 0.36, abs(cz) * 2.0) * (1.0 - smoothstep(0.44, 0.58, abs(cz) * 2.0)) * lin;
          let endb = (smoothstep(0.836, 0.845, xe) * (1.0 - smoothstep(0.845, 0.851, xe)) - smoothstep(0.871, 0.877, xe) * (1.0 - smoothstep(0.877, 0.886, xe))) * (1.0 - slot) * (1.0 - smoothstep(0.218, 0.222, abs(lp.z)));
          s.normal = normalize(s.normal - rightW * sign(cz) * bev * 0.7 + fwdW * endb * 0.6);
          s.ao = min(s.ao, 1.0 - 0.35 * bev); s.ao = min(s.ao, 1.0 - 0.7 * lv);   // o fundo da fenda não devolve céu nem sol
          lvShade = mix(1.0, mix(0.3, 1.1, sat(cz * 2.6 + 0.5)) * mix(0.5, 1.0, sat((xe - 0.846) / 0.03)), lin);   // só dentro das aletas (a base do para-brisa fica lisa)
          // pé dos dois vincos longitudinais: linha de sombra fina que acompanha o ressalto
          let zc = 0.515 - 0.145 * sat((xe - 0.72) / 1.03);
          let hx = smoothstep(0.78, 0.9, xe) * (1.0 - smoothstep(1.68, 1.76, xe));
          // aresta viva do ressalto: a normal dobra para fora numa faixa estreita (a face do degrau pega o céu de um lado e
          // sombra do outro), com uma linha de sombra fina no pé — o vinco lê de qualquer ângulo, inclusive da câmera de capô
          let dz = abs(lp.z) - zc; let wz = max(fwidth(lp.z), 1e-5);
          let face = (1.0 - smoothstep(0.004, 0.0085, abs(dz))) * hx;
          let foot = (1.0 - smoothstep(0.003, 0.02 + 2.0 * wz, abs(dz - 0.013))) * hx;   // faixa de sombra larga e suave (lê a 1 m em ângulo rasante, sem tracejar)
          let crest = (1.0 - smoothstep(0.003, 0.016 + 2.0 * wz, abs(dz + 0.012))) * hx;
          s.normal = normalize(s.normal + rightW * sign(lp.z) * (face * 1.0 + foot * 0.3));
          s.albedo *= (1.0 - 0.5 * foot) * (1.0 + 0.2 * crest); s.ao = min(s.ao, 1.0 - 0.6 * foot);
          s.coat *= 1.0 - 0.8 * foot; s.rough = mix(s.rough, 0.7, foot);   // no pé do degrau o verniz não devolve o céu: a linha de sombra aparece também em ângulo rasante
          black = max(black, lv);
        }
        s.albedo = mix(s.albedo, vec3f(0.016) * lvShade, black); s.coat *= 1.0 - black; s.rough = mix(s.rough, 0.95, black); s.metal *= 1.0 - black; s.ao = min(s.ao, 1.0 - line * 0.6);
      }
    }
    case 2u: {   // plástico preto: granulado finíssimo (quase liso a 3 m), arestas vivas, um pouco de difuso para ler na sombra
      let g = textureSample(tNoise, sLin, lp.xz * 57.0 + lp.yy * 43.0).b;
      let g2 = textureSample(tNoise, sLin, lp.zy * 131.0 + lp.xx * 97.0).a;
      s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * (0.2 + 0.13 * g + 0.09 * g2); s.rough = select(0.94 + 0.05 * g2, 0.4, pa > 0.5); s.ao = 0.38 + 0.2 * g2; s.metal = select(0.0, 0.55, pa > 0.5);
    }
    case 3u: { s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * 1.0; s.rough = 0.84; s.ao = 0.6; s.metal = 0.5; }
    case 4u: {   // pneu de passeio
      let r = length(lp.xy); let ang = atan2(lp.y, lp.x);
      let blur = sat(O.p0.x / 25.0);
      if (pa < 0.5) {
        // banda: lamelas finas e discretas, só entre os ombros (os sulcos longitudinais são geometria)
        let lane = floor((lp.z + 0.075) / 0.03);
        let k = fract(ang / 6.2831853 * 118.0 + lane * 0.5);
        let sipe = (1.0 - smoothstep(0.05, 0.1, abs(k - 0.5))) * (1.0 - blur) * (1.0 - smoothstep(0.06, 0.07, abs(lp.z)));
        s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * 0.5 * (1.0 - 0.5 * sipe); s.ao = 0.45 - 0.2 * sipe; s.rough = 0.95; s.metal = 0.0;
      } else {
        // flanco liso: dois frisos concêntricos e poucas inscrições pequenas em relevo suave
        let ring = (1.0 - smoothstep(0.0006, 0.0014, abs(r - 0.284))) + (1.0 - smoothstep(0.0006, 0.0014, abs(r - 0.228)));
        let tb = smoothstep(0.244, 0.2455, r) * (1.0 - smoothstep(0.2555, 0.257, r));
        let win = step(0.55, textureSampleLevel(tNoise, sLin, vec2f(ang * 0.33, 0.61), 0.0).r);
        let st = smoothstep(0.3, 0.45, abs(fract(ang * 58.0) - 0.5)) * step(0.35, textureSampleLevel(tNoise, sLin, vec2f(ang * 9.3, 0.37), 0.0).a);
        let letters = tb * win * st * (1.0 - blur);
        // friso largo junto ao ombro e nervuras radiais finas no flanco (pneu de verdade, não massa lisa)
        let ribs = (0.5 + 0.5 * sin(ang * 150.0)) * smoothstep(0.261, 0.264, r) * (1.0 - smoothstep(0.276, 0.279, r)) * (1.0 - blur) * sat(1.0 - fwidth(ang) * 150.0 * 0.4);
        let band2 = smoothstep(0.233, 0.235, r) * (1.0 - smoothstep(0.24, 0.242, r));
        s.albedo = in.col.rgb * vec3f(0.96, 1.0, 1.05) * 0.5 * (1.0 + 1.8 * letters + 0.8 * ring * (1.0 - blur) + 0.35 * ribs + 0.3 * band2); s.rough = 0.9 - 0.2 * letters; s.ao = 0.5 - 0.15 * ribs + 0.25 * letters; s.metal = 0.0;
      }
    }
    case 5u: {   // calota prateada
      let r = length(lp.xy);
      s.albedo = in.col.rgb; s.metal = 0.75; s.rough = 0.36; s.coat = 0.25;
      if (pa > 0.5) {
        // disco de borrão: cobre os rasgos por pontilhado conforme a roda gira (média radial: anel dos rasgos mais escuro)
        let cov = smoothstep(9.0, 34.0, O.p0.x);
        if (ign(in.pos.xy, F.misc.y) >= cov) { discard; }
        let ringd = 1.0 - smoothstep(0.016, 0.03, abs(r - 0.123));
        let rim = 1.0 - smoothstep(0.001, 0.003, abs(r - 0.156)); let hub = 1.0 - smoothstep(0.016, 0.024, r); let bolts = 1.0 - smoothstep(0.005, 0.01, abs(r - 0.058));
        let streak = 0.5 + 0.5 * sin(atan2(lp.y, lp.x) * 16.0);   // resto dos 16 rasgos, quase apagado pelo giro
        s.albedo = in.col.rgb * (1.0 - 0.5 * ringd * (0.85 + 0.15 * streak) - 0.35 * rim - 0.4 * hub - 0.22 * bolts); s.rough = 0.42; s.coat = 0.15; s.ao = 1.0 - 0.35 * ringd;
        return s;
      }
      let far = smoothstep(0.004, 0.011, fwidth(r)) * (1.0 - smoothstep(0.019, 0.026, abs(r - 0.123)));
      s.albedo *= 1.0 - 0.3 * far;
      let c = 1.0 - smoothstep(0.0012, 0.0024, abs(r - 0.031));
      // emblema central: cinco barras inclinadas em baixo-relevo
      let q = lp.x + lp.y * 0.3;
      let bars = (1.0 - smoothstep(0.2, 0.3, abs(fract(q / 0.0078 + 0.5) - 0.5))) * step(abs(lp.y), 0.0155) * step(abs(q), 0.0195) * (1.0 - sat(O.p0.x / 20.0));
      s.albedo *= 1.0 - 0.5 * bars; s.rough += 0.1 * bars;
      // friso na borda e sombra suave para dentro dos rasgos
      s.albedo *= 1.0 - 0.3 * (1.0 - smoothstep(0.001, 0.0025, abs(r - 0.156)));
      // cinco rebaixos de parafuso em volta do centro
      let a5 = atan2(lp.y, lp.x) / 6.2831853 * 5.0; let da = (a5 - round(a5)) / 5.0 * 6.2831853 * r;
      let dimple = 1.0 - smoothstep(0.006, 0.008, length(vec2f(da, r - 0.058)));
      s.albedo *= 1.0 - 0.5 * c - 0.6 * dimple; s.ao = 1.0 - 0.5 * dimple;
    }
    case 6u: { s.metal = 0.5; s.rough = select(0.45, 0.6, pa > 0.5); }
    case 7u: { s.metal = 1.0; s.rough = select(0.07, 0.26, pa > 0.5); if (pa > 1.5) { s.metal = 0.72; s.rough = 0.3; } }   // a=2: cromado claro acetinado (emblema)
    case 8u: {   // interior
      s.rough = 0.92;
      // forro interno atrás dos para-choques (a pele externa é cortada ali): escuro, para não aparecer por baixo do carro
      { let under = (1.0 - smoothstep(0.56, 0.62, lp.y)) * smoothstep(1.2, 1.3, abs(lp.x)); s.albedo = mix(s.albedo, vec3f(0.006), under); }
      if ((pa > 1.5 && pa < 2.5) || pa > 3.5) { let w = sin(lp.z * 900.0) * sin(lp.x * 900.0 + lp.y * 900.0); s.albedo = in.col.rgb * (1.0 + 0.1 * w); }
      if (pa > 3.5) {
        // bancos: gomos horizontais com costura (sulco escuro) a cada ~8 cm
        let k = (fract(lp.y / 0.082 + 0.3 * lp.x) - 0.5) * 0.082; let seam = 1.0 - smoothstep(0.0025, 0.008, abs(k));
        s.albedo *= (1.0 - 0.5 * seam) * (0.86 + 0.14 * cos(k / 0.082 * 6.2831853)); s.ao = 1.0 - 0.4 * seam;
      }
      if (pa > 2.5 && pa < 3.5) { s.rough = 0.55; }
    }
    case 9u: {   // lentes (lanterna traseira, piscas): prismas finos sobre refletor, cores profundas mesmo ao sol
      s.rough = 0.38; s.coat = 0.0;
      let rib = 0.86 + 0.14 * sin(lp.y * 6.2831853 / 0.0042);
      if (pa < 1.5) {
        // lanterna traseira: faixa superior âmbar-escuro (pisca), vermelho-rubi (posição/freio) no meio, ré clara embaixo
        let v = in.uv.y; let u = in.uv.x; let br = sat(O.p0.x);
        // o albedo fica sempre escuro (ao sol não lava para rosa); o freio aceso vem só do emissivo, em vermelho puro
        var c = mix(vec3f(0.17, 0.003, 0.002), vec3f(0.2, 0.004, 0.002), br); var e = mix(0.03, 0.66, br);
        if (v > 0.66) { c = vec3f(0.19, 0.05, 0.002); e = 0.006; }
        else if (v < 0.2 && u < 0.36) { c = mix(vec3f(0.1, 0.1, 0.098), vec3f(1.0, 1.0, 0.95), sat(O.p0.y)); e = 0.004 + sat(O.p0.y) * 0.5; }   // ré: pequeno retângulo interno
        // divisórias em relevo entre as seções (horizontais) e uma vertical a 1/3 da largura: barras escuras com chanfro
        let fy = max(fwidth(v), 1e-4); let fu = max(fwidth(u), 1e-4);
        let dh = min(abs(v - 0.66), select(9.0, abs(v - 0.2), u < 0.36)); let dvv = select(9.0, abs(u - 0.36), v < 0.2);
        // moldura escura fina em volta da lente (bordas de cima, de baixo e interna)
        let vh = (0.5 - abs(v - 0.5)) ; let edge = max(sat(1.0 - (vh - 0.0) / max(0.028, fy)), sat(1.0 - u / max(0.03, fu)));
        let k = sat(max(max(sat(1.0 - dh / max(0.02, fy)), sat(1.0 - dvv / max(0.014, fu))), edge));
        // prismas: pirâmides de ~4,5 mm que dobram a normal (brilhos pontuais do sol) e dão claro/escuro por célula
        let cell = vec2f(lp.z, lp.y) / 0.0045; var pc = fract(cell) - 0.5; pc.x = 0.0;   // lente frisada: nervuras horizontais finas
        let fade = sat(1.0 - fwidth(cell.y) * 1.4);   // some antes de virar serrilhado
        let rightW = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz); let upW = normalize((O.model * vec4f(0.0, 1.0, 0.0, 0.0)).xyz);
        s.normal = normalize(s.normal + (rightW * pc.x + upW * pc.y) * 0.45 * fade * (1.0 - k));
        let prism = mix(1.0, 0.62 + 0.76 * (1.0 - 2.0 * max(abs(pc.x), abs(pc.y))), fade);
        let depth = 0.8 + 0.2 * sin(u * 7.0 + v * 2.5);   // degradê do refletor atrás da lente
        s.albedo = mix(c * prism * depth, vec3f(0.006), k); s.emissive = e * (1.0 - k) * mix(1.0, 0.8 + 0.4 * (1.0 - 2.0 * max(abs(pc.x), abs(pc.y))), fade);
        s.rough = mix(0.62, 0.8, k);   // lente pouco especular: ao sol continua vermelha/âmbar, sem lavar para rosa
      } else {
        // piscas: lente âmbar translúcida (mais escura e saturada) com o brilho do refletor por trás e verniz
// (uv.x = x + z: coordenada ao longo da frente/lateral) — frisos verticais finos e um degradê de refletor por trás
        let fl2 = 0.5 + 0.5 * sin(in.uv.x * 6.2831853 / 0.0075); let fadeP = sat(1.0 - fwidth(in.uv.x) / 0.0075 * 2.0);
        let gy = 1.0 - 0.45 * abs((lp.y - 0.693) / 0.062);
        s.albedo = in.col.rgb * vec3f(0.9, 0.62, 0.3) * mix(1.0, 0.74 + 0.4 * fl2, fadeP) * gy * (0.9 + 0.1 * rib); s.rough = 0.3; s.coat = 0.7; s.emissive = 0.03;   // lente lisa translúcida, só com frisos horizontais finos
      }
    }
    case 10u: {  // alumínio da escada
      let n = textureSample(tNoise, sLin, vec2f(lp.x * 0.7, (lp.y + lp.z) * 30.0)).r;
      s.albedo = in.col.rgb * (0.94 + 0.08 * n); s.metal = 0.55; s.rough = 0.5 + 0.1 * n;
      if (pa > 0.5) { let k = sin(lp.z * 900.0); s.rough = 0.55; s.albedo *= 0.9 + 0.1 * k; }
      else if (abs(abs(lp.z) - 0.205) > 0.0105 && lp.x > -1.97 && lp.x < 1.21) {
        // extremidade rebitada de cada degrau, visível nas faces laterais das longarinas
        let kx = (fract((lp.x + 1.78) / 0.28 + 0.5) - 0.5) * 0.28; let d = length(vec2f(kx, lp.y - 1.5236));
        let ring = smoothstep(0.0215, 0.0195, d) * smoothstep(0.0135, 0.0155, d); let core = 1.0 - smoothstep(0.012, 0.014, d);
        s.albedo *= 1.0 - 0.55 * ring - 0.2 * core; s.ao = 1.0 - 0.5 * ring;
      }
    }
    case 11u: {  // cinta de poliéster
      let w = sin((lp.z + lp.y) * 1800.0) * sin(lp.x * 1800.0);
      s.albedo = in.col.rgb * (0.9 + 0.12 * w); s.rough = 0.8;
    }
    case 12u: {  // decalque (placa / emblemas); a=2: inserto fotográfico sobre a pintura branca
      if (pa > 1.5) {
        let f = textureSample(tFoto, sLin, in.uv);
        // a foto já traz a luz da rua: tira o grosso do sombreamento dela e deixa a luz do jogo trabalhar
        let c = f.rgb; let lum = dot(c, vec3f(0.299, 0.587, 0.114));
        let ph = c / max(0.35 + 0.65 * smoothstep(0.0, 0.9, lum), 0.35) * 0.82;
        s.albedo = mix(vec3f(0.74, 0.75, 0.75), clamp(ph, vec3f(0.0), vec3f(0.95)), f.a);
        s.rough = mix(0.2, 0.22, f.a); s.coat = mix(1.0, 0.75, f.a);
        // lanterna (vermelho) acende com o freio; o resto da foto não emite
        let red = f.a * smoothstep(0.12, 0.3, c.r - max(c.g, c.b)) * step(lp.x, -1.4);
        s.emissive = red * (0.04 + 0.7 * sat(O.p0.x));
        return s;
      }
      let t = textureSample(tAtlas, sLin, in.uv);
      if (pa > 0.5 && t.a < 0.5) { discard; }
      s.albedo = t.rgb * select(0.7, 1.0, pa > 0.5); s.rough = select(0.62, 0.28, pa > 0.5); s.metal = select(0.0, 0.4, pa > 0.5); s.coat = select(0.0, 0.6, pa > 0.5);
    }
    case 13u: { s.rough = 1.0; s.ao = 0.3; s.metal = 0.9; }
    case 14u: {  // refletor do farol: cuba prateada com aparência própria (pouco dependente do céu) / bulbo
      let u = in.uv.x; let v = in.uv.y;
      // gradação: mais claro no centro (em volta do bulbo), escurecendo para as bordas e para baixo; facetas verticais em colunas
      let rightW = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz);
      let fz = sin(lp.z * 6.2831853 / 0.013); let ffade = sat(1.0 - fwidth(lp.z) / 0.013 * 2.5);
      s.normal = normalize(s.normal + rightW * fz * 0.12 * ffade);
      let rr = length(vec2f(u * 0.85, v));
      let grad = mix(1.0, 0.36, smoothstep(0.1, 1.05, rr)) * mix(0.72, 1.0, smoothstep(-1.0, 0.3, v));
      let facet = mix(1.0, 0.86 + 0.14 * fz, ffade);
      s.albedo = vec3f(0.74, 0.75, 0.77) * grad * facet; s.metal = 0.25; s.rough = 0.32; s.ao = 1.0;
      s.emissive = 0.105 * grad;   // a cuba fica na sombra da moldura: luz própria proporcional ao desenho (prateado, não azul do céu)
      if (pa > 0.5) {
        // bulbo claro (a > 0,5) e sua capa prateada na ponta (a > 1,5): discretos, sem ponto preto
        s.normal = normalize(in.nrm);
        if (pa > 1.5) { s.metal = 0.3; s.albedo = vec3f(0.5, 0.5, 0.51); s.rough = 0.35; s.emissive = 0.06; }
        else { s.metal = 0.2; s.albedo = vec3f(0.8, 0.79, 0.74); s.rough = 0.25; s.emissive = 0.09 + O.p0.z * 0.1; }
      }
    }
    case 15u: {   // espelho retrovisor: reflexo FIXO (céu / horizonte de mata / chão), escurecido — não depende do cubemap
      let g = sat((lp.y - 0.965) / 0.082);
      let ground = vec3f(0.03, 0.03, 0.032); let trees = vec3f(0.018, 0.03, 0.014); let sky = mix(vec3f(0.2, 0.25, 0.3), vec3f(0.1, 0.16, 0.26), sat((g - 0.52) / 0.48));
      var c = mix(ground, trees, smoothstep(0.36, 0.42, g)); c = mix(c, sky, smoothstep(0.5, 0.56, g));
      s.albedo = c; s.metal = 0.0; s.rough = 0.5; s.coat = 0.25; s.emissive = 0.045;
    }
    case 16u: {  // palhetas no fundo das fendas: quase pretas
      let k = fract(lp.y / select(0.0105, 0.0175, pa > 0.5));
      s.albedo = in.col.rgb * mix(0.1, 1.0, smoothstep(0.25, 0.5, k)); s.rough = 0.92; s.metal = 0.3; s.ao = mix(0.2, 0.7, smoothstep(0.25, 0.5, k));
    }
    case 17u: { s.rough = select(0.42, 0.3, pa > 0.5); s.coat = select(0.3, 0.35, pa > 0.5); }   // capacete (pintura) / viseira escura lisa, sem espelhar zebras

    case 18u: {   // VW Gol G6 branco cristal: pintura sólida com verniz + tudo o que é desenhado sobre a carroceria
      let nO = normalize((vec4f(s.normal, 0.0) * O.model).xyz);
      s.albedo = vec3f(0.74, 0.75, 0.75); s.metal = 0.0; s.rough = 0.2; s.coat = 1.0;
      if (pa > 1.5) { s.albedo = in.col.rgb; s.rough = 0.3; s.coat = 0.7; return s; }    // pinça de freio
      if (pa > 0.5) { return s; }                                                       // retrovisor, maçanetas, antena
      let x = lp.x; let y = lp.y; let az = abs(lp.z);
      var black = 0.0; var blackRough = 0.3;
      // caixas de roda e fundo: preto fosco
      let arch = min(length(vec2f(x - 1.2335, y - 0.298)), length(vec2f(x + 1.2335, y - 0.298))) - 0.356;
      let well = max(gcov(arch), (1.0 - smoothstep(0.205, 0.215, y)) * step(nO.y, 0.2));
      if (well > 0.0) { s.albedo = mix(s.albedo, vec3f(0.01), well); s.coat *= 1.0 - well; s.rough = mix(s.rough, 0.95, well); s.ao = min(s.ao, 1.0 - 0.5 * well); }
      // vidros: a borda em volta do furo vira moldura preta brilhante (o vidro cobre o resto)
      // contornos medidos nas fotos (iguais a modelo/regions.py)
      let fz = ((x - 0.545) * 0.338 + (y - 0.921) * 0.329) / 0.4717;
      let r1 = ((x + 1.053) * -0.13 + (y - 0.97) * -0.087) / 0.156; let r2 = ((x + 0.988) * -0.164 + (y - 1.261) * 0.152) / 0.2236;
      let dlo = max(gsmax(gsmax(gbelt(x) - y, y - 1.272, 0.03), gsmax(fz, gsmax(r1, r2, 0.05), 0.04), 0.04), (0.45 - abs(nO.z)) * 0.2);
      let wzf = 0.624 - 0.089 * (y - 0.975) / 0.344;
      let ws = max(gsmax(gsmax(0.235 - x, x - 0.975, 0.03), az - wzf, 0.04), (0.15 - nO.x) * 0.2 + select(0.0, 1.0, y < 0.9));
      let wzr = 0.58 - 0.05 * (y - 1.0) / 0.27;
      let rg = max(gsmax(gsmax(0.998 - y, y - 1.266, 0.03), az - wzr, 0.05), (nO.x + 0.12) * 0.2 + select(0.0, 1.0, x > -1.3));
      let gd = min(min(dlo, ws), rg);
      black = max(black, gcov(gd - 0.009));
      // grade da base do para-brisa
      black = max(black, gcov(max(max(0.975 - x, x - 1.08), max(az - 0.62, 0.3 - nO.y))));
      // aerofólio preto brilhante e teto solar
      let spo = max(1.272 - y, x + 1.31); black = max(black, gcov(spo));
      let sun = max(grr(x - 0.22, lp.z, 0.36, 0.40, 0.05), 0.7 - nO.y);
      black = max(black, gcov(sun));
      // farol: máscara escura com dois projetores redondos
      let t = clamp((az - 0.33) / 0.45, 0.0, 1.0);
      let hl = max(gsmax(gsmax(0.672 + 0.05 * t - y, y - (0.792 + 0.012 * t), 0.012), gsmax(0.335 - az, 1.66 - x, 0.02), 0.02), select(-1.0, 1.0, x < 1.5));
      let hl_off = 1.0;
      // grade superior, grade inferior e painel da placa traseira
      let gr = max(grr(lp.z, y - 0.718, 0.33, 0.05, 0.012), 1.8 - x);
      let gr_off = 1.0;
      let gl = max(grr(lp.z, y - 0.385, 0.62, 0.095, 0.03), 1.75 - x);
      let gl_off = 1.0;
      let t2 = clamp((az - 0.5) / 0.3, 0.0, 1.0);
      let tl = max(gsmax(gsmax(0.655 + 0.015 * t2 - y, y - (0.872 - 0.01 * t2), 0.012), gsmax(0.50 - az, x + 1.60, 0.02), 0.02), select(-1.0, 1.0, x > -1.4));
      let tl_off = 1.0;
      let dif = max(grr(lp.z, y - 0.385, 0.40 - 0.1 * clamp((0.47 - y) / 0.17, 0.0, 1.0), 0.085, 0.02), x + 1.82);
      let dif_off = 1.0;
      // vãos dos painéis
      let sd = gseam(lp, nO); let sw = max(fwidth(sd), 1e-5); let hw = 0.0018;
      let line = clamp((hw - sd) / sw + 0.5, 0.0, 1.0) * min(1.0, 2.0 * hw / sw);
      let halo = (1.0 - smoothstep(hw, hw + 0.006, sd)) * clamp(0.003 / sw, 0.0, 1.0);
      s.albedo *= 1.0 - 0.25 * halo; s.ao = min(s.ao, 1.0 - 0.45 * halo - 0.4 * line);
      black = max(black, line * 0.85);
      // aplica o preto brilhante (molduras, aerofólio, teto solar)
      s.albedo = mix(s.albedo, vec3f(0.008), black); s.rough = mix(s.rough, 0.12, black); s.coat = mix(s.coat, 0.9, black);
      let rightW = normalize((O.model * vec4f(0.0, 0.0, 1.0, 0.0)).xyz); let upW = normalize((O.model * vec4f(0.0, 1.0, 0.0, 0.0)).xyz);
      // farol
      { let c = gcov(hl_off);
        if (c > 0.0) {
          let zc = select(0.6, 0.45, az < 0.53); let pr = length(vec2f(az - zc, y - 0.728)); let rr = select(0.046, 0.04, az < 0.53);
          let ring = (1.0 - smoothstep(0.002, 0.006, abs(pr - rr))); let core = 1.0 - smoothstep(rr * 0.55, rr * 0.62, pr);
          let bowl = 1.0 - smoothstep(rr * 0.6, rr, pr);
          var hc = vec3f(0.035, 0.037, 0.04) * (0.8 + 0.4 * bowl) + vec3f(0.5) * ring + vec3f(0.12) * core;
          let drl = (1.0 - smoothstep(0.0, 0.004, abs(y - (0.678 + 0.05 * t)))) * step(0.4, az);
          s.albedo = mix(s.albedo, hc, c); s.metal = mix(s.metal, 0.85, c); s.rough = mix(s.rough, 0.18, c); s.coat = mix(s.coat, 0.0, c);
          s.emissive = c * (core * (0.05 + O.p0.z * 0.6) + drl * 0.25);
        } }
      // grade superior: preto brilhante com frisos horizontais
      { let c = gcov(gr_off);
        if (c > 0.0) { let k = fract((y - 0.668) / 0.025); let bar = smoothstep(0.1, 0.2, k) * (1.0 - smoothstep(0.55, 0.65, k));
          s.albedo = mix(s.albedo, vec3f(0.006 + 0.02 * bar), c); s.rough = mix(s.rough, 0.15, c); s.normal = normalize(s.normal + upW * (k - 0.5) * 0.5 * c * (1.0 - bar)); } }
      // grade inferior: colmeia preta fosca + faróis de neblina
      { let c = gcov(gl_off);
        if (c > 0.0) {
          let hp = vec2f(lp.z / 0.022, (y - 0.385) / 0.019); let hh = abs(fract(hp + vec2f(0.5 * floor(hp.y), 0.0)) - 0.5);
          let cell = smoothstep(0.32, 0.42, max(hh.x, hh.y));
          var gc = vec3f(0.02 * (1.0 - 0.7 * cell));
          let fog = length(vec2f(az - 0.56, y - 0.37)); let fogC = 1.0 - smoothstep(0.034, 0.038, fog); let pod = 1.0 - smoothstep(0.06, 0.064, fog);
          gc = mix(gc, vec3f(0.012), pod); gc = mix(gc, vec3f(0.55, 0.56, 0.58), fogC);
          s.albedo = mix(s.albedo, gc, c); s.rough = mix(s.rough, mix(0.8, 0.15, max(pod, fogC)), c); s.coat = mix(s.coat, 0.0, c); s.ao = min(s.ao, 1.0 - 0.3 * c * cell);
          s.emissive = c * fogC * 0.02; } }
      // painel escuro da placa traseira e refletores vermelhos
      { let c = gcov(dif_off); s.albedo = mix(s.albedo, vec3f(0.035, 0.037, 0.04), c); s.rough = mix(s.rough, 0.7, c); s.coat = mix(s.coat, 0.0, c); }
      { let refl = 0.0;   // refletores: vêm da foto
        s.albedo = mix(s.albedo, vec3f(0.3, 0.008, 0.006), refl); s.rough = mix(s.rough, 0.25, refl); s.emissive = s.emissive + refl * 0.02; }
      // brake-light do aerofólio
      { let c3 = gcov(max(max(az - 0.13, abs(y - 1.292) - 0.008), x + 1.4)) * step(nO.y, 0.2);
        s.albedo = mix(s.albedo, vec3f(0.25, 0.01, 0.01), c3); s.emissive = s.emissive + c3 * (0.04 + 0.9 * sat(O.p0.x)); }
      // lanterna: lente fumê com o desenho de LED vermelho (contorno + "C" interno); acende no freio, luz de ré embaixo
      { let c = gcov(tl_off);
        if (c > 0.0) {
          let br = sat(O.p0.x);
          let ring = gcov(abs(tl + 0.016) - 0.0045);
          let u = (az - 0.5) / 0.32; let v = (y - 0.655) / 0.22;
          let cshape = gcov(abs(grr(u - 0.62, v - 0.5, 0.26, 0.2, 0.18)) - 0.035) * step(u, 0.85);
          let led = max(ring, cshape);
          let rev = gcov(grr(u - 0.25, v - 0.28, 0.13, 0.1, 0.05));
          var tc = vec3f(0.03, 0.004, 0.004); tc = mix(tc, vec3f(0.35, 0.01, 0.008), led); tc = mix(tc, vec3f(0.06), rev * sat(O.p0.y + 0.3));
          s.albedo = mix(s.albedo, tc, c); s.rough = mix(s.rough, 0.15, c); s.coat = mix(s.coat, 0.0, c); s.metal = mix(s.metal, 0.3, c);
          s.emissive = s.emissive + c * (led * (0.06 + 0.8 * br) + rev * sat(O.p0.y) * 0.6);
        } }
    }
    case 20u: { // materiais e mapas exportados do Blender
      let color = textureSample(tFoto, sLin, in.uv);
      let flags = u32(round(pa));
      s.albedo = color.rgb;
      s.rough = max(0.07, f32(flags & 15u) / 15.0);
      s.metal = f32(flags >> 4u) / 15.0;
      s.coat = select(0.0, 0.35, s.rough < 0.4);
      let mapped = pow(textureSample(tFoto, sLin, in.uv + vec2f(0.0, 0.5)).rgb, vec3f(1.0 / 2.2)) * 2.0 - 1.0;
      let dp1 = dpdx(in.wpos); let dp2 = dpdy(in.wpos);
      let uv1 = dpdx(in.uv); let uv2 = dpdy(in.uv);
      let a = cross(dp2, s.normal); let b = cross(s.normal, dp1);
      let tangent = a * uv1.x + b * uv2.x;
      let bitangent = a * uv1.y + b * uv2.y;
      let inv = inverseSqrt(max(max(dot(tangent, tangent), dot(bitangent, bitangent)), 1e-20));
      let mappedNormal = tangent * inv * mapped.x + bitangent * inv * mapped.y + s.normal * mapped.z;
      s.normal = normalize(mix(s.normal, mappedNormal, 0.7));
      return s;
    }
    case 21u: { // cor sólida do Blender, incluindo a faixa preta do aerofólio
      let flags = u32(round(pa));
      s.rough = max(0.07, f32(flags & 15u) / 15.0);
      s.metal = f32(flags >> 4u) / 15.0;
      s.coat = select(0.0, 0.3, s.rough < 0.4);
      return s;
    }
    case 23u: { // faixa cristal: luz de ré branca, separada da luz de freio vermelha
      let reverse = sat(O.p0.y);
      s.albedo = mix(vec3f(0.12, 0.13, 0.14), vec3f(0.95, 0.97, 1.0), reverse);
      s.rough = 0.24; s.metal = 0.0; s.coat = 0.25;
      s.emissive = reverse * 0.9;
      return s;
    }
    case 22u: { // segmentos vermelhos e luz de freio
      s.rough = 0.24; s.coat = 0.25;
      s.emissive = 0.04 + 0.65 * sat(O.p0.x);
      return s;
    }
    case 19u: {   // roda de liga: face diamantada (a=0), grafite (a=1), disco de borrão (a=2), miolo com emblema VW (a=3)
      let r = length(lp.xy);
      if (pa < 0.5) {
        let ang = atan2(lp.y, lp.x); let brush = 0.5 + 0.5 * sin(r * 2200.0);
        s.albedo = vec3f(0.74, 0.75, 0.76) * (0.95 + 0.05 * brush); s.metal = 0.95; s.rough = 0.2 + 0.05 * brush; s.coat = 0.4;
      } else if (pa < 1.5) {
        s.albedo = in.col.rgb; s.metal = 0.7; s.rough = 0.35; s.coat = 0.5;
      } else if (pa < 2.5) {
        let cov = smoothstep(9.0, 34.0, O.p0.x);
        if (ign(in.pos.xy, F.misc.y) >= cov) { discard; }
        let rim = 1.0 - smoothstep(0.18, 0.2, r);
        s.albedo = mix(vec3f(0.3, 0.31, 0.32), vec3f(0.12), 1.0 - smoothstep(0.06, 0.09, r)) * mix(0.8, 1.0, rim); s.metal = 0.8; s.rough = 0.35; s.coat = 0.3;
        return s;
      } else {
        // emblema VW em relevo cromado sobre fundo preto
        let p = lp.xy / 0.03; let rr = length(p);
        let ringv = 1.0 - smoothstep(0.02, 0.07, abs(rr - 0.86));
        let v1 = min(gseg(p, vec2f(-0.46, 0.72), vec2f(0.0, -0.1)), gseg(p, vec2f(0.46, 0.72), vec2f(0.0, -0.1)));
        let w1 = min(min(gseg(p, vec2f(-0.86, 0.32), vec2f(-0.44, -0.8)), gseg(p, vec2f(-0.44, -0.8), vec2f(0.0, 0.02))), min(gseg(p, vec2f(0.0, 0.02), vec2f(0.44, -0.8)), gseg(p, vec2f(0.44, -0.8), vec2f(0.86, 0.32))));
        let logo = max(ringv, 1.0 - smoothstep(0.05, 0.1, min(v1, w1))) * step(rr, 0.95);
        s.albedo = mix(vec3f(0.02), vec3f(0.85), logo); s.metal = mix(0.2, 1.0, logo); s.rough = mix(0.3, 0.12, logo);
      }
    }
    default: {}
  }
  return s;
}
