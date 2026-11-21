// Setor Sul de Nova Aliança (ao sul da Rua Jorge Galvão até a Av. Francisco Pereira dos Santos e Rua Egilio Darim).
// Levantamento de 20/nov/2026: posição pelo ponto do Google Maps, fachada pelo Street View (set/2024 e dez/2023).
// Arquivo do Claude (ver COORDENACAO.md). Ganchos: 12_city3_mesh.js chama sulPoi() no laço dos pontos públicos e sulMarcos().

// comércios do Sul: nome, lat, lon, fundo do letreiro, letra, rua (para cair no lote certo)
const SUL_SHOPS = [
  ['LANCHONETE DO TIO', -21.0184414, -49.4999280, '#2e7d32', '#ffffff', 'Rua Jorge Galvão'],
  ['EXPRESSO LANCHES', -21.0200287, -49.4986804, '#e65100', '#ffffff', 'Rua Jorge Tibiriça'],
  ['LARISSA TRIGOLO STUDIO', -21.0199683, -49.4986245, '#f3e5f5', '#6a1b9a', 'Rua Sete de Setembro'],
  ['BAR DO ROLO', -21.0194374, -49.5000036, '#4e342e', '#ffffff'],
  ['BAR UFC', -21.0201006, -49.5022252, '#1b1b1b', '#ffd54f', 'Rua Etore Zafalon'],
  ['CENTER CAR ALIANÇA', -21.0193069, -49.5023895, '#0d47a1', '#ffffff', 'Rua Felicio Helu'],
  ['GMS AUTOMOTIVA', -21.0207140, -49.5011859, '#212121', '#ef5350', 'Rua Hene Ayruth'],
  ['PLATO CAR EMBREAGEM', -21.0209712, -49.5017633, '#c62828', '#ffffff', 'Rua Manoel Pereira dos Santos'],
  ['OMNIPACK', -21.0203855, -49.4995141, '#37474f', '#ffffff', 'Rua São Paulo'],
  ['SACOLÃO DO MINEIRINHO', -21.0180393, -49.4989792, '#388e3c', '#fff59d'],
  ['ASSEMBLEIA DE DEUS', -21.0192600, -49.5011988, '#f4f4f0', '#1a237e', 'Rua Rio Preto'],
  ['AVENIDA MATERIAIS', -21.0182527, -49.5016184, '#1565c0', '#ffeb3b'],
  ['LOLOS BAR E ESPETINHO', -21.0181032, -49.5016087, '#3e2723', '#ffb74d'],
];
const SUL_SHOP_STYLE = {
  // parede verde-oliva lisa com antenas parabólicas, toldo verde na frente
  'LANCHONETE DO TIO': { kind: 'simples', col: [0.58, 0.6, 0.38], toldo: [0.16, 0.5, 0.36], sub: 'LANCHES', signH: 0.9 },
  'ASSEMBLEIA DE DEUS': { kind: 'simples', col: [0.94, 0.93, 0.9], sub: 'MINISTÉRIO DO BELÉM', signH: 0.85 },
  'PLATO CAR EMBREAGEM': { kind: 'simples', col: [0.9, 0.9, 0.88], sub: 'EMBREAGEM · MECÂNICA', signH: 0.9 },
  'AVENIDA MATERIAIS': { kind: 'simples', col: [0.92, 0.9, 0.84], toldo: [0.13, 0.4, 0.75], sub: 'MATERIAIS PARA CONSTRUÇÃO', signH: 1.0 },
};
for (const s of SUL_SHOPS) CITY_SHOPS.push(s);
Object.assign(CITY_SHOP_STYLE, SUL_SHOP_STYLE);

// UBS (R. Felício Helú, 105): o ponto do OSM fica 30 m a oeste e voltado para outra rua. Posição e frente pela foto do
// Street View (dez/2023), tirada de -21.0192345, -49.5023267 olhando a 343 graus: térrea branca de frente para a Felício Helú.
const SUL = {};
const SUL_UBS = { pano: [-21.0192345, -49.5023267], rumo: 343, d: 12, w: 18, recuo: 3.2 };
// chamado em cityBuild antes da grade de colisão: fixa a UBS e as caixas de água e tira as casas genéricas desses lotes
function sulLayout(houses) {
  const C = CITY, U = SUL_UBS, [px, pz] = llToXZ(...U.pano), a = U.rumo * PI / 180, gx = px + Math.sin(a) * 12, gz = pz - Math.cos(a) * 12;
  const r = nearestChain(gx, gz, /Felicio Helu/); if (!r) return;
  let nx = -r.tz, nz = r.tx; if ((gx - r.x) * nx + (gz - r.z) * nz < 0) { nx = -nx; nz = -nz; }   // n: da rua para dentro do lote
  const front = r.ch.hw + C.SW + U.recuo, cx = r.x + nx * (front + U.d / 2), cz = r.z + nz * (front + U.d / 2);
  SUL.ubs = { x: cx, z: cz, nx, nz, yr: r.ch.y[0] };
  const [kx, kz] = llToXZ(...SUL_CAIXAS_LL);
  const areas = [{ x: cx - nx * U.recuo / 2, z: cz - nz * U.recuo / 2, nx, nz, d: U.d + U.recuo + 1, w: U.w + 3 }, { x: kx, z: kz, nx: 1, nz: 0, d: 17, w: 17 }];
  const hit = (h, b) => { const A = { x: h.x, z: h.z, nx: h.nx, nz: h.nz, d: h.d + (h.wall ? h.set : 0), w: h.w };
    for (const [x, z] of [[A.nx, A.nz], [-A.nz, A.nx], [b.nx, b.nz], [-b.nz, b.nx]]) {
      const ra = A.d / 2 * Math.abs(A.nx * x + A.nz * z) + A.w / 2 * Math.abs(-A.nz * x + A.nx * z), rb = b.d / 2 * Math.abs(b.nx * x + b.nz * z) + b.w / 2 * Math.abs(-b.nz * x + b.nx * z);
      if (Math.abs((A.x - b.x) * x + (A.z - b.z) * z) >= ra + rb) return false; }
    return true; };
  const keep = houses.filter(h => h.borghiRef || !areas.some(b => hit(h, b)));
  SUL.removidas = houses.length - keep.length; houses.length = 0; houses.push(...keep);
}

// construções públicas do Sul com fachada própria. Devolve true quando desenhou (o laço genérico pula o ponto).
// UBS: barrado azul até 1,3 m com faixa amarela, janelas com grade, mureta azul com grade branca, telhado de telha em quatro águas
function sulPoi(mb, p) {
  if (p.tags.am !== 'clinic' || !/Saúde/.test(p.name) || !SUL.ubs) return false;
  const C = CITY, { d, w } = SUL_UBS, H = 3.3, U = SUL.ubs, x = U.x, z = U.z, y = hfAt(x, z) + 0.15;   // eixo local +X: da rua para os fundos
  const yaw = Math.atan2(U.nz, U.nx); const cy = Math.cos(yaw), sy = Math.sin(yaw);
  let ymin = 1e9; for (const [a, b] of [[-d / 2, -w / 2], [d / 2, -w / 2], [d / 2, w / 2], [-d / 2, w / 2]]) ymin = Math.min(ymin, hfAt(x + cy * a - sy * b, z + sy * a + cy * b));
  const blue = [0.12, 0.36, 0.78], yellow = [0.95, 0.78, 0.18], white = [0.95, 0.95, 0.93];
  mb.push(m4basis(m4(), cy, 0, sy, 0, 1, 0, -sy, 0, cy, x, y, z));
  mb.mat(19, 170).color(...white, 1); cWalls(mb, d, w, 1.45, H);
  mb.mat(19, 170).color(...blue, 1); cWalls(mb, d + 0.02, w + 0.02, ymin - y - 0.6, 1.3);
  mb.mat(19, 170).color(...yellow, 1); cWalls(mb, d + 0.03, w + 0.03, 1.3, 1.45);
  for (let zz = -w / 2 + 2.2; zz <= w / 2 - 1.8; zz += 3.2) if (Math.abs(zz) > 1.6) { cOpening(mb, -d / 2, -1, zz, 1.5, 1.5, 2.5, 21, white); cOpening(mb, d / 2, 1, zz, 1.5, 1.5, 2.5, 21, white); }
  cOpening(mb, -d / 2, -1, 0, 2.0, 0, 2.6, 5, [1, 1, 1]);
  mb.mat(20).color(0.62, 0.3, 0.17, 1); cRoof(mb, d, w, H, 2.2, 0.6, false); mb.mat(19, 180).color(...white, 1); cSoffit(mb, d, w, H, 0.6);
  // mureta azul com grade branca no alinhamento da calçada, portão aberto no meio
  const fx = -d / 2 - SUL_UBS.recuo + 0.15;
  for (const [z0, z1] of [[-w / 2 - 1, -1.6], [1.6, w / 2 + 1]]) {
    const L = z1 - z0, zm = (z0 + z1) / 2, g = mbGroundY(mb, fx, zm);
    mb.mat(19, 170).color(...blue, 1); mb.box(fx, g + 0.4, zm, 0.22, 0.8, L);
    mb.mat(19, 170).color(...yellow, 1); mb.box(fx, g + 0.82, zm, 0.24, 0.05, L);
    mb.mat(2, 140, 200).color(...white, 1); mb.box(fx, g + 2.0, zm, 0.05, 0.05, L); mb.box(fx, g + 0.9, zm, 0.05, 0.05, L);
    for (let b = z0 + 0.12; b < z1; b += 0.14) mb.box(fx, g + 1.45, b, 0.025, 1.1, 0.025);
    mbColBox(mb, fx, zm, 0.15, L / 2);
  }
  mb.pop();
  const q = (a, b) => [x + cy * a - sy * b, z + sy * a + cy * b], c0 = q(-d / 2 - 0.06, -3.2), c1 = q(-d / 2 - 0.06, 3.2);
  C.signs.push({ name: 'UBS NOVA ALIANÇA', sub: 'UNIDADE BÁSICA DE SAÚDE', bg: '#f4f4f0', fg: '#0d47a1', x: c0[0], y: y + 2.4, z: c0[1], rx: c1[0] - c0[0], rz: c1[1] - c0[1], h: 0.85, nx: -cy, nz: -sy });
  C.addBox({ x, z, ux: cy, uz: sy, hd: d / 2, hw: w / 2 });
  return true;
}

// marcos do Sul que não são lotes: as duas caixas d'água de concreto da Sabesp na esquina da Rua 13 de Maio com a Rio Preto
// (Street View de set/2024, 490 R. Treze de Maio: dois cilindros brancos de ~15 m num terreno de terra vermelha com alambrado)
const SUL_CAIXAS_LL = [-21.019205, -49.500905];
function sulMarcos(mb) {
  const C = CITY; if (!C.on) return;
  const [cx, cz] = llToXZ(...SUL_CAIXAS_LL);
  const f = cityFaceRoad(cx, cz), ux = Math.cos(f.ang), uz = Math.sin(f.ang), vx = -uz, vz = ux;   // u: do lote para a via
  const base = hfAt(cx, cz), concrete = [0.9, 0.9, 0.87];
  for (const [k, r, h] of [[-3.2, 2.3, 15.5], [3.0, 2.0, 13.2]]) {
    const x = cx + vx * k, z = cz + vz * k, y = Math.min(hfAt(x, z), base) - 0.3;
    mb.mat(3, 220).color(...concrete, 1); mb.cyl(x, y, z, r, y + h + 0.3, r, 20, false, true);
    mb.mat(3, 220).color(0.82, 0.82, 0.8, 1); mb.cyl(x, y + h + 0.3, z, r + 0.12, y + h + 0.6, r + 0.12, 20, true, true);
    mb.mat(3, 220).color(0.6, 0.6, 0.58, 1); mb.cyl(x, y + 0.3, z, r + 0.02, y + 1.0, r + 0.02, 20, false, false);   // mancha de terra na base
    // escada de marinheiro do lado da rua
    const lx = x + ux * (r + 0.18), lz = z + uz * (r + 0.18);
    mb.mat(2, 140, 200).color(0.45, 0.46, 0.48, 1);
    for (const e of [-0.22, 0.22]) mb.cyl(lx + vx * e, y + 1.2, lz + vz * e, 0.025, y + h + 0.9, 0.025, 5, false, false);
    for (let t = y + 1.5; t < y + h + 0.6; t += 0.35) { mb.push(m4basis(m4(), vx, 0, vz, 0, 1, 0, -ux, 0, -uz, lx, t, lz)); mb.box(0, 0, 0, 0.46, 0.03, 0.03); mb.pop(); }
    mb.mat(2, 140, 200).color(0.45, 0.46, 0.48, 1); mb.cyl(x, y + h + 0.6, z, r + 0.1, y + h + 1.5, r + 0.1, 20, false, false);   // guarda-corpo do topo (aro)
    C.addCircle(x, z, r);
  }
  // alambrado em volta do terreno (16 x 16 m), postes a cada 2,5 m
  const S = 8, cor = [0.5, 0.52, 0.53];
  for (const [a0, b0, a1, b1] of [[-S, -S, -S, S], [-S, S, S, S], [S, S, S, -S], [S, -S, -S, -S]]) {
    const L = Math.hypot(a1 - a0, b1 - b0), n = Math.ceil(L / 2.5);
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = a0 + (a1 - a0) * t, b = b0 + (b1 - b0) * t, x = cx + ux * a + vx * b, z = cz + uz * a + vz * b;
      _cq[0] = x; _cq[1] = z; cityRasterQ(_cq); if (_cq[9] < C.SW + 0.2) continue;   // não invade calçada nem rua
      const g = cityGroundY(x, z); mb.mat(2, 140, 200).color(...cor, 1); mb.cyl(x, g - 0.2, z, 0.035, g + 1.9, 0.035, 6, false, true);
      if (i < n) { const x2 = cx + ux * (a0 + (a1 - a0) * (i + 1) / n) + vx * (b0 + (b1 - b0) * (i + 1) / n), z2 = cz + uz * (a0 + (a1 - a0) * (i + 1) / n) + vz * (b0 + (b1 - b0) * (i + 1) / n), dx = x2 - x, dz = z2 - z, l = Math.hypot(dx, dz);
        mb.push(m4basis(m4(), dx / l, 0, dz / l, 0, 1, 0, -dz / l, 0, dx / l, (x + x2) / 2, g, (z + z2) / 2));
        mb.mat(2, 140, 200).color(...cor, 1); for (const h of [0.15, 0.6, 1.05, 1.5, 1.85]) mb.box(0, h, 0, l, 0.018, 0.018);   // fios do alambrado
        for (let t = -l / 2 + 0.3; t < l / 2; t += 0.3) { mb.push(m4basis(m4(), 0.7071, 0.7071, 0, -0.7071, 0.7071, 0, 0, 0, 1, t, 1.0, 0)); mb.box(0, 0, 0, 2.5, 0.008, 0.008); mb.pop(); }   // malha em losango
        mb.pop();
        C.addBox({ x: (x + x2) / 2, z: (z + z2) / 2, ux: dx / l, uz: dz / l, hd: l / 2, hw: 0.08 }); }
    }
  }
}
// piso sem grama nem árvores no terreno das caixas d'água (chamado por cityPave)
function sulPave() { const [cx, cz] = llToXZ(...SUL_CAIXAS_LL); CITY.pave.push(cx, cz, 9); }

// câmeras do modo ?fotos=1 no mesmo ponto e direção das fotos do Street View usadas como referência
const SUL_FOTOS = [
  ['Sul · UBS (R. Felício Helú, 105)', -21.0192345, -49.5023267, 343],
  ['Sul · caixas de água (R. 13 de Maio)', -21.0192821, -49.5011343, 98],
  ['Sul · Lanchonete do Tio (R. Jorge Galvão)', -21.0183070, -49.4999281, 167],
];
function sulFotos(L) {
  for (const [nome, lat, lon, hd] of SUL_FOTOS) {
    const [x, z] = llToXZ(lat, lon), a = hd * PI / 180, tx = x + Math.sin(a) * 20, tz = z - Math.cos(a) * 20;
    L.push({ nome, eye: [x, terrainH(x, z) + 2.5, z], alvo: [tx, terrainH(tx, tz) + 2.6, tz], fov: 1.1 });
  }
}
