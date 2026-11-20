// Mapa da cidade de Nova Aliança: leitura dos dados (12_city0_data.js), malha viária com cruzamentos, perfil de altura das
// vias, mapas raster (distância à via, altura da via, tipo de piso) e as consultas usadas por terreno, física e cenário.
// Convenções do jogo: X leste, Z sul, Y para cima, metros. Origem no centro de Nova Aliança (-21.0164, -49.4981).
// Ativado por ?mapa=nova-alianca (ou pela escolha salva no menu). Sem isso nada aqui roda e o circuito fica como era.
const CITY = {
  on: false,
  X0: -1900, X1: 1300, Z0: -1300, Z1: 1300,   // área jogável (metros); o relevo continua além dela até o horizonte
  Y0: 463.89,                                 // altitude (m) que vira y = 0 no jogo
  chains: [], nodes: [], juncs: [], pois: [], streams: [], ends: [],
  W: 0, H: 0, rd: null, ry: null, st: null,  // rasters de 1 m: distância assinada à borda da via (cm), altura da via (cm), tipo
  BAND: 30,                                   // largura da faixa (m) em volta das vias onde os rasters valem
  SW: 2.4,                                    // largura da calçada
  CURB: 0.15,                                 // altura do meio-fio
  stops: [], signs: [], spawn: null, tour: [], houses: [], hgrid: null, cams: [], forest: null,
};
const ST_PAVED = 1, ST_DIRT = 2, ST_URBAN = 4;
CITY.on = (() => {
  if (typeof Q === 'undefined') return false;
  const m = Q.get('mapa');
  if (m) return m === 'nova-alianca';
  if (typeof GAME !== 'undefined' && (GAME.capture || GAME.mode !== 'game')) return false;
  try { return localStorage.getItem('gol-mapa') !== 'circuito'; } catch (e) { return true; }
})();

// ---------- relevo (SRTM, grade 81x81 de 80 m, interpolação bicúbica: sem vincos na grade) ----------
const DEM = { n: 81, step: 80, o: -3200, h: null };
function demDecode() {
  if (DEM.h) return;
  const A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+-./:;<=>?@[]^_{}~', s = CITY_DEM, n = DEM.n;
  DEM.h = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) DEM.h[i] = (A.indexOf(s[i * 2]) * 88 + A.indexOf(s[i * 2 + 1])) / 10 + CITY_DEM_MIN - CITY.Y0;
}
function demAt(i, j) { const n = DEM.n; i = i < 0 ? 0 : i >= n ? n - 1 : i; j = j < 0 ? 0 : j >= n ? n - 1 : j; return DEM.h[j * n + i]; }
function cubic(p0, p1, p2, p3, t) { return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0))); }
// altura do relevo real (sem vias), em y do jogo
function demH(x, z) {
  const u = (x - DEM.o) / DEM.step, v = (z - DEM.o) / DEM.step, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  const r0 = cubic(demAt(i - 1, j - 1), demAt(i, j - 1), demAt(i + 1, j - 1), demAt(i + 2, j - 1), fu), r1 = cubic(demAt(i - 1, j), demAt(i, j), demAt(i + 1, j), demAt(i + 2, j), fu);
  const r2 = cubic(demAt(i - 1, j + 1), demAt(i, j + 1), demAt(i + 1, j + 1), demAt(i + 2, j + 1), fu), r3 = cubic(demAt(i - 1, j + 2), demAt(i, j + 2), demAt(i + 1, j + 2), demAt(i + 2, j + 2), fu);
  return cubic(r0, r1, r2, r3, fv);
}
// relevo suavizado (média num raio de ~25 m): base comum para nós e vias
function demS(x, z) { let s = demH(x, z) * 2; for (let k = 0; k < 6; k++) { const a = k * 1.0472; s += demH(x + Math.cos(a) * 24, z + Math.sin(a) * 24); } return s / 8; }
// relevo natural do terreno: SRTM + ondulações pequenas (o SRTM de 80 m é liso demais de perto) + serras além da grade
function cityNaturalH(x, z) {
  let h = demH(x, z);
  // ondulações baratas (somas de senos em direções irracionais): o relevo de 80 m fica liso demais de perto
  h += 0.9 * Math.sin(x * 0.0123 + z * 0.0071 + 1.3) * Math.sin(z * 0.0109 - x * 0.0043 + 0.4) + 0.45 * Math.sin(x * 0.031 - z * 0.023 + 2.1) + 0.3 * Math.sin(z * 0.041 + x * 0.017 - 0.7);
  const out = Math.max(Math.abs(x + 300) - 2900, Math.abs(z) - 2900, 0);
  if (out > 0) { const rn = fbm(x * 0.0011 + 7.7, z * 0.0011 + 2.2, 4); h += (rn * rn * 90 + rn * 30) * smooth(0, 2200, out); }
  return h;
}

// ---------- leitura dos dados ----------
function cityParse() {
  const items = [];
  for (const l of CITY_OSM.split('\n')) {
    const a = l.split('|'); if (a.length < 3) continue;
    const tags = {}; for (const kv of a[1].split('^')) { const i = kv.indexOf('='); if (i > 0) tags[kv.slice(0, i)] = kv.slice(i + 1); }
    const pts = []; let x = 0, z = 0;
    a[2].split(' ').forEach((p, i) => { const c = p.split(','); const dx = +c[0], dz = +c[1]; if (i === 0) { x = dx; z = dz; } else { x += dx; z += dz; } pts.push(x, z); });
    items.push({ t: a[0], tags, pts });   // pts em decímetros (inteiros: pontos compartilhados ficam iguais)
  }
  return items;
}
// classe da via → meia largura, piso, calçada, pintura (0 nenhuma, 1 amarela tracejada, 2 branca tracejada) e bordas brancas
function roadClass(tg) {
  const hw = tg.hw, named = tg.nm || '', ref = tg.rf || '', one = tg.ow === 'yes';
  const rua = /^(Rua|Avenida|Travessa|Praça)\b/.test(named), rod = /^Rodovia|^Estrada Vicinal/.test(named) || /^(SP|NVA)-/.test(ref);
  let dirt = tg.sf === 'unpaved' || tg.sf === 'dirt' || tg.sf === 'gravel' || hw === 'track';
  if (hw === 'unclassified' && !tg.sf && !rod && !rua) dirt = true;    // estradas rurais sem marcação: de terra, como na região
  const c = { hw: 3.0, dirt, sw: 0, paint: 0, edge: 0, rank: 1, urban: false };
  if (hw === 'secondary') { c.hw = 3.6; c.rank = 4; }
  else if (hw === 'secondary_link') { c.hw = 3.2; c.rank = 3; }
  else if (hw === 'residential') { c.hw = dirt ? 3.4 : 4.2; c.rank = 2; }
  else if (hw === 'unclassified') { c.hw = dirt ? 3.0 : 3.3; c.rank = rod ? 3 : 1; }
  else if (hw === 'service') { c.hw = 2.5; c.rank = 0; }
  else if (hw === 'track') { c.hw = 1.9; c.rank = 0; }
  else return null;
  c.urban = !dirt && (hw === 'residential' || (rua && !rod) || (hw === 'secondary' && /^Avenida/.test(named)));
  if (c.urban) c.sw = CITY.SW;
  if (!dirt && hw === 'secondary') { if (one) { c.paint = 2; c.edge = c.urban ? 0 : 1; } else { c.paint = 1; c.edge = c.urban ? 0 : 1; } }
  if (!dirt && hw === 'unclassified' && rod && !one) c.paint = 1;
  c.one = one; c.name = named; c.ref = ref;
  return c;
}
// recorta uma polilinha (decímetros) no retângulo da área; devolve trechos contínuos
function clipPolyline(p, x0, z0, x1, z1) {
  const runs = []; let cur = [];
  const ins = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
  const cut = (ax, az, bx, bz) => {   // Liang–Barsky
    let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
    const tst = (p, q) => { if (p === 0) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
    if (tst(-dx, ax - x0) && tst(dx, x1 - ax) && tst(-dz, az - z0) && tst(dz, z1 - az)) return [t0, t1];
    return null;
  };
  for (let i = 0; i < p.length / 2 - 1; i++) {
    const ax = p[i * 2], az = p[i * 2 + 1], bx = p[i * 2 + 2], bz = p[i * 2 + 3], ia = ins(ax, az), ib = ins(bx, bz);
    if (ia && ib) { if (!cur.length) cur.push(ax, az); cur.push(bx, bz); continue; }
    const c = cut(ax, az, bx, bz); if (!c) { if (cur.length) { runs.push(cur); cur = []; } continue; }
    const px = Math.round(ax + (bx - ax) * c[0]), pz = Math.round(az + (bz - az) * c[0]), qx = Math.round(ax + (bx - ax) * c[1]), qz = Math.round(az + (bz - az) * c[1]);
    if (ia) { if (!cur.length) cur.push(ax, az); cur.push(qx, qz); runs.push(cur); cur = []; }
    else if (ib) { cur = [px, pz, bx, bz]; }
    else { runs.push([px, pz, qx, qz]); }
  }
  if (cur.length) runs.push(cur);
  return runs.filter(r => r.length >= 4);
}

// ---------- malha viária ----------
function cityGraph(items) {
  const C = CITY, D = 10, bx0 = C.X0 * D, bz0 = C.Z0 * D, bx1 = C.X1 * D, bz1 = C.Z1 * D;
  const ways = [];
  for (const it of items) {
    if (it.t !== 'w') continue;
    const tg = it.tags;
    if (tg.ww) { C.streams.push(it.pts.map(v => v / D)); continue; }
    if (!tg.hw) continue;
    const cls = roadClass(tg); if (!cls) continue;
    for (const r of clipPolyline(it.pts, bx0, bz0, bx1, bz1)) ways.push({ p: r, cls });
  }
  for (const it of items) {
    const tg = it.tags; if (it.t === 'w' && (tg.hw || tg.ww)) continue;
    if (it.t === 'n' && tg.hw === 'stop') { C.stops.push(it.pts[0] / D, it.pts[1] / D); continue; }
    if (!(tg.am || tg.ls || tg.lu || tg.bd || tg.nt || tg.sh || tg.hw === 'services')) continue;
    if (tg.nm === 'Polícia Militar') continue;   // o posto da PM é a casa de arcos da Rua Gotardi (CITY_SHOPS), não um prédio genérico
    let x = 0, z = 0; const n = it.pts.length / 2; for (let i = 0; i < n; i++) { x += it.pts[i * 2]; z += it.pts[i * 2 + 1]; }
    C.pois.push({ x: x / n / D, z: z / n / D, tags: tg, name: tg.nm || '' });
  }
  // pontas soltas a até 12 m de outra via, apontando para ela (falha de desenho no OSM): emenda na via vizinha, inserindo um vértice nela
  const key = (x, z) => x + ',' + z;
  {
    const cnt = new Map(); for (const w of ways) { const n = w.p.length / 2; for (const i of [0, n - 1]) { const k = key(w.p[i * 2], w.p[i * 2 + 1]); cnt.set(k, (cnt.get(k) || 0) + 1); } for (let i = 1; i < n - 1; i++) { const k = key(w.p[i * 2], w.p[i * 2 + 1]); cnt.set(k, (cnt.get(k) || 0) + 2); } }
    for (const w of ways) {
      const n = w.p.length / 2;
      for (const i of [0, n - 1]) {
        const ex = w.p[i * 2], ez = w.p[i * 2 + 1]; if (cnt.get(key(ex, ez)) !== 1) continue;
        if (ex <= bx0 + 30 || ex >= bx1 - 30 || ez <= bz0 + 30 || ez >= bz1 - 30) continue;   // cortada pela borda da área
        const pi = i === 0 ? 1 : n - 2, dx0 = ex - w.p[pi * 2], dz0 = ez - w.p[pi * 2 + 1], dl = Math.hypot(dx0, dz0) || 1;   // direção em que a via chega à ponta
        let best = 120, bw = null, bj = 0, bx = 0, bz = 0;
        for (const v of ways) {
          if (v === w) continue; const m = v.p.length / 2;
          for (let j = 0; j < m - 1; j++) {
            const ax = v.p[j * 2], az = v.p[j * 2 + 1], dx = v.p[j * 2 + 2] - ax, dz = v.p[j * 2 + 3] - az, l2 = dx * dx + dz * dz; if (!l2) continue;
            const t = Math.max(0, Math.min(1, ((ex - ax) * dx + (ez - az) * dz) / l2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(ex - px, ez - pz);
            if (d < best && (d < 50 || ((px - ex) * dx0 + (pz - ez) * dz0) / (d * dl) > 0.6)) { best = d; bw = v; bj = j; bx = Math.round(px); bz = Math.round(pz); }
          }
        }
        if (!bw) continue;
        const m = bw.p.length / 2; let idx = -1;
        for (let j = 0; j < m; j++) if (Math.hypot(bw.p[j * 2] - bx, bw.p[j * 2 + 1] - bz) < 30) { idx = j; break; }   // vértice existente a menos de 3 m
        if (idx < 0) { bw.p.splice((bj + 1) * 2, 0, bx, bz); idx = bj + 1; }
        w.p[i * 2] = bw.p[idx * 2]; w.p[i * 2 + 1] = bw.p[idx * 2 + 1];
        C.joins = (C.joins || 0) + 1;
      }
    }
  }
  // grau de cada ponto: extremos contam 1, pontos internos contam 2
  const deg = new Map();
  for (const w of ways) { const n = w.p.length / 2; for (let i = 0; i < n; i++) { const k = key(w.p[i * 2], w.p[i * 2 + 1]); deg.set(k, (deg.get(k) || 0) + (i === 0 || i === n - 1 ? 1 : 2)); } }
  const nodeOf = new Map();
  const node = (x, z) => { const k = key(x, z); let nd = nodeOf.get(k); if (!nd) { nd = { id: C.nodes.length, x: x / D, z: z / D, ends: [], y: 0, junc: -1 }; C.nodes.push(nd); nodeOf.set(k, nd); } return nd; };
  // corta cada via nos pontos de grau ≠ 2 (cruzamentos) → cadeias entre nós
  for (const w of ways) {
    const n = w.p.length / 2; let s0 = 0;
    for (let i = 1; i < n; i++) {
      const k = key(w.p[i * 2], w.p[i * 2 + 1]);
      if (i === n - 1 || deg.get(k) !== 2) {
        const pts = []; for (let q = s0; q <= i; q++) pts.push(w.p[q * 2] / D, w.p[q * 2 + 1] / D);
        if (pts.length >= 4) {
          const a = node(w.p[s0 * 2], w.p[s0 * 2 + 1]), b = node(w.p[i * 2], w.p[i * 2 + 1]);
          const ch = { id: C.chains.length, cls: w.cls, hw: w.cls.hw, a, b, raw: pts, trimA: 0, trimB: 0 };
          C.chains.push(ch); a.ends.push({ ch, at: 0 }); b.ends.push({ ch, at: 1 });
        }
        s0 = i;
      }
    }
  }
}
// pontos da cadeia subdivididos (≤ 4 m), comprimentos acumulados
function chainSample(ch) {
  const r = ch.raw, xs = [], zs = [];
  for (let i = 0; i < r.length / 2; i++) {
    if (i > 0) {
      const ax = r[i * 2 - 2], az = r[i * 2 - 1], bx = r[i * 2], bz = r[i * 2 + 1], L = Math.hypot(bx - ax, bz - az), m = Math.ceil(L / 4);
      for (let k = 1; k < m; k++) { xs.push(ax + (bx - ax) * k / m); zs.push(az + (bz - az) * k / m); }
    }
    xs.push(r[i * 2]); zs.push(r[i * 2 + 1]);
  }
  const n = xs.length, s = new Float64Array(n);
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
  ch.x = Float64Array.from(xs); ch.z = Float64Array.from(zs); ch.s = s; ch.L = s[n - 1]; ch.n = n;
}
// posição e tangente da cadeia em s (interpolada); out = [x, z, tx, tz, y]
function chainAt(ch, s, out) {
  const n = ch.n, S = ch.s; s = s < 0 ? 0 : s > ch.L ? ch.L : s;
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
  const f = (s - S[lo]) / Math.max(1e-9, S[hi] - S[lo]);
  out[0] = ch.x[lo] + (ch.x[hi] - ch.x[lo]) * f; out[1] = ch.z[lo] + (ch.z[hi] - ch.z[lo]) * f;
  let tx = ch.x[hi] - ch.x[lo], tz = ch.z[hi] - ch.z[lo]; const l = Math.hypot(tx, tz) || 1; out[2] = tx / l; out[3] = tz / l;
  out[4] = ch.y ? ch.y[lo] + (ch.y[hi] - ch.y[lo]) * f : 0;
  return out;
}
// direção da cadeia saindo do nó (média dos primeiros metros)
function endDir(e) {
  const ch = e.ch, o = new Float64Array(5), d = Math.min(6, ch.L * 0.4);
  if (e.at === 0) { chainAt(ch, d, o); const x0 = ch.x[0], z0 = ch.z[0]; const l = Math.hypot(o[0] - x0, o[1] - z0) || 1; return [(o[0] - x0) / l, (o[1] - z0) / l]; }
  chainAt(ch, ch.L - d, o); const x0 = ch.x[ch.n - 1], z0 = ch.z[ch.n - 1]; const l = Math.hypot(o[0] - x0, o[1] - z0) || 1; return [(o[0] - x0) / l, (o[1] - z0) / l];
}
// cruzamentos: recuo de cada via, polígono do miolo (cantos arredondados) e curvas do meio-fio
function cityJunctions() {
  const C = CITY;
  for (const nd of C.nodes) {
    const E = nd.ends; if (E.length < 2) continue;
    for (const e of E) { const d = endDir(e); e.ux = d[0]; e.uz = d[1]; e.ang = Math.atan2(d[1], d[0]); e.hw = e.ch.hw; e.trim = 0; }
    E.sort((a, b) => a.ang - b.ang);
    const n = E.length, urban = E.some(e => e.ch.cls.urban);
    const minT = n >= 3 ? 1.0 : 0.25;
    for (const e of E) e.trim = minT;
    const pairs = [];
    for (let i = 0; i < n; i++) {
      const A = E[i], B = E[(i + 1) % n];
      let th = B.ang - A.ang; if (i === n - 1) th += TAU; if (n === 2 && i === 1) th = TAU - (E[1].ang - E[0].ang);
      const pr = { A, B, th, cx: 0, cz: 0, ok: false };
      if (th < PI - 0.08 && th > 0.02) {
        // borda +n de A com borda -n de B: P = nA*hwA + t*uA = -nB*hwB + s*uB
        const nAx = -A.uz, nAz = A.ux, nBx = -B.uz, nBz = B.ux;
        const rx = -nBx * B.hw - nAx * A.hw, rz = -nBz * B.hw - nAz * A.hw;
        const det = A.ux * (-B.uz) - A.uz * (-B.ux);
        if (Math.abs(det) > 1e-6) {
          let t = (rx * (-B.uz) - rz * (-B.ux)) / det, s = (A.ux * rz - A.uz * rx) / det;
          t = Math.max(0, t); s = Math.max(0, s);
          const R = n === 2 ? 1.5 : urban ? 3.2 : 7.0;
          A.trim = Math.max(A.trim, t + R); B.trim = Math.max(B.trim, s + R);
          pr.cx = nd.x + nAx * A.hw + A.ux * t; pr.cz = nd.z + nAz * A.hw + A.uz * t; pr.ok = true;
        }
      }
      pairs.push(pr);
    }
    // recuo limitado pelo comprimento da cadeia (cadeias curtas entre cruzamentos vizinhos)
    for (const e of E) {
      const other = e.ch.a === e.ch.b ? 0.45 : 0.46;
      e.trim = Math.min(e.trim, 32, e.ch.L * other);
      if (e.at === 0) e.ch.trimA = e.trim; else e.ch.trimB = e.trim;
    }
    nd.junc = C.juncs.length;
    C.juncs.push({ id: nd.junc, node: nd, ends: E, pairs, urban, poly: null, curbs: [] });
  }
}
// perfil de altura de cada cadeia: relevo suavizado, nós com altura única; nos cruzamentos o miolo acompanha a rampa
function cityHeights() {
  const C = CITY, sig = 12;
  for (const nd of C.nodes) nd.y = demS(nd.x, nd.z);
  for (const ch of C.chains) {
    const n = ch.n, h0 = new Float64Array(n), y = new Float64Array(n);
    for (let i = 0; i < n; i++) h0[i] = demS(ch.x[i], ch.z[i]);
    for (let i = 0; i < n; i++) {
      let sw = 0, sh = 0; const si = ch.s[i];
      for (let k = i; k >= 0 && si - ch.s[k] < sig * 3; k--) { const w = Math.exp(-0.5 * ((si - ch.s[k]) / sig) ** 2); sw += w; sh += w * h0[k]; }
      for (let k = i + 1; k < n && ch.s[k] - si < sig * 3; k++) { const w = Math.exp(-0.5 * ((ch.s[k] - si) / sig) ** 2); sw += w; sh += w * h0[k]; }
      y[i] = sh / sw;
    }
    // extremos presos à altura dos nós (correção espalhada ao longo da cadeia, mais forte perto de cada ponta)
    const L = ch.L, dA = ch.a.y - y[0], dB = ch.b.y - y[n - 1], k = Math.min(60, L);
    for (let i = 0; i < n; i++) { const sa = ch.s[i], sb = L - sa; y[i] += dA * (1 - smooth(0, k, sa)) + dB * (1 - smooth(0, k, sb)); }
    ch.y = y;
  }
}
// polígono de cada cruzamento: boca de cada via + curva de canto até a próxima (Bézier quadrática)
function cityJunctionPolys() {
  const C = CITY, o = new Float64Array(5);
  for (const J of C.juncs) {
    const nd = J.node, poly = [];
    const mouth = (e, side) => { const s = e.at === 0 ? e.trim : e.ch.L - e.trim; chainAt(e.ch, s, o); const nx = -e.uz, nz = e.ux; return [nd.x + e.ux * e.trim + nx * e.hw * side, nd.z + e.uz * e.trim + nz * e.hw * side, o[4]]; };
    for (const pr of J.pairs) {
      const A = pr.A, B = pr.B, pa0 = mouth(A, -1), pa = mouth(A, 1), pb = mouth(B, -1);
      e2push(poly, pa0, nd.y); e2push(poly, pa, nd.y);
      const curve = [pa];
      if (pr.ok) {
        for (let k = 1; k < 8; k++) { const u = k / 8, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; curve.push([a * pa[0] + b * pr.cx + c * pb[0], a * pa[1] + b * pr.cz + c * pb[1], pa[2] + (pb[2] - pa[2]) * u]); }
      }
      curve.push(pb);
      for (let k = 1; k < curve.length - 1; k++) e2push(poly, curve[k], nd.y);
      if (pr.ok) J.curbs.push({ pts: curve, urban: A.ch.cls.urban || B.ch.cls.urban });
    }
    J.poly = poly;   // [x, z, y, ...]
  }
  function e2push(p, q) { p.push(q[0], q[1], q[2]); }
}

// ---------- rasters ----------
// Faixa estreita (até NEAR m da borda) calculada exatamente a partir das vias; além dela, propagação do vizinho mais próximo
// (duas varreduras) — basta para a transição do terreno e as clareiras da mata.
function cityRasters() {
  const C = CITY, W = C.W = C.X1 - C.X0 + 1, H = C.H = C.Z1 - C.Z0 + 1, N = W * H, B = C.BAND, NEAR = 7;
  const rd = new Float32Array(N).fill(1e9), ry = new Float32Array(N), st = new Uint8Array(N);
  const X0 = C.X0, Z0 = C.Z0;
  // trecho de reta da via [a,b] com meia largura hw; capA/capB: extremidade reta (sem arredondar)
  const stampSeg = (ax, az, ay, bx, bz, by, hw, type, capA, capB) => {
    const ex = bx - ax, ez = bz - az, L = Math.hypot(ex, ez); if (L < 1e-6) return;
    const ux = ex / L, uz = ez / L, R = hw + NEAR;
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - R - X0)), i1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + R - X0));
    const j0 = Math.max(0, Math.floor(Math.min(az, bz) - R - Z0)), j1 = Math.min(H - 1, Math.ceil(Math.max(az, bz) + R - Z0));
    for (let j = j0; j <= j1; j++) {
      const pz = Z0 + j - az;
      for (let i = i0; i <= i1; i++) {
        const px = X0 + i - ax, along = px * ux + pz * uz, lat = Math.abs(px * uz - pz * ux);
        if (lat > R) continue;
        let sd;
        if (along < 0 && !capA) sd = Math.hypot(px, pz) - hw;
        else if (along > L && !capB) sd = Math.hypot(px - ex, pz - ez) - hw;
        else { const dy = along < 0 ? -along : along > L ? along - L : 0, dx = lat - hw; sd = dy > 0 ? (dx > 0 ? Math.hypot(dx, dy) : dy) : dx; }
        const k = j * W + i;
        if (sd < rd[k]) { const t = along < 0 ? 0 : along > L ? 1 : along / L; rd[k] = sd; ry[k] = ay + (by - ay) * t; st[k] = type; }
      }
    }
  };
  const o = new Float64Array(5); let _t = performance.now();
  for (const ch of C.chains) {
    const type = (ch.cls.dirt ? ST_DIRT : ST_PAVED) | (ch.cls.urban ? ST_URBAN : 0);
    const s0 = ch.trimA, s1 = ch.L - ch.trimB; if (s1 - s0 < 0.05) continue;
    // pedaços de até 6 m (os vértices originais das curvas ficam)
    const pts = [s0]; let last = s0;
    for (let i = 0; i < ch.n; i++) { const si = ch.s[i]; if (si <= s0 || si >= s1) continue; const raw = i === 0 || i === ch.n - 1 || Math.abs((ch.x[i] - ch.x[i - 1]) * (ch.z[i + 1] - ch.z[i]) - (ch.z[i] - ch.z[i - 1]) * (ch.x[i + 1] - ch.x[i])) > 1e-6; if (raw || si - last >= 6) { pts.push(si); last = si; } }
    pts.push(s1);
    let px, pz, py;
    for (let k = 0; k < pts.length; k++) {
      chainAt(ch, pts[k], o);
      if (k > 0) stampSeg(px, pz, py, o[0], o[1], o[4], ch.hw, type, k === 1 && ch.a.junc < 0, k === pts.length - 1 && ch.b.junc < 0);
      px = o[0]; pz = o[1]; py = o[4];
    }
  }
  if (C.dbg) console.log('chains', performance.now() - _t); _t = performance.now();
  for (const J of C.juncs) {
    const P = J.poly, n = P.length / 3, nd = J.node; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, P[i * 3]); x1 = Math.max(x1, P[i * 3]); z0 = Math.min(z0, P[i * 3 + 1]); z1 = Math.max(z1, P[i * 3 + 1]); }
    const type = J.ends.every(e => e.ch.cls.dirt) ? ST_DIRT : ST_PAVED, typ = type | (J.urban ? ST_URBAN : 0), R = NEAR;
    const i0 = Math.max(0, Math.floor(x0 - R - X0)), i1 = Math.min(W - 1, Math.ceil(x1 + R - X0)), j0 = Math.max(0, Math.floor(z0 - R - Z0)), j1 = Math.min(H - 1, Math.ceil(z1 + R - Z0));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = X0 + i, z = Z0 + j; let dm = 1e9, inside = false, hy = nd.y;
      for (let a = 0, b = n - 1; a < n; b = a++) {
        const ax = P[a * 3], az = P[a * 3 + 1], bx = P[b * 3], bz = P[b * 3 + 1];
        if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
        const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez, t = l2 > 0 ? clamp(((x - ax) * ex + (z - az) * ez) / l2, 0, 1) : 0, dx = x - ax - ex * t, dz = z - az - ez * t, d = dx * dx + dz * dz;
        if (d < dm) { dm = d; hy = P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t; }
      }
      const sd = inside ? -Math.sqrt(dm) : Math.sqrt(dm), k = j * W + i;
      if (sd < rd[k]) {
        if (inside) hy = junctionY(J, x, z);
        rd[k] = sd; ry[k] = hy; st[k] = typ;
      }
    }
  }
  if (C.dbg) console.log('juncs', performance.now() - _t); _t = performance.now();
  // propagação para fora da faixa: cada amostra herda a via mais próxima (vetor inteiro até a amostra da faixa; 8SSEDT)
  const ox = new Int16Array(N), oz = new Int16Array(N), d2 = new Int32Array(N);
  const INF = 0x3fffffff;
  for (let k = 0; k < N; k++) d2[k] = rd[k] < NEAR ? 0 : INF;
  const pass = (j, i0, i1, di, nb) => {   // nb: lista de vizinhos [dk, dx, dz]
    for (let i = i0; i !== i1; i += di) {
      const k = j * W + i; if (d2[k] === 0) continue;
      let best = d2[k], bx = ox[k], bz = oz[k];
      for (let q = 0; q < nb.length; q += 3) {
        const kk = k + nb[q], ci = i - nb[q + 1]; if (kk < 0 || kk >= N || ci < 0 || ci >= W) continue;
        const dk = d2[kk]; if (dk === INF) continue;
        const nx = ox[kk] + nb[q + 1], nz = oz[kk] + nb[q + 2], dd = nx * nx + nz * nz;
        if (dd < best) { best = dd; bx = nx; bz = nz; }
      }
      if (best < d2[k]) { d2[k] = best; ox[k] = bx; oz[k] = bz; }
    }
  };
  const fA = [-1, 1, 0, -W, 0, 1, -W - 1, 1, 1, -W + 1, -1, 1], fB = [1, -1, 0], bA = [1, -1, 0, W, 0, -1, W + 1, -1, -1, W - 1, 1, -1], bB = [-1, 1, 0];
  for (let j = 0; j < H; j++) { pass(j, 0, W, 1, j > 0 ? fA : [-1, 1, 0]); pass(j, W - 1, -1, -1, fB); }
  for (let j = H - 1; j >= 0; j--) { pass(j, W - 1, -1, -1, j < H - 1 ? bA : [1, -1, 0]); pass(j, 0, W, 1, bB); }
  for (let k = 0; k < N; k++) {
    if (d2[k] === 0 || d2[k] === INF) continue;
    const src = k - (oz[k] * W + ox[k]); rd[k] = rd[src] + Math.sqrt(d2[k]); ry[k] = ry[src]; st[k] = st[src];
  }
  if (C.dbg) console.log('prop', performance.now() - _t); _t = performance.now();
  // grava em inteiros (cm) para caber na memória: 2 bytes por amostra
  C.rd = new Int16Array(N); C.ry = new Int16Array(N);
  for (let k = 0; k < N; k++) { C.rd[k] = Math.round(clamp(rd[k], -300, B) * 100); C.ry[k] = Math.round(clamp(ry[k], -300, 300) * 100); }
  C.st = st;
}
// altura no miolo do cruzamento: leque de triângulos (centro do nó, vértices do polígono)
function junctionY(J, x, z) {
  const P = J.poly, n = P.length / 3, cx = J.node.x, cz = J.node.z, cy = J.node.y;
  for (let a = 0; a < n; a++) {
    const b = (a + 1) % n, ax = P[a * 3] - cx, az = P[a * 3 + 1] - cz, bx = P[b * 3] - cx, bz = P[b * 3 + 1] - cz, px = x - cx, pz = z - cz;
    const det = ax * bz - az * bx; if (Math.abs(det) < 1e-9) continue;
    const u = (px * bz - pz * bx) / det, v = (ax * pz - az * px) / det;
    if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) return cy + (P[a * 3 + 2] - cy) * u + (P[b * 3 + 2] - cy) * v;
  }
  return cy;
}
// amostra bilinear dos rasters no registrador: entrada q[0]=x, q[1]=z; saída q[9]=distância à via, q[10]=altura da via, q[11]=tipo
function cityRasterQ(q) {
  const C = CITY, fx = q[0] - C.X0, fz = q[1] - C.Z0;
  if (fx < 0 || fz < 0 || fx >= C.W - 1 || fz >= C.H - 1) { q[9] = C.BAND; q[10] = 0; q[11] = 0; return; }
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * C.W + i, W = C.W, a = C.rd, b = C.ry;
  q[9] = ((a[k] * (1 - u) + a[k + 1] * u) * (1 - v) + (a[k + W] * (1 - u) + a[k + W + 1] * u) * v) * 0.01;
  q[10] = ((b[k] * (1 - u) + b[k + 1] * u) * (1 - v) + (b[k + W] * (1 - u) + b[k + W + 1] * u) * v) * 0.01;
  q[11] = C.st[(fz + 0.5 | 0) * W + (fx + 0.5 | 0)];
}
const _cq = new Float64Array(12);
// relevo natural pré-calculado (grade de 8 m, bilinear) dentro da área: a malha e o campo de alturas consultam milhões de pontos
function cityNatGrid() {
  const C = CITY, cell = 8, x0 = C.X0 - 16, z0 = C.Z0 - 16, nx = Math.ceil((C.X1 - C.X0 + 32) / cell) + 1, nz = Math.ceil((C.Z1 - C.Z0 + 32) / cell) + 1, g = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = cityNaturalH(x0 + i * cell, z0 + j * cell);
  C.nat = { cell, x0, z0, nx, nz, g };
}
function cityNatQ(x, z) {
  const N = CITY.nat, u = (x - N.x0) / N.cell, v = (z - N.z0) / N.cell, i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * N.nx + i, g = N.g;
  return (g[k] * (1 - fu) + g[k + 1] * fu) * (1 - fv) + (g[k + N.nx] * (1 - fu) + g[k + N.nx + 1] * fu) * fv;
}
// altura do terreno na cidade: sob a via, calçada (urbano) e transição para o relevo natural
function cityTerrainH(x, z) {
  const C = CITY;
  if (x < C.X0 || z < C.Z0 || x > C.X1 || z > C.Z1) return cityNaturalH(x, z);
  const nat = cityNatQ(x, z), q = _cq; q[0] = x; q[1] = z; cityRasterQ(q);
  const d = q[9], yr = q[10], t = q[11];
  if (d >= C.BAND - 0.5) return nat;
  if (d < 0) return yr - 0.35 * smooth(0, 0.6, -d) - 0.02;
  if (t & ST_URBAN) { const top = yr + C.CURB; return d < C.SW ? top : lerp(top, nat, smooth(C.SW, C.BAND - 1, d)); }
  return lerp(yr - 0.08, nat, smooth(0.8, 14, d));
}
// densidade de mata: matas ciliares ao longo dos córregos e manchas soltas no campo; nada junto às vias e na cidade
function cityForestAt(x, z) {
  const F = CITY.forest; if (!F) return 0;
  const u = (x - F.x0) / F.cell, v = (z - F.z0) / F.cell; if (u < 0 || v < 0 || u >= F.n - 1 || v >= F.n - 1) return 0;
  const i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * F.n + i, d = F.d;
  let m = ((d[k] * (1 - fu) + d[k + 1] * fu) * (1 - fv) + (d[k + F.n] * (1 - fu) + d[k + F.n + 1] * fu) * fv) / 255;
  if (m <= 0) return 0;
  if (x > CITY.X0 && z > CITY.Z0 && x < CITY.X1 && z < CITY.Z1) {
    const q = _cq; q[0] = x; q[1] = z; cityRasterQ(q);
    const clear = (q[11] & ST_URBAN) ? 40 : 9; m *= smooth(clear, clear + 10, q[9]);
    if (CITY.occ && CITY.occ[Math.round(z - CITY.Z0) * CITY.W + Math.round(x - CITY.X0)] === 4) return 0;   // entrada da cidade
  }
  return m;
}
function cityForestBuild() {
  const C = CITY, cell = 8, n = 801, x0 = -3200, z0 = -3200, f = new Float32Array(n * n).fill(1e9);
  const stamp = (ax, az, bx, bz, R) => {
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R - x0) / cell)), i1 = Math.min(n - 1, Math.ceil((Math.max(ax, bx) + R - x0) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - R - z0) / cell)), j1 = Math.min(n - 1, Math.ceil((Math.max(az, bz) + R - z0) / cell));
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1e-9;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = x0 + i * cell - ax, pz = z0 + j * cell - az, t = clamp((px * ex + pz * ez) / l2, 0, 1), d = Math.hypot(px - ex * t, pz - ez * t);
      if (d < f[j * n + i]) f[j * n + i] = d;
    }
  };
  for (const s of C.streams) for (let i = 0; i < s.length / 2 - 1; i++) stamp(s[i * 2], s[i * 2 + 1], s[i * 2 + 2], s[i * 2 + 3], 70);
  const d = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) d[k] = Math.round(255 * (1 - smooth(16, 55, f[k])));
  // manchas: mata junto ao cemitério e capões espalhados pelo campo
  for (const p of C.pois) if (p.tags.lu === 'forest' || p.tags.nt === 'wood') {
    for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const gi = Math.round((p.x - x0) / cell) + i, gj = Math.round((p.z - z0) / cell) + j; if (gi < 0 || gj < 0 || gi >= n || gj >= n) continue; const v = 255 * (1 - smooth(50, 90, Math.hypot(i, j) * cell)); d[gj * n + gi] = Math.max(d[gj * n + gi], v); }
  }
  const rnd = mkRng(9137);
  for (let k = 0; k < 70; k++) {
    const cx = -3000 + rnd() * 6000, cz = -3000 + rnd() * 6000, r = 25 + rnd() * 70;
    if (Math.hypot(cx + 450, cz) < 1500) continue;
    for (let j = -14; j <= 14; j++) for (let i = -14; i <= 14; i++) { const gi = Math.round((cx - x0) / cell) + i, gj = Math.round((cz - z0) / cell) + j; if (gi < 0 || gj < 0 || gi >= n || gj >= n) continue; const v = 255 * (1 - smooth(r * 0.6, r, Math.hypot(i, j) * cell)); d[gj * n + gi] = Math.max(d[gj * n + gi], v); }
  }
  // recorte irregular das bordas (ruído assado só onde há mata)
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; if (!d[k]) continue; const x = x0 + i * cell, z = z0 + j * cell, m = d[k] / 255, nz = fbm(x * 0.012 + 4.4, z * 0.012 - 7.1, 3); d[k] = Math.round(255 * m * smooth(0.3, 0.55, nz + m * 0.25)); }
  C.forest = { x0, z0, cell, n, d };
}
// grade grossa (16 m) com a distância até a via mais próxima: decide onde a malha do terreno precisa ser fina
function cityNearGrid() {
  const C = CITY, cell = 16, nx = Math.ceil((C.X1 - C.X0) / cell) + 1, nz = Math.ceil((C.Z1 - C.Z0) / cell) + 1, g = new Float32Array(nx * nz).fill(1e9);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = C.X0 + i * cell, z = C.Z0 + j * cell; _cq[0] = Math.min(x, C.X1 - 1); _cq[1] = Math.min(z, C.Z1 - 1); cityRasterQ(_cq);
    if (_cq[9] < C.BAND - 1) g[j * nx + i] = Math.max(0, _cq[9]);
  }
  // propaga (chanfro) para fora da faixa das vias
  for (let it = 0; it < 2; it++) {
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (i > 0) g[k] = Math.min(g[k], g[k - 1] + cell); if (j > 0) g[k] = Math.min(g[k], g[k - nx] + cell); }
    for (let j = nz - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; if (i < nx - 1) g[k] = Math.min(g[k], g[k + 1] + cell); if (j < nz - 1) g[k] = Math.min(g[k], g[k + nx] + cell); }
  }
  C.near = { cell, nx, nz, g };
}
// distância (limite inferior) de uma caixa (centro, meio lado) até a via mais próxima
function cityDistBox(cx, cz, h) {
  const C = CITY, N = C.near;
  const bx = Math.max(Math.abs(cx - (C.X0 + C.X1) / 2) - h - (C.X1 - C.X0) / 2, 0), bz = Math.max(Math.abs(cz - (C.Z0 + C.Z1) / 2) - h - (C.Z1 - C.Z0) / 2, 0);
  if (bx > 0 || bz > 0) return Math.hypot(bx, bz) + 40;
  const i = clamp(Math.round((cx - C.X0) / N.cell), 0, N.nx - 1), j = clamp(Math.round((cz - C.Z0) / N.cell), 0, N.nz - 1);
  return Math.max(0, N.g[j * N.nx + i] - h * 1.415 - N.cell);
}

// ---------- lotes e casas (ao longo das ruas urbanas) ----------
function cityLots() {
  const C = CITY, rnd = mkRng(2024), o = new Float64Array(5), occ = C.occ = new Uint8Array(C.W * C.H), houses = C.houses;
  const free = (x, z, m) => { _cq[0] = x; _cq[1] = z; cityRasterQ(_cq); return _cq[9] > C.SW + m; };
  const reserved = [];
  for (const p of C.pois) {
    const t = p.tags;
    const r = t.ls === 'park' ? 0 : t.am === 'place_of_worship' ? 30 : t.am === 'school' || t.am === 'kindergarten' ? 26 : t.ls === 'pitch' ? 60 : t.lu === 'cemetery' ? 0 : t.am === 'fuel' ? 22 : t.am === 'townhall' ? 19 : (t.am || t.bd || t.hw === 'services') ? 14 : 0;
    if (r) reserved.push([p.x, p.z, r]);
  }
  // praças e cemitério: a quadra inteira (preenchimento a partir do ponto, limitado pelas calçadas)
  C.blocks = [];
  for (const p of C.pois) {
    const t = p.tags; if (!(t.ls === 'park' || t.lu === 'cemetery')) continue;
    let i0 = Math.round(p.x - C.X0), j0 = Math.round(p.z - C.Z0); if (i0 < 0 || j0 < 0 || i0 >= C.W || j0 >= C.H) continue;
    // o ponto do mapa fica na borda da praça: procura, em volta, o primeiro ponto bem dentro da quadra
    if (C.rd[j0 * C.W + i0] < (C.SW + 3) * 100) { let found = false; for (let r = 1; r < 30 && !found; r++) for (let a = 0; a < 16 && !found; a++) { const i = Math.round(i0 + Math.cos(a * PI / 8) * r), j = Math.round(j0 + Math.sin(a * PI / 8) * r); if (i >= 0 && j >= 0 && i < C.W && j < C.H && C.rd[j * C.W + i] > (C.SW + 3) * 100) { i0 = i; j0 = j; found = true; } } if (!found) continue; }
    const mark = new Set(), stack = [[i0, j0]], cells = [];
    while (stack.length && cells.length < 26000) {
      const [i, j] = stack.pop(), k = j * C.W + i; if (mark.has(k)) continue; mark.add(k);
      if (C.rd[k] * 0.01 < C.SW + 0.2 || Math.hypot(i - i0, j - j0) > 130) continue;
      cells.push(k); if (i > 0) stack.push([i - 1, j]); if (j > 0) stack.push([i, j - 1]); if (i < C.W - 1) stack.push([i + 1, j]); if (j < C.H - 1) stack.push([i, j + 1]);
    }
    if (cells.length > 25000) continue;   // vazou para fora da quadra: ignora
    for (const k of cells) occ[k] = 2;
    C.blocks.push({ kind: t.lu === 'cemetery' ? 'cemetery' : 'park', name: p.name, x: p.x, z: p.z, cells });
  }
  marcosLayout(reserved);
  const isRes = (x, z) => reserved.some(r => (x - r[0]) ** 2 + (z - r[1]) ** 2 < r[2] * r[2]);
  const pal = [[0.86, 0.84, 0.78], [0.9, 0.86, 0.7], [0.92, 0.8, 0.55], [0.74, 0.82, 0.86], [0.88, 0.74, 0.7], [0.8, 0.86, 0.74], [0.95, 0.93, 0.9], [0.86, 0.7, 0.5], [0.78, 0.82, 0.7], [0.83, 0.79, 0.68], [0.7, 0.7, 0.68], [0.93, 0.88, 0.8]];
  for (const ch of C.chains) {
    if (!ch.cls.urban) continue;
    const comm = /Comércio|Francisco Coco|Jorge Galvão|Quintino/.test(ch.cls.name);
    for (const side of [-1, 1]) {
      let s = ch.trimA + 4 + rnd() * 3;
      while (s < ch.L - ch.trimB - 6) {
        const w = comm ? 6 + rnd() * 5 : 7.5 + rnd() * 4.5, dep = comm ? 10 + rnd() * 8 : 8 + rnd() * 6;
        const set = comm ? rnd() * 0.6 : (rnd() < 0.15 ? 0.3 : 2.2 + rnd() * 3.2);
        chainAt(ch, s + w / 2, o);
        const tx = o[2], tz = o[3], nx = -tz * side, nz = tx * side, off = ch.hw + C.SW + 0.4 + set;
        const cx = o[0] + nx * (off + dep / 2), cz = o[1] + nz * (off + dep / 2);
        // cantos e meio dos lados precisam estar fora da via e da calçada, sem outra casa
        let ok = !isRes(cx, cz);
        const pts = [];
        for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0.5], [0, -0.5], [0.5, 0], [-0.5, 0], [0, 0]]) pts.push([cx + tx * a * w + nx * b * dep, cz + tz * a * w + nz * b * dep]);
        for (const p of pts) if (ok && !free(p[0], p[1], 0.3)) ok = false;
        if (ok) {
          // ocupação (1 m): sem sobrepor outra casa
          const cells = [];
          for (let a = -w / 2; a <= w / 2 && ok; a += 0.8) for (let b = -dep / 2 - set; b <= dep / 2 && ok; b += 0.8) {
            const x = cx + tx * a + nx * b, z = cz + tz * a + nz * b, i = Math.round(x - C.X0), j = Math.round(z - C.Z0);
            if (i < 0 || j < 0 || i >= C.W || j >= C.H) { ok = false; break; }
            const k = j * C.W + i; if (occ[k]) ok = false; else cells.push(k);
          }
          if (ok) {
            for (const k of cells) occ[k] = 1;
            _cq[0] = cx; _cq[1] = cz; cityRasterQ(_cq);
            const yaw = Math.atan2(nz, nx);   // eixo local X aponta da rua para o fundo do lote
            houses.push({ x: cx, z: cz, w, d: dep, yaw, fx: tx, fz: tz, nx, nz, set, comm, two: comm ? rnd() < 0.55 : rnd() < 0.07,
              col: pal[(rnd() * pal.length) | 0], roof: rnd(), wall: !comm && rnd() < 0.86, gate: rnd(), seed: rnd(), yr: _cq[10] + C.CURB, ch: ch.id, side });
          }
        }
        s += w + (comm ? 0.05 : 0.6 + rnd() * 2.2);
      }
    }
  }
  borghiNeighborhoodLayout(houses, occ);
  // grade para colisão: caixas orientadas (casas com o muro e o quintal da frente, prédios, lugares modelados)
  // e círculos (troncos de árvore, postes, placas, frades). Cada obstáculo entra em todas as células que toca.
  const cell = 32, nx = Math.ceil(C.W / cell), nz = Math.ceil(C.H / cell), grid = Array.from({ length: nx * nz }, () => []);
  const addTo = (b, r) => {
    const i0 = Math.max(0, Math.floor((b.x - r - C.X0) / cell)), i1 = Math.min(nx - 1, Math.floor((b.x + r - C.X0) / cell)), j0 = Math.max(0, Math.floor((b.z - r - C.Z0) / cell)), j1 = Math.min(nz - 1, Math.floor((b.z + r - C.Z0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) grid[j * nx + i].push(b);
  };
  // lotes que se sobrepõem (esquinas onde duas ruas disputam o mesmo terreno): fica o primeiro
  {
    const lot = h => { const e = h.wall && h.set > 1.0 ? h.set / 2 : 0; return { x: h.x - h.nx * e, z: h.z - h.nz * e, ux: h.nx, uz: h.nz, hd: h.d / 2 + e, hw: h.w / 2 }; };
    const sep = (A, B) => { for (const [ax, az] of [[A.ux, A.uz], [-A.uz, A.ux], [B.ux, B.uz], [-B.uz, B.ux]]) { const ra = A.hd * Math.abs(A.ux * ax + A.uz * az) + A.hw * Math.abs(-A.uz * ax + A.ux * az), rb = B.hd * Math.abs(B.ux * ax + B.uz * az) + B.hw * Math.abs(-B.uz * ax + B.ux * az); if (Math.abs((B.x - A.x) * ax + (B.z - A.z) * az) >= ra + rb - 0.15) return true; } return false; };
    const g = new Map(), keep = [];
    for (const h of houses) {
      const L = lot(h), gi = Math.floor(L.x / 40), gj = Math.floor(L.z / 40); let ok = true;
      for (let j = gj - 1; j <= gj + 1 && ok; j++) for (let i = gi - 1; i <= gi + 1 && ok; i++) for (const M of g.get(i + ',' + j) || []) if (!sep(L, M)) { ok = false; break; }
      if (!ok) continue;
      keep.push(h); const k = gi + ',' + gj; if (!g.has(k)) g.set(k, []); g.get(k).push(L);
    }
    houses.length = 0; houses.push(...keep);
  }
  C.boxes = []; C.circles = [];
  C.addBox = b => { if (!(b.hd > 0 && b.hw > 0) || !isFinite(b.x + b.z)) return; b.t = 0; C.boxes.push(b); addTo(b, Math.hypot(b.hd, b.hw) + 0.5); };
  C.addCircle = (x, z, r) => { if (x < C.X0 || x > C.X1 || z < C.Z0 || z > C.Z1) return; const b = { x, z, r, circ: true, t: 0 }; C.circles.push(b); addTo(b, r + 0.5); };
  for (const h of houses) {
    if (h.wall && h.set > 1.0) {   // muro da frente com portão fechado: a caixa vai do muro ao fundo da casa
      const e = h.set / 2; C.addBox({ x: h.x - h.nx * e, z: h.z - h.nz * e, ux: h.nx, uz: h.nz, hd: h.d / 2 + e, hw: h.w / 2 });
    } else C.addBox({ x: h.x, z: h.z, ux: h.nx, uz: h.nz, hd: h.d / 2, hw: h.w / 2 });
  }
  C.hgrid = { cell, nx, nz, grid };
  C.occ = occ;
}

// ---------- montagem ----------
function cityBuild() {
  const t0 = performance.now(), C = CITY;
  demDecode();
  cityGraph(cityParse());
  for (const ch of C.chains) chainSample(ch);
  cityTwins();
  cityJunctions(); cityHeights(); cityJunctionPolys();
  cityRasters(); cityNatGrid(); cityNearGrid(); cityForestBuild(); cityLots();
  // pontas cortadas na borda da área: barreiras
  for (const nd of C.nodes) if (nd.ends.length === 1 && (Math.abs(nd.x - C.X0) < 0.6 || Math.abs(nd.x - C.X1) < 0.6 || Math.abs(nd.z - C.Z0) < 0.6 || Math.abs(nd.z - C.Z1) < 0.6)) C.ends.push(nd);
  // Partida em frente à saída da Borghi, na faixa da loja e no sentido do centro.
  // Usa a via já amostrada, mantendo o Gol no asfalto e fora do cruzamento.
  const o = new Float64Array(5), M = MARCOS.borghi, target = M.at(-M.D / 2 - 4, 0);
  let best = null, bs = 0, bd = 1e18, dir = -1;
  for (const ch of C.chains) {
    if (!/Comércio/.test(ch.cls.name)) continue;
    for (let i = 0; i < ch.n; i++) {
      if (ch.s[i] < ch.trimA + 6 || ch.s[i] > ch.L - ch.trimB - 6) continue;
      const d = (ch.x[i] - target[0]) ** 2 + (ch.z[i] - target[1]) ** 2;
      if (d < bd) { bd = d; best = ch; bs = ch.s[i]; }
    }
  }
  if (!best) throw new Error('Não foi encontrada uma saída segura junto à Borghi.');
  chainAt(best, bs, o); dir = o[3] >= 0 ? 1 : -1;
  C.spawn = { ch: best, s: bs, dir, name: 'Saída da Borghi Veículos' };
  // passeio para o aquecimento da GPU: pontos espalhados pela cidade e pelas rodovias
  const cand = C.chains.filter(c => c.L > 40 && !c.cls.dirt);
  for (let i = 0; i < 36; i++) { const ch = cand[(i * 7919) % cand.length]; C.tour.push({ ch, s: ch.L * 0.5 }); }
  // câmeras de rua (modo TV): nos cruzamentos urbanos, a 5 m de altura num canto
  for (const J of C.juncs) if (J.urban && J.ends.length >= 3) {
    const e = J.ends[0], nd = J.node; C.cams.push([nd.x + (-e.uz) * (e.hw + 3) + e.ux * (e.trim + 2), nd.y + 5.2, nd.z + e.ux * (e.hw + 3) + e.uz * (e.trim + 2)]);
  }
  cityFeatures(); cityShops(); cityPoles();
  cityPave();
  C.stats = { chains: C.chains.length, juncs: C.juncs.length, houses: C.houses.length, ms: Math.round(performance.now() - t0) };
}

// ---------- lombadas, valetas e buracos ----------
// kind 0 lombada (elevação de 10 cm em 3,6 m, pintada), 1 valeta (calha de concreto de 1,6 m, 9 cm de fundo), 2 buraco
function cityFeatures() {
  const C = CITY, rnd = mkRng(5150), o = new Float64Array(5);
  C.feats = [];
  const add = (ch, s, kind, half, amp, lat, r) => {
    chainAt(ch, s, o); const f = { ch: ch.id, s, kind, half, amp, x: o[0] - o[3] * (lat || 0), z: o[1] + o[2] * (lat || 0), tx: o[2], tz: o[3], hw: ch.hw, r: r || 0, y: o[4] };
    C.feats.push(f); (ch.feats || (ch.feats = [])).push(f); return f;
  };
  const near = (ch, list, R) => { for (let i = 0; i < ch.n; i += 3) for (const p of list) if ((ch.x[i] - p[0]) ** 2 + (ch.z[i] - p[1]) ** 2 < R * R) return ch.s[i]; return -1; };
  const schools = C.pois.filter(p => p.tags.am === 'school' || p.tags.am === 'kindergarten' || p.tags.am === 'clinic').map(p => [p.x, p.z]);
  for (const ch of C.chains) {
    const s0 = ch.trimA, s1 = ch.L - ch.trimB, free = s1 - s0;
    if (!ch.cls.urban || ch.cls.dirt) continue;
    // lombadas: perto de escolas e postos de saúde e, nas ruas compridas, uma a cada ~200 m
    let sb = free > 30 ? near(ch, schools, 70) : -1;
    if (sb > s0 + 8 && sb < s1 - 8) add(ch, sb, 0, 1.8, 0.1);
    else if (free > 120 && rnd() < 0.55) add(ch, s0 + free * (0.35 + rnd() * 0.3), 0, 1.8, 0.1);
    // valetas atravessando a rua junto aos cruzamentos (ruas residenciais de mão dupla)
    if (!ch.cls.one && ch.cls.paint === 0) {
      if (ch.a.junc >= 0 && free > 14 && rnd() < 0.3) add(ch, s0 + 1.4, 1, 0.8, -0.09);
      if (ch.b.junc >= 0 && free > 14 && rnd() < 0.3) add(ch, s1 - 1.4, 1, 0.8, -0.09);
    }
  }
  // buracos: em parte das ruas e estradas asfaltadas, nas trilhas das rodas
  for (const ch of C.chains) {
    if (ch.cls.dirt || ch.cls.paint === 1 && !ch.cls.urban) continue;
    const s0 = ch.trimA + 3, s1 = ch.L - ch.trimB - 3; if (s1 - s0 < 20 || rnd() > 0.32) continue;
    const n = 1 + Math.floor(rnd() * 3 * (s1 - s0) / 150);
    for (let k = 0; k < n; k++) { const s = s0 + rnd() * (s1 - s0); if ((ch.feats || []).some(f => Math.abs(f.s - s) < 5)) continue; add(ch, s, 2, 0, -0.06, (rnd() < 0.5 ? -1 : 1) * ch.hw * (0.25 + rnd() * 0.25), 0.35 + rnd() * 0.4); }
  }
  // grade para a física
  const cell = 32, nx = Math.ceil(C.W / cell), nz = Math.ceil(C.H / cell), g = Array.from({ length: nx * nz }, () => []);
  for (const f of C.feats) {
    const R = Math.max(f.hw + 1, f.half + 1, f.r + 1), i0 = Math.max(0, Math.floor((f.x - R - C.X0) / cell)), i1 = Math.min(nx - 1, Math.floor((f.x + R - C.X0) / cell)), j0 = Math.max(0, Math.floor((f.z - R - C.Z0) / cell)), j1 = Math.min(nz - 1, Math.floor((f.z + R - C.Z0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) g[j * nx + i].push(f);
  }
  C.fgrid = { cell, nx, nz, g };
}
// perfil de uma lombada/valeta ao longo da via (t = distância ao centro / meia extensão)
function featProfile(f, a) { const t = a / f.half; if (t <= -1 || t >= 1) return 0; return f.kind === 0 ? f.amp * (0.5 + 0.5 * Math.cos(t * PI)) : f.amp * (0.5 + 0.5 * Math.cos(t * PI)); }
// deslocamento vertical das lombadas, valetas e buracos no ponto (só sobre a via)
function cityFeatureY(x, z) {
  const C = CITY, G = C.fgrid; if (!G) return 0;
  const i = Math.floor((x - C.X0) / G.cell), j = Math.floor((z - C.Z0) / G.cell); if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) return 0;
  const L = G.g[j * G.nx + i]; let dy = 0;
  for (let k = 0; k < L.length; k++) {
    const f = L[k], dx = x - f.x, dz = z - f.z;
    if (f.kind === 2) { const d2 = dx * dx + dz * dz; if (d2 < f.r * f.r) { const t = Math.sqrt(d2) / f.r; dy += f.amp * (1 - t * t * t * t); } continue; }
    const a = dx * f.tx + dz * f.tz, lat = -dx * f.tz + dz * f.tx;
    if (lat > -f.hw - 0.1 && lat < f.hw + 0.1) dy += featProfile(f, a);
  }
  return dy;
}
// ---------- comércios reais (Google Maps, nov/2026): fachada comercial com letreiro no lote mais próximo ----------
const CITY_SHOPS = [
  ['AUTOESCOLA VITÓRIA', -21.0166076, -49.4966016, '#1565c0', '#fff'],
  ['DIONÍSIO LOTÉRICA', -21.0158494, -49.4979102, '#005ca9', '#f39200'],
  ['PET SHOP ALIANÇA', -21.0161814, -49.4981408, '#2e7d32', '#fff'],
  ['GRANO SORVETES', -21.0168412, -49.4978941, '#ad1457', '#fff'],
  ['MARKIN MOTOS', -21.0151262, -49.4970352, '#1e2124', '#f5f5f5'],
  ['Prisma', -21.0169200, -49.4973000, '#14245c', '#ffffff'],
  ['SEGALA', -21.0168650, -49.4972550, '#1d1d1f', '#f2f2f2'],
  // Centro, conferidos no Google Maps e no Street View (nov/2026): posição pelo ponto do Google, fachada pelo Street View
  ['BANCO DO BRASIL', -21.0168384, -49.4966161, '#f7d417', '#1d3f95', 'Rua Gotardi'],
  ['PADARIA DO PARQUE', -21.0167167, -49.4964512, '#2a2a2d', '#f3e3c0'],
  ['POLÍCIA MILITAR', -21.0168491, -49.4969571, '#f4f4f0', '#1a1a1a', 'Rua Gotardi'],
  ['Aliança Saúde', -21.0161883, -49.4985310, '#d9d9d6', '#3a3a3a'],
  ['OQUELIFIBRA', -21.0160801, -49.4978341, '#1565c0', '#ffffff'],
  ['REDE TEM', -21.0157938, -49.4974687, '#c62828', '#ffffff'],
  ['CABELEIREIRO ROSILDO', -21.0158094, -49.4975415, '#f4f4f0', '#222222'],
  ['SECRETARIA DA EDUCAÇÃO', -21.0171501, -49.4980662, '#f4f4f0', '#0d3b66'],
  ['AUTO PEÇAS J. L.', -21.0152681, -49.4966995, '#0d47a1', '#ffffff'],
  ['CHAPA QUENTE', -21.0166043, -49.4986851, '#b71c1c', '#ffd54f'],
  ['DERSOS BIER', -21.0178773, -49.4964799, '#3e2723', '#ffca28'],
  ['TOP GRILL', -21.0164297, -49.4995265, '#212121', '#ff7043'],
  ['MINI MERCADO RNA', -21.0163067, -49.4997835, '#2e7d32', '#ffffff'],
  ['ARTENES BEAUTY', -21.0162365, -49.4992466, '#f8bbd0', '#4a148c'],
  ['ISA SIQUEIRA STUDIO', -21.0164886, -49.4998963, '#efe6dc', '#5d4037'],
  ['MARLENE MODAS', -21.0165230, -49.4999664, '#880e4f', '#ffffff'],
  ['DROGARIA TOTAL', -21.0163956, -49.5002224, '#0057a8', '#ffffff'],
  ['MULTI CASA', -21.0166181, -49.5004204, '#f57c00', '#ffffff'],
  ['FARMA NOVA', -21.0167267, -49.5003840, '#00897b', '#ffffff'],
  ['KAEDU', -21.0163431, -49.5006172, '#263238', '#ffffff'],
];
// fachadas de lojas feitas pelo Street View (dez/2023): cor da parede, toldo, grades, letreiro
const CITY_SHOP_STYLE = {
  'Prisma': { col: [0.64, 0.84, 0.66], awning: [0.3, 0.72, 0.48], grade: true, sub: 'PAPELARIA', signH: 1.15, roof: [0.6, 0.28, 0.15] },
  'SEGALA': { col: [0.86, 0.52, 0.38], awning: [0.6, 0.6, 0.6], grade: false, sub: 'ELÉTRICA · ELETRÔNICOS', signH: 1.05, roof: [0.55, 0.27, 0.15], frame: [0.3, 0.3, 0.32] },
  // agência na esquina da praça com a Rua do Comércio: vitrine de vidro entre pilares brancos, faixa amarela com o nome em azul, totem na esquina
  'BANCO DO BRASIL': { kind: 'banco', col: [0.93, 0.93, 0.9] },
  // sobrado azul na esquina da Gotardi com a Rua do Comércio: aba de telha laranja na frente, letreiro escuro no andar de cima
  'PADARIA DO PARQUE': { kind: 'padaria', two: true, col: [0.5, 0.62, 0.86], sub: 'CAFÉ', roof: [0.6, 0.27, 0.13] },
  // casa de tijolo avermelhado com varanda de arcos brancos e três oitões na frente, mureta branca com grade
  'POLÍCIA MILITAR': { kind: 'arcos', col: [0.6, 0.27, 0.2], roof: [0.5, 0.2, 0.1], sub: 'POSTO POLICIAL' },
  // fachada cinza com letreiro manuscrito na platibanda e toldo de lona branca
  'Aliança Saúde': { kind: 'simples', col: [0.78, 0.79, 0.79], toldo: [0.93, 0.92, 0.9], font: 'italic bold 60px Georgia, serif', sub: 'DROGARIA', signH: 0.95 },
  // casa de esquina verde-bandeira (Rua Guilhermite com a Rui Barbosa), placa azul da Oquelifibra
  'OQUELIFIBRA': { kind: 'simples', col: [0.16, 0.62, 0.3], sub: 'INTERNET FIBRA ÓPTICA', signH: 0.85, signW: 4.2 },
  'SECRETARIA DA EDUCAÇÃO': { kind: 'simples', col: [0.94, 0.93, 0.89], sub: 'PREFEITURA DE NOVA ALIANÇA', signH: 0.8 },
  'REDE TEM': { kind: 'simples', col: [0.86, 0.79, 0.64], toldo: [0.7, 0.32, 0.18], sub: 'MATERIAIS DE CONSTRUÇÃO', signH: 1.0 },
};
function cityShops() {
  const C = CITY, R = 6378137, kx = Math.cos(-21.0164 * PI / 180) * PI / 180 * R, kz = PI / 180 * R;
  C.shops = [];
  for (const [name, lat, lon, bg, fg, rua] of CITY_SHOPS) {
    const x = (lon + 49.4981) * kx, z = -(lat + 21.0164) * kz;
    let best = null, bd = 30 * 30;
    for (const h of C.houses) { const d = (h.x - x) ** 2 + (h.z - z) ** 2; if (d < bd && !h.shop && !h.borghiRef && (!rua || C.chains[h.ch].cls.name === rua)) { bd = d; best = h; } }
    if (!best) continue;
    best.shop = name; best.comm = true; best.wall = false; best.two = false; best.signBg = bg; best.signFg = fg;
    if (name === 'MARKIN MOTOS') best.col = [0.22, 0.23, 0.24];
    if (CITY_SHOP_STYLE[name]) { const S = CITY_SHOP_STYLE[name]; best.style = S; if (S.col) best.col = S.col; if (S.w) best.w = Math.min(best.w, S.w); if (S.two) best.two = true; }
    C.shops.push(name);
  }
  // lanchonetes e bares do OpenStreetMap
  for (const p of C.pois) {
    if (!p.name || !/^(fast_food|bar|cafe|restaurant|pharmacy)$/.test(p.tags.am || '')) continue;
    let best = null, bd = 25 * 25;
    for (const h of C.houses) { const d = (h.x - p.x) ** 2 + (h.z - p.z) ** 2; if (d < bd && !h.shop && !h.borghiRef) { bd = d; best = h; } }
    if (!best) continue;
    best.shop = p.name.toUpperCase(); best.comm = true; best.wall = false; best.two = false; best.signBg = p.tags.am === 'bar' ? '#4e342e' : '#e65100'; best.signFg = '#fff';
  }
}

// postes de concreto da rede elétrica com luminária: um lado de cada rua urbana, a cada ~35 m
function cityPoles() {
  const C = CITY, rnd = mkRng(8086), o = new Float64Array(5); C.poles = [];
  for (const ch of C.chains) {
    if (!ch.cls.urban) continue;
    const side = (ch.id & 1) ? 1 : -1;
    let s = ch.trimA + 4 + rnd() * 6;
    while (s < ch.L - ch.trimB - 3) {
      chainAt(ch, s, o); const nx = -o[3] * side, nz = o[2] * side, d = ch.hw + 0.35;
      _cq[0] = o[0] + nx * d; _cq[1] = o[1] + nz * d; cityRasterQ(_cq); if (_cq[9] < 0.25) { s += 6; continue; }   // cairia na pista de outra via (avenida com canteiro, ruas coladas)
      C.poles.push({ ch: ch.id, x: o[0] + nx * d, y: (typeof cityGroundY === 'function' ? cityGroundY(o[0] + nx * d, o[1] + nz * d) : o[4] + C.CURB), z: o[1] + nz * d, nx, nz, tx: o[2], tz: o[3], side, trafo: rnd() < 0.08, lx: o[0] + nx * (d - 1.95), lz: o[1] + nz * (d - 1.95) });
      C.addCircle(C.poles[C.poles.length - 1].x, C.poles[C.poles.length - 1].z, 0.2);
      s += 32 + rnd() * 7;
    }
  }
}

// pistas duplas desenhadas como duas vias de mão dupla coladas (ex.: Avenida João Brentam): as duas pistas se sobrepunham.
// Estreita cada uma para caber lado a lado com um canteiro de ~1,2 m entre elas.
function cityTwins() {
  const C = CITY, byName = new Map();
  for (const ch of C.chains) if (ch.cls.name && ch.L > 20) { if (!byName.has(ch.cls.name)) byName.set(ch.cls.name, []); byName.get(ch.cls.name).push(ch); }
  C.twins = 0;
  for (const L of byName.values()) for (const A of L) for (const B of L) {
    if (A === B) continue;
    const ds = []; let par = 0, tot = 0;
    for (let i = 0; i < A.n; i += 3) {
      let bd = 1e9, bj = 0; for (let j = 0; j < B.n; j++) { const d = (A.x[i] - B.x[j]) ** 2 + (A.z[i] - B.z[j]) ** 2; if (d < bd) { bd = d; bj = j; } }
      tot++; const d = Math.sqrt(bd); if (d > A.hw + B.hw + 1.2 || bj === 0 || bj === B.n - 1) continue;
      const ia = Math.min(A.n - 1, i + 1), ib = Math.min(B.n - 1, bj + 1), ax = A.x[ia] - A.x[ia - 1], az = A.z[ia] - A.z[ia - 1], bx = B.x[ib] - B.x[ib - 1], bz = B.z[ib] - B.z[ib - 1];
      if (Math.abs(ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz) + 1e-9) > 0.95) { par++; ds.push(d); }
    }
    if (tot < 3 || par / tot < 0.5) continue;
    ds.sort((a, b) => a - b); const d = ds[ds.length >> 1], hw = Math.max(2.6, Math.min(A.hw, (d - 1.2) / 2));
    if (hw < A.hw - 0.05) { A.hw = hw; A.twin = true; C.twins++; }
  }
}

// altura exata do chão visível num ponto da cidade: asfalto, calçada (asfalto + meio-fio) ou terreno
function cityGroundY(x, z) {
  const q = _cq; q[0] = x; q[1] = z; cityRasterQ(q);
  const d = q[9], yr = q[10], t = q[11];
  if (d < 0) return yr;
  if ((t & ST_URBAN) && d < CITY.SW) return yr + CITY.CURB;
  return hfAt(x, z);
}
