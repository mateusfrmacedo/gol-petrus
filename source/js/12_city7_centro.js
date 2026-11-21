// Centro de Nova Aliança, segunda passada (20/nov/2026): marcos vistos no Street View em volta da Praça Padre João Nolte.
// Arquivo do Claude (ver COORDENACAO.md). Ganchos de uma linha: centroLayout em 12_city1_core.js; centroHouse, centroPoi e
// centroMarcos em 12_city3_mesh.js; centroFotos em 56_fotos.js.

// Secretaria da Educação (R. Gotardi, 220): paredes amarelas com barrado azul da prefeitura, não brancas (Street View out/2024)
if (CITY_SHOP_STYLE['SECRETARIA DA EDUCAÇÃO']) Object.assign(CITY_SHOP_STYLE['SECRETARIA DA EDUCAÇÃO'], { col: [0.96, 0.83, 0.4] });

// lotes que viram construções próprias: o lote mais próximo do ponto, na rua indicada
const CENTRO_LOTES = [
  // galpão da R. Gotardi, 266 (lado sul, perto da 25 de Março): fachada de tijolo laranja, três portas de enrolar brancas,
  // painel branco no meio e telhado em arco de telha metálica. Foto de -21.0170462, -49.4983303 olhando a 168 graus.
  { kind: 'galpao', ll: [-21.0171340, -49.4983100], rua: /Gotardi/ },
];
// torres de telefonia, posição cruzando as direções vistas de dois pontos do Street View (R. Rui Barbosa, 130 e R. 25 de Março, 334)
const CENTRO_TORRES = [
  { xz: [-32.4, -71.4], h: 40, base: 3.0, cores: true },       // treliçada vermelha e branca
  { xz: [-10.9, -91.3], h: 31, base: 2.2, cores: false },                                                    // treliçada galvanizada
];
const CENTRO = {};

function centroLayout(houses) {
  const C = CITY; CENTRO.lotes = [];
  for (const L of CENTRO_LOTES) {
    const [x, z] = llToXZ(...L.ll); let best = null, bd = 25 * 25;
    for (const h of houses) { if (h.borghiRef || h.centroRef || h.shop) continue; if (L.rua && !L.rua.test(C.chains[h.ch].cls.name)) continue; const d = (h.x - x) ** 2 + (h.z - z) ** 2; if (d < bd) { bd = d; best = h; } }
    if (!best) continue;
    best.centroRef = L.kind; best.wall = false; best.two = false; best.comm = true; CENTRO.lotes.push(best);
  }
  // casas em cima da base das torres saem (a torre fica num terreno cercado de 7 x 7 m)
  const keep = houses.filter(h => h.borghiRef || h.centroRef || !CENTRO_TORRES.some(T => {
    const dx = T.xz[0] - h.x, dz = T.xz[1] - h.z, a = Math.abs(dx * h.nx + dz * h.nz), b = Math.abs(-dx * h.nz + dz * h.nx);
    return a < h.d / 2 + (h.wall ? h.set : 0) + 4 && b < h.w / 2 + 4; }));
  const keep2 = centroEscolaLayout(keep);
  CENTRO.removidas = houses.length - keep2.length; houses.length = 0; houses.push(...keep2);
}

// casa de referência no lote: quadro local com x da rua para dentro do lote e z ao longo da fachada
function centroHouse(mb, h) {
  if (h.centroRef !== 'galpao') return false;
  const X = h.d / 2, Z = h.w / 2, front = [h.x - h.nx * X, h.z - h.nz * X], y = Math.max(h.yr, hfAt(...front)) + 0.08, H = 6.2;
  mb.push(m4basis(m4(), h.nx, 0, h.nz, 0, 1, 0, h.fx, 0, h.fz, h.x, y, h.z));
  // paredes laterais e do fundo em reboco cinza; fachada em tijolo aparente laranja
  mb.mat(19, 200).color(0.78, 0.78, 0.76, 1); cWalls(mb, h.d, h.w, -1.5, H - 1.2);
  mb.mat(22).color(0.82, 0.42, 0.2, 1); mb.box(-X - 0.05, (H - 1.5) / 2 - 0.25, 0, 0.12, H - 1.0, h.w + 0.1);
  // três portas de enrolar brancas, verga de concreto
  const n = 3, gap = 0.55, dw = (h.w - gap * (n + 1)) / n;
  for (let i = 0; i < n; i++) { const zc = -Z + gap + dw / 2 + i * (dw + gap); cOpening(mb, -X - 0.12, -1, zc, dw, 0, 3.0, 13, [0.93, 0.93, 0.91]); mb.mat(3).color(0.86, 0.86, 0.84, 1); mb.box(-X - 0.14, 3.12, zc, 0.06, 0.24, dw + 0.3); }
  // painel branco central com frisos horizontais (ali vai o nome do galpão)
  mb.mat(19, 230).color(0.95, 0.95, 0.93, 1); mb.box(-X - 0.16, 4.25, 0, 0.1, 1.5, h.w * 0.45);
  mb.mat(19, 200).color(0.82, 0.82, 0.8, 1); for (const yy of [3.75, 4.25, 4.75]) mb.box(-X - 0.22, yy, 0, 0.03, 0.06, h.w * 0.45);
  // oitão em arco na frente e telhado de telha metálica curvo, em gomos
  const seg = 10, rise = 1.8, yb = H - 1.2;
  for (let i = 0; i < seg; i++) {
    const a0 = -Z + h.w * i / seg, a1 = -Z + h.w * (i + 1) / seg, f = t => yb + rise * (1 - ((t / Z) ** 2)), y0 = f(a0), y1 = f(a1);
    mb.mat(22).color(0.82, 0.42, 0.2, 1); mb.push(m4basis(m4(), 1, 0, 0, 0, 1, 0, 0, 0, 1, -X - 0.05, (Math.min(y0, y1) + yb) / 2, (a0 + a1) / 2)); mb.box(0, 0, 0, 0.12, Math.min(y0, y1) - yb + 0.02, a1 - a0 + 0.01); mb.pop();
    const dz = a1 - a0, dy = y1 - y0, l = Math.hypot(dz, dy);
    mb.push(m4basis(m4(), 1, 0, 0, 0, dz / l, -dy / l, 0, dy / l, dz / l, 0, (y0 + y1) / 2 + 0.06, (a0 + a1) / 2));
    mb.mat(9).color(0.66, 0.67, 0.66, 1); mb.box(0, 0, 0, h.d + 0.5, 0.06, l + 0.02); mb.pop();
  }
  mb.pop();
  return true;
}

// Escola Municipal Abdo Ayruth (R. Rui Barbosa, 320): o ponto do OSM fica 40 m a sudoeste, de frente para outra rua. Pelo
// Street View (dez/2023, de -21.0172503, -49.4974349 olhando a 257 graus) ela fica no lado oeste da Rui Barbosa, atrás de um
// muro comprido da prefeitura: barrado azul, faixa amarela e parte de cima branca, portão de grade no meio.
const CENTRO_ESCOLA = { pano: [-21.0172503, -49.4974349], rumo: 257, d: 12, w: 34, recuo: 2.4 };
function centroEscolaLayout(houses) {
  const C = CITY, E = CENTRO_ESCOLA, [px, pz] = llToXZ(...E.pano), a = E.rumo * PI / 180, gx = px + Math.sin(a) * 14, gz = pz - Math.cos(a) * 14;
  const r = nearestChain(gx, gz, /Rui Barbosa/); if (!r) return houses;
  let nx = -r.tz, nz = r.tx; if ((gx - r.x) * nx + (gz - r.z) * nz < 0) { nx = -nx; nz = -nz; }
  const front = r.ch.hw + C.SW + E.recuo, cx = r.x + nx * (front + E.d / 2), cz = r.z + nz * (front + E.d / 2);
  CENTRO.escola = { x: cx, z: cz, nx, nz };
  const bx = cx - nx * E.recuo / 2, bz = cz - nz * E.recuo / 2, bd = E.d + E.recuo + 1, bw = E.w + 2;
  return houses.filter(h => { if (h.borghiRef || h.centroRef) return true;
    const A = { d: h.d + (h.wall ? h.set : 0), w: h.w };
    for (const [x, z] of [[h.nx, h.nz], [-h.nz, h.nx], [nx, nz], [-nz, nx]]) {
      const ra = A.d / 2 * Math.abs(h.nx * x + h.nz * z) + A.w / 2 * Math.abs(-h.nz * x + h.nx * z), rb = bd / 2 * Math.abs(nx * x + nz * z) + bw / 2 * Math.abs(-nz * x + nx * z);
      if (Math.abs((h.x - bx) * x + (h.z - bz) * z) >= ra + rb) return true; }
    return false; });
}
function centroPoi(mb, p) {
  if (!/Abdo Ayruth/.test(p.name) || !CENTRO.escola) return false;
  const E = CENTRO_ESCOLA, S = CENTRO.escola, yaw = Math.atan2(S.nz, S.nx), c = Math.cos(yaw), s = Math.sin(yaw), x = S.x, z = S.z;
  cityBuilding(mb, x, z, yaw, E.d, E.w, 1, [0.95, 0.94, 0.9], { gable: false, tile: true, sign: 'E. M. ABDO AYRUTH', bg: '#f4f4f0', fg: '#1a4d8f' });
  const y = hfAt(x, z) + 0.15, W = E.w + 2, fx = -E.d / 2 - E.recuo;
  mb.push(m4basis(m4(), c, 0, s, 0, 1, 0, -s, 0, c, x, y, z));
  const blue = [0.12, 0.36, 0.78], yellow = [0.95, 0.78, 0.18], white = [0.95, 0.95, 0.93];
  for (const [z0, z1] of [[-W / 2, -1.5], [1.5, W / 2]]) {
    const L = z1 - z0, zm = (z0 + z1) / 2, g = mbGroundY(mb, fx, zm);
    mb.mat(19, 170).color(...blue, 1); mb.box(fx, g + 0.55, zm, 0.22, 1.5, L);
    mb.mat(19, 170).color(...yellow, 1); mb.box(fx, g + 1.38, zm, 0.23, 0.16, L);
    mb.mat(19, 170).color(...white, 1); mb.box(fx, g + 1.98, zm, 0.22, 1.04, L);
    mbColBox(mb, fx, zm, 0.15, L / 2);
  }
  mb.mat(2, 140, 200).color(0.22, 0.24, 0.27, 1); for (let b = -1.45; b < 1.5; b += 0.12) { const g = mbGroundY(mb, fx, b); mb.box(fx, g + 1.1, b, 0.03, 2.2, 0.03); }   // portão de grade
  mb.pop();
  return true;
}

// torre treliçada de seção triangular: três montantes inclinados, travamento em X, antenas painel e para-raios no topo
function centroTorre(mb, T) {
  const C = CITY, [cx, cz] = T.xz, y0 = hfAt(cx, cz) - 0.3, H = T.h, r0 = T.base, r1 = 0.45;
  const leg = k => [Math.cos(k * 2.0944 + 0.3), Math.sin(k * 2.0944 + 0.3)];
  const at = (k, t) => { const [a, b] = leg(k), r = r0 + (r1 - r0) * t; return [cx + a * r, y0 + H * t, cz + b * r]; };
  const bar = (p, q, w) => { const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], l = Math.hypot(dx, dy, dz), ux = dx / l, uy = dy / l, uz = dz / l;
    let ax = -uz, az = ux, al = Math.hypot(ax, az); if (al < 1e-3) { ax = 1; az = 0; al = 1; } ax /= al; az /= al; const bx = uy * az, by = uz * ax - ux * az, bz = -uy * ax;
    mb.push(m4basis(m4(), ax, 0, az, ux, uy, uz, bx, by, bz, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2)); mb.box(0, 0, 0, w, l, w); mb.pop(); };
  const N = Math.round(H / 2.5), red = [0.78, 0.12, 0.1], wh = [0.92, 0.92, 0.9], galv = [0.62, 0.64, 0.66];
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, band = T.cores ? (Math.floor(i / (N / 7)) % 2 ? wh : red) : galv;
    mb.mat(2, 120, 200).color(...band, 1);
    for (let k = 0; k < 3; k++) {
      bar(at(k, t0), at(k, t1), 0.14 - 0.06 * t0);
      bar(at(k, t1), at((k + 1) % 3, t1), 0.05); bar(at(k, t0), at((k + 1) % 3, t1), 0.04); bar(at((k + 1) % 3, t0), at(k, t1), 0.04);
    }
  }
  // plataforma, antenas painel em três setores e para-raios
  const top = y0 + H; mb.mat(2, 120, 200).color(...galv, 1);
  for (let k = 0; k < 3; k++) { const [a, b] = leg(k), r = r1 + 0.6; mb.push(m4basis(m4(), -b, 0, a, 0, 1, 0, -a, 0, -b, cx + a * r, top - 1.4, cz + b * r)); mb.mat(2, 150, 200).color(0.9, 0.9, 0.88, 1); mb.box(0, 0, 0, 0.32, 1.6, 0.12); mb.box(0.45, 0, 0, 0.32, 1.6, 0.12); mb.pop(); }
  mb.mat(2, 120, 200).color(...galv, 1); mb.cyl(cx, top - 2.3, cz, r1 + 0.8, top - 2.2, r1 + 0.8, 12, true, true); mb.cyl(cx, top, cz, 0.04, top + 3, 0.02, 5, false, true);
  if (T.cores) { mb.mat(25).color(1, 0.12, 0.08, 1); mb.cyl(cx, top + 0.2, cz, 0.12, top + 0.45, 0.12, 8, true, true); }   // luz de balizamento acesa
  C.addCircle(cx, cz, r0 + 0.3);
  // terreno cercado de 7 x 7 m com muro baixo e alambrado
  const S = 3.5; mb.mat(19, 200).color(0.8, 0.79, 0.74, 1);
  for (const [a, b, w, d] of [[-S, 0, 0.15, 2 * S], [S, 0, 0.15, 2 * S], [0, -S, 2 * S, 0.15], [0, S, 2 * S, 0.15]]) {
    const x = cx + a, z = cz + b, g = cityGroundY(x, z); mb.box(x, g + 1.0, z, w, 2.0, d); C.addBox({ x, z, ux: 1, uz: 0, hd: w / 2, hw: d / 2 });
  }
}
function centroMarcos(mb) { if (!CITY.on) return; for (const T of CENTRO_TORRES) centroTorre(mb, T); }

// câmeras do modo ?fotos=1 no ponto e na direção das fotos de referência do Street View
const CENTRO_FOTOS = [
  ['Centro · galpão da R. Gotardi', -21.0170462, -49.4983303, 168],
  ['Centro · Escola Abdo Ayruth', -21.0172503, -49.4974349, 257],
  ['Centro · torres (R. Rui Barbosa, 130)', -21.0154677, -49.4978944, 250],
  ['Centro · Secretaria da Educação', -21.0170462, -49.4983303, 348],
];
function centroFotos(L) {
  for (const [nome, lat, lon, hd] of CENTRO_FOTOS) {
    const [x, z] = llToXZ(lat, lon), a = hd * PI / 180, tx = x + Math.sin(a) * 20, tz = z - Math.cos(a) * 20;
    L.push({ nome, eye: [x, terrainH(x, z) + 2.5, z], alvo: [tx, terrainH(tx, tz) + 3.2, tz], fov: 1.2 });
  }
}
