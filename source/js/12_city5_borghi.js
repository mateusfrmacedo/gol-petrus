// Entorno da Borghi: reconstrução manual pelas vistas públicas de out/2024.
// Os cinco lotes substituem casas procedurais; posições e medidas são aproximadas.
// Nenhuma fotografia do Street View é incorporada às texturas do jogo.
function borghiNear(x, z) {
  const M = MARCOS.borghi;
  return !!M && Math.hypot(x - M.ox, z - M.oz) < 58;
}
function borghiNeighborhoodLayout(houses, occ) {
  const M = MARCOS.borghi, C = CITY; if (!M) return;
  const defs = [
    // a: oeste a partir da loja; b: norte. Eixo n aponta para dentro do lote.
    ['jardim', 12, 34, 30, 16, 3.0, M.zx, M.zz, [0.82, 0.69, 0.58]],
    ['salmao', -38, 32, 21, 12, 2.0, M.zx, M.zz, [0.73, 0.43, 0.34]],
    ['mercearia', -29, 0, 18, 16, 0.1, -M.ux, -M.uz, [0.43, 0.53, 0.31]],
    ['muro', 25, 0, 15, 12, 2.2, -M.zx, -M.zz, [0.73, 0.72, 0.64]],
    ['quintal', 0, -14.9, 7.4, 14, 0, M.ux, M.uz, [0.79, 0.78, 0.71]],
  ];
  const fixed = defs.map(([kind, a, b, w, d, set, nx, nz, col], i) => {
    const [x, z] = M.at(a, b), r = nearestChain(x, z, kind === 'mercearia' || kind === 'quintal' ? /Comércio/ : /Francisco Coco/);
    const q = new Float64Array(12); q[0] = x - nx * d / 2; q[1] = z - nz * d / 2; cityRasterQ(q);
    return { x, z, w, d, set, nx, nz, fx: -nz, fz: nx, yaw: Math.atan2(nz, nx), yr: q[10] + C.CURB,
      borghiRef: kind, col, wall: set > 1, two: false, comm: false, roof: 0.3, gate: 0.3, seed: 0.31 + i * 0.1,
      ch: r.ch.id, side: 1, shop: kind === 'mercearia' ? 'Mercearia da esquina (referência visual)' : undefined };
  });
  // Teste de eixos separadores: elimina também lotes da rua transversal que invadem a reserva.
  const box = h => { const e = h.wall ? h.set / 2 : 0; return { x: h.x - h.nx * e, z: h.z - h.nz * e, nx: h.nx, nz: h.nz, d: h.d + 2 * e, w: h.w }; };
  const overlap = (a, b) => {
    for (const [x, z] of [[a.nx, a.nz], [-a.nz, a.nx], [b.nx, b.nz], [-b.nz, b.nx]]) {
      const ra = a.d / 2 * Math.abs(a.nx * x + a.nz * z) + a.w / 2 * Math.abs(-a.nz * x + a.nx * z);
      const rb = b.d / 2 * Math.abs(b.nx * x + b.nz * z) + b.w / 2 * Math.abs(-b.nz * x + b.nx * z);
      if (Math.abs((a.x - b.x) * x + (a.z - b.z) * z) >= ra + rb + 0.35) return false;
    }
    return true;
  };
  const keep = houses.filter(h => !fixed.some(f => overlap(box(h), box(f))));
  houses.length = 0; houses.push(...fixed, ...keep); M.neighbors = fixed;
  // Reconstitui a ocupação residencial: as árvores e os lotes substituídos não deixam reservas fantasmas.
  for (let i = 0; i < occ.length; i++) if (occ[i] === 1) occ[i] = 0;
  for (const h of houses) {
    for (let a = -h.d / 2 - h.set; a <= h.d / 2; a += 0.8) for (let b = -h.w / 2; b <= h.w / 2; b += 0.8) {
      const i = Math.round(h.x + h.nx * a + h.fx * b - C.X0), j = Math.round(h.z + h.nz * a + h.fz * b - C.Z0);
      if (i >= 0 && j >= 0 && i < C.W && j < C.H && !occ[j * C.W + i]) occ[j * C.W + i] = 1;
    }
  }
  // Copas podadas na calçada e árvores maiores atrás do muro baixo da esquina noroeste.
  const trees = [
    [3, 23, 1, 0.70], [14, 23, 1, 0.70], [26, 23, 1, 0.74], [3, 37, 1, 1.0], [16, 38, 0, 0.95], [27, 36, 1, 0.9],
    [-22, 23, 1, 0.66], [-37, 23, 1, 0.68], [-20, 6, 1, 0.68], [-20, -5, 1, 0.72], [22, 9, 1, 0.65], [32, 9, 1, 0.67],
  ];
  // Terraplenagem apenas dos lotes de referência: elimina taludes artificiais junto aos muros.
  // A grade natural é alterada antes de criar campo de alturas, postes, árvores e colisões.
  const N = C.nat, pads = [...fixed, { x: M.ox, z: M.oz, nx: M.ux, nz: M.uz, d: M.D, w: M.W, yr: fixed.find(h => h.borghiRef === 'quintal').yr }];
  for (const h of pads) {
    const radius = Math.hypot(h.d, h.w) / 2 + 12;
    for (let j = Math.max(0, Math.floor((h.z - radius - N.z0) / N.cell)); j <= Math.min(N.nz - 1, Math.ceil((h.z + radius - N.z0) / N.cell)); j++) {
      for (let i = Math.max(0, Math.floor((h.x - radius - N.x0) / N.cell)); i <= Math.min(N.nx - 1, Math.ceil((h.x + radius - N.x0) / N.cell)); i++) {
        const dx = N.x0 + i * N.cell - h.x, dz = N.z0 + j * N.cell - h.z;
        const edge = Math.max(Math.abs(dx * h.nx + dz * h.nz) - h.d / 2, Math.abs(-dx * h.nz + dz * h.nx) - h.w / 2);
        const k = 1 - smooth(0, 10, edge); if (k > 0) N.g[j * N.nx + i] = lerp(N.g[j * N.nx + i], h.yr - 0.05, k);
      }
    }
  }
  for (const [a, b, type, scale] of trees) { const p = M.at(a, b), q = new Float64Array(12); q[0] = p[0]; q[1] = p[1]; cityRasterQ(q); if (q[9] > 0.4) MARCOS.trees.push([p[0], p[1], type, scale]); }
}

// Portão de barras, com travessas, orientado no plano x local.
function borghiFence(mb, x, z0, z1, y, height, color) {
  mb.mat(2, 170, 100).color(...color, 1);
  for (let z = z0; z <= z1; z += 0.15) mb.box(x, y + height / 2, z, 0.035, height, 0.035);
  for (const yy of [y + 0.08, y + height * 0.52, y + height - 0.05]) mb.box(x, yy, (z0 + z1) / 2, 0.055, 0.045, z1 - z0);
}
function borghiReferenceHouse(mb, h) {
  const X = h.d / 2, Z = h.w / 2, F = -X - h.set;
  const front = [h.x - h.nx * X, h.z - h.nz * X], y = Math.max(h.yr, hfAt(...front)) + 0.08;
  const H = h.borghiRef === 'muro' ? 3.0 : 3.1;
  mb.push(m4basis(m4(), h.nx, 0, h.nz, 0, 1, 0, h.fx, 0, h.fz, h.x, y, h.z));
  if (h.borghiRef === 'quintal') {
    // Terreno lateral entre o salão e a oficina: chão de terra, grade marrom e paredes claras.
    mb.mat(19, 220).color(0.77, 0.75, 0.67, 1);
    mb.box(X - 0.1, 0.85, 0, 0.2, 2.5, h.w); mb.box(0, 0.15, Z - 0.1, h.d, 0.7, 0.2);
    borghiFence(mb, -X, -Z, Z, 0.05, 1.65, [0.25, 0.18, 0.12]);
    for (const z of [-Z, 0, Z]) { mb.mat(2, 180).color(0.26, 0.18, 0.13, 1); mb.box(-X, 0.9, z, 0.10, 1.8, 0.10); }
    mb.pop(); return;
  }
  mb.mat(19, 205).color(...h.col, 1); cWalls(mb, h.d, h.w, -1.5, H);
  mb.mat(20).color(0.57, 0.29, 0.16, 1); cRoof(mb, h.d, h.w, H, Math.min(h.d, h.w) * 0.22, 0.45, false);
  mb.mat(19, 210).color(0.85, 0.83, 0.76, 1); cSoffit(mb, h.d, h.w, H, 0.45);
  if (h.borghiRef === 'mercearia') {
    // Reboco verde, folhas azuis e toldo amarelo de borda recortada vistos em frente à Borghi.
    cOpening(mb, -X, -1, 2.6, 4.1, 0, 2.6, 13, [0.24, 0.39, 0.53]);
    cOpening(mb, -X, -1, -3.8, 1.5, 1.1, 2.3, 13, [0.25, 0.39, 0.50]);
    mb.mat(10).color(0.78, 0.58, 0.20, 1);
    cRect(mb, -X, 2.88, -Z + 0.25, -1.05, -0.32, 0, 0, 0, h.w - 0.5, -0.3, 1, 0);
    for (let z = -Z + 0.25; z < Z - 0.25; z += 0.28) mb.box(-X - 1.05, 2.49, z, 0.04, 0.2 + 0.04 * Math.cos(z * 15), 0.27);
    mb.mat(19, 235).color(0.80, 0.79, 0.67, 1); cRect(mb, -X - 0.04, 0.25, 5.0, 0, 0, 2.4, 0, 1.05, 0, -1, 0, 0);
    const at = (a, b) => [h.x + h.nx * a + h.fx * b, h.z + h.nz * a + h.fz * b], p = at(-X - 0.06, 5.15), q = at(-X - 0.06, 7.15);
    CITY.signs.push({ name: 'TEMOS GELO', bg: '#ccc9ab', fg: '#514b39', x: p[0], z: p[1], y: y + 0.55, rx: q[0] - p[0], rz: q[1] - p[1], h: 0.55, nx: -h.nx, nz: -h.nz });
  } else {
    // Casas recuadas: varanda de telha, pilares claros, janela de madeira e muro de reboco áspero.
    cOpening(mb, -X, -1, 1.6, 1.1, 0, 2.25, 13, [0.30, 0.20, 0.13]);
    for (const z of [-Z * 0.55, Z * 0.55]) {
      cOpening(mb, -X, -1, z, 1.7, 1.0, 2.15, 13, [0.34, 0.25, 0.18]);
      mb.mat(19, 195).color(0.88, 0.86, 0.79, 1); mb.box(-X - 0.07, 0.94, z, 0.14, 0.10, 1.9);
    }
    const porch = Math.min(2.1, h.set - 0.35);
    mb.mat(20).color(0.63, 0.31, 0.17, 1); cRect(mb, -X, 2.94, -Z + 0.3, -porch, -0.43, 0, 0, 0, h.w - 0.6, -0.2, 1, 0);
    mb.mat(19, 200).color(0.89, 0.87, 0.81, 1);
    for (const z of [-Z + 0.5, 0, Z - 0.5]) mb.box(-X - porch + 0.08, 1.23, z, 0.18, 2.46, 0.18);
    const wallH = h.borghiRef === 'muro' ? 2.55 : 1.05, wall = [0.65, 0.65, 0.61];
    mb.mat(19, 245).color(...wall, 1);
    for (const [a, b] of [[-Z, Z * 0.30], [Z * 0.72, Z]]) mb.box(F, (wallH - 0.6) / 2, (a + b) / 2, 0.20, wallH + 0.6, b - a);
    for (const z of [-Z, Z]) mb.box((F + X) / 2, (wallH - 0.6) / 2, z, X - F, wallH + 0.6, 0.20);
    borghiFence(mb, F, Z * 0.30, Z * 0.72, 0.02, wallH + 0.2, [0.37, 0.29, 0.20]);
    mb.mat(3).color(0.60, 0.58, 0.52, 1); cRect(mb, F, 0.01, -Z, h.set, 0, 0, 0, 0, h.w, 0, 1, 0);
  }
  // Faixa junto à fachada com juntas e caixa de energia; sem geometria sobre o asfalto.
  mb.mat(19, 230).color(0.51, 0.51, 0.45, 1); cRect(mb, -X - 0.025, -0.25, -Z, 0, 0, h.w, 0, 0.43, 0, -1, 0, 0);
  mb.mat(2, 210).color(0.58, 0.59, 0.56, 1); mb.box(-X - 0.07, 1.4, -Z + 0.65, 0.12, 0.45, 0.30);
  mb.pop();
}

function borghiForecourt(mb, X, Z) {
  // Grade de correr em malha fina, trilho e rampas de concreto sob a cobertura existente.
  borghiFence(mb, -X + 0.16, -Z + 4.4, Z - 4.3, 0.04, 2.55, [0.10, 0.10, 0.11]);
  mb.mat(2, 200, 100).color(0.18, 0.18, 0.18, 1); mb.box(-X + 0.12, 2.62, 0, 0.06, 0.09, Z * 2);
  for (let z = -Z + 4.55; z < Z - 4.3; z += 0.14) {
    mb.mat(2, 190, 100).color(0.12, 0.12, 0.13, 1); mb.box(-X + 0.16, 1.28, z, 0.015, 2.5, 0.015);
  }
  for (const z of [-3.0, 1.0, 5.0]) {
    mb.mat(3).color(0.45, 0.44, 0.41, 1); cRect(mb, -X - 0.15, 0.04, z - 1.1, 1.0, 0, 0, 0, 0, 2.2, 0, 1, 0);
    mb.mat(19, 230).color(0.24, 0.24, 0.23, 1); mb.box(-X + 0.6, 0.055, z, 1.4, 0.015, 0.035);
  }
  // Bandeja parabólica e antena no telhado, visíveis por cima da lateral.
  mb.mat(2, 180, 100).color(0.55, 0.54, 0.48, 1); mb.box(X - 1.8, 4.9, -Z + 3, 0.06, 1.5, 0.06);
  mb.push(m4basis(m4(), 0.8, 0.6, 0, -0.6, 0.8, 0, 0, 0, 1, X - 1.8, 5.15, -Z + 3));
  mb.cyl(0, 0, 0, 0.72, 0.07, 0.68, 20, true, true); mb.pop();
}

// Pintura PARE desenhada por traços, sem imagens externas; nas duas aproximações da Francisco Coco.
function borghiStopPaint(mb) {
  const M = MARCOS.borghi; if (!M) return;
  const glyphs = [
    [[[0, 0], [0, 1], [0.6, 1], [0.6, 0.5], [0, 0.5]]],
    [[[0, 0], [0.3, 1], [0.6, 0]], [[0.15, 0.5], [0.45, 0.5]]],
    [[[0, 0], [0, 1], [0.6, 1], [0.6, 0.5], [0, 0.5]], [[0.25, 0.5], [0.65, 0]]],
    [[[0.6, 1], [0, 1], [0, 0], [0.6, 0]], [[0, 0.5], [0.5, 0.5]]],
  ];
  const o = new Float64Array(5), q = new Float64Array(12);
  for (const ch of CITY.chains) {
    if (!/Francisco Coco/.test(ch.cls.name) || ch.a !== M.junction && ch.b !== M.junction) continue;
    const atA = ch.a === M.junction, s = atA ? ch.trimA + 5.5 : ch.L - ch.trimB - 5.5, dir = atA ? -1 : 1;
    chainAt(ch, s, o); const tx = o[2] * dir, tz = o[3] * dir, rx = -tz, rz = tx;
    const x = o[0] + rx * ch.hw * 0.5, z = o[1] + rz * ch.hw * 0.5;
    const point = (a, b) => { const px = x + rx * a + tx * b, pz = z + rz * a + tz * b; q[0] = px; q[1] = pz; cityRasterQ(q); return [px, q[10] + 0.016, pz]; };
    const stroke = (a, b, c, d, w) => {
      const len = Math.hypot(c - a, d - b), nx = -(d - b) / len * w / 2, nz = (c - a) / len * w / 2;
      const A = point(a + nx, b + nz), B = point(c + nx, d + nz), C = point(c - nx, d - nz), D = point(a - nx, b - nz);
      cTriN(mb, A, B, C, [0, 1, 0]); cTriN(mb, A, C, D, [0, 1, 0]);
    };
    mb.mat(3).color(0.75, 0.73, 0.66, 1);
    glyphs.forEach((paths, i) => { for (const path of paths) for (let k = 1; k < path.length; k++) stroke(-1.35 + i * 0.72 + path[k - 1][0], path[k - 1][1] * 1.8 - 1, -1.35 + i * 0.72 + path[k][0], path[k][1] * 1.8 - 1, 0.10); });
    stroke(-ch.hw * 0.43, 2.4, ch.hw * 0.43, 2.4, 0.25);
  }
}
