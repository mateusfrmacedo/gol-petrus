// Minimapa (canto inferior esquerdo): mapa desenhado uma vez num canvas 2D e girado com o carro (frente para cima).
// Na cidade: ruas, quadras das praças, casas e os lugares modelados; no circuito: o traçado. N liga e desliga.
const MINI = { el: null, g: null, base: null, k: 0.6, x0: 0, z0: 0, on: true, R: 62, mpp: 2.1, last: 0 };
function miniInit() {
  if (MINI.el) return;
  const el = MINI.el = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), S = MINI.R * 2 + 8;
  el.width = S * dpr; el.height = S * dpr; el.style.cssText = `position:fixed;bottom:1.6vh;left:1.6vh;width:${S}px;height:${S}px;z-index:6;pointer-events:none;display:none`;
  document.body.appendChild(el); MINI.g = el.getContext('2d'); MINI.g.scale(dpr, dpr);
  try { const v = localStorage.getItem('gol-minimapa'); if (v === '0') MINI.on = false; } catch (e) { /* sem armazenamento: começa ligado */ }
  miniBase();
  addEventListener('keydown', e => { if (e.code === 'KeyN' && !e.repeat) { MINI.on = !MINI.on; try { localStorage.setItem('gol-minimapa', MINI.on ? '1' : '0'); } catch (err) { /* sem armazenamento */ } } });
  requestAnimationFrame(miniFrame);
}
function miniBase() {
  const k = MINI.k;
  let x0, z0, x1, z1;
  if (CITY.on) { x0 = CITY.X0 - 60; z0 = CITY.Z0 - 60; x1 = CITY.X1 + 60; z1 = CITY.Z1 + 60; }
  else { x0 = TRK.bx0 - 150; z0 = TRK.bz0 - 150; x1 = TRK.bx1 + 150; z1 = TRK.bz1 + 150; }
  const cv = document.createElement('canvas'); cv.width = Math.ceil((x1 - x0) * k); cv.height = Math.ceil((z1 - z0) * k);
  const g = cv.getContext('2d'); MINI.base = cv; MINI.x0 = x0; MINI.z0 = z0;
  const X = x => (x - x0) * k, Z = z => (z - z0) * k;
  g.fillStyle = '#26331f'; g.fillRect(0, 0, cv.width, cv.height);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (!CITY.on) {
    g.strokeStyle = '#d8d8d8'; g.lineWidth = TRK.hw * 2 * k + 1.5; g.beginPath();
    for (let i = 0; i <= TRK.N; i++) { const q = i % TRK.N; if (i === 0) g.moveTo(X(TRK.x[q]), Z(TRK.z[q])); else g.lineTo(X(TRK.x[q]), Z(TRK.z[q])); }
    g.stroke(); return;
  }
  const C = CITY;
  // córregos
  g.strokeStyle = '#2f6f9a'; g.lineWidth = 2;
  for (const s of C.streams) { g.beginPath(); for (let i = 0; i < s.length / 2; i++) { if (i) g.lineTo(X(s[i * 2]), Z(s[i * 2 + 1])); else g.moveTo(X(s[0]), Z(s[1])); } g.stroke(); }
  // praças
  g.fillStyle = '#3f7d3a';
  for (const B of C.blocks) for (let q = 0; q < B.cells.length; q += 3) { const kk = B.cells[q]; g.fillRect(X(C.X0 + kk % C.W) - 1, Z(C.Z0 + Math.floor(kk / C.W)) - 1, 2.2, 2.2); }
  // casas
  g.fillStyle = '#6f675e';
  for (const h of C.houses) { g.save(); g.translate(X(h.x), Z(h.z)); g.rotate(Math.atan2(h.nz, h.nx)); g.fillRect(-h.d / 2 * k, -h.w / 2 * k, h.d * k, h.w * k); g.restore(); }
  // vias: calçada (urbana), depois o leito
  const pass = (wf, col) => {
    for (const ch of C.chains) {
      const w = wf(ch); if (!w) continue; g.strokeStyle = col(ch); g.lineWidth = w * k; g.beginPath();
      for (let i = 0; i < ch.n; i++) { if (i) g.lineTo(X(ch.x[i]), Z(ch.z[i])); else g.moveTo(X(ch.x[0]), Z(ch.z[0])); }
      g.stroke();
    }
  };
  pass(ch => ch.cls.urban ? (ch.hw + C.SW) * 2 : 0, () => '#9a9690');
  pass(ch => Math.max(2.4 / k, ch.hw * 2), ch => ch.cls.dirt ? '#9c6a43' : ch.cls.paint === 1 && !ch.cls.urban ? '#e8c35a' : '#dcdcdc');
  // lugares modelados
  const pin = (x, z, txt, bg) => { g.fillStyle = bg; g.beginPath(); g.arc(X(x), Z(z), 9, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 11px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, X(x), Z(z) + 0.5); };
  if (MARCOS.borghi) pin(MARCOS.borghi.ox, MARCOS.borghi.oz, 'B', '#c62828');
  if (MARCOS.sacoi) pin(MARCOS.sacoi.ox, MARCOS.sacoi.oz, 'S', '#2e7d32');
  if (MARCOS.petrus) pin(MARCOS.petrus.ox, MARCOS.petrus.oz, 'P', '#1565c0');
  if (MARCOS.matriz) { const M = MARCOS.matriz, p = M.at(M.church.u, M.church.v); pin(p[0], p[1], '+', '#6d4c41'); }
}
function miniFrame(t) {
  requestAnimationFrame(miniFrame);
  const el = MINI.el, show = MINI.on && typeof HUD !== 'undefined' && HUD.vis && GAME.ready;
  el.style.display = show ? 'block' : 'none'; if (!show) return;
  if (t - MINI.last < 30) return; MINI.last = t;
  const g = MINI.g, R = MINI.R, c = R + 4, sc = 1 / MINI.mpp / MINI.k;
  g.clearRect(0, 0, c * 2, c * 2);
  g.save(); g.beginPath(); g.arc(c, c, R, 0, TAU); g.clip();
  g.fillStyle = '#1d2618'; g.fillRect(0, 0, c * 2, c * 2);
  const rot = -PI / 2 - GS.yaw;
  g.translate(c, c); g.rotate(rot); g.scale(sc, sc);
  g.drawImage(MINI.base, -(GS.cx - MINI.x0) * MINI.k, -(GS.cz - MINI.z0) * MINI.k);
  g.restore();
  // borda, norte e o carro
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, R, 0, TAU); g.stroke();
  const na = rot - PI / 2; g.fillStyle = '#fff'; g.font = 'bold 12px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(c + Math.cos(na) * (R - 10), c + Math.sin(na) * (R - 10), 8, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillText('N', c + Math.cos(na) * (R - 10), c + Math.sin(na) * (R - 10) + 0.5);
  g.fillStyle = '#ffd54f'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(c, c - 9); g.lineTo(c + 6.5, c + 7); g.lineTo(c, c + 3.5); g.lineTo(c - 6.5, c + 7); g.closePath(); g.fill(); g.stroke();
}
