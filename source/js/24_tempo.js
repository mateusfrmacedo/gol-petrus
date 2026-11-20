// Hora do dia: posição do sol para Nova Aliança (lat. -21°, fim de novembro), céu regerado aos poucos, sombra estática e luz
// ambiente refeitas quando o sol anda; à noite a luz direta passa a ser a lua, postes e janelas acendem (F.sunDir.w = noite).
// O tempo corre (1 minuto do jogo por segundo, por padrão) e pode ser parado ou acertado no menu e nas teclas , e .
const TOD = {
  hour: 16.0, rate: 1 / 60, rates: { parado: 0, normal: 1 / 60, rapido: 10 / 60, turbo: 1 },
  night: 0, real: new Float32Array(3), bakeSun: new Float32Array(3), shadowSun: new Float32Array(3), bake: -1, bakeQueued: false,
  shadowT: 0, shT: 0, shBusy: false, lit: 1, litCover: -1, bakeCover: -1, dirty: true,
};
(() => { try { const h = parseFloat(localStorage.getItem('gol-hora')); if (h >= 0 && h < 24) TOD.hour = h; const r = localStorage.getItem('gol-tempo'); if (r && r in TOD.rates) TOD.rate = TOD.rates[r]; } catch (e) { /* sem armazenamento */ } })();
if (typeof Q !== 'undefined' && Q.has('hora')) { const h = parseFloat(Q.get('hora')); if (h >= 0 && h < 24) { TOD.hour = h; TOD.rate = 0; } }
// direção do sol (x leste, y cima, z sul) para a hora local; devolve o seno da elevação
function todSunDir(h, out) {
  const lat = -21.02 * PI / 180, dec = -19.6 * PI / 180, H = (h - 12.15) * 15 * PI / 180;   // 12h15 ≈ meio-dia solar em -49,5°
  const sEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H), el = Math.asin(sEl), cEl = Math.cos(el);
  // azimute a partir do norte, sentido horário
  let cA = (Math.sin(dec) - Math.sin(el) * Math.sin(lat)) / (cEl * Math.cos(lat) + 1e-9); cA = clamp(cA, -1, 1);
  let A = Math.acos(cA); if (Math.sin(H) > 0) A = TAU - A;
  out[0] = Math.sin(A) * cEl; out[1] = sEl; out[2] = -Math.cos(A) * cEl;
  return sEl;
}
const _tm = new Float32Array(3);
// aplica a hora: luz direta (sol ou lua), cor, fator noite
function todApply() {
  const s = todSunDir(TOD.hour, TOD.real);
  // dia: sol; crepúsculo: o sol perde força até -3°; noite: lua alta no lado oposto, luz fria e fraca
  const sunK = smooth(-0.05, 0.06, s), moonK = 1 - smooth(-0.08, -0.02, s);
  TOD.night = 1 - smooth(-0.1, 0.07, s);
  if (s > -0.035) {
    R.sun.set(TOD.real); if (R.sun[1] < 0.02) { R.sun[1] = 0.02; const l = Math.hypot(R.sun[0], R.sun[1], R.sun[2]); R.sun[0] /= l; R.sun[1] /= l; R.sun[2] /= l; }
    const c = atmSunColor(Math.max(Math.sin(2 * PI / 180), s - 0.04)), k = 1.5 * sunK;
    const cs = CLIMA.cur.sun, g = (c[0] + c[1] + c[2]) / 3;   // céu fechado: sol fraco e mais neutro (luz atravessando as nuvens)
    R.sunCol[0] = (c[0] * cs + g * (1 - cs) * 0.15) * k; R.sunCol[1] = (c[1] * cs + g * (1 - cs) * 0.15) * k; R.sunCol[2] = (c[2] * cs + g * (1 - cs) * 0.17) * k;
  } else {
    _tm[0] = -TOD.real[0] * 0.55 + 0.25; _tm[1] = 0.75; _tm[2] = -TOD.real[2] * 0.55 + 0.2; const l = Math.hypot(_tm[0], _tm[1], _tm[2]);
    R.sun[0] = _tm[0] / l; R.sun[1] = _tm[1] / l; R.sun[2] = _tm[2] / l;
    const mk = moonK * (0.15 + 0.85 * CLIMA.cur.sun);   // lua some atrás das nuvens
    R.sunCol[0] = 0.07 * mk; R.sunCol[1] = 0.09 * mk; R.sunCol[2] = 0.13 * mk;
  }
  // postes e janelas acendem à noite e também em dia muito escuro (temporal)
  R.night = Math.max(TOD.night, (1 - smooth(0.05, 0.3, CLIMA.cur.sun)) * 0.75);
}
// reinicia a geração do céu (uma faixa por quadro) para a posição real do sol
function todQueueBake() { TOD.bakeQueued = true; }
function todBakeStep() {
  const B = R.skyBake; if (!B) return;
  if (TOD.bake < 0) {
    if (!TOD.bakeQueued) return;
    TOD.bakeQueued = false; TOD.bake = 0; TOD.bakeSun.set(TOD.real);
    TOD.bakeCover = CLIMA.cur.cover;
    G.dev.queue.writeBuffer(B.su, 0, new Float32Array([TOD.real[0], TOD.real[1], TOD.real[2], 0, CLIMA.cur.cover, 0, 0, 0]));
  }
  const i = TOD.bake, strips = 16, enc = G.dev.createCommandEncoder();
  const p = enc.beginRenderPass({ colorAttachments: [{ view: R.view.sky, loadOp: 'load', storeOp: 'store' }] });
  p.setPipeline(B.sb); p.setBindGroup(0, B.sbg); p.setScissorRect(i * SKY_W / strips, 0, SKY_W / strips, SKY_H); p.draw(3); p.end();
  G.dev.queue.submit([enc.finish()]);
  TOD.bake = i + 1 >= strips ? -1 : i + 1;
}
const angDeg = (a, b) => Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)) * 180 / PI;
// a cada quadro (antes de renderizar)
function todFrame() {
  if (!GAME.ready) return;
  const dt = RT[2] > 0 ? Math.min(RT[2], 0.1) : 1 / 60;
  climaFrame(dt);
  const paused = typeof UI !== 'undefined' && UI.st === ST.PAUSA;
  if (TOD.rate > 0 && !paused) { TOD.hour += dt * TOD.rate; if (TOD.hour >= 24) TOD.hour -= 24; TOD.dirty = true; }
  if (TOD.dirty) { todApply(); TOD.dirty = false; }
  if ((angDeg(TOD.real, TOD.bakeSun) > 0.6 || Math.abs(CLIMA.cur.cover - TOD.bakeCover) > 0.03) && TOD.bake < 0) todQueueBake();
  todBakeStep();
  const now = performance.now();
  if (angDeg(R.sun, TOD.shadowSun) > 0.5 && now - TOD.shadowT > 1200) { TOD.shadowSun.set(R.sun); TOD.shadowT = now; renderStaticShadow(); }
  if (!TOD.shBusy && now - TOD.shT > 1800 && (TOD.lit !== TOD.hour || TOD.litCover !== CLIMA.cur.cover)) {
    TOD.shBusy = true; TOD.shT = now; TOD.lit = TOD.hour; TOD.litCover = CLIMA.cur.cover;
    computeSH().then(() => { TOD.shBusy = false; }, () => { TOD.shBusy = false; });
  }
  todClock();
}
// acerta a hora (menu, teclas): refaz o céu inteiro de uma vez e a sombra
function todSet(h, naoGuardar) {
  TOD.hour = ((h % 24) + 24) % 24; todApply(); TOD.dirty = false;
  TOD.bake = -1; todQueueBake(); TOD.shadowSun.fill(9); TOD.shT = 0; TOD.lit = -1;
  if (!naoGuardar) { try { localStorage.setItem('gol-hora', TOD.hour.toFixed(2)); } catch (e) { /* sem armazenamento */ } }
  todUI();
}
function todFmt(h) { const m = Math.floor(h * 60 + 1e-6) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
// relógio na tela (junto ao minimapa) e controles do menu
function todClock() {
  const el = document.getElementById('clock'); if (!el) return;
  const show = typeof HUD !== 'undefined' && HUD.vis;
  el.style.display = show ? 'block' : 'none'; if (!show) return;
  const t = todFmt(TOD.hour) + (CLIMA.real && CLIMA.temp != null ? ' · ' + Math.round(CLIMA.temp) + '°C' : ''); if (el.textContent !== t) el.textContent = t;
}
function todUI() {
  const r = document.getElementById('hora'), l = document.getElementById('hora-txt');
  if (r && document.activeElement !== r) r.value = TOD.hour.toFixed(2);
  if (l) l.textContent = todFmt(TOD.hour);
}
function todInit() {
  const r = document.getElementById('hora'), sp = document.getElementById('tempo');
  if (r) r.oninput = e => todSet(parseFloat(e.target.value));
  if (sp) {
    for (const k in TOD.rates) if (Math.abs(TOD.rates[k] - TOD.rate) < 1e-9) sp.value = k;
    sp.onchange = e => { TOD.rate = TOD.rates[e.target.value]; try { localStorage.setItem('gol-tempo', e.target.value); } catch (err) { /* sem armazenamento */ } };
  }
  addEventListener('keydown', e => {
    if (e.code === 'Comma' && !e.repeat) todSet(TOD.hour - 1);
    else if (e.code === 'Period' && !e.repeat) todSet(TOD.hour + 1);
  });
  setInterval(todUI, 500); todUI();
}
