// Acabamento das quadras em volta da Borghi e do Centro (pedido do Mateus em 20/nov/2026).
// Os lotes reservados para lugares modelados (Borghi, Matriz, comércios, escola, galpão) deixavam vãos de 7 a 13 m de grama
// entre as construções, e as frentes comerciais ficavam com uma faixa de grama entre a calçada e a fachada. Nas cidades do
// interior paulista as casas ficam coladas ou com um corredor lateral de ~1,2 m e a calçada vai até o alinhamento.
// Arquivo do Claude (ver COORDENACAO.md). Ganchos: cityQuadras em 12_city1_core.js (antes da grade de colisão) e
// quadrasPave em cityPave (12_city3_mesh.js).

const QUADRAS_AREAS = [
  { quem: 'Borghi', x: () => MARCOS.borghi && MARCOS.borghi.ox, z: () => MARCOS.borghi && MARCOS.borghi.oz, r: 150 },
  { quem: 'Centro', x: () => 44, z: () => -47, r: 230 },   // Praça Padre João Nolte
];
const QUADRAS = { novas: 0, alargadas: 0, faixas: [] };

function quadrasNaArea(x, z) {
  for (const A of QUADRAS_AREAS) { const ax = A.x(), az = A.z(); if (ax !== undefined && ax !== null && Math.hypot(x - ax, z - az) < A.r) return true; }
  return false;
}

// caixa do lote (casa + quintal da frente com muro) e teste de separação de eixos com folga
function quadrasCaixa(h) { const e = h.wall && h.set > 1.0 ? h.set / 2 : 0; return { x: h.x - h.nx * e, z: h.z - h.nz * e, nx: h.nx, nz: h.nz, d: h.d + 2 * e, w: h.w }; }
function quadrasSobrepoe(a, b, folga) {
  for (const [x, z] of [[a.nx, a.nz], [-a.nz, a.nx], [b.nx, b.nz], [-b.nz, b.nx]]) {
    const ra = a.d / 2 * Math.abs(a.nx * x + a.nz * z) + a.w / 2 * Math.abs(-a.nz * x + a.nx * z);
    const rb = b.d / 2 * Math.abs(b.nx * x + b.nz * z) + b.w / 2 * Math.abs(-b.nz * x + b.nx * z);
    if (Math.abs((a.x - b.x) * x + (a.z - b.z) * z) >= ra + rb + folga) return false;
  }
  return true;
}
// o lote inteiro fica fora da calçada e das ruas (inclusive de outra rua, nas esquinas)
function quadrasLivre(h) {
  const C = CITY, B = quadrasCaixa(h);
  for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0], [-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]]) {
    const x = B.x + B.nx * a * B.d - B.nz * b * B.w, z = B.z + B.nz * a * B.d + B.nx * b * B.w;
    _cq[0] = x; _cq[1] = z; cityRasterQ(_cq); if (_cq[9] < C.SW + 0.15) return false;
    if (MARCOS.trees && MARCOS.trees.some(t => Math.hypot((t.x !== undefined ? t.x : t[0]) - x, (t.z !== undefined ? t.z : t[1]) - z) < 2.2)) return false;
  }
  return true;
}

function cityQuadras(houses) {
  const C = CITY, rnd = mkRng(4417), fixo = h => h.borghiRef || h.centroRef || h.style;
  // faces de quadra: casas da mesma via e do mesmo lado, em ordem ao longo da fachada
  const faces = new Map();
  for (const h of houses) { if (!quadrasNaArea(h.x, h.z) || !C.chains[h.ch] || !C.chains[h.ch].cls.urban) continue; const k = h.ch + ':' + h.side; if (!faces.has(k)) faces.set(k, []); faces.get(k).push(h); }
  const novas = [];
  for (const L of faces.values()) {
    if (L.length < 2) continue;
    const f0 = L[0], pr = h => h.x * f0.fx + h.z * f0.fz; L.sort((a, b) => pr(a) - pr(b));
    for (let i = 1; i < L.length; i++) {
      const A = L[i - 1], B = L[i]; if (A.nx * B.nx + A.nz * B.nz < 0.94) continue;   // faces que viram a esquina
      const gap = Math.abs(pr(B) - pr(A)) - (A.w + B.w) / 2; if (gap < 2.6 || gap > 30) continue;
      if (gap >= 6.4) {
        // casa nova no vão, na linha de fachada da vizinha mais comum, com corredor de 0,8 m de cada lado
        const w = Math.min(12, gap - 1.6), ref = !fixo(A) ? A : B, d = Math.min(14, Math.max(9, ref.d)), set = ref.set;
        const m = (pr(A) + A.w / 2 + pr(B) - B.w / 2) / 2, fA = [A.x - A.nx * A.d / 2, A.z - A.nz * A.d / 2];
        const cx = fA[0] + f0.fx * (m - pr(A)) + A.nx * d / 2, cz = fA[1] + f0.fz * (m - pr(A)) + A.nz * d / 2;
        _cq[0] = cx; _cq[1] = cz; cityRasterQ(_cq);
        const h = { x: cx, z: cz, w, d, yaw: Math.atan2(A.nz, A.nx), fx: A.fx, fz: A.fz, nx: A.nx, nz: A.nz, set, comm: !!ref.comm && rnd() < 0.5, two: rnd() < 0.12,
          col: ref.col ? ref.col.map((c, k) => Math.min(1, Math.max(0, c + (rnd() - 0.5) * 0.16 + (k === 2 ? 0.02 : 0)))) : [0.9, 0.88, 0.82], roof: rnd(), wall: ref.wall, gate: rnd(), seed: rnd(),
          yr: _cq[10] + C.CURB, ch: ref.ch, side: ref.side, quadra: true };
        if (quadrasLivre(h) && ![...houses, ...novas].some(o => quadrasSobrepoe(quadrasCaixa(h), quadrasCaixa(o), 0.3))) { novas.push(h); continue; }
      }
      // vão menor (ou casa nova sem espaço): alarga a vizinha genérica, deixando corredor de 1,2 m
      for (const V of [A, B]) {
        if (fixo(V) || V.quadraAlargada) continue;
        const extra = Math.min(gap - 1.2, 6), s = V === A ? 1 : -1;
        const W = { ...V, w: V.w + extra, x: V.x + f0.fx * s * extra / 2, z: V.z + f0.fz * s * extra / 2 };
        if (!quadrasLivre(W) || houses.some(o => o !== V && quadrasSobrepoe(quadrasCaixa(W), quadrasCaixa(o), 0.3)) || novas.some(o => quadrasSobrepoe(quadrasCaixa(W), quadrasCaixa(o), 0.3))) continue;
        V.w = W.w; V.x = W.x; V.z = W.z; V.quadraAlargada = true; QUADRAS.alargadas++; break;
      }
    }
  }
  for (const h of novas) houses.push(h);
  QUADRAS.novas = novas.length;
  // ocupação das casas novas e alargadas (árvores procedurais não nascem dentro delas)
  for (const h of houses) {
    if (!h.quadra && !h.quadraAlargada) continue;
    for (let a = -h.d / 2 - h.set; a <= h.d / 2; a += 0.8) for (let b = -h.w / 2; b <= h.w / 2; b += 0.8) {
      const i = Math.round(h.x + h.nx * a + h.fx * b - C.X0), j = Math.round(h.z + h.nz * a + h.fz * b - C.Z0);
      if (i >= 0 && j >= 0 && i < C.W && j < C.H && !C.occ[j * C.W + i]) C.occ[j * C.W + i] = 1;
    }
  }
}

// faixa entre o fim da calçada e a fachada: cimentada (calçada até o alinhamento) nas frentes sem muro
function quadrasPave() {
  const C = CITY; QUADRAS.faixas = [];
  for (const h of C.houses) {
    if (!quadrasNaArea(h.x, h.z) || (h.wall && h.set > 1.0) || h.borghiRef) continue;
    const fx = h.x - h.nx * h.d / 2, fz = h.z - h.nz * h.d / 2; _cq[0] = fx; _cq[1] = fz; cityRasterQ(_cq);
    const faixa = _cq[9] - C.SW; if (faixa < 0.15 || faixa > 3.5) continue;
    const r = faixa / 2 + 0.45, xm = fx - h.nx * faixa / 2, zm = fz - h.nz * faixa / 2;
    for (let b = -h.w / 2 + r * 0.6; b <= h.w / 2 - r * 0.6 + 1e-6; b += r * 0.9) C.pave.push(xm + h.fx * b, zm + h.fz * b, r);
    QUADRAS.faixas.push(h);
  }
}
