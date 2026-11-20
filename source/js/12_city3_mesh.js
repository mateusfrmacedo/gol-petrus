// Nova Aliança: malhas das ruas (asfalto, terra, cruzamentos, meio-fio e calçadas) e do cenário urbano (casas, comércio,
// igreja, prédios públicos, praças, postes, barreiras na borda da área).

// ---------- ruas ----------
// uv do asfalto = (s ao longo da via, d lateral). cor: r = meia largura / 8, g = pintura / 4, b = bordas brancas, a = 0.
// peso (normal.w) = comprimento da via / 1000; mat a = faixas de pedestre (bit 0 no início, bit 1 no fim).
// material: 0 asfalto | 1 asfalto do cruzamento (uv = xz) | 2 concreto (meio-fio e calçada) | 3 chão | 4 terra | 5 terra do cruzamento
// triângulo com a face da frente na direção da normal do vértice a (a regra de quad(): (b-a)×(c-a) aponta para fora)
// obstáculo redondo na posição local (a, b) do construtor de malha (usa a transformação atual dele)
function mbColCircle(mb, a, b, r) { const m = mb.xf; const x = m ? m[0] * a + m[8] * b + m[12] : a, z = m ? m[2] * a + m[10] * b + m[14] : b; CITY.addCircle(x, z, r); }
// caixa sólida alinhada ao quadro local atual do construtor (meias medidas hd ao longo de x local, hw ao longo de z local)
function mbColBox(mb, a, b, hd, hw) {
  const m = mb.xf; if (!m) { CITY.addBox({ x: a, z: b, ux: 1, uz: 0, hd, hw }); return; }
  const l = Math.hypot(m[0], m[2]) || 1; CITY.addBox({ x: m[0] * a + m[8] * b + m[12], z: m[2] * a + m[10] * b + m[14], ux: m[0] / l, uz: m[2] / l, hd, hw });
}
function triN(mb, a, b, c) {
  const f = mb.f32, i16 = mb.i16, ax = f[a * 9], ay = f[a * 9 + 1], az = f[a * 9 + 2];
  const ux = f[b * 9] - ax, uy = f[b * 9 + 1] - ay, uz = f[b * 9 + 2] - az, vx = f[c * 9] - ax, vy = f[c * 9 + 1] - ay, vz = f[c * 9 + 2] - az;
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  const nx = i16[a * 18 + 6] + i16[b * 18 + 6] + i16[c * 18 + 6], ny = i16[a * 18 + 7] + i16[b * 18 + 7] + i16[c * 18 + 7], nz = i16[a * 18 + 8] + i16[b * 18 + 8] + i16[c * 18 + 8];
  if (cx * nx + cy * ny + cz * nz >= 0) mb.tri(a, b, c); else mb.tri(a, c, b);
}
function quadN(mb, a, b, c, d) { triN(mb, a, b, c); triN(mb, a, c, d); }
function cityRoadsBuild() {
  const C = CITY, fam = mkFamily('road', { src: 'mat_road', defs: worldDefs(), noShadow: true }), rs = new RangeSet(fam), mb = new MeshBuilder(1 << 19);
  WORLD.ribbon = rs;
  const o = new Float64Array(5), CU = C.CURB, SW = C.SW;
  const zebraEnd = nd => { if (nd.junc < 0) return false; const J = C.juncs[nd.junc]; return J.urban && J.ends.length >= 3; };
  for (const ch of C.chains) {
    const s0 = ch.trimA, s1 = ch.L - ch.trimB; if (s1 - s0 < 0.08) continue;
    let ss = [s0]; for (let i = 0; i < ch.n; i++) if (ch.s[i] > s0 + 0.05 && ch.s[i] < s1 - 0.05) ss.push(ch.s[i]); ss.push(s1);
    const FE = (ch.feats || []).filter(f => f.kind !== 2);
    for (const f of FE) for (let a = -f.half; a <= f.half + 1e-6; a += f.half / 6) { const s = f.s + a; if (s > s0 + 0.02 && s < s1 - 0.02) ss.push(s); }
    ss.sort((a, b) => a - b); ss = ss.filter((v, i) => i === 0 || v - ss[i - 1] > 0.01);
    const FY = ss.map(s => { let y = 0; for (const f of FE) y += featProfile(f, s - f.s); return y; });
    const n = ss.length, X = new Float64Array(n), Z = new Float64Array(n), Y = new Float64Array(n), NX = new Float64Array(n), NZ = new Float64Array(n), M = new Float64Array(n);
    for (let r = 0; r < n; r++) { chainAt(ch, ss[r], o); X[r] = o[0]; Z[r] = o[1]; Y[r] = o[4]; }
    for (let r = 0; r < n; r++) {
      const a = Math.max(0, r - 1), b = Math.min(n - 1, r + 1); let tx = X[b] - X[a], tz = Z[b] - Z[a]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      NX[r] = -tz; NZ[r] = tx; M[r] = 1;
      if (r > 0 && r < n - 1) { let px = X[r] - X[r - 1], pz = Z[r] - Z[r - 1]; const pl = Math.hypot(px, pz) || 1; M[r] = 1 / Math.max(0.55, (-pz / pl) * NX[r] + (px / pl) * NZ[r]); }
    }
    const L = s1 - s0, hw = ch.hw, dirt = ch.cls.dirt, urban = ch.cls.urban;
    const zeb = urban && !dirt ? (zebraEnd(ch.a) ? 1 : 0) | (zebraEnd(ch.b) ? 2 : 0) : 0;
    const P = (r, d, dy) => [X[r] + NX[r] * d * M[r], Y[r] + dy + (dy < 0.01 && dy > -0.01 ? FY[r] : 0), Z[r] + NZ[r] * d * M[r]];
    // faixa genérica: colunas [d, dy] por linha; normal pela malha (para cima) ou fixa
    const strip = (cols, mat, matA, uvFn, fixedN, clip) => {
      const nc = cols.length, base = mb.nv, onRoad = clip ? new Uint8Array(n * nc) : null;
      if (clip) for (let r = 0; r < n; r++) for (let c = 0; c < nc; c++) { const p = P(r, cols[c][0] * 1.0 + Math.sign(cols[c][0]) * 0.05, 0); _cq[0] = p[0]; _cq[1] = p[2]; cityRasterQ(_cq); onRoad[r * nc + c] = _cq[9] < -0.6 ? 1 : 0; }
      mb.mat(mat, matA || 0, 0, 0).color(hw / 8, ch.cls.paint / 4, ch.cls.edge, 0).weight(Math.min(1, L / 1000));
      for (let r = 0; r < n; r++) for (let c = 0; c < nc; c++) {
        const p = P(r, cols[c][0], cols[c][1]); let nx, ny, nz;
        if (fixedN) { const sg = fixedN; nx = -NX[r] * sg; ny = 0; nz = -NZ[r] * sg; }
        else {
          const ra = Math.max(0, r - 1), rb = Math.min(n - 1, r + 1), ca = Math.max(0, c - 1), cb = Math.min(nc - 1, c + 1);
          const A = P(ra, cols[c][0], cols[c][1]), B = P(rb, cols[c][0], cols[c][1]), Cc = P(r, cols[ca][0], cols[ca][1]), D = P(r, cols[cb][0], cols[cb][1]);
          const ax = B[0] - A[0], ay = B[1] - A[1], az = B[2] - A[2]; let bx = D[0] - Cc[0], by = D[1] - Cc[1], bz = D[2] - Cc[2];
          if (Math.abs(bx) + Math.abs(bz) < 1e-6) { bx = NX[r]; by = 0; bz = NZ[r]; }
          nx = ay * bz - az * by; ny = az * bx - ax * bz; nz = ax * by - ay * bx; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        }
        const uv = uvFn(r, c, p); mb.v(p[0], p[1], p[2], nx, ny, nz, uv[0], uv[1]);
      }
      for (let r = 0; r < n - 1; r++) for (let c = 0; c < nc - 1; c++) {
        if (clip && (onRoad[r * nc + c] | onRoad[r * nc + c + 1] | onRoad[(r + 1) * nc + c] | onRoad[(r + 1) * nc + c + 1])) continue;   // por cima de outra pista
        const a = base + r * nc + c, b = a + 1, cc = a + nc + 1, d = a + nc;
        quadN(mb, a, b, cc, d);
      }
      mb.weight(0);
    };
    const i0 = mb.ni;
    const sd = (r, c, cols) => [ss[r] - s0, cols[c][0]];
    const surf = [[-hw, 0], [-hw * 0.5, 0], [0, 0], [hw * 0.5, 0], [hw, 0]];
    strip(surf, dirt ? 4 : 0, zeb, (r, c) => sd(r, c, surf));
    if (urban) {
      for (const side of [-1, 1]) {
        const face = side < 0 ? [[-hw, CU], [-hw, 0]] : [[hw, 0], [hw, CU]];
        strip(face, 2, 0, (r, c) => [ss[r], face[c][1]], side, true);
        // lado voltado para outra pista colada (avenida de pista dupla): só meio canteiro de grama, sem calçada por cima da outra pista
        { let free = SW + 0.3; const rm = n >> 1; for (let w = 0.3; w <= SW + 0.3; w += 0.3) { _cq[0] = X[rm] + NX[rm] * side * (hw + w); _cq[1] = Z[rm] + NZ[rm] * side * (hw + w); cityRasterQ(_cq); if (_cq[9] < -0.2) { free = w; break; } }
          if (free < SW) { const half = Math.max(0.15, free / 2 - 0.05), med = side < 0 ? [[-hw - half, CU - 0.02], [-hw, CU - 0.02]] : [[hw, CU - 0.02], [hw + half, CU - 0.02]]; strip(med, 3, 0, (r, c, p) => [p[0], p[2]]); continue; } }
        // calçada: concreto (maioria), faixa de grama junto ao meio-fio ou ladrilho hidráulico (mais no centro)
        const hh = ((ch.id * 2654435761 + (side + 1) * 40503) >>> 0) % 100, central = Math.hypot(X[0] - 60, Z[0] + 10) < 450;
        const sty = hh < (central ? 30 : 8) ? 2 : hh < (central ? 45 : 35) ? 1 : 0;
        if (sty === 1) {
          const gr = side < 0 ? [[-hw - 0.9, CU - 0.02], [-hw, CU - 0.02]] : [[hw, CU - 0.02], [hw + 0.9, CU - 0.02]];
          strip(gr, 3, 0, (r, c, p) => [p[0], p[2]], 0, true);
          const walk = side < 0 ? [[-hw - SW, CU], [-hw - 0.9, CU]] : [[hw + 0.9, CU], [hw + SW, CU]];
          strip(walk, 2, 1, (r, c, p) => [p[0], p[2]], 0, true);
        } else {
          const walk = side < 0 ? [[-hw - SW, CU], [-hw, CU]] : [[hw, CU], [hw + SW, CU]];
          strip(walk, 2, sty === 2 ? 3 : 1, (r, c, p) => [p[0], p[2]], 0, true);
        }
      }
    } else {
      const sh = dirt ? 0.8 : 1.0, dy = dirt ? -0.05 : -0.08;
      for (const side of [-1, 1]) { const cols = side < 0 ? [[-hw - sh, dy], [-hw, 0]] : [[hw, 0], [hw + sh, dy]]; strip(cols, 3, 0, (r, c, p) => [p[0], p[2]]); }
    }
    // pintura das lombadas, concreto das valetas e buracos (decalques logo acima do asfalto, seguindo o relevo)
    for (const f of ch.feats || []) {
      if (f.kind === 2) {
        const base = mb.nv, ny = 1; mb.mat(7).color(f.r, 0, 0, 0);
        mb.v(f.x, f.y + f.amp * 0 + 0.012, f.z, 0, ny, 0, 0, 0);
        for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, rr = f.r * (0.85 + 0.3 * Math.sin(a * 3 + f.s)), x = f.x + Math.cos(a) * rr, z = f.z + Math.sin(a) * rr; chainAt(ch, f.s, o); mb.v(x, o[4] + 0.012, z, 0, 1, 0, Math.cos(a) * rr / f.r, Math.sin(a) * rr / f.r); }
        for (let k = 0; k < 10; k++) triN(mb, base, base + 1 + k, base + 1 + (k + 1) % 10);
        continue;
      }
      const ra = ss.findIndex(s => s >= f.s - f.half - 1e-6), rb = ss.findIndex(s => s > f.s + f.half + 1e-6);
      if (ra < 0) continue; const r1 = rb < 0 ? n - 1 : rb - 1; if (r1 <= ra) continue;
      const nc = 3, base = mb.nv;
      mb.mat(f.kind === 0 ? 6 : 2, f.kind === 0 ? 0 : 2).color(hw / 8, 0, 0, 0);
      for (let r = ra; r <= r1; r++) for (let c = 0; c < nc; c++) { const d = -hw + 0.05 + (2 * hw - 0.1) * c / (nc - 1), p = P(r, d, 0); mb.v(p[0], p[1] + 0.012, p[2], 0, 1, 0, ss[r] - f.s, d); }
      for (let r = 0; r < r1 - ra; r++) for (let c = 0; c < nc - 1; c++) { const a = base + r * nc + c; quadN(mb, a, a + 1, a + nc + 1, a + nc); }
    }
    rs.add(mb, i0, 7, 1600);
  }
  // cruzamentos: leque a partir do nó; meio-fio e calçada nas curvas de canto
  for (const J of C.juncs) {
    const i0 = mb.ni, P = J.poly, n = P.length / 3, nd = J.node, dirt = J.ends.every(e => e.ch.cls.dirt);
    // normais por vértice (média das faces do leque)
    const nrm = new Float64Array(n * 3);
    for (let a = 0; a < n; a++) {
      const b = (a + 1) % n, ax = P[a * 3] - nd.x, ay = P[a * 3 + 2] - nd.y, az = P[a * 3 + 1] - nd.z, bx = P[b * 3] - nd.x, by = P[b * 3 + 2] - nd.y, bz = P[b * 3 + 1] - nd.z;
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1; for (const v of [a, b]) { nrm[v * 3] += nx / l; nrm[v * 3 + 1] += ny / l; nrm[v * 3 + 2] += nz / l; }
    }
    let cx = 0, cy = 0, cz = 0; for (let a = 0; a < n; a++) { cx += nrm[a * 3]; cy += nrm[a * 3 + 1]; cz += nrm[a * 3 + 2]; }
    mb.mat(dirt ? 5 : 1).color(0.5, 0, 0, 0);
    const c0 = mb.v(nd.x, nd.y, nd.z, cx, cy, cz, nd.x, nd.z);
    for (let a = 0; a < n; a++) mb.v(P[a * 3], P[a * 3 + 2], P[a * 3 + 1], nrm[a * 3], nrm[a * 3 + 1] + 1e-3, nrm[a * 3 + 2], P[a * 3], P[a * 3 + 1]);
    for (let a = 0; a < n; a++) {
      const b = (a + 1) % n, ax = P[a * 3] - nd.x, az = P[a * 3 + 1] - nd.z, bx = P[b * 3] - nd.x, bz = P[b * 3 + 1] - nd.z;
      triN(mb, c0, c0 + 1 + a, c0 + 1 + b); void ax; void az; void bx; void bz;
    }
    for (const cb0 of J.curbs) {
      if (!cb0.urban) continue;
      // trechos da curva de canto que caem sobre a pista de outra via (cruzamentos colados, vias quase paralelas) não
      // ganham meio-fio nem calçada: antes viravam uma barreira desenhada no meio da rua e o carro parecia afundar
      const ok = cb0.pts.map(p => { _cq[0] = p[0]; _cq[1] = p[1]; cityRasterQ(_cq); return _cq[9] > -0.45; });
      const runs = []; let cur = [];
      cb0.pts.forEach((p, k) => { if (ok[k]) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } }); if (cur.length > 1) runs.push(cur);
      for (const pts of runs) {
      const m = pts.length, out = [];
      for (let k = 0; k < m; k++) {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(m - 1, k + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        let nx = -tz, nz = tx; if (nx * (pts[k][0] - nd.x) + nz * (pts[k][1] - nd.z) < 0) { nx = -nx; nz = -nz; }
        out.push([nx, nz]);
      }
      // face do meio-fio (normal para dentro do cruzamento)
      mb.mat(2, 0).color(0.5, 0, 0, 0);
      let base = mb.nv;
      for (let k = 0; k < m; k++) { const p = pts[k], q = out[k]; mb.v(p[0], p[2], p[1], -q[0], 0, -q[1], k * 0.6, 0); mb.v(p[0], p[2] + CU, p[1], -q[0], 0, -q[1], k * 0.6, CU); }
      for (let k = 0; k < m - 1; k++) { const a = base + k * 2; quadN(mb, a, a + 2, a + 3, a + 1); }
      // calçada
      mb.mat(2, 1);
      base = mb.nv;
      for (let k = 0; k < m; k++) { const p = pts[k], q = out[k]; let w = SW; for (; w > 0.4; w -= 0.4) { _cq[0] = p[0] + q[0] * w; _cq[1] = p[1] + q[1] * w; cityRasterQ(_cq); if (_cq[9] > 0.05) break; } const ex = p[0] + q[0] * w, ez = p[1] + q[1] * w; mb.v(p[0], p[2] + CU, p[1], 0, 1, 0, p[0], p[1]); mb.v(ex, p[2] + CU, ez, 0, 1, 0, ex, ez); }
      for (let k = 0; k < m - 1; k++) { const a = base + k * 2; quadN(mb, a, a + 2, a + 3, a + 1); }
      }
    }
    rs.add(mb, i0, 7, 1600);
  }
  // quad vertical: escolhe a ordem pelo sentido da normal desejada (nx, nz)
  function quadUp(a, b, c, d, p, q, nx, nz) { const ex = q[0] - p[0], ez = q[1] - p[1]; /* (b-a) ao longo, (d-a) para cima: normal = e × up */ const cx = -ez, cz = ex; if (cx * nx + cz * nz > 0) mb.quadI(a, b, c, d); else mb.quadI(a, d, c, b); }
  function tri2Up(a, b, c, d) {
    const f = mb.f32, ax = f[a * 9], az = f[a * 9 + 2], bx = f[b * 9], bz = f[b * 9 + 2], dx = f[d * 9], dz = f[d * 9 + 2];
    const ny = (bz - az) * (dx - ax) - (bx - ax) * (dz - az);   // componente y de (b-a) × (d-a)
    if (ny > 0) mb.quadI(a, b, c, d); else mb.quadI(a, d, c, b);
  }
  WORLD.stats.tris.ribbon = mb.ni / 3; WORLD.stats.ranges.ribbon = rs.r.length;
  rs.upload(mb);
}

// ---------- cenário urbano ----------
// retângulo com normal desejada (n): P0, lados U e V; uv em metros
function cRect(mb, px, py, pz, ux, uy, uz, vx, vy, vz, nx, ny, nz) {
  const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz);
  const a = mb.v(px, py, pz, nx, ny, nz, 0, 0), b = mb.v(px + ux, py + uy, pz + uz, nx, ny, nz, lu, 0), c = mb.v(px + ux + vx, py + uy + vy, pz + uz + vz, nx, ny, nz, lu, lv), d = mb.v(px + vx, py + vy, pz + vz, nx, ny, nz, 0, lv);
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * nx + cy * ny + cz * nz > 0) mb.quadI(a, b, c, d); else mb.quadI(a, d, c, b);
}
// triângulo com uv dados e normal da face, virada para cima (telhados)
function cTriUp(mb, A, B, Cc, uA, uB, uC) {
  const e1x = B[0] - A[0], e1y = B[1] - A[1], e1z = B[2] - A[2], e2x = Cc[0] - A[0], e2y = Cc[1] - A[1], e2z = Cc[2] - A[2];
  let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; const flip = ny < 0; if (flip) { nx = -nx; ny = -ny; nz = -nz; }
  const a = mb.v(A[0], A[1], A[2], nx, ny, nz, uA[0], uA[1]), b = mb.v(B[0], B[1], B[2], nx, ny, nz, uB[0], uB[1]), c = mb.v(Cc[0], Cc[1], Cc[2], nx, ny, nz, uC[0], uC[1]);
  if (flip) mb.tri(a, c, b); else mb.tri(a, b, c);
}
// telhado de quatro águas (ou duas, gable = true) sobre o retângulo local x∈[-dx/2,dx/2], z∈[-dz/2,dz/2] na altura y
function cRoof(mb, dx, dz, y, rise, eave, gable) {
  const X = dx / 2 + eave, Z = dz / 2 + eave, alongZ = dz >= dx, r = alongZ ? X : Z, rl = alongZ ? Z - (gable ? 0 : r) : X - (gable ? 0 : r), top = y + rise;
  const slope = Math.hypot(r, rise);
  // pontos do beiral e da cumeeira
  const e = [[-X, y, -Z], [X, y, -Z], [X, y, Z], [-X, y, Z]];
  const k0 = alongZ ? [0, top, -rl] : [-rl, top, 0], k1 = alongZ ? [0, top, rl] : [rl, top, 0];
  const uvS = (p, ax, len) => [p[ax === 0 ? 2 : 0], 0];
  if (alongZ) {
    // águas longas (laterais em x) e oitões/águas curtas (frente/fundo em z)
    cTriUp(mb, e[0], e[3], k1, [-Z, 0], [Z, 0], [rl, slope]); cTriUp(mb, e[0], k1, k0, [-Z, 0], [rl, slope], [-rl, slope]);
    cTriUp(mb, e[1], k0, k1, [-Z, 0], [-rl, slope], [rl, slope]); cTriUp(mb, e[1], k1, e[2], [-Z, 0], [rl, slope], [Z, 0]);
    if (!gable) { cTriUp(mb, e[0], k0, e[1], [-X, 0], [0, Math.hypot(Z - rl, rise)], [X, 0]); cTriUp(mb, e[3], e[2], k1, [-X, 0], [X, 0], [0, Math.hypot(Z - rl, rise)]); }
  } else {
    cTriUp(mb, e[0], k0, k1, [-X, 0], [-rl, slope], [rl, slope]); cTriUp(mb, e[0], k1, e[1], [-X, 0], [rl, slope], [X, 0]);
    cTriUp(mb, e[3], e[2], k1, [-X, 0], [X, 0], [rl, slope]); cTriUp(mb, e[3], k1, k0, [-X, 0], [rl, slope], [-rl, slope]);
    if (!gable) { cTriUp(mb, e[0], e[3], k0, [-Z, 0], [Z, 0], [0, Math.hypot(X - rl, rise)]); cTriUp(mb, e[1], k1, e[2], [-Z, 0], [0, Math.hypot(X - rl, rise)], [Z, 0]); }
  }
  return { k0, k1, alongZ, X, Z, top };
}
// beiral: forro sob a aba do telhado (visto de baixo, da rua)
function cSoffit(mb, dx, dz, y, eave) {
  const X = dx / 2, Z = dz / 2, E = eave;
  cRect(mb, -X - E, y, -Z - E, 2 * (X + E), 0, 0, 0, 0, E, 0, -1, 0); cRect(mb, -X - E, y, Z, 2 * (X + E), 0, 0, 0, 0, E, 0, -1, 0);
  cRect(mb, -X - E, y, -Z, E, 0, 0, 0, 0, 2 * Z, 0, -1, 0); cRect(mb, X, y, -Z, E, 0, 0, 0, 0, 2 * Z, 0, -1, 0);
}
// paredes de uma caixa sem tampa (x∈[-dx/2,dx/2], z∈[-dz/2,dz/2], y∈[y0,y1])
function cWalls(mb, dx, dz, y0, y1) {
  const X = dx / 2, Z = dz / 2, h = y1 - y0;
  cRect(mb, -X, y0, -Z, 0, 0, dz, 0, h, 0, -1, 0, 0); cRect(mb, X, y0, -Z, 0, 0, dz, 0, h, 0, 1, 0, 0);
  cRect(mb, -X, y0, -Z, dx, 0, 0, 0, h, 0, 0, 0, -1); cRect(mb, -X, y0, Z, dx, 0, 0, 0, h, 0, 0, 0, 1);
}
// janela/porta na parede x = xw (normal nx = ±1), centrada em z, de y0 a y1
function cOpening(mb, xw, nx, z, w, y0, y1, mat, col) {
  mb.mat(mat).color(col[0], col[1], col[2], 1);
  cRect(mb, xw + nx * 0.03, y0, z - w / 2, 0, 0, w, 0, y1 - y0, 0, nx, 0, 0);
}
function cOpeningZ(mb, zw, nz, x, w, y0, y1, mat, col) {
  mb.mat(mat).color(col[0], col[1], col[2], 1);
  cRect(mb, x - w / 2, y0, zw + nz * 0.03, w, 0, 0, 0, y1 - y0, 0, 0, 0, nz);
}
// uma casa (ou loja) no seu lote; quadro local: X da rua para o fundo, Z ao longo da rua
function cityHouse(mb, h, rnd) {
  const C = CITY, d = h.d, w = h.w, set = h.set, X = d / 2, Zh = w / 2;
  // chão: maior altura sob a frente; paredes descem até abaixo do terreno mais baixo
  let ymin = 1e9, ymax = -1e9;
  for (const [a, b] of [[-X, -Zh], [X, -Zh], [X, Zh], [-X, Zh], [0, 0]]) { const y = hfAt(h.x + h.nx * a + h.fx * b, h.z + h.nz * a + h.fz * b); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
  const y0 = Math.max(h.yr, ymax) + 0.12, yb = ymin - 0.6, H1 = h.two ? 5.8 : 2.95 + rnd() * 0.25;
  mb.push(m4basis(m4(), h.nx, 0, h.nz, 0, 1, 0, h.fx, 0, h.fz, h.x, y0, h.z));
  const col = h.col, dark = [col[0] * 0.55, col[1] * 0.52, col[2] * 0.5];
  // paredes (reboco pintado) e barrado
  mb.mat(19, Math.round(150 + rnd() * 80), 0, 0).color(col[0], col[1], col[2], 1);
  cWalls(mb, d, w, yb - y0, H1);
  mb.mat(19, 230, 0, 0).color(dark[0], dark[1], dark[2], 1);
  cRect(mb, -X - 0.025, yb - y0, -Zh - 0.025, 0, 0, w + 0.05, 0, 0.45 - (yb - y0), 0, -1, 0, 0);
  // fachada da rua (x = -X)
  const wcol = [0.9, 0.9, 0.88], gcol = h.seed < 0.5 ? [0.2, 0.2, 0.21] : [0.85, 0.85, 0.82];
  if (h.comm && h.style) {
    // loja com fachada feita pelo Street View: vitrine com grades brancas de abrir, toldo em arco, letreiro e telhado de telha
    const S = h.style;
    cOpening(mb, -X, -1, 0, w - 1.6, 0, 2.7, 21, S.frame || [0.95, 0.95, 0.94]);
    if (S.grade) { mb.mat(2, 150, 0).color(0.94, 0.94, 0.93, 1); for (const s of [-1, 1]) { const z0 = s * (w / 2 - 0.4); for (let k = 0; k < 9; k++) mb.box(-X - 0.08, 1.35, z0 - s * (0.1 + k * 0.11), 0.03, 2.7, 0.025); mb.box(-X - 0.08, 2.65, z0 - s * 0.5, 0.04, 0.05, 1.0); mb.box(-X - 0.08, 0.1, z0 - s * 0.5, 0.04, 0.05, 1.0); } }
    if (S.awning) {   // toldo de policarbonato em arco, translúcido
      mb.mat(10).color(...S.awning, 1); const N = 6, aw = w - 1.4; let pp = null;
      for (let k = 0; k <= N; k++) { const a = k / N * PI / 2, x = -X - Math.sin(a) * 1.1, y = 2.75 + Math.cos(a) * 0.55; if (pp) cRect(mb, pp[0], pp[1], -aw / 2, x - pp[0], y - pp[1], 0, 0, 0, aw, -Math.sin(a), Math.cos(a), 0); pp = [x, y]; }
      mb.mat(2, 140, 160).color(0.85, 0.85, 0.85, 1); for (const z of [-aw / 2, aw / 2]) mb.tube([[-X, 3.3, z], [-X - 0.8, 3.15, z], [-X - 1.1, 2.75, z]], 0.02, 4);
    }
    mb.mat(19, 160).color(col[0] * 0.96, col[1] * 0.96, col[2] * 0.96, 1); cRect(mb, -X - 0.02, 2.8, -Zh, 0, 0, w, 0, H1 - 2.8 + 0.9, 0, -1, 0, 0);
    if (h.shop) { const q = (a, b) => [h.x + h.nx * a + h.fx * b, h.z + h.nz * a + h.fz * b]; const sw = Math.min(w - 0.8, S.signW || w), c0 = q(-X - 0.06, -sw / 2), c1 = q(-X - 0.06, sw / 2); CITY.signs.push({ name: h.shop, bg: h.signBg, fg: h.signFg, sub: S.sub, x: c0[0], y: y0 + 3.4, z: c0[1], rx: c1[0] - c0[0], rz: c1[1] - c0[1], h: S.signH || 1.0, nx: -h.nx, nz: -h.nz }); }
    mb.mat(20).color(...(S.roof || [0.55, 0.26, 0.14]), 1); cRoof(mb, d, w, H1 + 0.9, Math.min(d, w) * 0.3, 0.45, false);
    mb.mat(19, 180).color(0.92, 0.91, 0.88, 1); cSoffit(mb, d, w, H1 + 0.9, 0.45);
  } else if (h.comm) {
    // loja: portas de enrolar na frente toda, toldo e platibanda colorida
    const nd = Math.max(1, Math.round((w - 0.8) / 3.4)), dw = (w - 0.8) / nd;
    for (let i = 0; i < nd; i++) cOpening(mb, -X, -1, -Zh + 0.4 + dw * (i + 0.5), dw - 0.35, 0, 2.75, 13, [0.62 + rnd() * 0.2, 0.6, 0.55]);
    const pc = [[0.75, 0.12, 0.1], [0.12, 0.3, 0.6], [0.85, 0.65, 0.1], [0.15, 0.5, 0.25], [0.9, 0.9, 0.88]][(h.seed * 5) | 0];
    mb.mat(19, 160).color(pc[0], pc[1], pc[2], 1);
    cRect(mb, -X - 0.12, H1, -Zh, 0, 0, w, 0, 1.3, 0, -1, 0, 0);                  // platibanda
    if (h.shop) { const q = (a, b) => [h.x + h.nx * a + h.fx * b, h.z + h.nz * a + h.fz * b]; const c0 = q(-X - 0.16, -(w / 2 - 0.3)), c1 = q(-X - 0.16, w / 2 - 0.3); CITY.signs.push({ name: h.shop, bg: h.signBg, fg: h.signFg, x: c0[0], y: y0 + H1 + 0.15, z: c0[1], rx: c1[0] - c0[0], rz: c1[1] - c0[1], h: 1.0, nx: -h.nx, nz: -h.nz }); }
    cRect(mb, -X - 0.12, H1, -Zh, 0.12, 0, 0, 0, 1.3, 0, 0, 0, -1); cRect(mb, -X - 0.12, H1, Zh, 0.12, 0, 0, 0, 1.3, 0, 0, 0, 1);
    mb.mat(19, 200).color(col[0] * 0.9, col[1] * 0.9, col[2] * 0.9, 1);
    cWalls(mb, d - 0.4, w, H1, H1 + 1.0);                                            // mureta do telhado plano
    mb.mat(3).color(0.42, 0.41, 0.39, 1); cRect(mb, -X + 0.2, H1 + 0.6, -Zh, d - 0.4, 0, 0, 0, 0, w, 0, 1, 0);   // laje
    if (h.seed > 0.4) { mb.mat(10).color(pc[0] * 0.9 + 0.08, pc[1] * 0.9 + 0.08, pc[2] * 0.9 + 0.08, 1); cRect(mb, -X, 3.0, -Zh + 0.3, -1.6, -0.45, 0, 0, 0, w - 0.6, 0, 0.96, -0.27); }
    if (h.two) for (let i = 0; i < nd; i++) cOpening(mb, -X - 0.12, -1, -Zh + 0.4 + dw * (i + 0.5), Math.min(1.6, dw - 0.8), 3.4, 4.6, 21, wcol);
  } else {
    // casa: porta, janelas com grade, garagem (porta de enrolar) em parte delas
    const gar = w > 8.6 && h.gate < 0.45 && !h.wall, gz = gar ? Zh - 1.6 : 0;
    if (gar) cOpening(mb, -X, -1, gz, 2.6, 0, 2.3, 13, [0.55 + rnd() * 0.3, 0.55, 0.52]);
    const dz = gar ? -Zh + 1.4 : (h.seed < 0.5 ? -Zh + 1.3 : Zh - 1.3);
    cOpening(mb, -X, -1, dz, 0.9, 0, 2.1, 2, h.seed < 0.3 ? [0.32, 0.18, 0.09] : [0.75, 0.74, 0.7]);
    const winZ = gar ? [dz + 2.0] : [dz + (dz < 0 ? 2.1 : -2.1), dz + (dz < 0 ? 4.4 : -4.4)];
    for (const z of winZ) if (Math.abs(z) < Zh - 0.8) cOpening(mb, -X, -1, z, 1.3, 1.0, 2.15, 21, wcol);
    for (const s of [-1, 1]) cOpeningZ(mb, s * Zh, s, -X + d * 0.45, 1.1, 1.05, 2.1, 21, wcol);   // janelas laterais
    if (h.two) { for (const z of [-Zh * 0.5, Zh * 0.5]) cOpening(mb, -X, -1, z, 1.3, 3.9, 5.05, 21, wcol); }
    // telhado
    if (h.roof < 0.8) {
      const tile = h.roof < 0.62, tc = [[0.27, 0.17, 0.12], [0.5, 0.22, 0.1], [0.36, 0.24, 0.17], [0.44, 0.3, 0.22], [0.24, 0.22, 0.21]][(h.seed * 997 | 0) % 5], rcol = tile ? [tc[0] * (0.9 + rnd() * 0.2), tc[1], tc[2]] : [0.5, 0.5, 0.47];
      const gable = h.roof > 0.45 && h.roof < 0.62;
      mb.mat(tile ? 20 : 9).color(rcol[0], rcol[1], rcol[2], 1);
      const r = cRoof(mb, d, w, H1, Math.min(d, w) * (tile ? 0.27 : 0.16), 0.5, gable);
      mb.mat(19, 180).color(0.92, 0.91, 0.88, 1); cSoffit(mb, d, w, H1, 0.5);
      if (gable) {   // oitões: triângulos de parede sob a cumeeira
        mb.mat(19, 150).color(col[0], col[1], col[2], 1);
        if (r.alongZ) { for (const s of [-1, 1]) cTriUp(mb, [-X, H1, s * Zh], [X, H1, s * Zh], [0, r.top - 0.05, s * Zh], [0, 0], [d, 0], [X, 1]); }
        else { for (const s of [-1, 1]) cTriUp(mb, [s * X, H1, -Zh], [s * X, H1, Zh], [s * X, r.top - 0.05, 0], [0, 0], [w, 0], [Zh, 1]); }
      }
    } else {
      // laje com platibanda
      mb.mat(19, 170).color(col[0], col[1], col[2], 1); cWalls(mb, d, w, H1, H1 + 0.8);
      mb.mat(3).color(0.4, 0.39, 0.37, 1); cRect(mb, -X, H1 + 0.45, -Zh, d, 0, 0, 0, 0, w, 0, 1, 0);
      mb.mat(1).color(0.6, 0.6, 0.6, 1); mb.cyl(X * 0.4, H1 + 0.45, Zh * 0.4, 0.55, H1 + 1.6, 0.55, 10, false, true);   // caixa d'água
    }
  }
  // muro da frente com portão e muros laterais até a casa
  if (h.wall && set > 1.0) {
    const xw = -X - set + 0.08, mh = 1.9 + rnd() * 0.6, mcol = rnd() < 0.5 ? col : [0.85, 0.84, 0.8], gw = Math.min(w - 2.2, 3.2 + rnd() * 2.6), gzc = (h.gate - 0.5) * (w - gw - 1);
    mb.mat(19, 210).color(mcol[0], mcol[1], mcol[2], 1);
    const seg = (z0, z1) => { if (z1 - z0 < 0.05) return; mb.box(xw, (yb - y0 + mh) / 2, (z0 + z1) / 2, 0.16, mh - (yb - y0), z1 - z0); };
    seg(-Zh, gzc - gw / 2); seg(gzc + gw / 2, Zh);
    for (const s of [-1, 1]) mb.box((xw + -X) / 2, (yb - y0 + mh) / 2, s * (Zh - 0.08), -X - xw, mh - (yb - y0), 0.16);
    const gc = [[0.33, 0.26, 0.16], [0.08, 0.08, 0.09], [0.85, 0.85, 0.83], [0.45, 0.45, 0.46], [0.36, 0.22, 0.12]][(h.seed * 4111 | 0) % 5];
    mb.mat(13).color(gc[0], gc[1], gc[2], 1);   // portão de lâminas horizontais
    cRect(mb, xw - 0.09, 0, gzc - gw / 2, 0, 0, gw, 0, mh - 0.1, 0, -1, 0, 0); cRect(mb, xw + 0.09, 0, gzc - gw / 2, 0, 0, gw, 0, mh - 0.1, 0, 1, 0, 0);
    mb.mat(2, 140, 150).color(gc[0], gc[1], gc[2], 1); mb.box(xw, mh - 0.05, gzc, 0.12, 0.1, gw + 0.1);
    mb.mat(3).color(0.5, 0.49, 0.46, 1); cRect(mb, xw, 0.02, -Zh, -X - xw, 0, 0, 0, 0, w, 0, 1, 0);   // quintal da frente cimentado
  }
  mb.pop();
}
// prédio genérico (público): caixa de 1–2 andares, telhado de fibrocimento ou laje, janelas em fila
function cityBuilding(mb, x, z, yaw, d, w, floors, col, opt) {
  opt = opt || {};
  const y = hfAt(x, z) + 0.15, c = Math.cos(yaw), s = Math.sin(yaw), H = floors * 3.1;
  let ymin = 1e9; for (const [a, b] of [[-d / 2, -w / 2], [d / 2, -w / 2], [d / 2, w / 2], [-d / 2, w / 2]]) ymin = Math.min(ymin, hfAt(x + c * a - s * b, z + s * a + c * b));
  mb.push(m4basis(m4(), c, 0, s, 0, 1, 0, -s, 0, c, x, y, z));
  mb.mat(19, 170).color(col[0], col[1], col[2], 1); cWalls(mb, d, w, ymin - y - 0.6, H);
  for (let f = 0; f < floors; f++) for (let zz = -w / 2 + 2; zz <= w / 2 - 1.5; zz += 3) { cOpening(mb, -d / 2, -1, zz, 1.6, 1.0 + f * 3.1, 2.3 + f * 3.1, 21, [0.88, 0.88, 0.86]); cOpening(mb, d / 2, 1, zz, 1.6, 1.0 + f * 3.1, 2.3 + f * 3.1, 21, [0.88, 0.88, 0.86]); }
  cOpening(mb, -d / 2, -1, opt.door || 0, 1.8, 0, 2.4, 5, [1, 1, 1]);
  if (opt.sign) { const sw = Math.min(w - 1, Math.max(4, opt.sign.length * 0.38)), q = (a, b) => [x + c * a - s * b, z + s * a + c * b], c0 = q(-d / 2 - 0.06, -sw / 2), c1 = q(-d / 2 - 0.06, sw / 2); CITY.signs.push({ name: opt.sign, bg: opt.bg || '#f4f4f0', fg: opt.fg || '#123a6b', x: c0[0], y: y + 2.65, z: c0[1], rx: c1[0] - c0[0], rz: c1[1] - c0[1], h: Math.min(0.9, sw / 6), nx: -c, nz: -s }); }
  if (opt.flat) { mb.mat(19, 170).color(col[0], col[1], col[2], 1); cWalls(mb, d, w, H, H + 0.9); mb.mat(3).color(0.4, 0.39, 0.37, 1); cRect(mb, -d / 2, H + 0.5, -w / 2, d, 0, 0, 0, 0, w, 0, 1, 0); }
  else { mb.mat(opt.tile ? 20 : 9).color(...(opt.tile ? [0.5, 0.22, 0.1] : [0.52, 0.52, 0.5]), 1); cRoof(mb, d, w, H, Math.min(d, w) * 0.2, 0.7, !!opt.gable); mb.mat(19, 180).color(0.9, 0.9, 0.88, 1); cSoffit(mb, d, w, H, 0.7); }
  mb.pop();
  CITY.addBox({ x, z, ux: c, uz: s, hd: d / 2, hw: w / 2 });
}
function cityChurch(mb, x, z, yaw) {
  const y = hfAt(x, z) + 0.2, c = Math.cos(yaw), s = Math.sin(yaw), D = 28, W = 13, H = 10;
  mb.push(m4basis(m4(), c, 0, s, 0, 1, 0, -s, 0, c, x, y, z));
  const wc = [0.93, 0.9, 0.82], tr = [0.35, 0.5, 0.75];
  mb.mat(19, 140).color(...wc, 1); cWalls(mb, D, W, -1.5, H);
  // fachada com frontão (x = -D/2) e torre central
  cTriUp(mb, [-D / 2, H, -W / 2], [-D / 2, H, W / 2], [-D / 2, H + 4.2, 0], [0, 0], [W, 0], [W / 2, 4]);
  mb.mat(20).color(0.5, 0.22, 0.1, 1); cRoof(mb, D, W, H, 4.2, 0.6, true);
  mb.mat(19, 140).color(...wc, 1); cTriUp(mb, [D / 2, H, -W / 2], [D / 2, H, W / 2], [D / 2, H + 4.2, 0], [0, 0], [W, 0], [W / 2, 4]);
  for (let k = -2; k <= 2; k++) { cOpeningZ(mb, -W / 2, -1, k * 4.5, 1.2, 3.0, 7.5, 21, tr); cOpeningZ(mb, W / 2, 1, k * 4.5, 1.2, 3.0, 7.5, 21, tr); }
  cOpening(mb, -D / 2 - 2.5, -1, 0, 2.6, 0, 4.4, 2, [0.35, 0.2, 0.1]);
  // torre
  mb.mat(19, 140).color(...wc, 1); mb.box(-D / 2 - 2.5, 9.5, 0, 5, 22, 5);
  for (const sz of [-1, 1]) cOpeningZ(mb, sz * 2.5, sz, -D / 2 - 2.5, 1.4, 15.5, 18.5, 2, [0.12, 0.12, 0.13]);
  cOpening(mb, -D / 2 - 5, -1, 0, 1.4, 15.5, 18.5, 2, [0.12, 0.12, 0.13]);
  mb.mat(20).color(0.5, 0.22, 0.1, 1); cRoof(mb, 5, 5, 20.5, 5.5, 0.35, false);
  mb.mat(1).color(0.8, 0.8, 0.78, 1); mb.box(-D / 2 - 2.5, 27.4, 0, 0.18, 2.4, 0.18); mb.box(-D / 2 - 2.5, 27.9, 0, 0.18, 0.18, 1.2);
  mb.pop();
  CITY.addBox({ x, z, ux: c, uz: s, hd: D / 2, hw: W / 2 }); CITY.addBox({ x: x - c * (D / 2 + 2.5), z: z - s * (D / 2 + 2.5), ux: c, uz: s, hd: 2.5, hw: 2.5 });
}
// direção da via mais próxima (para alinhar construções): devolve o ângulo da normal da via (apontando do ponto para a via)
function cityFaceRoad(x, z) {
  const C = CITY; let best = 1e18, ang = 0;
  for (const ch of C.chains) {
    if (ch.cls.dirt) continue;
    for (let i = 1; i < ch.n; i++) {
      const ax = ch.x[i - 1], az = ch.z[i - 1], ex = ch.x[i] - ax, ez = ch.z[i] - az, l2 = ex * ex + ez * ez; if (l2 < 1e-6) continue;
      const t = clamp(((x - ax) * ex + (z - az) * ez) / l2, 0, 1), px = ax + ex * t - x, pz = az + ez * t - z, d = px * px + pz * pz;
      if (d < best) { best = d; ang = Math.atan2(pz, px); }
    }
  }
  return { ang, dist: Math.sqrt(best) };
}
function cityPropsBuild() {
  const C = CITY, rnd = mkRng(31337);
  const atlas = atlasBuild();
  const fam = mkFamily('props', { src: 'mat_props' }), famDS = mkFamily('propsDS', { src: 'mat_props', cull: 'none' });
  const bg3 = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: atlas.createView() }] });
  const S1 = new RangeSet(fam, bg3), S2 = new RangeSet(famDS, bg3);
  const mb = new MeshBuilder(1 << 19), md = new MeshBuilder(1 << 15);
  // casas agrupadas por região de 128 m (faixas de desenho com culling)
  const key = h => Math.floor((h.x - C.X0) / 128) + Math.floor((h.z - C.Z0) / 128) * 64;
  const hs = C.houses.slice().sort((a, b) => key(a) - key(b));
  let cur = null, i0 = 0;
  for (const h of hs) { const k = key(h); if (k !== cur) { if (cur !== null) S1.add(mb, i0, 7, 1400); cur = k; i0 = mb.ni; } cityHouse(mb, h, rnd); }
  S1.add(mb, i0, 7, 1400);
  // construções públicas nos pontos do mapa
  i0 = mb.ni;
  for (const p of C.pois) {
    const t = p.tags, f = cityFaceRoad(p.x, p.z), yaw = f.ang + PI;   // eixo local X: da via para dentro do lote
    const off = (dd) => [p.x - Math.cos(f.ang) * Math.max(0, dd - f.dist), p.z - Math.sin(f.ang) * Math.max(0, dd - f.dist)];
    if (t.am === 'place_of_worship') { if (MARCOS.matriz) continue; const [x, z] = off(C.SW + 4.2 + 20); cityChurch(mb, x, z, yaw); }
    else if (t.am === 'school' || t.am === 'kindergarten') { const [x, z] = off(4.2 + C.SW + 8); cityBuilding(mb, x, z, yaw, 12, t.am === 'school' ? 34 : 18, 1, [0.92, 0.88, 0.72], { gable: false, sign: (p.name || (t.am === 'school' ? 'Escola' : 'Creche')).replace(/^Escola Estadual /, 'E. E. ').replace(/^Escola M+unicipal /, 'E. M. ').toUpperCase(), bg: '#f4f4f0', fg: '#1a4d8f' }); }
    else if (t.am === 'townhall') { const [x, z] = off(4.2 + C.SW + 9); cityBuilding(mb, x, z, yaw, 14, 22, 2, [0.94, 0.92, 0.84], { flat: true, sign: 'PREFEITURA MUNICIPAL DE NOVA ALIANÇA', bg: '#f4f4f0', fg: '#0d3b66' }); }
    else if (t.am === 'post_office') { const [x, z] = off(4.2 + C.SW + 7); cityBuilding(mb, x, z, yaw, 11, 12, 1, [0.95, 0.8, 0.15], { flat: true, sign: 'CORREIOS', bg: '#ffd400', fg: '#0052a5' }); }
    else if (t.am === 'police') { const [x, z] = off(4.2 + C.SW + 7); cityBuilding(mb, x, z, yaw, 11, 14, 1, [0.82, 0.84, 0.86], { flat: true, sign: (p.name || 'POLÍCIA').toUpperCase(), bg: '#5d4037', fg: '#fff' }); }
    else if (t.am === 'clinic' || t.am === 'nursing_home' || t.am === 'funeral_hall' || t.am === 'library') { const [x, z] = off(4.2 + C.SW + 7); cityBuilding(mb, x, z, yaw, 11, 16, 1, [0.9, 0.9, 0.86], { sign: (p.name || (t.am === 'library' ? 'Biblioteca Municipal' : t.am === 'clinic' ? 'Unidade Básica de Saúde' : '')).toUpperCase().replace('UNIDADE BÁSICA DE SAÚDE DE NOVA ALIANÇA', 'UBS NOVA ALIANÇA') || null, bg: t.am === 'clinic' ? '#0277bd' : '#f4f4f0', fg: t.am === 'clinic' ? '#fff' : '#333' }); }
    else if (t.bd === 'transportation') { // rodoviária: cobertura sobre pilares
      const [x, z] = off(4.2 + C.SW + 6), y = hfAt(x, z) + 0.15, c = Math.cos(yaw), s = Math.sin(yaw);
      mb.push(m4basis(m4(), c, 0, s, 0, 1, 0, -s, 0, c, x, y, z)); mb.mat(3).color(0.6, 0.59, 0.56, 1);
      for (const a of [-4, 4]) for (const b of [-10, -3.3, 3.3, 10]) { mb.box(a, 1.8, b, 0.4, 3.6, 0.4); mbColCircle(mb, a, b, 0.28); }
      mb.mat(2, 120, 0).color(0.85, 0.85, 0.82, 1); mb.box(0, 3.75, 0, 10, 0.3, 23); mb.pop();
      C.pave.push(x, z, 14);
    } else if (t.am === 'fuel') { // posto: cobertura, bombas, loja
      const [x, z] = off(4.2 + C.SW + 9), y = hfAt(x, z) + 0.12, c = Math.cos(yaw), s = Math.sin(yaw);
      mb.push(m4basis(m4(), c, 0, s, 0, 1, 0, -s, 0, c, x, y, z));
      mb.mat(2, 90, 30).color(0.85, 0.85, 0.85, 1); for (const a of [-3, 3]) for (const b of [-5, 5]) mb.box(a, 2.4, b, 0.35, 4.8, 0.35);
      mb.mat(2, 60, 0).color(0.9, 0.9, 0.9, 1); mb.box(0, 5.0, 0, 10, 0.8, 16); mb.mat(2, 80, 0).color(0.1, 0.45, 0.2, 1); mb.box(-5.02, 5.0, 0, 0.06, 0.6, 16.02); mb.box(5.02, 5.0, 0, 0.06, 0.6, 16.02);
      mb.mat(2, 100, 0).color(0.8, 0.8, 0.78, 1); for (const b of [-4, 0, 4]) mb.box(0, 0.8, b, 0.9, 1.6, 0.6);
      mb.pop();
      cityBuilding(mb, x + c * 12, z + s * 12, yaw, 7, 10, 1, [0.95, 0.95, 0.93], { flat: true, sign: (p.name || 'AUTO POSTO').toUpperCase(), bg: '#c62828', fg: '#fff' });
      C.pave.push(x, z, 15);
    } else if (t.ls === 'pitch') { // campo de futebol: linhas e traves (grama do próprio terreno)
      const [x, z] = off(4.2 + C.SW + 38), c = Math.cos(yaw), s = Math.sin(yaw), y = hfAt(x, z);
      mb.push(m4basis(m4(), c, 0, s, 0, 1, 0, -s, 0, c, x, y + 0.04, z)); mb.mat(2, 200, 0).color(0.85, 0.85, 0.82, 1);
      const L2 = 42, W2 = 27, lw = 0.12;
      cRect(mb, -W2, 0, -L2, 2 * W2, 0, 0, 0, 0, lw, 0, 1, 0); cRect(mb, -W2, 0, L2 - lw, 2 * W2, 0, 0, 0, 0, lw, 0, 1, 0);
      cRect(mb, -W2, 0, -L2, lw, 0, 0, 0, 0, 2 * L2, 0, 1, 0); cRect(mb, W2 - lw, 0, -L2, lw, 0, 0, 0, 0, 2 * L2, 0, 1, 0); cRect(mb, -W2, 0, -lw / 2, 2 * W2, 0, 0, 0, 0, lw, 0, 1, 0);
      mb.mat(1).color(0.9, 0.9, 0.9, 1); for (const e of [-1, 1]) { mb.box(-3.66, 1.22, e * L2, 0.12, 2.44, 0.12); mb.box(3.66, 1.22, e * L2, 0.12, 2.44, 0.12); mb.box(0, 2.44, e * L2, 7.44, 0.12, 0.12); }
      mb.pop();
    } else if (t.bd === 'storage_tank') { const y = hfAt(p.x, p.z); mb.mat(1).color(0.7, 0.7, 0.7, 1); mb.cyl(p.x, y - 0.5, p.z, 4.5, y + 9, 4.5, 20, false, true); C.addBox({ x: p.x, z: p.z, ux: 1, uz: 0, hd: 4.4, hw: 4.4 }); }
  }
  S1.add(mb, i0, 7, 1600);
  // praças: caminhos em cruz, bancos e um coreto na maior
  i0 = mb.ni;
  let big = null; for (const B of C.blocks) if (B.kind === 'park' && !B.matriz && (!big || B.cells.length > big.cells.length)) big = B;
  for (const B of C.blocks) {
    if (B.kind !== 'park' || B.matriz) continue;
    let cx = 0, cz = 0; for (const k of B.cells) { cx += k % C.W; cz += Math.floor(k / C.W); } cx = C.X0 + cx / B.cells.length; cz = C.Z0 + cz / B.cells.length;
    const r = Math.sqrt(B.cells.length / PI);
    for (let a = 0; a < 4; a++) { const ang = a * PI / 2 + 0.3; C.pave.push(cx + Math.cos(ang) * r * 0.5, cz + Math.sin(ang) * r * 0.5, 1.6); C.pave.push(cx + Math.cos(ang) * r * 0.2, cz + Math.sin(ang) * r * 0.2, 1.6); C.pave.push(cx + Math.cos(ang) * r * 0.8, cz + Math.sin(ang) * r * 0.8, 1.6); }
    C.pave.push(cx, cz, B === big ? 9 : 4);
    B.free = (x, z) => Math.hypot(x - cx, z - cz) < (B === big ? 10 : 5);
    if (B === big) {   // coreto octogonal
      const y = hfAt(cx, cz) + 0.1; mb.mat(3).color(0.7, 0.69, 0.66, 1); mb.cyl(cx, y - 0.5, cz, 5, y + 0.6, 5, 8, false, true);
      mb.mat(2, 120).color(0.92, 0.92, 0.9, 1); for (let k = 0; k < 8; k++) { const a = k * PI / 4; mb.box(cx + Math.cos(a) * 4.4, y + 2.1, cz + Math.sin(a) * 4.4, 0.25, 3.0, 0.25); }
      mb.mat(20).color(0.5, 0.22, 0.1, 1); mb.cyl(cx, y + 3.6, cz, 5.4, y + 5.6, 0.2, 8, true, false);
      C.addBox({ x: cx, z: cz, ux: 1, uz: 0, hd: 4.6, hw: 4.6 });
    }
    for (let k = 0; k < 8; k++) { const a = k * PI / 4 + 0.7, x = cx + Math.cos(a) * r * 0.45, z = cz + Math.sin(a) * r * 0.45, y = hfAt(x, z); mb.mat(2, 140).color(0.25, 0.35, 0.2, 1); mb.box(x, y + 0.45, z, 0.5, 0.08, 1.8); mb.mat(3).color(0.6, 0.6, 0.58, 1); mb.box(x, y + 0.2, z, 0.4, 0.42, 0.2); }
  }
  S1.add(mb, i0, 7, 900);
  // postes de concreto (rede elétrica) com braço de iluminação e fiação entre eles, num lado de cada rua urbana
  i0 = mb.ni;
  const o = new Float64Array(5);
  for (const ch of C.chains) {
    const poles = C.poles.filter(p => p.ch === ch.id);
    if (!poles.length) continue;
    for (const P of poles) {
      const { x, y, z, nx, nz } = P;
      // poste de concreto cônico, cruzeta com isoladores, transformador em alguns
      mb.mat(3).color(0.6, 0.59, 0.56, 1); mb.cyl(x, y - 0.5, z, 0.16, y + 9.2, 0.09, 8, false, true);
      mb.push(m4basis(m4(), P.tx, 0, P.tz, 0, 1, 0, -P.tz, 0, P.tx, x, y, z));
      mb.mat(3).color(0.55, 0.54, 0.51, 1); mb.box(0, 8.75, 0, 1.9, 0.11, 0.11);
      mb.mat(2, 200, 0, 30).color(0.2, 0.3, 0.25, 1); for (const a of [-0.8, 0, 0.8]) mb.box(a, 8.9, 0, 0.07, 0.18, 0.07);
      if (P.trafo) { mb.mat(1).color(0.55, 0.57, 0.58, 1); mb.cyl(0, 6.4, P.side * 0.45, 0.32, 7.6, 0.32, 10, true, true); }
      mb.pop();
      mb.mat(11, 0, 0, 40).color(0.6, 0.6, 0.6, 1); mb.tube([[x, y + 7.2, z], [x - nx * 0.9, y + 7.65, z - nz * 0.9], [x - nx * 1.8, y + 7.7, z - nz * 1.8]], 0.035, 5);
      mb.mat(2, 120, 80, 35).color(0.28, 0.28, 0.3, 1); mb.box(x - nx * 1.95, y + 7.67, z - nz * 1.95, 0.5, 0.11, 0.28);
      mb.mat(24, 255).color(1, 0.86, 0.62, 1); mb.box(x - nx * 1.95, y + 7.6, z - nz * 1.95, 0.4, 0.04, 0.22);   // lente da luminária (acende à noite)
    }
    const P0s = poles.map(p => [p.x, p.y, p.z, p.tx, p.tz]);
    // fios: dois condutores entre postes vizinhos (catenária simples)
    mb.mat(11, 0, 0, 22).color(0.12, 0.12, 0.12, 1);
    for (let k = 1; k < poles.length; k++) {
      const P0 = P0s[k - 1], P1 = P0s[k];
      for (const a of [-0.8, 0.8]) {
        const path = []; for (let q = 0; q <= 6; q++) { const t = q / 6, x = P0[0] + (P1[0] - P0[0]) * t + (P0[3] * a) * (1 - t) + (P1[3] * a) * t, z = P0[2] + (P1[2] - P0[2]) * t + (P0[4] * a) * (1 - t) + (P1[4] * a) * t; path.push([x, P0[1] + (P1[1] - P0[1]) * t + 8.95 - 0.55 * Math.sin(t * PI), z]); }
        mb.tube(path, 0.012, 3);
      }
    }
  }
  S1.add(mb, i0, 7, 320);
  // barreiras de concreto onde as vias saem da área
  i0 = mb.ni;
  for (const nd of C.ends) {
    const e = nd.ends[0], ch = e.ch; chainAt(ch, e.at === 0 ? 1.5 : ch.L - 1.5, o); const nx = -o[3], nz = o[2];
    mb.mat(3).color(0.66, 0.65, 0.62, 1);
    for (let k = -2; k <= 2; k++) { const d = k * (ch.hw + 0.6) / 2, x = o[0] + nx * d, z = o[1] + nz * d, y = o[4]; mb.push(m4basis(m4(), o[2], 0, o[3], 0, 1, 0, -o[3], 0, o[2], x, y, z)); mb.box(0, 0.4, 0, 0.6, 0.8, (ch.hw + 0.6) / 2.4); mb.pop(); }
  }
  S1.add(mb, i0, 7, 900);
  // lugares modelados pelas fotos (atlas próprio dos letreiros)
  const MA = marcosAtlas(), bgM = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: MA.tex.createView() }] });
  const SM = new RangeSet(fam, bgM), mm = new MeshBuilder(1 << 17);
  let j0 = mm.ni; marcoMatriz(mm, MA.REG); SM.add(mm, j0, 7, 1600);
  j0 = mm.ni; marcoBorghi(mm, MA.REG); SM.add(mm, j0, 7, 1200);
  j0 = mm.ni; marcoSacoi(mm, MA.REG); SM.add(mm, j0, 7, 1600);
  j0 = mm.ni; marcoPetrus(mm, MA.REG); SM.add(mm, j0, 7, 900);
  j0 = mm.ni; marcoEntrada(mm); SM.add(mm, j0, 7, 1400);
  j0 = mm.ni; citySigns(mm, MA.REG); SM.add(mm, j0, 7, 300);
  SM.upload(mm); R.drawables.push(SM);
  WORLD.stats.tris.props = mb.ni / 3 + mm.ni / 3;
  S1.upload(mb); R.drawables.push(S1);
  if (md.ni) { S2.upload(md); R.drawables.push(S2); }
  PROPS.sets.push(S1);
}

// ponto da construção de um lugar do mapa: recuado da via mais próxima, de frente para ela
function poiSite(p, depth) { const f = cityFaceRoad(p.x, p.z); return { x: p.x - Math.cos(f.ang) * Math.max(0, depth - f.dist), z: p.z - Math.sin(f.ang) * Math.max(0, depth - f.dist), yaw: f.ang + PI, f }; }
// pisos de concreto (antes dos mapas do mundo)
function cityPave() {
  const C = CITY; C.pave = [];
  for (const p of C.pois) {
    const t = p.tags;
    if (t.am === 'fuel') { const s = poiSite(p, 4.2 + C.SW + 9); C.pave.push(s.x, s.z, 15); }
    else if (t.bd === 'transportation') { const s = poiSite(p, 4.2 + C.SW + 6); C.pave.push(s.x, s.z, 14); }
  }
  for (const B of C.blocks) {
    if (B.kind !== 'park' || B.matriz) continue;
    let cx = 0, cz = 0; for (const k of B.cells) { cx += k % C.W; cz += Math.floor(k / C.W); } cx = C.X0 + cx / B.cells.length; cz = C.Z0 + cz / B.cells.length;
    const r = Math.sqrt(B.cells.length / PI);
    for (let a = 0; a < 4; a++) { const ang = a * PI / 2 + 0.3; for (const f of [0.2, 0.35, 0.5, 0.65, 0.8]) C.pave.push(cx + Math.cos(ang) * r * f, cz + Math.sin(ang) * r * f, 1.6); }
    C.pave.push(cx, cz, 4);
  }
  if (MARCOS.sacoi) { const M = MARCOS.sacoi, p = M.at(-M.D / 2 - M.park / 2, 0); C.pave.push(p[0], p[1], 21); const q = M.at(-M.D / 2 - M.park / 2, 12), q2 = M.at(-M.D / 2 - M.park / 2, -12); C.pave.push(q[0], q[1], 14, q2[0], q2[1], 14); }
  if (MARCOS.borghi) { const M = MARCOS.borghi, p = M.at(-M.D / 2 + 3, 0); C.pave.push(p[0], p[1], 7); }
}
