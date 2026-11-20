// Entorno da casa do Petrus, conferido no Street View de setembro/2024 em 20/11/2026.
// https://www.google.com/maps/@?api=1&map_action=pano&pano=vwJxbELpF4El1dB1dVEZ_A&heading=171&pitch=5
// Mantém a casa e os dois vizinhos já modelados. Fachadas opostas e terreno da esquina
// têm dimensões aproximadas; nenhuma fotografia é incorporada ao jogo.
function petrusNeighborhoodLayout(reserved) {
  const M = MARCOS.petrus, C = CITY;
  if (!M) return;
  // a: norte/para o fundo da casa; b: leste. Inclui muros e pátios dos lotes existentes.
  M.referencePads = [
    { kind: 'existentes', a: 0, b: -0.8, d: 22.5, w: 37.0 },
    { kind: 'varanda', a: -35.5, b: -3.0, d: 22.0, w: 29.0 },
    { kind: 'portao', a: -35.5, b: 19.5, d: 22.0, w: 14.0 },
    { kind: 'terreno', a: 7.0, b: -45.0, d: 28.0, w: 26.0 },
  ];
  const q = new Float64Array(12);
  for (const P of M.referencePads) {
    const p = M.at(P.a, P.b);
    reserved.push([p[0], p[1], Math.min(P.d, P.w) / 2]);
    // Marca toda a área no raster antes da geração das casas: evita fachadas duplicadas.
    // Código 4 distingue lotes manuais das casas procedurais e dos pisos da praça.
    for (let a = P.a - P.d / 2 - 0.8; a <= P.a + P.d / 2 + 0.8; a += 0.6) {
      for (let b = P.b - P.w / 2 - 0.8; b <= P.b + P.w / 2 + 0.8; b += 0.6) {
        const [x, z] = M.at(a, b), i = Math.round(x - C.X0), j = Math.round(z - C.Z0);
        q[0] = x; q[1] = z; cityRasterQ(q);
        if (i >= 0 && j >= 0 && i < C.W && j < C.H && q[9] > C.SW + 0.1 && !C.occ[j * C.W + i]) C.occ[j * C.W + i] = 4;
      }
    }
  }
  // Duas copas baixas vistas do outro lado da rua, mantendo a frente do Petrus livre.
  for (const [a, b, type, scale] of [[-23.7, -16.3, 1, 0.55], [-23.8, 7.7, 4, 0.48]]) {
    const p = M.at(a, b); q[0] = p[0]; q[1] = p[1]; cityRasterQ(q);
    if (q[9] > 0.6) MARCOS.trees.push([p[0], p[1], type, scale]);
  }
  // Solo dos lotes residenciais nivelado com a rua; terreno vazio conserva o relevo.
  const N = C.nat;
  for (const P of M.referencePads.filter(p => p.kind !== 'terreno')) {
    const front = M.at(P.a > -20 ? -12 : -24, P.b);
    q[0] = front[0]; q[1] = front[1]; cityRasterQ(q);
    const level = q[10] + C.CURB - 0.04, p = M.at(P.a, P.b), radius = Math.hypot(P.d, P.w) / 2 + 9;
    for (let j = Math.max(0, Math.floor((p[1] - radius - N.z0) / N.cell)); j <= Math.min(N.nz - 1, Math.ceil((p[1] + radius - N.z0) / N.cell)); j++) {
      for (let i = Math.max(0, Math.floor((p[0] - radius - N.x0) / N.cell)); i <= Math.min(N.nx - 1, Math.ceil((p[0] + radius - N.x0) / N.cell)); i++) {
        const x = N.x0 + i * N.cell - M.ox, z = N.z0 + j * N.cell - M.oz;
        const a = x * M.ux + z * M.uz, b = x * M.zx + z * M.zz;
        const edge = Math.max(Math.abs(a - P.a) - P.d / 2, Math.abs(b - P.b) - P.w / 2);
        const k = 1 - smooth(0, 8, edge);
        if (k > 0) N.g[j * N.nx + i] = lerp(N.g[j * N.nx + i], level, k);
      }
    }
  }
}

function petrusOppositeHouse(mb, P) {
  const M = MARCOS.petrus, p = M.at(P.a, P.b), front = M.at(-24.6, P.b);
  const y = cityGroundY(...front) + 0.025, W = P.w - 0.3, Z = W / 2;
  // +X segue para o fundo do lote do lado sul; +Z aponta para oeste.
  mb.push(m4basis(m4(), -M.ux, 0, -M.uz, 0, 1, 0, -M.zx, 0, -M.zz, p[0], y, p[1]));
  const F = -10.9, cream = [0.84, 0.81, 0.70], white = [0.86, 0.88, 0.85];
  const gateZ = P.kind === 'varanda' ? 0 : -2.0, gateW = P.kind === 'varanda' ? 1.25 : 4.1;
  // Muro de reboco, dividido pelo portão; laterais enterradas até o nível do terreno.
  mb.mat(19, 220).color(...cream, 1);
  for (const [lo, hi] of [[-Z, gateZ - gateW / 2], [gateZ + gateW / 2, Z]]) {
    if (hi > lo) mb.box(F, 0.72, (lo + hi) / 2, 0.20, 1.85, hi - lo);
  }
  for (const z of [-Z, Z]) mb.box(0.1, 0.72, z, 22, 1.85, 0.18);
  mb.mat(19, 210).color(0.70, 0.67, 0.58, 1);
  for (const [lo, hi] of [[-Z, gateZ - gateW / 2], [gateZ + gateW / 2, Z]]) {
    if (hi > lo) mb.box(F, 1.67, (lo + hi) / 2, 0.25, 0.055, hi - lo);
  }
  // Portão social branco com losango; o segundo lote tem garagem de chapa vertical.
  mb.mat(2, 175, 130).color(...white, 1);
  for (const z of [gateZ - gateW / 2, gateZ + gateW / 2]) mb.box(F, 1.02, z, 0.08, 2.05, 0.07);
  for (const yy of [0.12, 1.35, 2.02]) mb.box(F, yy, gateZ, 0.06, 0.05, gateW);
  for (let z = gateZ - gateW / 2 + 0.13; z < gateZ + gateW / 2; z += P.kind === 'varanda' ? 0.14 : 0.10) {
    mb.box(F, P.kind === 'varanda' ? 0.72 : 1.03, z, 0.03, P.kind === 'varanda' ? 1.2 : 1.94, P.kind === 'varanda' ? 0.025 : 0.075);
  }
  if (P.kind === 'varanda') {
    const points = [[0, 0.24], [0.24, 0], [0, -0.24], [-0.24, 0]];
    for (let i = 0; i < 4; i++) {
      const A = points[i], B = points[(i + 1) % 4], dy = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dy, dz);
      mb.push(m4basis(m4(), 1, 0, 0, 0, dy / L, dz / L, 0, -dz / L, dy / L, F, 1.64 + (A[0] + B[0]) / 2, gateZ + (A[1] + B[1]) / 2));
      mb.box(0, 0, 0, 0.035, L, 0.035); mb.pop();
    }
  }
  // Casa térrea recuada, varanda comprida com vigas de madeira e telhas cerâmicas.
  const w = W - 0.7, houseX = 1.2, roofH = P.kind === 'varanda' ? 1.8 : 2.0;
  mb.push(m4translate(m4(), houseX, 0, 0));
  mb.mat(19, 210).color(0.88, 0.86, 0.78, 1); cWalls(mb, 11, w, -0.45, 3.05);
  for (let z = -w / 2 + 2.1; z < w / 2 - 1; z += 4.3) cOpening(mb, -5.5, -1, z, 1.4, 1.05, 2.35, 13, [0.20, 0.18, 0.14]);
  cOpening(mb, -5.5, -1, 0.3, 0.95, 0, 2.25, 2, [0.23, 0.25, 0.20]);
  mb.mat(20).color(0.59, 0.29, 0.16, 1); cRoof(mb, 11, w, 3.05, roofH, 0.45, false);
  mb.mat(19, 210).color(0.83, 0.81, 0.73, 1); cSoffit(mb, 11, w, 3.05, 0.45);
  if (P.kind === 'varanda') {
    mb.mat(20).color(0.62, 0.31, 0.17, 1); cRect(mb, -5.5, 3.02, -w / 2, -2.7, -0.58, 0, 0, 0, w, -0.2, 1, 0);
    mb.mat(2, 190).color(0.30, 0.19, 0.12, 1); mb.box(-8.12, 2.39, 0, 0.13, 0.18, w);
    for (let z = -w / 2 + 0.12; z <= w / 2; z += 4.1) mb.box(-8.1, 1.2, z, 0.12, 2.4, 0.12);
    for (let z = -w / 2; z < w / 2; z += 0.65) mb.box(-6.75, 2.71, z, 2.8, 0.075, 0.065);
    // As duas antenas parabólicas são visíveis na referência, sem texturas externas.
    for (const z of [-5.2, -3.1]) {
      mb.mat(2, 185).color(0.71, 0.70, 0.63, 1); mb.cyl(-2, 4.1, z, 0.035, 4.75, 0.035, 6, false, false);
      mb.cyl(-2.1, 4.7, z, 0.47, 4.84, 0.09, 12, true, false);
    }
  }
  mb.pop();
  // Piso do pátio; o muro e a casa recebem colisões próprias.
  mb.mat(3).color(0.47, 0.43, 0.38, 1); cRect(mb, F, 0.015, -Z, 6.5, 0, 0, 0, 0, W, 0, 1, 0);
  mbColBox(mb, F, 0, 0.12, Z);
  mbColBox(mb, houseX, 0, 5.5, w / 2);
  for (const z of [-Z, Z]) mbColBox(mb, 0, z, 11, 0.11);
  mb.pop();
}

function petrusNeighborhoodBuild(mb) {
  const M = MARCOS.petrus; if (!M || !M.referencePads) return;
  for (const P of M.referencePads) if (P.kind === 'varanda' || P.kind === 'portao') petrusOppositeHouse(mb, P);
  const q = new Float64Array(12);
  // Terreno aberto na esquina: solo irregular, manchas de terra e muro de tijolo ao fundo.
  for (let a = -5; a < 20; a += 2) for (let b = -56; b < -33; b += 2) {
    const pts = [[a, b], [a + 2, b], [a + 2, b + 2], [a, b + 2]].map(([aa, bb]) => {
      const p = M.at(aa, bb); q[0] = p[0]; q[1] = p[1]; cityRasterQ(q);
      return [p[0], hfAt(...p) + 0.018, p[1], q[9]];
    });
    if (pts.some(p => p[3] < CITY.SW + 0.5)) continue;
    const bare = Math.sin(a * 1.7 + b * 0.7) > 0.2;
    mb.mat(3).color(...(bare ? [0.40, 0.29, 0.20] : [0.37, 0.40, 0.24]), 1);
    cTriN(mb, pts[0], pts[1], pts[2], [0, 1, 0]); cTriN(mb, pts[0], pts[2], pts[3], [0, 1, 0]);
  }
  const wall = M.at(19.8, -45), yy = hfAt(...wall);
  mb.push(m4basis(m4(), M.ux, 0, M.uz, 0, 1, 0, M.zx, 0, M.zz, wall[0], yy, wall[1]));
  mb.mat(19, 245).color(0.48, 0.27, 0.19, 1); mb.box(0, 0.75, 0, 0.17, 1.8, 23);
  mb.mat(19, 240).color(0.61, 0.42, 0.29, 1);
  for (let y = 0.12; y < 1.65; y += 0.18) mb.box(-0.09, y, 0, 0.015, 0.012, 23);
  for (let k = 0; k < 8; k++) mb.box(0, 0.85, -11.5 + k * 3.28, 0.24, 2.0, 0.23);
  mbColBox(mb, 0, 0, 0.15, 11.5); mb.pop();

  // Calçada contínua, juntas e tampas de inspeção, amostradas no chão e fora do asfalto.
  for (const [a0, a1, b0, b1, col] of [[-13.2, -11.25, -17.8, 16.8, [0.58, 0.56, 0.51]], [-24.45, -23.0, -17.1, 26, [0.43, 0.40, 0.36]]]) {
    for (let b = b0; b < b1; b += 1.2) {
      const B = Math.min(b1, b + 1.18), pts = [[a0, b], [a1, b], [a1, B], [a0, B]].map(([a, bb]) => {
        const p = M.at(a, bb); q[0] = p[0]; q[1] = p[1]; cityRasterQ(q);
        return [p[0], cityGroundY(...p) + 0.012, p[1], q[9]];
      });
      if (pts.some(p => p[3] < 0.35)) continue;
      mb.mat(3).color(...col, 1); cTriN(mb, pts[0], pts[1], pts[2], [0, 1, 0]); cTriN(mb, pts[0], pts[2], pts[3], [0, 1, 0]);
    }
  }
  for (const [a, b] of [[-12.15, -13.8], [-23.65, 14.5]]) {
    const p = M.at(a, b), y = cityGroundY(...p);
    mb.push(m4basis(m4(), M.ux, 0, M.uz, 0, 1, 0, M.zx, 0, M.zz, p[0], y, p[1]));
    mb.mat(2, 210, 70).color(0.32, 0.31, 0.27, 1); mb.box(0, 0.025, 0, 0.55, 0.03, 0.65);
    mb.mat(2, 200).color(0.22, 0.22, 0.20, 1); for (const z of [-0.17, 0.17]) mb.box(0, 0.045, z, 0.10, 0.01, 0.025);
    mb.pop();
  }
  // Lixeira verde-clara da casa em frente; cesta vazada sobre um único suporte.
  const p = M.at(-23.4, 7.0), ground = cityGroundY(...p);
  mb.push(m4basis(m4(), M.ux, 0, M.uz, 0, 1, 0, M.zx, 0, M.zz, p[0], ground, p[1]));
  mb.mat(2, 190).color(0.52, 0.69, 0.62, 1); mb.box(0, 0.43, 0, 0.06, 0.86, 0.06);
  for (const y of [0.86, 1.05]) { mb.box(0, y, -0.25, 0.42, 0.025, 0.025); mb.box(0, y, 0.25, 0.42, 0.025, 0.025); mb.box(-0.21, y, 0, 0.025, 0.025, 0.5); mb.box(0.21, y, 0, 0.025, 0.025, 0.5); }
  for (let z = -0.23; z < 0.25; z += 0.08) for (const x of [-0.21, 0.21]) mb.box(x, 0.95, z, 0.02, 0.19, 0.02);
  mbColCircle(mb, 0, 0, 0.09); mb.pop();
}

function petrusFotoCams() {
  const M = MARCOS.petrus; if (!M) return [];
  return [
    ['Casa do Petrus e vizinhos', -19.5, -1, -5, 0, 2.1],
    ['Casas em frente', -17.8, 4, -35.5, -3, 1.9],
    ['Esquina e terreno', -8, -25, 6, -44, 2.5],
    ['Rua e calçadas', -17.8, 27, -16, -13, 2.2],
  ].map(([nome, a, b, ta, tb, alt]) => {
    const p = M.at(a, b), t = M.at(ta, tb);
    return { nome, eye: [p[0], terrainH(...p) + alt, p[1]], alvo: [t[0], terrainH(...t) + 2.0, t[1]], fov: 1.1 };
  });
}

// A arborização explícita substitui a distribuição aleatória somente neste pequeno entorno.
function petrusTreeReserved(x, z) {
  const M = MARCOS.petrus; if (!M || !M.referencePads) return false;
  const dx = x - M.ox, dz = z - M.oz;
  const a = dx * M.ux + dz * M.uz, b = dx * M.zx + dz * M.zz;
  return a > -48 && a < 24 && b > -59 && b < 28;
}
