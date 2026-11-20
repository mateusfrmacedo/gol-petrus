// Nova Aliança: lugares modelados a partir das fotos (Street View, out/2024 e nov/2021) e da vista de satélite:
// Borghi Veículos (esquina da Rua do Comércio/SP-355 com a Rua Francisco Coco), Praça Matriz Padre João Nolte com a
// Paróquia Nossa Senhora Aparecida, e o Supermercado Sacoi (Avenida Francisco Pereira dos Santos).
// Medidas aproximadas pelas fotos; posições casadas com as ruas do OpenStreetMap.
const MARCOS = { borghi: null, sacoi: null, matriz: null, petrus: null, entrada: null, trees: [] };

// quadro local de um lote: origem o, eixo X da rua para dentro do lote (ux, uz), eixo Z ao longo da rua
function marcoFrame(ox, oz, ux, uz) { const l = Math.hypot(ux, uz); ux /= l; uz /= l; return { ox, oz, ux, uz, zx: -uz, zz: ux, at(a, b) { return [ox + ux * a - uz * b, oz + uz * a + ux * b]; } }; }
function nearestChain(x, z, re) {
  let best = null, bd = 1e18, bi = 0;
  for (const ch of CITY.chains) { if (re && !re.test(ch.cls.name)) continue; for (let i = 0; i < ch.n; i++) { const d = (ch.x[i] - x) ** 2 + (ch.z[i] - z) ** 2; if (d < bd) { bd = d; best = ch; bi = i; } } }
  if (!best) return null;
  const a = Math.max(0, bi - 2), b = Math.min(best.n - 1, bi + 2), tx = best.x[b] - best.x[a], tz = best.z[b] - best.z[a], l = Math.hypot(tx, tz) || 1;
  return { ch: best, x: best.x[bi], z: best.z[bi], tx: tx / l, tz: tz / l, d: Math.sqrt(bd) };
}
// posições (chamado em cityLots, antes das casas): reserva o espaço e define os quadros locais
function marcosLayout(reserved) {
  const C = CITY;
  marcosEntradaLayout();
  // Borghi: lote da esquina sudoeste do cruzamento; frente para a Rua do Comércio (leste), lado norte na Rua Francisco Coco
  {
    let J = null, bd = 1e18;
    for (const j of C.juncs) { const d = (j.node.x - 112) ** 2 + (j.node.z + 176) ** 2; if (d < bd) { bd = d; J = j; } }
    const r = nearestChain(J.node.x, J.node.z - 8, /Comércio/), fc = nearestChain(J.node.x - 10, J.node.z, /Francisco Coco/);
    // eixo "rua → lote" = oeste (contrário da Francisco Coco no sentido leste); eixo Z = sul (ao longo da Rua do Comércio)
    let ex = fc ? fc.tx : 0.97, ez = fc ? fc.tz : -0.24; if (ex < 0) { ex = -ex; ez = -ez; }
    let sx = -ez, sz = ex; if (sz < 0) { sx = -sx; sz = -sz; }
    const off = (r ? r.ch.hw : 3.6) + C.SW + 0.3, offN = (fc ? fc.ch.hw : 3.6) + C.SW + 0.3;
    const D = 15, W = 20, ox = J.node.x - ex * (off + D / 2) + sx * (offN + W / 2), oz = J.node.z - ez * (off + D / 2) + sz * (offN + W / 2);
    MARCOS.borghi = Object.assign(marcoFrame(ox, oz, -ex, -ez), { D, W });
    // o eixo Z do quadro precisa apontar para o sul (canto do escritório no norte)
    if (MARCOS.borghi.zz < 0) MARCOS.borghi.flip = true;
    reserved.push([ox, oz, 14]);
  }
  // Sacoi: prédio recuado da avenida, estacionamento na frente
  {
    const r = nearestChain(-388, 176, /Avenida Francisco Pereira/);
    let sx = r.tx, sz = r.tz; if (sz < 0) { sx = -sx; sz = -sz; }   // ao longo da avenida, para o sul
    let ex = sz, ez = -sx;                                              // perpendicular, para o leste
    const front = r.ch.hw + C.SW + 15.5, D = 30, W = 42;
    const fx = r.x - ex * front + sx * 6, fz = r.z - ez * front + sz * 6;
    MARCOS.sacoi = Object.assign(marcoFrame(fx - ex * D / 2, fz - ez * D / 2, -ex, -ez), { D, W, park: 15 });
    reserved.push([fx - ex * 6, fz - ez * 6, 34]);
  }
  // casa do Petrus (Rua José Fagliari, nº 475 no Google; no OSM o trecho se chama Rua Humberto Melão): lado norte da rua
  {
    const r = nearestChain(-702, 261);
    let tx = r.tx, tz = r.tz; if (tx < 0) { tx = -tx; tz = -tz; }   // ao longo da rua, para o leste
    const nx = tz, nz = -tx;                                           // para o norte (dentro do lote)
    const off = r.ch.hw + C.SW + 0.3, D = 22, W = 13;
    const ox = r.x + nx * (off + D / 2) + tx * 1.0, oz = r.z + nz * (off + D / 2) + tz * 1.0;
    MARCOS.petrus = Object.assign(marcoFrame(ox, oz, nx, nz), { D, W, flipZ: (-nz) * tx + nx * tz });
    reserved.push([ox, oz, 12]);
  }
  // Praça Matriz: a quadra inteira (Rua Guilhermite, Rua Rui Barbosa, Rua Gotardi e Rua do Comércio)
  {
    const B = C.blocks.find(b => /Nolte/.test(b.name)); if (!B) return;
    const g = nearestChain(116, 36, /Gotardi/); let ex = g ? g.tx : 0.97, ez = g ? g.tz : -0.24; if (ex < 0) { ex = -ex; ez = -ez; }
    const sx = -ez, sz = ex;   // sul
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9, cx = 0, cz = 0;
    for (const k of B.cells) { cx += k % C.W; cz += Math.floor(k / C.W); }
    cx = C.X0 + cx / B.cells.length; cz = C.Z0 + cz / B.cells.length;
    for (const k of B.cells) { const x = C.X0 + k % C.W - cx, z = C.Z0 + Math.floor(k / C.W) - cz, u = x * ex + z * ez, v = x * sx + z * sz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const M = { B, cx, cz, ex, ez, sx, sz, u0, u1, v0, v1, at(u, v) { return [cx + ex * u + sx * v, cz + ez * u + sz * v]; } };
    MARCOS.matriz = M; B.matriz = true;
    // igreja na parte oeste, fachada e torre voltadas para a praça (leste); praça no resto da quadra
    const vm = (v0 + v1) / 2;
    M.church = { u: u0 + 4 + 18, v: vm + 2, D: 36, W: 17 };
    M.pu0 = u0 + 4 + 36 + 9; M.vm = vm;
    // pisos: caminhos de tijolo (largura 3,4 m) em cruz e diagonais, contorno de 3 m, largo circular no centro e adro da igreja
    const pc = [(M.pu0 + u1) / 2, vm];
    M.center = pc;
    const segs = [[u0 + 4 + 36, vm, u1, vm, 1.9], [pc[0], v0, pc[0], v1, 1.7], [pc[0], vm, u1, v0, 1.7], [pc[0], vm, u1, v1, 1.7], [pc[0], vm, M.pu0, v0, 1.5], [pc[0], vm, M.pu0, v1, 1.5]];
    M.segs = segs;
    const inPath = (u, v) => {
      if (u < u0 + 1 || u > u1 - 1 || v < v0 + 1 || v > v1 - 1) return false;
      if (u > M.pu0 - 9 && (u > u1 - 4.0 || v < v0 + 4.0 || v > v1 - 4.0)) return true;   // contorno da praça
      if (Math.hypot(u - pc[0], v - pc[1]) < 9) return true;
      if (u > M.pu0 - 9 && u < M.pu0 + 1 && Math.abs(v - vm) < 14) return true;            // adro em frente à igreja
      for (const s of segs) { const ax = s[0], az = s[1], bx = s[2], bz = s[3], l2 = (bx - ax) ** 2 + (bz - az) ** 2, t = clamp(((u - ax) * (bx - ax) + (v - az) * (bz - az)) / l2, 0, 1); if (Math.hypot(u - ax - (bx - ax) * t, v - az - (bz - az) * t) < s[4]) return true; }
      return false;
    };
    M.paved = [];
    for (const k of B.cells) {
      const x = C.X0 + k % C.W - cx, z = C.Z0 + Math.floor(k / C.W) - cz, u = x * ex + z * ez, v = x * sx + z * sz;
      if (inPath(u, v)) { C.occ[k] = 3; M.paved.push(k); }
    }
    // quiosque coberto (ponto de encontro) junto à Rua do Comércio, lado sul
    M.kiosk = { u: u1 - 8, v: v1 - 22, D: 8, W: 22 };
    // árvores: palmeiras-imperiais ladeando o caminho principal, renque ao norte e a leste, copas grandes nos canteiros
    const T = MARCOS.trees, rnd = mkRng(777), free = (u, v) => !inPath(u, v) && !(u > M.kiosk.u - 6 && v > M.kiosk.v - 13 && v < M.kiosk.v + 13);
    for (let u = M.pu0 + 2; u < u1 - 6; u += 8) for (const s of [-1, 1]) { const p = M.at(u, vm + s * 3.4); T.push([p[0], p[1], 3, 1.25 + rnd() * 0.15]); }
    for (let u = M.pu0 - 4; u < u1 - 2; u += 6.5) { const p = M.at(u, v0 + 1.6); T.push([p[0], p[1], rnd() < 0.5 ? 1 : 4, 0.8 + rnd() * 0.3]); }
    for (let v = v0 + 6; v < M.kiosk.v - 14; v += 6.5) { const p = M.at(u1 - 1.6, v); T.push([p[0], p[1], rnd() < 0.5 ? 1 : 4, 0.8 + rnd() * 0.3]); }
    for (let k = 0; k < 90; k++) { const u = M.pu0 + rnd() * (u1 - M.pu0), v = v0 + rnd() * (v1 - v0); if (!free(u, v) || !free(u + 2, v) || !free(u - 2, v)) continue; const p = M.at(u, v); T.push([p[0], p[1], rnd() < 0.55 ? 0 : rnd() < 0.5 ? 1 : 3, 0.7 + rnd() * 0.5]); }
    for (let k = 0; k < 24; k++) { const u = u0 + 2 + rnd() * 44, v = rnd() < 0.5 ? v0 + 2 + rnd() * 5 : v1 - 2 - rnd() * 5; const p = M.at(u, v); T.push([p[0], p[1], rnd() < 0.5 ? 1 : 4, 0.7 + rnd() * 0.3]); }
  }
}
// ---------- atlas próprio dos letreiros da cidade ----------
function marcosAtlas() {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 3072; const g = cv.getContext('2d');
  const REG = {}, reg = (n, x, y, w, h) => { REG[n] = [x / 2048, y / 3072, (x + w) / 2048, (y + h) / 3072]; };
  g.fillStyle = '#888'; g.fillRect(0, 0, 2048, 3072);
  // Sacoi: letras arredondadas coloridas sobre o reboco bege, "SUPERMERCADOS" em verde
  g.fillStyle = '#cbbf9f'; g.fillRect(0, 0, 1024, 384);
  g.textBaseline = 'alphabetic'; g.font = '900 250px "Arial Rounded MT Bold", "Nunito", "Arial Black", Arial, sans-serif';
  const L = [['s', '#f4b400'], ['a', '#7cb342'], ['c', '#f57c00'], ['o', '#e53935'], ['i', '#f4b400']];
  let tw = 0; for (const [ch] of L) tw += g.measureText(ch).width; let x = 512 - tw / 2;
  for (const [ch, col] of L) { g.lineWidth = 16; g.strokeStyle = 'rgba(60,40,20,0.35)'; g.strokeText(ch, x + 6, 268); g.fillStyle = col; g.fillText(ch, x, 262); x += g.measureText(ch).width; }
  g.fillStyle = '#e53935'; g.beginPath(); g.ellipse(512 + tw / 2 - 30, 70, 30, 30, 0, 0, TAU); g.fill();   // pingo do "i"
  g.font = 'bold 66px Arial, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#2e7d32'; g.fillText('SUPERMERCADOS', 512, 350, 760); g.textAlign = 'left';
  reg('sacoi', 0, 0, 1024, 384);
  // Borghi: placa escura pendurada com a logo
  g.fillStyle = '#17181b'; g.fillRect(1024, 0, 512, 640);
  if (typeof borghiLogo !== 'undefined' && borghiLogo) { const w = 460, h = w * borghiLogo.naturalHeight / borghiLogo.naturalWidth; g.drawImage(borghiLogo, 1024 + 26, 40, w, h); }
  g.fillStyle = '#f1f1f1'; g.textAlign = 'center'; g.font = 'bold 54px Arial, sans-serif'; g.fillText('BORGHI', 1280, 470); g.font = 'bold 44px Arial, sans-serif'; g.fillText('VEÍCULOS', 1280, 530);
  g.font = '28px Arial, sans-serif'; g.fillText('compra · venda · troca', 1280, 590); g.textAlign = 'left';
  reg('borghi', 1024, 0, 512, 640);
  // faixa promocional pendurada no Sacoi
  g.fillStyle = '#b71c1c'; g.fillRect(0, 400, 512, 128); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 70px Arial, sans-serif'; g.fillText('OFERTAS', 256, 488); g.textAlign = 'left'; reg('oferta', 0, 400, 512, 128);
  // mostrador do relógio da torre
  g.fillStyle = '#f5f5f0'; g.beginPath(); g.arc(1700, 160, 140, 0, TAU); g.fill(); g.strokeStyle = '#1b2a5a'; g.lineWidth = 14; g.stroke();
  g.lineWidth = 8; for (let k = 0; k < 12; k++) { const a = k * TAU / 12; g.beginPath(); g.moveTo(1700 + Math.cos(a) * 110, 160 + Math.sin(a) * 110); g.lineTo(1700 + Math.cos(a) * 128, 160 + Math.sin(a) * 128); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.moveTo(1700, 160); g.lineTo(1700 + 60, 160 - 30); g.moveTo(1700, 160); g.lineTo(1700 - 10, 160 - 95); g.stroke();
  g.fillStyle = '#1b2a5a'; g.fillRect(1544, 4, 312, 6); reg('relogio', 1550, 10, 300, 300);
  // placa de PARE (octógono vermelho, borda branca)
  { const cx = 1700, cy = 520, R = 150; g.fillStyle = '#f2f2f2'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k + 0.5) * TAU / 8; g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } g.fill();
    g.fillStyle = '#c62828'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k + 0.5) * TAU / 8; g.lineTo(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12)); } g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 92px Arial, sans-serif'; g.fillText('PARE', cx, cy + 4, 250); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; reg('pare', cx - R, cy - R, 2 * R, 2 * R); }
  // placas com o nome das ruas (azul, letra branca), 256 x 64 cada, a partir de y = 1024
  const names = [...new Set(CITY.chains.filter(c => c.cls.urban && c.cls.name).map(c => c.cls.name))].sort();
  CITY.plates = {};
  names.slice(0, 96).forEach((nm, i) => {
    const x = (i % 8) * 256, y = 1024 + Math.floor(i / 8) * 48;
    g.fillStyle = '#f2f2f2'; g.fillRect(x, y, 256, 48); g.fillStyle = '#1b4f9c'; g.fillRect(x + 3, y + 3, 250, 42);
    const short = nm.replace(/^Rua /, 'R. ').replace(/^Avenida /, 'Av. ').replace(/^Professora /, 'Profª ');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 22px Arial, sans-serif'; g.fillText(short, x + 128, y + 25, 240);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    reg('rua' + i, x, y, 256, 48); CITY.plates[nm] = 'rua' + i;
  });
  // letreiros dos comércios e prédios públicos (512 x 96 cada): 16 a partir de y = 1600 e mais 40 a partir de y = 2048
  const sn = [...new Map(CITY.signs.map(s => [s.name, s])).values()];
  sn.slice(0, 56).forEach((sg, i) => {
    const x = (i % 4) * 512, y = i < 16 ? 1600 + Math.floor(i / 4) * 96 : 2048 + Math.floor((i - 16) / 4) * 96;
    g.fillStyle = sg.bg; g.fillRect(x, y, 512, 96);
    if (sg.name === 'Prisma') {   // painel azul de "galáxia" com brilhos, como o letreiro da papelaria
      const gr = g.createRadialGradient(x + 200, y + 40, 10, x + 256, y + 48, 300); gr.addColorStop(0, '#3d6fd6'); gr.addColorStop(0.5, '#1a2f7a'); gr.addColorStop(1, '#0b1436'); g.fillStyle = gr; g.fillRect(x, y, 512, 96);
      const rs = mkRng(77); for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,255,255,${0.3 + rs() * 0.6})`; g.fillRect(x + rs() * 512, y + rs() * 96, 1 + rs() * 2, 1 + rs() * 2); }
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + 88, 512, 8);
    g.fillStyle = sg.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (sg.band) { g.fillStyle = sg.band; g.fillRect(x, y + 70, 512, 18); g.fillStyle = sg.fg; }
    if (sg.sub) { g.font = sg.font || (sg.name === 'Prisma' ? 'italic bold 56px Georgia, serif' : 'bold 48px Arial, sans-serif'); g.fillText(sg.name, x + 256, y + 38, 490); g.font = 'bold 19px Arial, sans-serif'; g.fillText(sg.sub, x + 256, y + 78, 490); }
    else { g.font = sg.font || 'bold 50px Arial, sans-serif'; g.fillText(sg.name, x + 256, y + (sg.band ? 38 : 46), 490); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; reg('sg' + i, x, y, 512, 96); CITY.signReg = CITY.signReg || {}; CITY.signReg[sg.name] = 'sg' + i;
  });
  // mural da lateral da Borghi (Rua Francisco Coco): serviços à esquerda, logo no meio, telefones à direita
  {
    const x0 = 0, y0 = 1984 - 360, W = 1536, H = 360; void W;
    g.fillStyle = '#121315'; g.fillRect(x0, 660, 1536, 360);
    g.fillStyle = '#f2f2f2'; g.font = 'italic bold 46px Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    ['• COMPRA', '• VENDA', '• TROCA', '• CONSIGNAÇÃO', '• FINANCIAMENTO'].forEach((t, k) => g.fillText(t, x0 + 40 + (k > 2 ? 0 : 60), 716 + k * 58, 420));
    g.strokeStyle = '#c9c9c9'; g.lineWidth = 10; g.beginPath(); g.ellipse(x0 + 770, 840, 250, 150, 0, 0, TAU); g.stroke();
    if (typeof borghiLogo !== 'undefined' && borghiLogo) { const lw = 420, lh = lw * borghiLogo.naturalHeight / borghiLogo.naturalWidth; g.drawImage(borghiLogo, x0 + 770 - lw / 2, 840 - lh / 2 - 20, lw, lh); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'italic bold 52px Arial, sans-serif'; g.fillText('Borghi Veículos', x0 + 770, 922); g.font = '24px Arial, sans-serif'; g.fillText('Nova Aliança', x0 + 770, 962);
    g.textAlign = 'left'; g.font = 'italic bold 50px Arial, sans-serif'; g.fillText('(17) 99701-7323', x0 + 1080, 820); g.fillText('(17) 99201-7475', x0 + 1080, 884);
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(x0 + 1250, 746, 26, 0, TAU); g.fill(); g.fillStyle = '#121315'; g.beginPath(); g.arc(x0 + 1250, 746, 18, 0, TAU); g.fill();
    g.textBaseline = 'alphabetic'; reg('borghiwall', x0, 660, 1536, 360); void y0; void H;
  }
  const tex = mkTex(2048, 3072, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 12 });
  G.dev.queue.copyExternalImageToTexture({ source: cv }, { texture: tex }, [2048, 3072]);
  genMips(tex, 'rgba8unorm-srgb');
  return { tex, REG };
}
// placa do atlas: canto p, vetor "direita" r, altura h (vertical), normal n
function marcoSign(mb, REG, name, px, py, pz, rx, rz, h, nx, nz) {
  const r = REG[name]; if (!r) return; mb.mat(7).color(1, 1, 1, 1);
  // o texto corre para a direita de quem olha a placa de frente (com a transformação espelhada, o lado se inverte)
  let side = rx * nz - rz * nx; if (mb.flipW) side = -side;
  if (side < 0) { px += rx; pz += rz; rx = -rx; rz = -rz; }
  const a = mb.v(px, py, pz, nx, 0, nz, r[0], r[3]), b = mb.v(px + rx, py, pz + rz, nx, 0, nz, r[2], r[3]), c = mb.v(px + rx, py + h, pz + rz, nx, 0, nz, r[2], r[1]), d = mb.v(px, py + h, pz, nx, 0, nz, r[0], r[1]);
  const cx = rz * h * 0 - 0, cz = 0; // (b-a) × (d-a) = (rx,0,rz) × (0,h,0) = (-rz h, 0, rx h)
  if (-rz * nx + rx * nz > 0) mb.quadI(a, b, c, d); else mb.quadI(a, d, c, b);
}
// carro estacionado simples (caixas arredondadas): uso nos pátios
function marcoCar(mb, x, y, z, yaw, col) {
  mb.push(m4basis(m4(), Math.cos(yaw), 0, Math.sin(yaw), 0, 1, 0, -Math.sin(yaw), 0, Math.cos(yaw), x, y, z));
  mb.mat(2, 60, 200).color(col[0], col[1], col[2], 1); mb.rbox(0, 0.62, 0, 3.9, 0.62, 1.66, 0.12, 3);
  mb.mat(5).color(1, 1, 1, 1); mb.rbox(-0.25, 1.12, 0, 2.0, 0.52, 1.46, 0.14, 3);
  mb.mat(4).color(0.05, 0.05, 0.05, 1); for (const a of [-1.25, 1.25]) for (const b of [-0.72, 0.72]) mb.cyl(a, 0.0, b, 0.31, 0.62, 0.31, 10, true, true);
  mbColBox(mb, 0, 0, 1.95, 0.83);   // carro estacionado é sólido
  mb.pop();
}
// ---------- Borghi Veículos ----------
function marcoBorghi(mb, REG) {
  const M = MARCOS.borghi; if (!M) return;
  const D = M.D, W = M.W, X = D / 2, Z = W / 2, y0 = hfAt(M.ox, M.oz) + 0.16;
  let ymin = y0; for (const [a, b] of [[-X, -Z], [X, -Z], [X, Z], [-X, Z]]) { const p = M.at(a, b); ymin = Math.min(ymin, hfAt(p[0], p[1])); }
  // eixo Z do quadro aponta para o sul quando flip = false; o escritório fica no canto norte da frente
  const zs = M.flip ? -1 : 1;
  mb.push(m4basis(m4(), M.ux, 0, M.uz, 0, 1, 0, M.zx * zs, 0, M.zz * zs, M.ox, y0, M.oz));
  const dark = [0.1, 0.1, 0.11], office = [0.2, 0.2, 0.21], yb = ymin - y0 - 0.5;
  // bloco do fundo (galpão escuro) mais alto que a cobertura
  mb.mat(19, 200).color(...dark, 1); cWalls(mb, 9, W, yb, 4.3); mb.mat(9).color(0.32, 0.33, 0.34, 1); cRect(mb, -4.5, 4.3, -Z, 9, 0, 0, 0, 0, W, 0, 1, 0);
  mb.push(m4translate(m4(), X - 4.5, 0, 0));
  mb.pop();
  // escritório fechado na esquina (norte = z negativo no quadro)
  mb.mat(19, 200).color(...office, 1);
  mb.box(-X + 2.6, (yb + 3.6) / 2, -Z + 2.1, 5.2, 3.6 - yb, 4.2);
  cOpening(mb, -X, -1, -Z + 2.1, 1.0, 0.1, 2.2, 13, [0.16, 0.16, 0.17]);
  // lateral norte na Rua Francisco Coco: parede preta contínua com o mural pintado e um basculante
  mb.mat(19, 200).color(...dark, 1); mb.box(0, (yb + 3.6) / 2, -Z + 0.1, D, 3.6 - yb, 0.2);
  marcoSign(mb, REG, 'borghiwall', -X + 1.0, 0.5, -Z - 0.02, D - 4.0, 0, (D - 4.0) * 360 / 1536, 0, -1);
  cOpeningZ(mb, -Z, -1, X - 2.6, 1.2, 2.0, 2.9, 2, [0.36, 0.37, 0.38]);
  // frades brancos na esquina
  mb.mat(2, 160, 0).color(0.9, 0.9, 0.88, 1); for (const [a0, b0] of [[-X - 1.2, -Z - 0.6], [-X - 0.4, -Z - 1.4], [-X - 2.0, -Z - 1.0]]) { const [a, b] = mbOffRoad(mb, a0, b0, 0.7, 0.7), g = mbGroundY(mb, a, b); mb.cyl(a, g - 0.1, b, 0.09, g + 0.9, 0.09, 8, false, true); mbColCircle(mb, a, b, 0.12); }
  // cobertura aberta: pilares pretos, telha metálica caída para a frente, franja escura na borda
  mb.mat(2, 120, 160).color(0.07, 0.07, 0.075, 1);
  for (const z of [-Z + 4.3, -1, 3.5, Z - 0.2]) { mb.box(-X + 0.12, 1.55, z, 0.14, 3.1, 0.14); mbColCircle(mb, -X + 0.12, z, 0.12); }
  mb.box(-X + 0.12, 3.1, 0, 0.18, 0.22, W);                                      // viga da frente
  mb.mat(9).color(0.36, 0.37, 0.38, 1);
  const rf = (a, y, b) => [a, y, b];
  cTriUp(mb, rf(-X - 0.2, 3.15, -Z + 4.2), rf(-X - 0.2, 3.15, Z), rf(-4.5 + X - D + 4.5 + 6.5, 3.75, Z), [-Z, 0], [Z, 0], [Z, 6.6]);
  cTriUp(mb, rf(-X - 0.2, 3.15, -Z + 4.2), rf(-X + 6.5, 3.75, Z), rf(-X + 6.5, 3.75, -Z + 4.2), [-Z, 0], [Z, 6.6], [-Z, 6.6]);
  // testeira cinza-escura na borda da cobertura e franja de tiras pretas penduradas (tela de sombreamento cortada)
  mb.mat(2, 150, 60).color(0.2, 0.21, 0.22, 1); mb.box(-X - 0.22, 3.28, (-Z + 4.2 + Z) / 2, 0.1, 0.55, W - 4.2);
  { const fr = mkRng(515); for (let z = -Z + 4.25; z < Z; z += 0.085) { const h = 0.3 + fr() * 0.28, k = 0.04 + fr() * 0.04; mb.mat(2, 220, 0).color(k, k, k * 1.05, 1); mb.box(-X - 0.25, 3.0 - h / 2, z, 0.012, h, 0.06); } }
  // grade metálica preta à esquerda (lado sul) e mureta baixa
  mb.mat(2, 120, 160).color(0.08, 0.08, 0.085, 1);
  for (let z = Z - 4.2; z <= Z - 0.1; z += 0.13) mb.box(-X + 0.1, 1.1, z, 0.03, 2.2, 0.03);
  mb.box(-X + 0.1, 2.2, Z - 2.15, 0.05, 0.05, 4.1); mb.box(-X + 0.1, 0.12, Z - 2.15, 0.05, 0.05, 4.1);
  for (let a = -X + 0.4; a < -X + 6.4; a += 0.13) mb.box(a, 1.1, Z - 0.1, 0.03, 2.2, 0.03);
  // teto de luz em colmeia (LED hexagonal, como no salão da loja): sempre aceso
  {
    const r = 0.42, t = 0.045, x0 = -X + 0.7, x1 = -4.9, z0 = -Z + 4.7, z1 = Z - 0.6, h = Math.sqrt(3) * r;
    mb.mat(2, 180, 0).color(0.12, 0.12, 0.13, 1); mb.box((x0 + x1) / 2, 3.12, (z0 + z1) / 2, x1 - x0 + 0.4, 0.04, z1 - z0 + 0.4);   // forro escuro
    mb.mat(25, 230).color(0.95, 0.97, 1.0, 1);
    for (let i = 0, cx = x0 + r; cx < x1 - r * 0.5; i++, cx += 1.5 * r) for (let cz = z0 + r + (i & 1) * h / 2; cz < z1 - r * 0.5; cz += h) {
      for (let k = 0; k < 6; k++) { const a0 = k * PI / 3, a1 = a0 + PI / 3, ax = cx + Math.cos(a0) * r, az = cz + Math.sin(a0) * r, bx = cx + Math.cos(a1) * r, bz = cz + Math.sin(a1) * r, L = Math.hypot(bx - ax, bz - az);
        mb.push(m4basis(m4(), (bx - ax) / L, 0, (bz - az) / L, 0, 1, 0, -(bz - az) / L, 0, (bx - ax) / L, (ax + bx) / 2, 3.08, (az + bz) / 2)); mb.box(0, 0, 0, L + t * 0.5, 0.03, t); mb.pop(); }
    }
  }
  // banner da logo na parede preta do fundo, de frente para a rua
  marcoSign(mb, REG, 'borghi', -4.53, 0.75, -1.2, 0, 2.0, 2.5, -1, 0);
  // placa da loja num poste na calçada, junto ao escritório, e o poste da rede pintado (base azul com faixa amarela)
  {
    const [px, pz] = mbOffRoad(mb, -X - 1.7, -Z + 2.6, 1, 0), pg = mbGroundY(mb, px, pz);
    mb.mat(2, 140, 200).color(0.25, 0.25, 0.26, 1); mb.box(px, (pg - 0.2 + 3.2) / 2, pz, 0.09, 3.4 - pg, 0.09); mbColCircle(mb, px, pz, 0.12);
    mb.mat(2, 140, 120).color(0.1, 0.1, 0.11, 1); mb.box(px, 3.65, pz, 0.12, 1.5, 1.3);
    marcoSign(mb, REG, 'borghi', px - 0.07, 2.95, pz - 0.55, 0, 1.1, 1.38, -1, 0);
    marcoSign(mb, REG, 'borghi', px + 0.07, 2.95, pz + 0.55, 0, -1.1, 1.38, 1, 0);
    const [qx, qz] = mbOffRoad(mb, -X - 2.0, -Z - 1.6, 0.7, 0.7), qg = mbGroundY(mb, qx, qz);
    mb.mat(3).color(0.6, 0.59, 0.56, 1); mb.cyl(qx, qg + 1.95, qz, 0.15, qg + 9.6, 0.09, 8, false, true);
    mb.mat(2, 150, 0).color(0.16, 0.42, 0.78, 1); mb.cyl(qx, qg - 0.3, qz, 0.19, qg + 1.6, 0.175, 10, false, true);
    mb.mat(2, 150, 0).color(0.95, 0.8, 0.15, 1); mb.cyl(qx, qg + 1.6, qz, 0.175, qg + 1.96, 0.17, 10, false, true);
    mbColCircle(mb, qx, qz, 0.22);
  }
  // piso de concreto liso, mais escuro e lustroso, sob a cobertura
  mb.mat(3).color(0.33, 0.33, 0.34, 1); cRect(mb, -X, 0.03, -Z + 4.2, D - 9, 0, 0, 0, 0, W - 4.2, 0, 1, 0);
  // letreiro pendurado e carros no pátio
  marcoSign(mb, REG, 'borghi', -X + 0.05, 1.7, -2.6, 0, 1.3, 1.62, -1, 0);
  mb.pop();
  // placa sobre a cobertura voltada para a rua (com a logo), presa no bloco do fundo
  {
    const p = M.at(-X + 6.6, -4.5 * zs), q = M.at(-X + 6.6, 4.5 * zs);
    mb.push(m4ident(m4())); mb.pop();
    mb.mat(2, 120, 0).color(0.12, 0.12, 0.13, 1);
    const atA = M.at(-X + 6.5, 0); mb.box(atA[0], y0 + 4.3, atA[1], 0.2, 0.2, 0.2);
    void p; void q;
  }
  CITY.addBox({ x: M.at(X - 4.5, 0)[0], z: M.at(X - 4.5, 0)[1], ux: M.ux, uz: M.uz, hd: 4.5, hw: Z });
  { const p = M.at(-X + 2.6, -(Z - 2.1) * zs); CITY.addBox({ x: p[0], z: p[1], ux: M.ux, uz: M.uz, hd: 2.6, hw: 2.1 }); }
}
// ---------- Supermercado Sacoi ----------
function marcoSacoi(mb, REG) {
  const M = MARCOS.sacoi; if (!M) return;
  const D = M.D, W = M.W, X = D / 2, Z = W / 2, y0 = hfAt(M.ox, M.oz) + 0.15;
  let ymin = y0; for (const [a, b] of [[-X, -Z], [X, -Z], [X, Z], [-X, Z]]) { const p = M.at(a, b); ymin = Math.min(ymin, hfAt(p[0], p[1])); }
  // Z do quadro: ao longo da avenida (sul positivo). Na foto, de frente: anexo baixo à esquerda (sul), bloco de tijolinho à direita (norte)
  const zs = M.zz > 0 ? 1 : -1;
  mb.push(m4basis(m4(), M.ux, 0, M.uz, 0, 1, 0, M.zx * zs, 0, M.zz * zs, M.ox, y0, M.oz));
  const beige = [0.74, 0.66, 0.5], yb = ymin - y0 - 0.6;
  // corpo principal bege (sul) e bloco de tijolinho (norte, mais alto); anexo baixo ao sul
  mb.push(m4translate(m4(), 0, 0, 5)); mb.mat(19, 170).color(...beige, 1); cWalls(mb, D, 30, yb, 7.6); mb.mat(9).color(0.6, 0.6, 0.58, 1); cRect(mb, -X, 7.3, -15, D, 0, 0, 0, 0, 30, 0, 1, 0);
  mb.mat(19, 170).color(beige[0] * 1.03, beige[1] * 1.03, beige[2] * 1.03, 1); cRect(mb, -X - 0.05, 4.4, -15, 0, 0, 30, 0, 3.2, 0, -1, 0, 0);
  mb.mat(5).color(1, 1, 1, 1); for (let z = -14; z < 3; z += 4.4) cRect(mb, -X - 0.08, 4.5, z, 0, 0, 3.9, 0, 1.3, 0, -1, 0, 0);   // faixa de janelas
  mb.pop();
  mb.push(m4translate(m4(), 0, 0, -16)); mb.mat(22).color(0.5, 0.25, 0.15, 1); cWalls(mb, D, 10, yb, 9.6);
  mb.mat(9).color(0.6, 0.6, 0.58, 1); cRect(mb, -X, 9.3, -5, D, 0, 0, 0, 0, 10, 0, 1, 0); mb.pop();
  mb.push(m4translate(m4(), 4, 0, 23.5)); mb.mat(19, 170).color(beige[0] * 0.95, beige[1] * 0.95, beige[2] * 0.95, 1); cWalls(mb, D - 8, 7, yb, 5.0); mb.mat(9).color(0.6, 0.6, 0.58, 1); cRect(mb, -X + 4, 5.0, -3.5, D - 8, 0, 0, 0, 0, 7, 0, 1, 0); mb.pop();
  // logo sobre a entrada, marquise preta, portas de vidro com grade, carrinhos
  marcoSign(mb, REG, 'sacoi', -X - 0.12, 7.6, 3.2, 0, -11.2, 4.2, -1, 0);
  mb.mat(19, 170).color(...beige, 1); mb.box(-X + 0.4, 9.7, -2.4, 0.8, 4.4, 11.4);
  marcoSign(mb, REG, 'sacoi', -X - 0.02, 7.65, 3.2, 0, -11.2, 4.1, -1, 0);
  mb.mat(2, 70, 0).color(0.03, 0.03, 0.035, 1); mb.box(-X - 0.9, 3.75, -2.6, 1.8, 0.9, 11.6);
  mb.mat(5).color(1, 1, 1, 1); cRect(mb, -X - 0.06, 0.0, -7.8, 0, 0, 10.4, 0, 3.3, 0, -1, 0, 0);
  mb.mat(13).color(0.7, 0.7, 0.72, 1); for (const z of [-7.8, -2.6, 2.4]) cRect(mb, -X - 0.1, 0.0, z - 0.1, 0, 0, 0.35, 0, 3.3, 0, -1, 0, 0);
  marcoSign(mb, REG, 'oferta', -X - 0.06, 1.2, 6.5, 0, 3.0, 0.75, -1, 0);
  mb.mat(1).color(0.65, 0.65, 0.66, 1); for (let k = 0; k < 14; k++) mb.box(-X - 1.5 - (k % 2) * 0.6, 0.5, -9.5 - Math.floor(k / 2) * 0.55 + (k > 7 ? 15 : 0), 0.9, 0.9, 0.5);
  // estacionamento: piso de concreto com vagas amarelas
  mb.mat(3).color(0.5, 0.49, 0.47, 1);
  const P = M.park;
  for (let a = -X - P; a < -X; a += 3) { const p = M.at(a + 1.5, 0); void p; }
  cRect(mb, -X - P, 0.04, -Z, P, 0, 0, 0, 0, W, 0, 1, 0);
  mb.mat(2, 140, 0).color(0.75, 0.6, 0.1, 1);
  for (let z = -Z + 1; z <= Z - 1; z += 2.6) cRect(mb, -X - 5.5, 0.05, z - 0.05, 5.0, 0, 0, 0, 0, 0.1, 0, 1, 0);
  mb.pop();
  const cols = [[0.75, 0.75, 0.77], [0.55, 0.56, 0.6], [0.85, 0.85, 0.86], [0.1, 0.1, 0.12]];
  for (const [b, c] of [[-14.5, 0], [-11.9, 1], [12.8, 2], [-6.7, 3]]) { const p = M.at(-X - 3.2, b * zs); marcoCar(mb, p[0], y0 + 0.04, p[1], Math.atan2(M.uz, M.ux) + PI, cols[c]); }
  const c = M.at(0, 0); CITY.addBox({ x: c[0], z: c[1], ux: M.ux, uz: M.uz, hd: X, hw: Z + 7 });
  CITY.pave.push(...M.at(-X - P / 2, 0), 22);
}
// ---------- Praça Matriz e Paróquia Nossa Senhora Aparecida ----------
function marcoMatriz(mb, REG) {
  const M = MARCOS.matriz; if (!M) return;
  const C = CITY;
  // piso de tijolo vermelho (blocos de 1 m que acompanham o terreno)
  mb.mat(23).color(0.46, 0.2, 0.12, 1);
  for (const k of M.paved) {
    const i = k % C.W, j = Math.floor(k / C.W), x = C.X0 + i, z = C.Z0 + j;
    const h00 = hfAt(x - 0.5, z - 0.5) + 0.035, h10 = hfAt(x + 0.5, z - 0.5) + 0.035, h11 = hfAt(x + 0.5, z + 0.5) + 0.035, h01 = hfAt(x - 0.5, z + 0.5) + 0.035;
    const a = mb.v(x - 0.5, h00, z - 0.5, 0, 1, 0, x - 0.5, z - 0.5), b = mb.v(x + 0.5, h10, z - 0.5, 0, 1, 0, x + 0.5, z - 0.5), c = mb.v(x + 0.5, h11, z + 0.5, 0, 1, 0, x + 0.5, z + 0.5), d = mb.v(x - 0.5, h01, z + 0.5, 0, 1, 0, x - 0.5, z + 0.5);
    quadN(mb, a, b, c, d);
  }
  // igreja (pelas fotos de 2023–2025): nave de tijolinho aparente com frisos e cantos brancos, telhado de duas águas com beiral
  // branco, alpendre de colunas redondas brancas sob a sacada com gradil, e a torre central de tijolo salmão com cantoneiras
  // brancas: vitral azul, nicho iluminado com a imagem de Aparecida, relógio nas quatro faces e cruz (rosa acesa à noite)
  {
    const ch = M.church, p = M.at(ch.u, ch.v), y = hfAt(p[0], p[1]) + 0.25, ex = M.ex, ez = M.ez, D = ch.D, W = ch.W, H = 9.2;
    let ymin = y; for (const [a, b] of [[-D / 2, -W / 2], [D / 2, -W / 2], [D / 2, W / 2], [-D / 2, W / 2]]) { const q = M.at(ch.u + a, ch.v + b); ymin = Math.min(ymin, hfAt(q[0], q[1])); }
    mb.push(m4basis(m4(), -ex, 0, -ez, 0, 1, 0, M.sx, 0, M.sz, p[0], y, p[1]));
    const white = [0.93, 0.93, 0.91], brick = [0.66, 0.4, 0.3], salmon = [0.74, 0.44, 0.38], glass = [0.3, 0.5, 0.82], yb = ymin - y - 0.8, R = 4.4;
    const F = -D / 2;   // fachada
    // nave
    mb.mat(22).color(...brick, 1); cWalls(mb, D, W, yb, H);
    cTriUp(mb, [F - 0.02, H, -W / 2], [F - 0.02, H, W / 2], [F - 0.02, H + R, 0], [0, 0], [W, 0], [W / 2, R]);
    cTriUp(mb, [D / 2, H, -W / 2], [D / 2, H, W / 2], [D / 2, H + R, 0], [0, 0], [W, 0], [W / 2, R]);
    mb.mat(20).color(0.42, 0.24, 0.16, 1); cRoof(mb, D, W, H, R, 0.7, true);
    mb.mat(19, 180).color(...white, 1); cSoffit(mb, D, W, H, 0.7);
    // frisos e cantos brancos
    mb.mat(19, 150).color(...white, 1);
    for (const hy of [3.7, H - 0.25]) { mb.box(0, hy, -W / 2 - 0.04, D + 0.1, 0.35, 0.12); mb.box(0, hy, W / 2 + 0.04, D + 0.1, 0.35, 0.12); mb.box(F - 0.06, hy, 0, 0.14, 0.35, W + 0.1); }
    for (const [a, b] of [[F, -W / 2], [F, W / 2], [D / 2, -W / 2], [D / 2, W / 2]]) mb.box(a, (yb + H) / 2, b, 0.5, H - yb, 0.5);
    for (let u = F + 4.5; u < D / 2 - 2; u += 4.5) for (const z of [-W / 2, W / 2]) mb.box(u, (yb + H) / 2, z, 0.4, H - yb, 0.12);
    // beiral branco inclinado na fachada (moldura do frontão)
    { const L = Math.hypot(W / 2, R), a = Math.atan2(R, W / 2); for (const sg of [-1, 1]) { mb.push(m4basis(m4(), 0, 0, 1, 0, 1, 0, -1, 0, 0, F - 0.08, 0, 0)); mbSeg(mb, sg * W / 2 + sg * 0.3, H - 0.25, 0, H + R + 0.05, 0.42, 0.18); mb.pop(); void L; void a; } }
    // janelas laterais em dois níveis e na fachada
    for (let k = -3; k <= 3; k++) for (const [y0, y1] of [[1.0, 3.0], [4.6, 7.8]]) { cOpeningZ(mb, -W / 2, -1, k * 4.5 + 2.25, 1.2, y0, y1, 21, white); cOpeningZ(mb, W / 2, 1, k * 4.5 + 2.25, 1.2, y0, y1, 21, white); }
    for (const z of [-5.6, -3.6, 3.6, 5.6]) for (const [y0, y1] of [[1.0, 3.0], [4.8, 7.6]]) cOpening(mb, F - 0.03, -1, z, 1.1, y0, y1, 21, white);
    // alpendre: laje da sacada sobre colunas redondas, gradil, escadaria larga de granito cinza
    mb.mat(19, 150).color(...white, 1); mb.box(F - 2.0, 3.55, 0, 4.0, 0.35, W - 1.0);
    for (const z of [-W / 2 + 1.0, -2.6, 2.6, W / 2 - 1.0]) { mb.cyl(F - 3.6, 0, z, 0.3, 3.4, 0.28, 12, false, true); mbColCircle(mb, F - 3.6, z, 0.35); }
    mb.mat(2, 120, 160).color(0.15, 0.15, 0.16, 1);
    mb.box(F - 3.95, 4.75, 0, 0.05, 0.05, W - 1.1); for (let z = -W / 2 + 0.6; z <= W / 2 - 0.6; z += 0.16) mb.box(F - 3.95, 4.25, z, 0.025, 1.0, 0.025);
    for (const z of [-W / 2 + 0.55, W / 2 - 0.55]) { mb.box(F - 2.0, 4.75, z, 3.9, 0.05, 0.05); for (let u = F - 3.9; u < F; u += 0.16) mb.box(u, 4.25, z, 0.025, 1.0, 0.025); }
    mb.mat(3).color(0.6, 0.6, 0.58, 1); for (let k = 0; k < 5; k++) mb.box(F - 4.4 - k * 0.38, -0.05 - k * 0.17 + 0.1, 0, 0.4, 0.3 + 0.0, W + 1.0 - k * 0.2);
    mb.mat(2, 140, 0).color(0.32, 0.2, 0.1, 1); cOpening(mb, F - 0.03, -1, -1.6, 1.4, 0, 2.9, 2, [0.32, 0.2, 0.1]); cOpening(mb, F - 0.03, -1, 1.6, 1.4, 0, 2.9, 2, [0.32, 0.2, 0.1]);
    // torre central
    const TW = 3.8, tx = F - TW / 2 + 0.3, TH = 22.5, h2 = TW / 2;
    mb.mat(19, 150).color(...salmon, 1); mb.box(tx, (yb + TH) / 2, 0, TW, TH - yb, TW);
    mb.mat(19, 150).color(...white, 1);
    for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) mb.box(tx + a * (h2 - 0.18), (yb + TH) / 2, b * (h2 - 0.18), 0.42, TH - yb, 0.42);
    for (const hy of [3.7, 10.8, 14.6, 19.7]) mb.box(tx, hy, 0, TW + 0.12, 0.3, TW + 0.12);
    mb.box(tx, TH + 0.2, 0, TW + 0.5, 0.4, TW + 0.5);
    // vitral azul alto
    cOpening(mb, tx - h2 - 0.02, -1, 0, 1.2, 5.0, 9.8, 21, glass);
    mb.mat(25, 90).color(0.35, 0.55, 0.95, 1); cRect(mb, tx - h2 - 0.035, 5.05, -0.55, 0, 0, 1.1, 0, 4.7, 0, -1, 0, 0);
    // nicho iluminado com a imagem de Nossa Senhora Aparecida
    mb.mat(25, 160).color(0.95, 0.78, 0.35, 1); mb.box(tx - h2 - 0.03, 12.6, 0, 0.06, 1.7, 1.2);
    mb.mat(2, 140, 60).color(0.08, 0.12, 0.32, 1); mb.cyl(tx - h2 - 0.18, 11.9, 0, 0.3, 13.0, 0.1, 8, false, true);
    mb.mat(2, 80, 220).color(0.85, 0.68, 0.25, 1); mb.cyl(tx - h2 - 0.18, 13.0, 0, 0.12, 13.25, 0.14, 8, true, true);
    // relógio nas quatro faces (mostrador branco, moldura branca quadrada)
    for (const [nx, nz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const cx = tx + nx * (h2 + 0.03), cz = nz * (h2 + 0.03);
      mb.mat(19, 150).color(...white, 1); mb.box(tx + nx * (h2 + 0.01), 17.2, nz * (h2 + 0.01), nx ? 0.06 : 2.3, 2.3, nz ? 0.06 : 2.3);
      if (nx) marcoSign(mb, REG, 'relogio', cx + nx * 0.02, 16.2, -nx * 1.0, 0, nx * 2.0, 2.0, nx, 0);
      else marcoSign(mb, REG, 'relogio', tx + nz * 1.0, 16.2, cz + nz * 0.02, -nz * 2.0, 0, 2.0, 0, nz);
    }
    // aberturas do campanário logo acima do relógio
    for (const s of [-1, 1]) { cOpening(mb, tx + s * h2 + s * 0.02, s, 0, 1.4, 20.1, 21.9, 2, [0.08, 0.08, 0.09]); cOpeningZ(mb, s * h2 + s * 0.02, s, tx, 1.4, 20.1, 21.9, 2, [0.08, 0.08, 0.09]); }
    // remate e cruz (de dia branca; à noite o neon rosa acende)
    mb.mat(19, 150).color(...white, 1); mb.box(tx, TH + 0.75, 0, 2.2, 0.7, 2.2); mb.cyl(tx, TH + 1.1, 0, 0.9, TH + 2.0, 0.15, 4, false, false);
    mb.mat(24, 255).color(1.0, 0.35, 0.6, 1); mb.box(tx, TH + 3.3, 0, 0.18, 2.6, 0.18); mb.box(tx, TH + 3.9, 0, 0.18, 0.18, 1.4);
    mb.pop();
    C.addBox({ x: p[0], z: p[1], ux: -ex, uz: -ez, hd: D / 2, hw: W / 2 });
    const tp = M.at(ch.u + D / 2 + TW / 2 - 0.3, ch.v); C.addBox({ x: tp[0], z: tp[1], ux: -ex, uz: -ez, hd: TW / 2, hw: TW / 2 });
    const ap = M.at(ch.u + D / 2 + 3.0, ch.v); C.addBox({ x: ap[0], z: ap[1], ux: -ex, uz: -ez, hd: 1.0, hw: 0.4 });
  }
  // quiosque coberto: parede ao fundo (lado da rua) com faixas azul, vermelha, laranja e amarela; cobertura curva; bancos
  {
    const K = M.kiosk, p = M.at(K.u, K.v), y = hfAt(p[0], p[1]) + 0.1;
    mb.push(m4basis(m4(), M.ex, 0, M.ez, 0, 1, 0, M.sx, 0, M.sz, p[0], y, p[1]));
    const D = K.D, W = K.W, X = D / 2, Z = W / 2;
    mb.mat(3).color(0.55, 0.54, 0.52, 1); mb.box(0, -0.2, 0, D, 0.5, W);
    mb.mat(19, 160).color(0.92, 0.92, 0.9, 1); mb.box(X - 0.15, 1.45, 0, 0.3, 2.9, W); mb.box(0, 1.45, -Z + 0.15, D, 2.9, 0.3);
    const band = (y0, h, c) => { mb.mat(19, 160).color(c[0], c[1], c[2], 1); cRect(mb, X - 0.32, y0, -Z + 0.3, 0, 0, W - 0.3, 0, h, 0, -1, 0, 0); cRect(mb, -X, y0, -Z + 0.32, D - 0.3, 0, 0, 0, h, 0, 0, 0, 1); };
    band(0.05, 0.85, [0.12, 0.28, 0.62]); band(0.9, 0.16, [0.75, 0.12, 0.1]); band(1.06, 0.16, [0.92, 0.5, 0.1]); band(1.22, 0.16, [0.95, 0.78, 0.15]);
    // cobertura em arco (chapa metálica) e mãos-francesas
    mb.mat(9).color(0.78, 0.78, 0.76, 1);
    const seg = 8, base = mb.nv;
    for (let k = 0; k <= seg; k++) { const t = k / seg, a = X + 0.3 - (D + 1.6) * t, hh = 3.1 + 0.9 * Math.sin(t * PI * 0.8); for (const z of [-Z - 0.3, Z + 0.3]) mb.v(a, hh, z, 0, 1, 0, z, t * (D + 1.6)); }
    for (let k = 0; k < seg; k++) { const a = base + k * 2; mb.quadI(a, a + 1, a + 3, a + 2); mb.quadI(a, a + 2, a + 3, a + 1); }
    mb.mat(2, 120, 0).color(0.15, 0.3, 0.6, 1); mb.box(-X - 1.3, 3.55, 0, 0.12, 0.3, W + 0.6);
    mb.mat(2, 120, 150).color(0.92, 0.92, 0.92, 1);
    for (const z of [-Z + 3, -3.5, 3.5, Z - 3]) mb.tube([[X - 0.3, 2.6, z], [X - 2.4, 3.7, z], [-X - 1.0, 3.6, z]], 0.07, 6);
    for (const z of [-Z + 2, -6, 0, 6, Z - 2]) { mb.mat(2, 120, 0).color(0.92, 0.92, 0.92, 1); mb.box(X - 0.75, 0.45, z, 0.5, 0.08, 3.4); mb.box(X - 0.75, 0.22, z, 0.08, 0.44, 3.0); }
    mbColBox(mb, 0, 0, X, Z);   // quiosque inteiro sólido (paredes, bancos e pilares)
    mb.pop();
    C.addBox({ x: p[0] + M.ex * (X - 0.15), z: p[1] + M.ez * (X - 0.15), ux: M.ex, uz: M.ez, hd: 0.2, hw: Z });
  }
  // bancos de concreto com assento verde, canteiros com mureta baixa, lixeiras
  const rnd = mkRng(4242);
  for (const s of M.segs) for (let t = 0.2; t < 0.95; t += 0.22) {
    const u = s[0] + (s[2] - s[0]) * t, v = s[1] + (s[3] - s[1]) * t, l = Math.hypot(s[2] - s[0], s[3] - s[1]), nu = -(s[3] - s[1]) / l, nv = (s[2] - s[0]) / l;
    for (const sd of [-1, 1]) {
      const pu = u + nu * sd * (s[4] + 0.6), pv = v + nv * sd * (s[4] + 0.6), p = M.at(pu, pv), y = hfAt(p[0], p[1]);
      const ax = (M.ex * (s[2] - s[0]) + M.sx * (s[3] - s[1])) / l, az = (M.ez * (s[2] - s[0]) + M.sz * (s[3] - s[1])) / l;
      mb.push(m4basis(m4(), ax, 0, az, 0, 1, 0, -az, 0, ax, p[0], y, p[1]));
      mb.mat(3).color(0.62, 0.61, 0.58, 1); mb.box(-0.6, 0.22, 0, 0.3, 0.44, 0.4); mb.box(0.6, 0.22, 0, 0.3, 0.44, 0.4);
      mb.mat(2, 150).color(0.12, 0.38, 0.18, 1); mb.box(0, 0.47, 0, 1.8, 0.07, 0.48);
      mbColBox(mb, 0, 0, 0.9, 0.24);
      // lixeira verde ao lado de alguns bancos; poste de praça com globo (acende à noite) em outros
      if (rnd() < 0.35) { mb.mat(2, 150).color(0.1, 0.42, 0.22, 1); mb.cyl(1.35, 0, 0.1, 0.24, 0.85, 0.27, 10, true, true); mb.mat(2, 120, 0).color(0.2, 0.2, 0.2, 1); mb.box(1.35, 0.42, 0.1, 0.05, 0.84, 0.05); mbColCircle(mb, 1.35, 0.1, 0.28); }
      else if (rnd() < 0.4) { mb.mat(2, 140, 160).color(0.9, 0.9, 0.9, 1); mb.cyl(-1.4, 0, 0.1, 0.08, 3.6, 0.06, 8, false, true); mb.mat(24, 230).color(1, 0.94, 0.8, 1); mb.cyl(-1.4, 3.6, 0.1, 0.25, 4.1, 0.22, 10, true, true); mbColCircle(mb, -1.4, 0.1, 0.12); }
      mb.pop();
    }
  }
  void rnd;
}

// ---------- casa do Petrus ----------
// Da rua: portão de lâminas horizontais cor de bronze (social + garagem) à esquerda, muro bege com faixas cinza e brancas
// à direita; atrás, a casa térrea com telhado de quatro águas de telha escura e, mais ao fundo, o volume de laje com platibanda.
function marcoPetrus(mb, REG) {
  const M = MARCOS.petrus; if (!M) return;
  const D = M.D, W = M.W, X = D / 2, Z = W / 2, y0 = hfAt(M.ox, M.oz) + 0.16;
  let ymin = y0; for (const [a, b] of [[-X, -Z], [X, -Z], [X, Z], [-X, Z]]) { const p = M.at(a, b); ymin = Math.min(ymin, hfAt(p[0], p[1])); }
  // Z local para o leste (portão a oeste, à esquerda de quem olha da rua)
  const zs = M.zx * 1 > 0 ? 1 : -1;
  mb.push(m4basis(m4(), M.ux, 0, M.uz, 0, 1, 0, M.zx * zs, 0, M.zz * zs, M.ox, y0, M.oz));
  const yb = ymin - y0 - 0.5, beige = [0.8, 0.72, 0.58], bronze = [0.4, 0.36, 0.25];
  const xw = -X + 0.1, gw = 8.7;
  // muro da frente: pilares, faixa do portão e trecho de alvenaria com faixas
  mb.mat(19, 200).color(...beige, 1);
  mb.box(xw, (yb + 2.75) / 2, -Z + 0.15, 0.3, 2.75 - yb, 0.3); mb.box(xw, (yb + 2.75) / 2, -Z + gw + 0.15, 0.3, 2.75 - yb, 0.3);
  mb.box(xw, (yb + 2.55) / 2, (-Z + gw + 0.3 + Z) / 2, 0.2, 2.55 - yb, Z - (-Z + gw + 0.3));
  const stripe = (y, h, c, z0, z1) => { mb.mat(19, 200).color(c[0], c[1], c[2], 1); cRect(mb, xw - 0.11, y, z0, 0, 0, z1 - z0, 0, h, 0, -1, 0, 0); };
  // faixas branca, cinza e branca que correm retas e descem em curva na ponta direita do muro (como na foto)
  {
    mb.push(m4basis(m4(), 0, 0, 1, 0, 1, 0, -1, 0, 0, xw - 0.115, 0, 0));
    const za = -Z + gw + 0.35, zb = Z - 0.05;
    for (const [y, h, c] of [[0.98, 0.07, [0.97, 0.97, 0.95]], [1.1, 0.13, [0.58, 0.58, 0.57]], [1.24, 0.07, [0.97, 0.97, 0.95]]]) {
      mb.mat(19, 200).color(c[0], c[1], c[2], 1);
      // como na foto: correm retas, descem em diagonal no meio do muro e seguem retas mais baixas até a ponta
      const L = zb - za, z1 = za + L * 0.32 + (y - 0.98) * 0.5, z2 = z1 + L * 0.16, drop = 0.42, pts = [[za, y], [z1, y]];
      for (let k = 1; k <= 4; k++) { const t = k / 4, e = t * t * (3 - 2 * t); pts.push([z1 + (z2 - z1) * t, y - drop * e]); }
      pts.push([zb, y - drop]);
      for (let k = 1; k < pts.length; k++) mbSeg(mb, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], h, 0.012);
    }
    mb.pop();
  }
  // caixa de correio junto ao portão social e lixeira de ferro num poste na calçada
  mb.mat(2, 140, 120).color(0.15, 0.15, 0.16, 1); mb.box(xw - 0.18, 1.45, -Z + gw + 0.85, 0.16, 0.26, 0.36);
  { const lx = -X - 1.3, lz = Z - 0.9, lg = mbGroundY(mb, lx, lz); mb.push(m4translate(m4(), 0, lg, 0)); mb.mat(2, 140, 200).color(0.3, 0.3, 0.31, 1); mb.box(lx, 0.5, lz, 0.06, 1.2, 0.06); mbColCircle(mb, lx, lz, 0.1);
    mb.mat(11, 0, 0, 40).color(0.32, 0.32, 0.33, 1); for (const [a, b] of [[-0.22, -0.16], [0.22, -0.16], [-0.22, 0.16], [0.22, 0.16]]) mb.box(lx + b, 1.12, lz + a, 0.02, 0.3, 0.02);
    for (const y of [0.98, 1.12, 1.26]) { mb.box(lx - 0.16, y, lz, 0.02, 0.02, 0.46); mb.box(lx + 0.16, y, lz, 0.02, 0.02, 0.46); mb.box(lx, y, lz - 0.22, 0.34, 0.02, 0.02); mb.box(lx, y, lz + 0.22, 0.34, 0.02, 0.02); } mb.pop(); }
  mb.mat(2, 120, 160).color(0.3, 0.3, 0.3, 1); cRect(mb, xw - 0.12, 1.9, Z - 3.0, 0, 0, 0.32, 0, 0.22, 0, -1, 0, 0);   // número
  // portão de lâminas horizontais vazadas (réguas de 7 cm com fresta de 4 cm, dá para ver o quintal por entre elas),
  // quadro de metalon, folha da garagem (6,3 m) e portão social (2,1 m) com puxador; viga do quadro por cima
  mb.mat(2, 150, 150).color(...bronze, 1);
  const gate = (z0, z1, top) => {
    for (let y = 0.12; y < top - 0.05; y += 0.11) mb.box(xw, y + 0.035, (z0 + z1) / 2, 0.025, 0.07, z1 - z0 - 0.06);
    mb.box(xw, top, (z0 + z1) / 2, 0.06, 0.06, z1 - z0); mb.box(xw, 0.06, (z0 + z1) / 2, 0.06, 0.06, z1 - z0);
    for (const z of [z0 + 0.03, z1 - 0.03]) mb.box(xw, top / 2, z, 0.06, top, 0.06);
  };
  gate(-Z + 0.3, -Z + 3.45, 2.3); gate(-Z + 3.45, -Z + 6.6, 2.3); gate(-Z + 6.75, -Z + 8.85, 2.3);
  for (const z of [-Z + 0.3, -Z + 6.6, -Z + 6.75, -Z + 8.85]) mb.box(xw, 1.25, z, 0.09, 2.5, 0.09);
  mb.box(xw, 2.42, -Z + 4.55, 0.1, 0.1, 8.6);                                        // viga do quadro
  mb.mat(2, 120, 220).color(0.75, 0.75, 0.72, 1); mb.box(xw - 0.06, 1.05, -Z + 8.6, 0.05, 0.22, 0.03);   // puxador
  // calçada de concreto até o pé do muro (sem faixa de mato entre a calçada e o lote, como na foto)
  mb.mat(3).color(0.62, 0.61, 0.58, 1); cRect(mb, xw - 3.0, -0.12, -Z - 9.0, 3.0 - 0.1, 0, 0, 0, 0, W + 19.5, 0, 1, 0);
  // trilho no chão e rampa de concreto da calçada até o portão
  mb.mat(2, 120, 200).color(0.35, 0.35, 0.36, 1); mb.box(xw, 0.015, -Z + 3.45, 0.06, 0.03, 6.4);
  mb.mat(3).color(0.6, 0.59, 0.57, 1); { const r0 = xw - 1.6; cRect(mb, r0, -0.05, -Z + 0.3, 1.55, 0.06, 0, 0, 0, 6.3, -0.04, 1, 0); }
  // muros laterais
  mb.mat(19, 200).color(beige[0] * 0.97, beige[1] * 0.97, beige[2] * 0.97, 1);
  for (const s of [-1, 1]) mb.box(0, (yb + 2.3) / 2, s * (Z - 0.08), D, 2.3 - yb, 0.16);
  // garagem/quintal cimentado
  mb.mat(3).color(0.5, 0.49, 0.46, 1); cRect(mb, xw, 0.03, -Z, 6.2, 0, 0, 0, 0, W, 0, 1, 0);
  // casa da frente (à esquerda, atrás do portão): térrea alta, paredes verde-claro, telhado de quatro águas de telha escura
  mb.push(m4translate(m4(), -X + 9.6, 0, -Z + 4.4));
  mb.mat(19, 170).color(0.78, 0.83, 0.7, 1); cWalls(mb, 8.4, 8.4, yb, 3.25);
  cOpening(mb, -4.2, -1, -1.6, 1.6, 1.0, 2.3, 21, [0.86, 0.86, 0.84]); cOpening(mb, -4.2, -1, 1.9, 0.9, 0, 2.2, 2, [0.35, 0.22, 0.12]);
  mb.mat(20).color(0.12, 0.075, 0.055, 1); cRoof(mb, 8.4, 8.4, 3.25, 2.5, 0.65, false);
  mb.mat(19, 180).color(0.9, 0.88, 0.84, 1); cSoffit(mb, 8.4, 8.4, 3.25, 0.65);
  // beiral com caibros de madeira aparentes e testeira escura, número da casa na quina
  mb.mat(2, 200, 0).color(0.3, 0.19, 0.12, 1); mb.box(-4.2 - 0.62, 3.2, 0, 0.05, 0.2, 9.7);
  for (let z = -4.6; z <= 4.6; z += 0.55) mb.box(-4.2 - 0.32, 3.3, z, 0.62, 0.07, 0.06);
  mb.mat(2, 160, 0).color(0.12, 0.12, 0.12, 1); mb.box(-4.22, 2.75, 4.0, 0.03, 0.22, 0.42);
  mb.pop();
  // volume à direita com laje e platibanda bege-oliva (mais alto), com friso escuro
  mb.push(m4translate(m4(), -X + 10.8, 0, Z - 2.55));
  mb.mat(19, 170).color(0.82, 0.79, 0.62, 1); cWalls(mb, 10.4, 4.9, yb, 5.1);
  mb.mat(19, 160).color(0.68, 0.64, 0.48, 1); for (const hy of [4.3, 5.0]) mb.box(0, hy, 0, 10.6, 0.16, 5.1);
  cOpening(mb, -5.2, -1, 0, 1.4, 1.1, 2.3, 21, [0.86, 0.86, 0.84]); cOpening(mb, -5.2, -1, 0, 1.6, 2.9, 3.9, 21, [0.86, 0.86, 0.84]);
  mb.mat(3).color(0.4, 0.39, 0.37, 1); cRect(mb, -5.2, 4.75, -2.45, 10.4, 0, 0, 0, 0, 4.9, 0, 1, 0);
  mb.mat(1).color(0.7, 0.7, 0.72, 1); mb.cyl(2.2, 4.75, 0.8, 0.5, 5.6, 0.5, 10, false, true);
  mb.pop();
  // antena de TV (mastro com hastes) no telhado da frente
  mb.mat(1).color(0.7, 0.7, 0.72, 1); mb.cyl(-X + 10.5, 4.5, -Z + 4.2, 0.03, 8.4, 0.03, 5, false, false);
  for (let k = 0; k < 5; k++) mb.box(-X + 10.5, 7.4 + k * 0.22, -Z + 4.2, 0.03, 0.03, 1.6 - k * 0.22);
  // antena parabólica no telhado
  mb.mat(1).color(0.75, 0.75, 0.75, 1); mb.cyl(-X + 7.0, 5.0, Z - 4.2, 0.04, 5.9, 0.04, 5, false, false); mb.cyl(-X + 6.75, 5.75, Z - 4.2, 0.45, 5.92, 0.05, 10, true, false);
  mb.pop();
  // vizinhos, pelo Street View: à esquerda a casa da esquina (muro creme com a quina arredondada, sobrado de telha);
  // à direita a casa cinza de laje com o painel de cobogó preto, muro branco com faixa preta e portão branco de lâminas verticais
  mb.push(m4basis(m4(), M.ux, 0, M.uz, 0, 1, 0, M.zx * zs, 0, M.zz * zs, M.ox, y0, M.oz));
  {
    const cream = [0.86, 0.84, 0.78], z0 = -Z - 0.05, z1 = -Z - 9.0, r = 3.2, hw = 2.25;
    mb.mat(19, 200).color(...cream, 1);
    mb.box(xw, (yb + hw) / 2, (z0 + z1) / 2, 0.2, hw - yb, z0 - z1);
    let pp = null; for (let k = 0; k <= 8; k++) { const a = k / 8 * PI / 2, x = xw + r - Math.cos(a) * r, z = z1 - Math.sin(a) * r; if (pp) { const dx = x - pp[0], dz = z - pp[1], L = Math.hypot(dx, dz); mb.push(m4basis(m4(), dx / L, 0, dz / L, 0, 1, 0, -dz / L, 0, dx / L, (x + pp[0]) / 2, (yb + hw) / 2, (z + pp[1]) / 2)); mb.box(0, 0, 0, L + 0.05, hw - yb, 0.2); mb.pop(); } pp = [x, z]; }
    mb.box(xw + r + 6, (yb + hw) / 2, z1 - r, 12, hw - yb, 0.2);
    mb.mat(2, 140, 0).color(0.2, 0.2, 0.2, 1); mb.box(xw - 0.11, 1.75, z1 + 1.5, 0.02, 0.22, 0.3);
    // sobrado: térreo e pavimento de cima recuado, telha cerâmica, ar-condicionado na lateral
    mb.push(m4translate(m4(), xw + 9.5, 0, (z0 + z1) / 2 - 1.2));
    mb.mat(19, 170).color(0.88, 0.86, 0.8, 1); cWalls(mb, 11, 10, yb, 3.0);
    cOpening(mb, -5.5, -1, 1.5, 1.6, 1.0, 2.2, 21, [0.9, 0.9, 0.88]);
    mb.mat(20).color(0.36, 0.22, 0.15, 1); cRoof(mb, 11, 10, 3.0, 1.9, 0.55, false);
    mb.mat(19, 170).color(0.88, 0.86, 0.8, 1); mb.push(m4translate(m4(), 1.0, 0, 0.5)); cWalls(mb, 7, 7, 3.0, 5.7); cOpening(mb, -3.5, -1, 0, 1.5, 3.9, 5.0, 21, [0.9, 0.9, 0.88]);
    mb.mat(20).color(0.36, 0.22, 0.15, 1); cRoof(mb, 7, 7, 5.7, 1.6, 0.5, false); mb.pop();
    mb.mat(1).color(0.92, 0.92, 0.9, 1); mb.box(-1.0, 4.4, -3.05, 0.8, 0.55, 0.28);
    mb.pop();
  }
  {
    const z0 = Z + 0.05, zc = Z + 3.2, z1 = Z + 10.5, white = [0.92, 0.92, 0.9];
    // painel de cobogó preto: blocos de 25 cm em relevo, vazados
    mb.mat(2, 200, 0).color(0.05, 0.05, 0.055, 1);
    mb.box(xw + 0.12, 1.25, (z0 + zc) / 2, 0.06, 2.5, zc - z0);
    for (let y = 0.15; y < 2.4; y += 0.27) for (let z = z0 + 0.15; z < zc - 0.1; z += 0.27) { mb.box(xw - 0.02, y + 0.12, z + 0.12, 0.12, 0.2, 0.06); mb.box(xw - 0.02, y + 0.12, z + 0.12, 0.12, 0.06, 0.2); }
    // muro branco com faixa preta e portão branco de lâminas verticais
    mb.mat(19, 200).color(...white, 1); mb.box(xw, (yb + 2.1) / 2, (zc + z1 - 2.6) / 2, 0.2, 2.1 - yb, z1 - 2.6 - zc);
    mb.mat(19, 200).color(0.06, 0.06, 0.07, 1); mb.box(xw - 0.11, 1.25, (zc + z1 - 2.6) / 2, 0.02, 0.32, z1 - 2.6 - zc);
    mb.mat(2, 150, 0).color(...white, 1); for (let z = z1 - 2.55; z < z1 - 0.05; z += 0.09) mb.box(xw, 1.15, z, 0.04, 2.2, 0.06);
    mb.box(xw, 2.27, z1 - 1.3, 0.06, 0.06, 2.5);
    // casa de laje: térreo branco e pavimento de cima cinza-grafite, ar-condicionado na fachada
    mb.push(m4translate(m4(), xw + 8.5, 0, (z0 + z1) / 2));
    mb.mat(19, 170).color(...white, 1); cWalls(mb, 10, z1 - z0, yb, 3.1);
    mb.mat(19, 170).color(0.3, 0.31, 0.33, 1); mb.box(0.6, 4.1, 0, 8.8, 2.0, z1 - z0 - 0.4);
    mb.mat(19, 170).color(0.15, 0.15, 0.16, 1); mb.box(-3.82, 3.25, 0, 0.12, 0.18, z1 - z0 - 0.4);
    cOpening(mb, -3.8, -1, 1.2, 2.2, 3.5, 4.6, 21, [0.25, 0.25, 0.27]);
    mb.mat(1).color(0.93, 0.93, 0.92, 1); mb.box(-3.95, 4.0, -1.8, 0.28, 0.55, 0.8);
    mb.mat(3).color(0.42, 0.41, 0.39, 1); cRect(mb, -4.4, 5.1, -(z1 - z0) / 2 + 0.2, 8.8, 0, 0, 0, 0, z1 - z0 - 0.4, 0, 1, 0);
    mb.pop();
    // lixeira de ferro do vizinho, junto ao meio-fio
    const lx = -X - 1.6, lz = Z + 6.0, lg = mbGroundY(mb, lx, lz); mb.push(m4translate(m4(), 0, lg, 0)); mb.mat(2, 140, 200).color(0.12, 0.12, 0.13, 1); mb.box(lx, 0.5, lz, 0.06, 1.2, 0.06); mbColCircle(mb, lx, lz, 0.1);
    mb.mat(11, 0, 0, 40).color(0.12, 0.12, 0.13, 1); for (const y of [0.98, 1.12, 1.26]) { mb.box(lx - 0.16, y, lz, 0.02, 0.02, 0.46); mb.box(lx + 0.16, y, lz, 0.02, 0.02, 0.46); mb.box(lx, y, lz - 0.22, 0.34, 0.02, 0.02); mb.box(lx, y, lz + 0.22, 0.34, 0.02, 0.02); } mb.pop();
  }
  mbColBox(mb, xw + 7, -Z - 6.0, 7.2, 4.6); mbColBox(mb, xw + 7, Z + 5.3, 7.2, 5.2);
  mb.pop();
  { const c = M.at(-X + 9.6, (-Z + 4.4) * zs); CITY.addBox({ x: c[0], z: c[1], ux: M.ux, uz: M.uz, hd: 4.2, hw: 4.2 }); const c2 = M.at(-X + 10.8, (Z - 2.55) * zs); CITY.addBox({ x: c2[0], z: c2[1], ux: M.ux, uz: M.uz, hd: 5.2, hw: 2.45 }); }
  const f = M.at(xw, 0); CITY.addBox({ x: f[0], z: f[1], ux: M.ux, uz: M.uz, hd: 0.15, hw: Z });
}

// placas da cidade: nomes de rua nas esquinas e PARE nos pontos marcados no mapa
function citySigns(mb, REG) {
  const C = CITY, o = new Float64Array(5);
  const plate = (name, x, y, z, ax, az) => {   // placa dupla face, 0,9 x 0,22 m, alinhada com a rua (ax, az)
    const key = C.plates && C.plates[name]; if (!key) return;
    const w = 0.9, h = 0.17, nx = -az, nz = ax;
    marcoSign(mb, REG, key, x - ax * w / 2 + nx * 0.012, y, z - az * w / 2 + nz * 0.012, ax * w, az * w, h, nx, nz);
    marcoSign(mb, REG, key, x + ax * w / 2 - nx * 0.012, y, z + az * w / 2 - nz * 0.012, -ax * w, -az * w, h, -nx, -nz);
  };
  for (const J of C.juncs) {
    if (!J.urban || J.ends.length < 3) continue;
    const pr = J.pairs.find(p => p.ok && p.A.ch.cls.name && p.B.ch.cls.name && p.A.ch.cls.name !== p.B.ch.cls.name); if (!pr) continue;
    const cb = J.curbs.find(c => c.pts.length); if (!cb) continue;
    const m = cb.pts[Math.floor(cb.pts.length / 2)], nd = J.node; let dx = m[0] - nd.x, dz = m[1] - nd.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const x = m[0] + dx * 0.7, z = m[1] + dz * 0.7; _cq[0] = x; _cq[1] = z; cityRasterQ(_cq); if (_cq[9] < 0.2) continue; const y = cityGroundY(x, z) - 0.02;
    mb.mat(2, 140, 200).color(0.55, 0.56, 0.58, 1); mb.cyl(x, y, z, 0.035, y + 2.9, 0.035, 6, false, true); C.addCircle(x, z, 0.08);
    plate(pr.A.ch.cls.name, x, y + 2.6, z, pr.A.ux, pr.A.uz);
    plate(pr.B.ch.cls.name, x, y + 2.33, z, pr.B.ux, pr.B.uz);
  }
  // letreiros dos comércios e prédios públicos
  for (const sg of C.signs) { const key = C.signReg && C.signReg[sg.name]; if (!key) continue; marcoSign(mb, REG, key, sg.x, sg.y, sg.z, sg.rx, sg.rz, sg.h, sg.nx, sg.nz); }
  // PARE: no lado direito de quem chega ao cruzamento
  for (let k = 0; k < C.stops.length; k += 2) {
    const sx = C.stops[k], sz = C.stops[k + 1], r = nearestChain(sx, sz); if (!r || r.d > 8) continue;
    const ch = r.ch; let tx = r.tx, tz = r.tz;
    const da = Math.hypot(ch.a.x - sx, ch.a.z - sz), db = Math.hypot(ch.b.x - sx, ch.b.z - sz);
    if (da < db) { tx = -tx; tz = -tz; }   // sentido de quem chega ao nó mais próximo
    const off = ch.hw + (ch.cls.urban ? 0.6 : 1.2), x = r.x - tz * off, z = r.z + tx * off, y = cityGroundY(x, z) - 0.02;
    mb.mat(2, 140, 200).color(0.55, 0.56, 0.58, 1); mb.cyl(x, y, z, 0.03, y + 2.3, 0.03, 6, false, true); C.addCircle(x, z, 0.08);
    // octógono voltado para quem chega (normal = -t)
    const R = 0.32, cy = y + 2.15, reg = REG.pare, nx = -tx, nz = -tz, rx = -nz, rz = nx, um = (reg[0] + reg[2]) / 2, vm = (reg[1] + reg[3]) / 2, us = (reg[2] - reg[0]) / 2, vs = (reg[3] - reg[1]) / 2;
    mb.mat(7).color(1, 1, 1, 1);
    const c0 = mb.v(x + nx * 0.03, cy, z + nz * 0.03, nx, 0, nz, um, vm);
    for (let q = 0; q < 8; q++) { const a = (q + 0.5) * TAU / 8, cu = Math.cos(a), cv = Math.sin(a); mb.v(x + nx * 0.03 + rx * cu * R, cy - cv * R, z + nz * 0.03 + rz * cu * R, nx, 0, nz, um + cu * us, vm + cv * vs); }
    for (let q = 0; q < 8; q++) { const a = c0 + 1 + q, b = c0 + 1 + (q + 1) % 8; mb.tri(c0, a, b); mb.tri(c0, b, a); }
  }
}

// ---------- entrada da cidade pela Rodovia Maurício Goulart (SP-355), pelo Street View de out/2024 ----------
// Pórtico sobre as duas pistas (pilares verdes, vigas brancas de pérgola e um arco branco curvo saindo de cada lado),
// imagem de Nossa Senhora Aparecida no canteiro central e, mais adiante, as letras brancas NOVA ALIANÇA no campo.
const ENTRADA_LL = { portal: [-21.0087032, -49.4954918, 164.38, 25], letras: [-21.0092639, -49.4953781, 136, 40] };
function llToXZ(lat, lon) { const R = 6378137, kx = Math.cos(-21.0164 * PI / 180) * PI / 180 * R, kz = PI / 180 * R; return [(lon + 49.4981) * kx, -(lat + 21.0164) * kz]; }
function marcosEntradaLayout() {
  const C = CITY, at = ([lat, lon, h, d]) => { const [x, z] = llToXZ(lat, lon), a = h * PI / 180; return [x + Math.sin(a) * d, z - Math.cos(a) * d, x, z]; };
  const [px, pz] = at(ENTRADA_LL.portal);
  // as duas pistas da rodovia mais próximas do pórtico
  const cand = [];
  for (const ch of C.chains) { if (!/Maurício Goulart/.test(ch.cls.name)) continue; let bd = 1e9, bi = 0; for (let i = 0; i < ch.n; i++) { const d = Math.hypot(ch.x[i] - px, ch.z[i] - pz); if (d < bd) { bd = d; bi = i; } } if (bd < 20) cand.push({ ch, bi, d: bd }); }
  cand.sort((a, b) => a.d - b.d);
  const A = cand[0]; if (!A) return;
  const B = cand.find(c => c.ch !== A.ch && Math.hypot(c.ch.x[c.bi] - A.ch.x[A.bi], c.ch.z[c.bi] - A.ch.z[A.bi]) > 6);
  const ax = A.ch.x[A.bi], az = A.ch.z[A.bi], bx = B ? B.ch.x[B.bi] : ax + 13, bz = B ? B.ch.z[B.bi] : az;
  let vx = bx - ax, vz = bz - az; const dl = Math.hypot(vx, vz) / 2; vx /= dl * 2; vz /= dl * 2;
  const i0 = Math.max(0, A.bi - 2), i1 = Math.min(A.ch.n - 1, A.bi + 2); let ux = A.ch.x[i1] - A.ch.x[i0], uz = A.ch.z[i1] - A.ch.z[i0]; const ul = Math.hypot(ux, uz); ux /= ul; uz /= ul;
  if (ux * Math.sin(164 * PI / 180) - uz * Math.cos(164 * PI / 180) < 0) { ux = -ux; uz = -uz; }   // u = sentido de quem entra na cidade
  const P = { x: (ax + bx) / 2, z: (az + bz) / 2, ux, uz, vx, vz, dl, hw: A.ch.hw };
  // letras: no campo, de frente para quem chega
  const [lx, lz, ox, oz] = at(ENTRADA_LL.letras); let nx = ox - lx, nz = oz - lz; const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
  MARCOS.entrada = { P, L: { x: lx, z: lz, nx, nz } };
  // nada de casa, mato ou árvore em cima
  const mark = (x, z, r) => { for (let j = Math.floor(z - r); j <= z + r; j++) for (let i = Math.floor(x - r); i <= x + r; i++) { if ((i - x) ** 2 + (j - z) ** 2 > r * r) continue; const ii = i - C.X0, jj = j - C.Z0; if (ii >= 0 && jj >= 0 && ii < C.W && jj < C.H) C.occ[jj * C.W + ii] = C.occ[jj * C.W + ii] || 4; } };
  mark(lx, lz, 13);
  for (const s of [-1, 1]) mark(P.x + vx * s * (dl + P.hw + 3.4), P.z + vz * s * (dl + P.hw + 3.4), 4);
  // sagus e palmeiras baixas no canteiro e nas margens, como no Street View
  for (let k = -5; k <= 7; k++) { if (Math.abs(k) < 2) continue; const u = k * 6; MARCOS.trees.push([P.x + ux * u, P.z + uz * u, 3, 0.26]); }
}
// ponto local (a, b) do construtor de malha: altura do chão real nesse ponto, no referencial local (para nada flutuar)
function mbGroundY(mb, a, b) { const m = mb.xf; if (!m) return cityGroundY(a, b); return cityGroundY(m[0] * a + m[8] * b + m[12], m[2] * a + m[10] * b + m[14]) - m[13]; }
// empurra o ponto local (a, b) na direção (da, db) até sair da pista (frades, postes e placas na calçada, não no asfalto)
function mbOffRoad(mb, a, b, da, db) { const m = mb.xf; for (let k = 0; k < 20; k++) { const x = m ? m[0] * a + m[8] * b + m[12] : a, z = m ? m[2] * a + m[10] * b + m[14] : b; _cq[0] = x; _cq[1] = z; cityRasterQ(_cq); if (_cq[9] > 0.35) break; a += da * 0.25; b += db * 0.25; } return [a, b]; }
// segmento extrudado (letras): de (x0,y0) a (x1,y1) no plano local, espessura t, profundidade d
function mbSeg(mb, x0, y0, x1, y1, t, d) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), c = dx / L, s = dy / L;
  mb.push(m4basis(m4(), c, s, 0, -s, c, 0, 0, 0, 1, (x0 + x1) / 2, (y0 + y1) / 2, 0)); mb.box(0, 0, 0, L + t * 0.98, t, d); mb.pop();
}
function marcoEntrada(mb) {
  const E = MARCOS.entrada; if (!E) return;
  const P = E.P, white = [0.93, 0.93, 0.91], green = [0.36, 0.5, 0.36];
  const y0 = hfAt(P.x, P.z);
  // quadro: x = sentido de entrada (u), y = cima, z = lateral (v, da pista A para a B)
  mb.push(m4basis(m4(), P.ux, 0, P.uz, 0, 1, 0, P.vx, 0, P.vz, P.x, y0, P.z));
  const H = 7.6;
  for (const s of [-1, 1]) {
    const inner = s * (P.dl - P.hw - 0.9), outer = s * (P.dl + P.hw + 3.4);
    // pilares verdes no canteiro
    mb.mat(19, 150).color(...green, 1);
    for (const u of [-1.7, 1.7]) { mb.box(u, (H + 0.9) / 2 - 0.3, inner, 0.36, H + 1.5, 0.36); mbColCircle(mb, u, inner, 0.3); }
    // vigas brancas da pérgola sobre a pista, com ripas
    mb.mat(2, 120, 0).color(...white, 1);
    const zc = (inner + outer) / 2, len = Math.abs(outer - inner) + 1.2;
    for (const u of [-0.45, 0.45]) mb.box(u, H, zc, 0.16, 0.42, len);
    for (let t = 0; t <= len; t += 0.55) mb.box(0, H + 0.26, zc - len / 2 + t, 1.4, 0.1, 0.1);
    // tirantes do topo dos pilares até a ponta da viga
    mb.mat(11, 0, 0, 40).color(0.75, 0.75, 0.75, 1);
    for (const u of [-1.7, 1.7]) mb.tube([[u, H + 1.15, inner], [u * 0.3, H + 0.2, inner + (outer - inner) * 0.65]], 0.025, 4);
    // arco branco curvo saindo do pedestal verde na margem e chegando na ponta da viga
    mb.mat(19, 150).color(...green, 1); mb.box(0, 0.6, outer, 1.6, 1.6, 1.6); mbColBox(mb, 0, outer, 0.85, 0.85);
    mb.mat(2, 120, 0).color(...white, 1);
    const N = 14; let pp = null;
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * PI / 2, z = outer + (inner - outer) * 0.62 * (1 - Math.cos(a)), y = 1.4 + (H - 1.4) * Math.sin(a);
      if (pp) { const dz = z - pp[0], dy = y - pp[1], L = Math.hypot(dz, dy); mb.push(m4basis(m4(), 1, 0, 0, 0, dy / L, dz / L, 0, -dz / L, dy / L, 0, (pp[1] + y) / 2, (pp[0] + z) / 2)); mb.box(0, 0, 0, 0.5, L + 0.05, 0.32); mb.pop(); }
      pp = [z, y];
    }
  }
  // canteiro central: Nossa Senhora Aparecida sobre pedestal de tijolinho, com flores
  {
    const u = 4.5;
    mb.mat(22).color(0.72, 0.52, 0.4, 1); mb.box(u, 0.7, 0, 2.4, 1.6, 2.4); mbColBox(mb, u, 0, 1.25, 1.25);
    mb.mat(3).color(0.8, 0.79, 0.76, 1); mb.box(u, 1.55, 0, 2.6, 0.1, 2.6);
    const fl = [[0.85, 0.2, 0.35], [0.95, 0.85, 0.9], [0.9, 0.75, 0.2], [0.75, 0.15, 0.2]];
    for (let k = 0; k < 18; k++) { const a = k / 18 * TAU, c = fl[k % 4]; mb.mat(2, 200, 0).color(c[0], c[1], c[2], 1); mb.box(u + Math.cos(a) * 1.0, 1.75, Math.sin(a) * 1.0, 0.28, 0.28, 0.28); }
    // manto azul-escuro em forma de sino, bordas douradas, rosto, coroa
    mb.mat(2, 140, 60).color(0.07, 0.11, 0.3, 1); mb.cyl(u, 1.6, 0, 0.95, 4.6, 0.22, 16, false, true);
    mb.mat(2, 80, 220).color(0.75, 0.6, 0.25, 1); mb.cyl(u, 1.6, 0, 0.98, 1.75, 0.96, 16, false, true);
    mb.mat(2, 160, 0).color(0.25, 0.16, 0.1, 1); mb.cyl(u - 0.12, 4.45, 0, 0.2, 4.95, 0.17, 10, true, true);
    mb.mat(2, 80, 230).color(0.85, 0.68, 0.25, 1); mb.cyl(u, 4.95, 0, 0.26, 5.35, 0.3, 10, true, true); mb.cyl(u, 5.35, 0, 0.04, 5.65, 0.04, 6, false, true);
  }
  mb.pop();
  // letreiro NOVA ALIANÇA: letras brancas de concreto, 2,6 m de altura, sobre base baixa
  {
    const L = E.L, yl = hfAt(L.x, L.z) - 0.05, tx = L.nz, tz = -L.nx;   // tx,tz: ao longo do letreiro (esquerda→direita de quem olha)
    const Hl = 2.6, t = 0.32, dep = 0.5, gap = 0.32;
    const G = {
      N: [0.95, [[0, 0, 0, 1], [1, 0, 1, 1], [0, 1, 1, 0]]], O: [1.05, 'O'], V: [1.0, [[0, 1, 0.5, 0], [0.5, 0, 1, 1]]],
      A: [1.0, [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.22, 0.36, 0.78, 0.36]]], L: [0.8, [[0, 0, 0, 1], [0, 0, 1, 0]]], I: [0.12, [[0.5, 0, 0.5, 1]]], ' ': [0.55, []], 'Ç': [0.95, 'C'],
    };
    const txt = 'NOVA ALIANÇA'; let total = 0; for (const ch of txt) total += G[ch][0] * Hl * 0.5 + gap; total -= gap;
    mb.push(m4basis(m4(), tx, 0, tz, 0, 1, 0, -L.nx, 0, -L.nz, L.x, yl, L.z));
    mb.mat(3).color(0.86, 0.86, 0.84, 1); mb.box(0, 0.12, 0, total + 1.6, 0.34, dep + 1.0);
    mbColBox(mb, 0, 0, total / 2 + 0.8, dep / 2 + 0.5);
    mb.mat(2, 170, 0).color(0.94, 0.94, 0.92, 1);
    let x = -total / 2; const S = Hl * 0.5;   // largura unitária = metade da altura
    for (const ch of txt) {
      const [w, segs] = G[ch], W = w * S, X = (a) => x + t / 2 + a * (W - t), Y = (b) => 0.3 + t / 2 + b * (Hl - t);
      if (segs === 'O' || segs === 'C') {
        const n = 18, a0 = segs === 'C' ? 0.75 : 0, a1 = segs === 'C' ? TAU - 0.75 : TAU; let pp = null;
        for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n, px = X(0.5 + 0.5 * Math.cos(a)), py = Y(0.5 + 0.5 * Math.sin(a)); if (pp) mbSeg(mb, pp[0], pp[1], px, py, t, dep); pp = [px, py]; }
        if (segs === 'C') { mbSeg(mb, X(0.5), Y(0) - 0.05, X(0.5), 0.12, t * 0.7, dep); }   // cedilha (a letra fica um pouco mais alta)
      } else for (const [a, b, c, d] of segs) mbSeg(mb, X(a), Y(b), X(c), Y(d), t, dep);
      x += W + gap;
    }
    mb.pop();
  }
}
