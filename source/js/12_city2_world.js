// Nova Aliança no jogo: troca as funções do circuito (terreno, mapas do mundo, chão da física, colisão, reposição) pelas da
// cidade. cityInstall() roda em main() logo depois de trackBuild(); o circuito continua calculado (a IA do aquecimento usa),
// mas não é desenhado.
function cityInstall() {
  const C = CITY;
  cityBuild();
  console.log('Nova Aliança:', JSON.stringify(C.stats));
  // centro do mundo (vegetação, sombra estática, raiz do terreno) no meio da área
  TRK.cx = (C.X0 + C.X1) / 2; TRK.cz = (C.Z0 + C.Z1) / 2;
  TRK.bx0 = C.X0; TRK.bx1 = C.X1; TRK.bz0 = C.Z0; TRK.bz1 = C.Z1;
  // piso de terra (estradas rurais): aderência intermediária, solta para o som e a poeira
  ZONE.DIRT = 7;
  SH_DEFS.CITY = ''; SH_DEFS.WM_ZS = '1.0';
  // troca das funções do circuito pelas da cidade (declarações de função: as chamadas usam sempre o valor atual do nome)
  terrainH = cityTerrainH; forestAt = cityForestAt; trackFarDist = () => 1e9;
  heightFieldBuild = cityHeightField; worldMapBuild = cityWorldMap;
  ribbonBuild = cityRoadsBuild; propsBuild = cityPropsBuild;
  terrainDistBox = cityDistBox; terrainMinLeaf = 32;
  groundQ = cityGroundQ; vehicleCollide = cityCollide;
  ZMU[7] = 0.74; ZDRAG[7] = 0.03;
}
// campo de alturas de 1 m (mesma grade dos rasters): um laço só, sem chamada por ponto
function cityHeightField() {
  const C = CITY, W = C.W, H = C.H, N = W * H, d = new Float32Array(N), rd = C.rd, ry = C.ry, st = C.st, SW = C.SW, CU = C.CURB, BAND = C.BAND;
  HF.x0 = C.X0; HF.z0 = C.Z0; HF.w = W; HF.h = H; HF.d = d;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, dist = rd[k] * 0.01, nat = cityNatQ(C.X0 + i, C.Z0 + j);
    if (dist >= BAND - 0.5) { d[k] = nat; continue; }
    const yr = ry[k] * 0.01, t = st[k];
    if (dist < 0) d[k] = yr - 0.35 * smooth(0, 0.6, -dist) - 0.02;
    else if (t & ST_URBAN) { const top = yr + CU - 0.03; d[k] = dist < SW ? top : lerp(top + 0.03, nat, smooth(SW, BAND - 1, dist)); }
    else d[k] = lerp(yr - 0.08, nat, smooth(0.8, 14, dist));
  }
  // lotes ocupados (casas, praças): terreno plano no nível da calçada junto à frente, sem degraus sob as paredes
}
// mapas do mundo na GPU: altura (1 m) e zonas (1 m; o circuito usa 0,5 m). Canais como em 11_worldmap.js:
// R distância à borda da via | G brita (não há) | B grama alta | A concreto (calçadas, posto, praças pavimentadas)
function cityWorldMap() {
  const C = CITY, dev = G.dev, W = C.W, H = C.H;
  WM.x0 = HF.x0; WM.z0 = HF.z0; WM.sx = HF.w - 1; WM.sz = HF.h - 1;
  WM.height = mkTex(HF.w, HF.h, 'r32float', TU.TB | TU.CD);
  dev.queue.writeTexture({ texture: WM.height }, HF.d, { bytesPerRow: HF.w * 4 }, [HF.w, HF.h]);
  WM.zw = W; WM.zh = H;
  const z = new Uint8Array(W * H * 4), rd = C.rd, st = C.st, SW = C.SW;
  const enc = (v, lo, hi) => { const t = (v - lo) / (hi - lo); return t <= 0 ? 0 : t >= 1 ? 255 : Math.round(t * 255); };
  const pave = C.pave || [];   // áreas de concreto: [x, z, raio]
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, o = k * 4, d = rd[k] * 0.01, t = st[k], urban = t & ST_URBAN;
    z[o] = enc(d, -8, 24);
    z[o + 1] = 0;   // canal G: luz dos postes à noite (carimbada abaixo)
    let tall = urban ? 0.18 : smooth(2.5, 9, d) * (0.65 + 0.35 * smooth(30, 30, d));
    if (C.occ[k] === 2) tall = 0;           // praças: gramado aparado
    z[o + 2] = Math.round(sat(tall) * 255);
    let c = urban ? Math.min(d + 0.15, SW + 0.25 - d) : -8;
    if (C.occ[k] === 3) c = Math.max(c, 1.0); // pisos da praça matriz
    z[o + 3] = enc(c, -8, 8);
  }
  // luz dos postes no chão (poças de luz à noite): soma das quedas em volta de cada luminária
  for (const P of C.poles || []) {
    const R = 13;
    for (let j = Math.max(0, Math.floor(P.lz - R - C.Z0)); j <= Math.min(H - 1, Math.ceil(P.lz + R - C.Z0)); j++) for (let i = Math.max(0, Math.floor(P.lx - R - C.X0)); i <= Math.min(W - 1, Math.ceil(P.lx + R - C.X0)); i++) {
      const o = (j * W + i) * 4, d2 = (C.X0 + i - P.lx) ** 2 + (C.Z0 + j - P.lz) ** 2, v = 255 * Math.exp(-d2 / 42) * 0.95;
      z[o + 1] = Math.min(255, z[o + 1] + Math.round(v));
    }
  }
  // áreas pavimentadas (posto, rodoviária, estacionamentos, caminhos das praças): discos carimbados por cima
  for (let p = 0; p < pave.length; p += 3) {
    const px = pave[p], pz = pave[p + 1], r = pave[p + 2], R = r + 8;
    for (let j = Math.max(0, Math.floor(pz - R - C.Z0)); j <= Math.min(H - 1, Math.ceil(pz + R - C.Z0)); j++) for (let i = Math.max(0, Math.floor(px - R - C.X0)); i <= Math.min(W - 1, Math.ceil(px + R - C.X0)); i++) {
      const o = (j * W + i) * 4, c = enc(r - Math.hypot(C.X0 + i - px, C.Z0 + j - pz), -8, 8); if (c > z[o + 3]) z[o + 3] = c;
    }
  }
  WM.zone = mkTex(W, H, 'rgba8unorm', TU.TB | TU.CD);
  dev.queue.writeTexture({ texture: WM.zone }, z, { bytesPerRow: W * 4 }, [W, H]);
}

// ---------- física ----------
// chão da cidade (mesmo contrato de groundQ): entrada _gq[0]=x, _gq[1]=z; saída _gq[8]=altura; devolve a zona
function cityGroundQ(wi) {
  const q = _gq, C = CITY;
  cityRasterQ(q);
  const d = q[9], yr = q[10], t = q[11];
  let zone, y;
  if (d < 0) {
    y = yr + cityFeatureY(q[0], q[1]); zone = (t & ST_DIRT) ? ZONE.DIRT : ZONE.ASPHALT;
    if (t & ST_DIRT) y += 0.025 * Math.sin(q[0] * 1.7 + q[1] * 0.4) * Math.sin(q[1] * 1.3 - q[0] * 0.6);   // costelas da estrada de terra
  } else if ((t & ST_URBAN) && d < C.SW) { y = yr + C.CURB; zone = ZONE.CONCRETE; }
  else {
    hfAtQ(q); y = q[6]; zone = (t & ST_DIRT) && d < 1.2 ? ZONE.DIRT : ZONE.GRASS;
    if (d < 1.0 && !(t & ST_URBAN)) { const e = yr - 0.08 * d; if (y < e) y = e; }
  }
  if (wi < 0) { VEH.s = 0; VEH.d = d; }
  q[8] = y; return zone;
}
// colisão: o retângulo do carro contra caixas orientadas (separação de eixos) e círculos (troncos, postes, placas),
// mais a borda da área. Cada contato empurra o carro para fora e corta a velocidade na direção da parede.
const _col = { tick: 0, n: new Float64Array(2) };
function cityHit(nx, nz, pen, lx, lz) {
  // lx, lz: ponto de contato em relação à posição do carro (mundo)
  const V = VEH, c = Math.cos(V.yaw), s = Math.sin(V.yaw);
  if (!(pen > 0) || pen > 3) return;
  V.x += nx * pen; V.z += nz * pen;
  let wvx = V.vx * c - V.vy * s, wvz = V.vx * s + V.vy * c;
  // velocidade do ponto de contato (inclui o giro)
  const pvx = wvx - V.r * lz, pvz = wvz + V.r * lx, vn = pvx * nx + pvz * nz;
  if (vn < 0) {
    wvx -= nx * vn * 1.25; wvz -= nz * vn * 1.25;
    const tgx = -nz, tgz = nx, vt = wvx * tgx + wvz * tgz; wvx -= tgx * vt * 0.2; wvz -= tgz * vt * 0.2;
    V.vx = wvx * c + wvz * s; V.vy = -wvx * s + wvz * c;
    V.r += (lx * nz - lz * nx) * (-vn) * 0.35; V.r *= 0.85; V.hits++;
  }
}
function cityCollide() {
  const V = VEH, P = VP, C = CITY, G = C.hgrid;
  // borda da área jogável (cantos do carro)
  for (let it = 0; it < 4; it++) {
    const c = Math.cos(V.yaw), s = Math.sin(V.yaw), k = it, lx = k < 2 ? P.front : -P.rear, lz = (k & 1) ? P.halfW : -P.halfW;
    const cx = V.x + c * lx - s * lz, cz = V.z + s * lx + c * lz, m = 6;
    if (cx < C.X0 + m) cityHit(1, 0, C.X0 + m - cx, cx - V.x, cz - V.z); else if (cx > C.X1 - m) cityHit(-1, 0, cx - (C.X1 - m), cx - V.x, cz - V.z);
    else if (cz < C.Z0 + m) cityHit(0, 1, C.Z0 + m - cz, cx - V.x, cz - V.z); else if (cz > C.Z1 - m) cityHit(0, -1, cz - (C.Z1 - m), cx - V.x, cz - V.z);
  }
  const tick = ++_col.tick, hl = (P.front + P.rear) / 2, hw = P.halfW + 0.04, co = (P.front - P.rear) / 2;
  const R = hl + 1, i0 = Math.max(0, Math.floor((V.x - R - C.X0) / G.cell)), i1 = Math.min(G.nx - 1, Math.floor((V.x + R - C.X0) / G.cell));
  const j0 = Math.max(0, Math.floor((V.z - R - C.Z0) / G.cell)), j1 = Math.min(G.nz - 1, Math.floor((V.z + R - C.Z0) / G.cell));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const L = G.grid[j * G.nx + i];
    for (let q = 0; q < L.length; q++) {
      const B = L[q]; if (B.t === tick) continue; B.t = tick;
      const c = Math.cos(V.yaw), s = Math.sin(V.yaw), pcx = V.x + c * co, pcz = V.z + s * co;   // centro do retângulo do carro
      const dx = B.x - pcx, dz = B.z - pcz;
      if (B.circ) {
        const rr = B.r + hl + hw; if (dx * dx + dz * dz > rr * rr) continue;
        const lx = dx * c + dz * s, lz = -dx * s + dz * c, qx = clamp(lx, -hl, hl), qz = clamp(lz, -hw, hw);
        let ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez), pen, nlx, nlz;
        if (d > 1e-4) { if (d >= B.r) continue; pen = B.r - d; nlx = -ex / d; nlz = -ez / d; }
        else { const px = hl - Math.abs(lx), pz = hw - Math.abs(lz); if (px < pz) { nlx = lx > 0 ? -1 : 1; nlz = 0; pen = px + B.r; } else { nlx = 0; nlz = lz > 0 ? -1 : 1; pen = pz + B.r; } }
        cityHit(nlx * c - nlz * s, nlx * s + nlz * c, pen, c * (qx + co) - s * qz, s * (qx + co) + c * qz);
      } else {
        const rb = Math.hypot(B.hd, B.hw); if (Math.hypot(dx, dz) > rb + hl + hw) continue;
        // separação de eixos: eixos do carro (frente, lado) e da caixa (u, v)
        let best = 1e9, bnx = 0, bnz = 0;
        const axes = [c, s, -s, c, B.ux, B.uz, -B.uz, B.ux];
        let sep = false;
        for (let a = 0; a < 8; a += 2) {
          const ax = axes[a], az = axes[a + 1];
          const rc = hl * Math.abs(c * ax + s * az) + hw * Math.abs(-s * ax + c * az);
          const rbx = B.hd * Math.abs(B.ux * ax + B.uz * az) + B.hw * Math.abs(-B.uz * ax + B.ux * az);
          const dist = -(dx * ax + dz * az), ov = rc + rbx - Math.abs(dist);   // dist: da caixa para o carro
          if (ov <= 0) { sep = true; break; }
          if (ov < best) { best = ov; const sg = dist < 0 ? -1 : 1; bnx = ax * sg; bnz = az * sg; }
        }
        if (sep) continue;
        // ponto de contato: o canto do carro mais enfiado na direção da caixa
        let mx = 0, mz = 0, md = 1e9;
        for (let k = 0; k < 4; k++) { const lx = (k < 2 ? hl : -hl) + co, lz = (k & 1) ? hw : -hw, wx = c * lx - s * lz, wz = s * lx + c * lz, dd = wx * bnx + wz * bnz; if (dd < md) { md = dd; mx = wx; mz = wz; } }
        cityHit(bnx, bnz, best, mx, mz);
      }
    }
  }
}
// coloca o carro na cadeia ch, a s metros do início, na faixa da direita (dir = +1 no sentido da cadeia, -1 contrário)
function cityPlace(ch, s, dir) {
  const V = VEH, o = new Float64Array(5); chainAt(ch, s, o);
  const one = ch.cls.one; if (one) dir = 1;
  const tx = o[2] * dir, tz = o[3] * dir, lane = one ? 0 : ch.hw * 0.48;
  V.x = o[0] - tz * lane; V.z = o[1] + tx * lane; V.yaw = Math.atan2(tz, tx);
  V.vx = V.vy = V.r = 0; V.steer = 0; V.rpm = 900; V.gear = 1; V.shiftTime = 0; V.ax = V.ay = 0; V.roll = V.rollV = V.pitch = V.pitchV = V.heave = V.heaveV = 0;
  V.hint = -1; V.whint.fill(-1); V.omega.fill(0); V.slip.fill(0);
  _gq[0] = V.x; _gq[1] = V.z; groundQ(-1); V.y = _gq[8]; V.gPitch = 0; V.gRoll = 0; V.lastS = V.s;
  for (let k = 0; k < 6; k++) vehicleGround(1);
  vehicleSavePrev();
}
function citySpawn() { const sp = CITY.spawn; cityPlace(sp.ch, sp.s, sp.dir); }
function cityTour(i) { const t = CITY.tour[i % CITY.tour.length]; cityPlace(t.ch, t.s, i & 1 ? 1 : -1); }
// R: volta para a rua mais próxima, no sentido mais parecido com o do carro
function cityRecover() {
  const V = VEH, C = CITY; let best = null, bs = 0, bd = 1e18;
  for (const ch of C.chains) {
    if (ch.L - ch.trimA - ch.trimB < 6) continue;
    for (let i = 0; i < ch.n; i++) { const dx = ch.x[i] - V.x, dz = ch.z[i] - V.z, d = dx * dx + dz * dz; if (d < bd && ch.s[i] > ch.trimA + 2 && ch.s[i] < ch.L - ch.trimB - 2) { bd = d; best = ch; bs = ch.s[i]; } }
  }
  if (!best) { citySpawn(); return; }
  const o = new Float64Array(5); chainAt(best, bs, o);
  cityPlace(best, bs, o[2] * Math.cos(V.yaw) + o[3] * Math.sin(V.yaw) >= 0 ? 1 : -1);
}
// árvores da cidade: calçadas (arvoretas e ipês), praças (copas grandes e palmeiras); entra na distribuição da vegetação
function cityTrees(push, rnd) {
  const C = CITY, o = new Float64Array(5);
  const nearJ = (x, z) => { for (const J of C.juncs) { const dx = x - J.node.x, dz = z - J.node.z; if (dx * dx + dz * dz < 196) return true; } return false; };
  for (const ch of C.chains) {
    if (!ch.cls.urban) continue;
    for (const side of [-1, 1]) {
      let s = ch.trimA + 5 + rnd() * 10;
      while (s < ch.L - ch.trimB - 5) {
        chainAt(ch, s, o);
        const nx = -o[3] * side, nz = o[2] * side, d = ch.hw + C.SW - 0.7, x = o[0] + nx * d, z = o[1] + nz * d;
        const i = Math.round(x - C.X0), j = Math.round(z - C.Z0);
        const nearP = MARCOS.petrus && (Math.hypot(x - MARCOS.petrus.ox, z - MARCOS.petrus.oz) < 24 || (typeof petrusTreeReserved === 'function' && petrusTreeReserved(x, z)));   // calçada da casa do Petrus sem árvore, como na foto
        if (rnd() < 0.42 && i >= 0 && j >= 0 && i < C.W && j < C.H && !nearJ(x, z) && !nearP && !borghiNear(x, z)) {
          const r = rnd(), arch = r < 0.55 ? 4 : r < 0.8 ? 1 : r < 0.9 ? 3 : 0;
          push(x, cityGroundY(x, z) - 0.12, z, (arch === 4 ? 0.55 : 0.42) + rnd() * 0.3, rnd() * TAU, rnd(), arch);
        }
        s += 11 + rnd() * 14;
      }
    }
  }
  // palmeiras no canteiro central das avenidas de mão dupla separada (duas pistas de mão única lado a lado)
  for (const ch of C.chains) {
    if (!ch.cls.urban || !ch.cls.one) continue;
    for (let s = ch.trimA + 6; s < ch.L - ch.trimB - 6; s += 13) {
      chainAt(ch, s, o); const lx = o[3], lz = -o[2];   // esquerda de quem segue a via
      let hit = -1; for (let d = ch.hw + C.SW + 1; d < 26; d += 0.8) { _cq[0] = o[0] + lx * d; _cq[1] = o[1] + lz * d; cityRasterQ(_cq); if (_cq[9] < 0) { hit = d; break; } }
      if (hit < 0) continue;
      const m = (ch.hw + hit) / 2; _cq[0] = o[0] + lx * m; _cq[1] = o[1] + lz * m; cityRasterQ(_cq); if (_cq[9] < C.SW + 0.8) continue;
      { const px = _cq[0], pz = _cq[1]; push(px, cityGroundY(px, pz) - 0.12, pz, 0.85 + rnd() * 0.25, rnd() * TAU, rnd(), 3); }
    }
  }
  for (const t of MARCOS.trees) push(t[0], cityGroundY(t[0], t[1]) - 0.12, t[1], t[3], rnd() * TAU, rnd(), t[2]);
  for (const B of C.blocks) {
    if (B.kind !== 'park' || B.matriz) continue;
    for (let q = 0; q < B.cells.length; q += 23) {
      const k = B.cells[(q + ((rnd() * 23) | 0)) % B.cells.length], x = C.X0 + (k % C.W) + rnd() - 0.5, z = C.Z0 + Math.floor(k / C.W) + rnd() - 0.5;
      if (C.rd[k] < (C.SW + 2.5) * 100 || rnd() < 0.35) continue;
      if (B.free && B.free(x, z)) continue;
      const r = rnd(), arch = r < 0.3 ? 3 : r < 0.6 ? 0 : r < 0.85 ? 1 : 4;
      push(x, cityGroundY(x, z) - 0.15, z, 0.6 + rnd() * 0.45, rnd() * TAU, rnd(), arch);
    }
  }
}

// vegetação solta (arbustos) fora das vias, calçadas, lotes urbanos e construções
function cityVegBlocked(x, z) {
  const C = CITY; if (x < C.X0 || z < C.Z0 || x > C.X1 || z > C.Z1) return false;
  _cq[0] = x; _cq[1] = z; cityRasterQ(_cq);
  if (_cq[11] & ST_URBAN) return _cq[9] < 45;
  if (C.occ[Math.round(z - C.Z0) * C.W + Math.round(x - C.X0)]) return true;
  return _cq[9] < 7;
}
