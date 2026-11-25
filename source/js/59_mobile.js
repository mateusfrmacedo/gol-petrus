// Controles móveis: volante multitoque e inclinação, compartilhando a física analógica do controle.
const MOBILE = {
  on: false, mode: 'volante', steer: 0, keys: 0, wheelId: null, wheelAngle: 0,
  lastAngle: 0, tilt: null, neutral: 0, sensorTime: 0, sensorPending: false,
  pointers: new Map(), buttons: new Map(), cameraPointers: new Map(), el: null, wheel: null, status: null,
  init() {
    this.on = GAME.ui && (Q.get('mobile') === '1' || (Q.get('mobile') !== '0' && matchMedia('(pointer:coarse)').matches));
    if (!this.on) return;
    document.body.classList.add('mobile'); document.title = 'GTA NA';
    document.querySelector('#ui h1').textContent = 'GTA NA';
    document.getElementById('map-choice').closest('p').hidden = true;
    try { this.mode = localStorage.getItem('gta-na-direcao') === 'inclinacao' ? 'inclinacao' : 'volante'; } catch (_) { /* preferência desta sessão */ }
    const style = document.createElement('style'); style.textContent = this.css; document.head.append(style);
    const root = document.createElement('div'); root.id = 'mobile-controls'; root.hidden = true;
    root.innerHTML = `<div class="mobile-top"><button id="mob-pause" aria-label="Abrir menu de configurações" title="Menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3l-.6 2.2-1.8 1-2.2-.6-2 3.4 1.6 1.6v2.1L3 14.3l2 3.4 2.2-.6 1.8 1 .6 2.2h4l.6-2.2 1.8-1 2.2.6 2-3.4-1.6-1.6v-2.1L20 9l-2-3.4-2.2.6-1.8-1-.6-2.2z"/><circle cx="11.5" cy="11.7" r="3.2"/></svg></button><button id="mob-camera" aria-label="Trocar câmera"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6l2-3h4l2 3"/><circle cx="12" cy="13" r="4"/></svg></button></div>
      <div class="mobile-left"><div id="mob-wheel" role="slider" tabindex="0" aria-label="Volante: arraste para girar" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><img id="mob-wheel-art" src="${MOBILE_ART.wheel}" alt="" draggable="false"></div><button id="mob-center">Calibrar inclinação</button></div>
      <div class="mobile-right"><div class="mobile-shifts"><button id="mob-down" aria-label="Reduzir marcha">−</button><button id="mob-hand" aria-label="Freio de mão: segure para puxar"><img src="${MOBILE_ART.handbrake}" alt="" draggable="false"><span>Freio de mão</span></button><button id="mob-up" aria-label="Subir marcha">+</button></div><div class="mobile-pedals"><button id="mob-brake" aria-label="Freio e ré"><img src="${MOBILE_ART.brake}" alt="" draggable="false"><span>Freio / ré</span></button><button id="mob-gas" aria-label="Acelerar"><img src="${MOBILE_ART.gas}" alt="" draggable="false"><span>Acelerar</span></button></div></div>`;
    document.body.append(root); this.el = root; this.wheel = document.getElementById('mob-wheel');
    const settings = document.createElement('section'); settings.className = 'mobile-settings';
    settings.innerHTML = `<label>Direção<select id="mob-mode"><option value="volante">Volante na tela</option><option value="inclinacao">Inclinação do celular</option></select></label><label>Sensibilidade<input id="mob-sensitivity" type="range" min="12" max="40" value="25"><small>Menor valor: direção mais sensível</small></label><label>Gráficos<select id="mob-quality"><option value="economico">Econômico</option><option value="equilibrado">Equilibrado</option><option value="alto">Alto</option></select></label><p id="mob-status" role="status">Segure os pedais e arraste o volante. Freio dá ré após parar.</p>`;
    document.querySelector('#ui .setup-grid').append(settings); this.status = document.getElementById('mob-status');
    const environment = document.querySelector('#ui .environment');
    const weather = document.createElement('details'); weather.className = 'mobile-weather';
    weather.innerHTML = '<summary>Clima e horário</summary>'; environment.before(weather); weather.append(environment);
    const mode = document.getElementById('mob-mode'); mode.value = this.mode;
    mode.onchange = () => { this.reset(); this.mode = mode.value; this.save('gta-na-direcao', this.mode); this.layout(); if (this.mode === 'inclinacao') void this.enableSensor(); };
    const quality = document.getElementById('mob-quality'); quality.value = Q.get('quality') || 'economico';
    quality.onchange = () => { const u = new URL(location.href); u.searchParams.set('quality', quality.value); u.searchParams.delete('res'); location.href = u.href; };
    document.getElementById('mob-pause').onclick = () => uiPause();
    document.getElementById('mob-center').onclick = () => { this.calibrate(); void this.enableSensor(); };
    this.hold('mob-gas', K_W); this.hold('mob-brake', K_S); this.hold('mob-hand', K_SPACE);
    this.hold('mob-up', K_UP); this.hold('mob-down', K_DOWN); this.hold('mob-camera', K_C);
    this.wheel.addEventListener('pointerdown', e => this.wheelDown(e));
    this.wheel.addEventListener('pointermove', e => this.wheelMove(e));
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) this.wheel.addEventListener(name, e => { if (e.pointerId === this.wheelId) { this.wheelId = null; this.steer = 0; this.wheelAngle = 0; this.drawWheel(); } });
    this.cameraInit();
    this.wheel.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); this.steer = e.key === 'ArrowLeft' ? -1 : 1; this.wheelAngle = this.steer * 120; this.drawWheel(); } });
    this.wheel.addEventListener('keyup', () => { this.steer = this.wheelAngle = 0; this.drawWheel(); });
    addEventListener('gta-na-tilt', e => this.sensor(e.detail));
    addEventListener('deviceorientation', e => {
      // Na horizontal, beta acompanha a rotação em torno do eixo natural do celular.
      if (window.GtaAndroid || e.beta === null || e.gamma === null) return;
      const a = screen.orientation ? screen.orientation.angle : (window.orientation || 0);
      this.sensor(a === 90 ? e.beta : a === 270 || a === -90 ? -e.beta : e.gamma);
    });
    window.gtaNativeBack = () => { if (UI.st === ST.JOGO || UI.st === ST.FITA) { uiPause(); return true; } return false; };
    addEventListener('gta-na-background', () => this.background());
    addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.background(); });
    if (screen.orientation) screen.orientation.addEventListener('change', () => { this.reset(); this.tilt = null; this.sensorTime = 0; });
    // Permissão de sensores e tela cheia precisam nascer do toque da pessoa.
    document.getElementById('b0').addEventListener('click', () => {
      if (this.mode === 'inclinacao') void this.enableSensor();
      if (!window.GtaAndroid && FULLSCREEN.supported() && !FULLSCREEN.active()) void FULLSCREEN.toggle();
      if (!window.GtaAndroid && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    });
    if (!Q.has('gear')) uiSetGearMode(false);
    if (MINI.el) { MINI.el.id = 'mobile-mini'; MINI.el.style.bottom = 'auto'; MINI.el.style.top = '70px'; MINI.el.style.left = '14px'; MINI.el.style.width = MINI.el.style.height = '90px'; }
    MINI.on = false;
    this.menuInit(); this.layout(); this.sync();
  },
  menuAvailable() { return this.on && (UI.st === ST.INICIO || UI.st === ST.PAUSA); },
  menuInit() {
    const section = document.createElement('section'); section.className = 'mobile-lights'; section.setAttribute('aria-label', 'Luzes e acessórios');
    section.innerHTML = '<h2>Luzes e acessórios</h2><div class="mobile-light-grid"><label><input id="mob-low" type="checkbox">Farol baixo</label><label><input id="mob-high" type="checkbox">Farol alto</label><label><input id="mob-plate" type="checkbox">Luz da placa</label><label><input id="mob-left" type="checkbox">Seta esquerda</label><label><input id="mob-right" type="checkbox">Seta direita</label><label><input id="mob-roof" type="checkbox">Teto solar</label></div><p id="mob-plate-note">A luz da placa acompanha o farol alto.</p>';
    document.querySelector('#ui .setup-grid').prepend(section);
    const commands = { 'mob-low': () => GOL_CONTROLS.toggleLights(), 'mob-high': () => GOL_CONTROLS.toggleHigh(), 'mob-plate': () => GOL_CONTROLS.togglePlate(), 'mob-left': () => GOL_CONTROLS.toggleSignal(-1), 'mob-right': () => GOL_CONTROLS.toggleSignal(1), 'mob-roof': () => SUNROOF.toggle() };
    for (const [id, action] of Object.entries(commands)) document.getElementById(id).onchange = () => { action(); this.menuSync(); };
    const actions = document.createElement('div'); actions.className = 'mobile-actions';
    actions.innerHTML = '<button id="mob-centralize" type="button">Centralizar câmera</button><button id="mob-recover" type="button">Reposicionar carro</button>';
    section.append(actions);
    document.getElementById('mob-centralize').onclick = () => { CAM_ORBIT.reset(); GS.chaseInit = false; GS.cut = true; };
    document.getElementById('mob-recover').onclick = () => { if (CITY.on) cityRecover(); else vehicleReset(VEH.s, clamp(VEH.d, -2, 2), 0); CAM_ORBIT.reset(); GS.cut = true; GS.chaseInit = false; };
    const bt = document.querySelector('#ui .bt'); document.querySelector('#ui .sub').after(bt);
  },
  menuSync() {
    if (!this.on || !document.getElementById('mob-low')) return;
    const c = GOL_CONTROLS;
    const states = { 'mob-low': c.lights, 'mob-high': c.high, 'mob-plate': c.plate || c.high, 'mob-left': c.signal === -1, 'mob-right': c.signal === 1, 'mob-roof': !!SUNROOF.target };
    for (const [id, value] of Object.entries(states)) document.getElementById(id).checked = !!value;
    document.getElementById('mob-plate').disabled = c.high;
    document.getElementById('mob-plate-note').hidden = !c.high;
  },
  save(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* sem armazenamento */ } },
  cameraInit() {
    const canvas = document.getElementById('c'), points = this.cameraPointers;
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' || !CAM_ORBIT.activate()) return;
      e.preventDefault(); canvas.setPointerCapture(e.pointerId); points.set(e.pointerId, [e.clientX, e.clientY]);
    });
    canvas.addEventListener('pointermove', e => {
      const previous = points.get(e.pointerId); if (!previous || !CAM_ORBIT.allowed()) return;
      if (points.size === 1) CAM_ORBIT.move(e.clientX - previous[0], e.clientY - previous[1]);
      else {
        const other = [...points.entries()].find(([id]) => id !== e.pointerId)[1];
        const before = Math.hypot(previous[0] - other[0], previous[1] - other[1]);
        const after = Math.hypot(e.clientX - other[0], e.clientY - other[1]);
        if (after > 4 && before > 4) CAM_ORBIT.zoom(Math.log(before / after) * 1000);
      }
      previous[0] = e.clientX; previous[1] = e.clientY;
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, e => points.delete(e.pointerId));
  },
  hold(id, key) {
    const b = document.getElementById(id); this.buttons.set(b, key);
    b.addEventListener('pointerdown', e => { if (UI.st !== ST.JOGO) return; e.preventDefault(); b.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, key); this.readKeys(); b.classList.add('pressed'); });
    const up = e => { this.pointers.delete(e.pointerId); this.readKeys(); if (![...this.pointers.values()].includes(key)) b.classList.remove('pressed'); };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(name, up);
  },
  readKeys() { this.keys = 0; for (const k of this.pointers.values()) this.keys |= k; },
  angle(e) { const r = this.wheel.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; },
  wheelDown(e) { if (this.wheelId !== null || UI.st !== ST.JOGO) return; e.preventDefault(); this.wheelId = e.pointerId; this.lastAngle = this.angle(e); this.wheel.setPointerCapture(e.pointerId); },
  wheelMove(e) {
    if (e.pointerId !== this.wheelId) return;
    const a = this.angle(e); let d = a - this.lastAngle; if (d > 180) d -= 360; if (d < -180) d += 360;
    this.lastAngle = a; this.wheelAngle = clamp(this.wheelAngle + d, -120, 120); this.steer = this.wheelAngle / 120; this.drawWheel();
  },
  drawWheel() { if (!this.wheel) return; this.wheel.firstElementChild.style.transform = `rotate(${this.wheelAngle}deg)`; this.wheel.setAttribute('aria-valuenow', Math.round(this.steer * 100)); },
  sensor(degrees) {
    if (!Number.isFinite(degrees)) return;
    const first = this.tilt === null; this.tilt = first ? degrees : this.tilt + (degrees - this.tilt) * 0.25;
    this.sensorTime = performance.now(); if (first) this.neutral = this.tilt;
  },
  calibrate() { this.neutral = this.tilt === null ? 0 : this.tilt; this.steer = 0; },
  async enableSensor() {
    if (this.sensorPending) return;
    this.sensorPending = true;
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (await DeviceOrientationEvent.requestPermission() !== 'granted') throw new Error('Permissão negada');
      }
      this.calibrate(); this.status.textContent = 'Segure o celular na posição de dirigir. Use Calibrar inclinação para centralizar.';
      setTimeout(() => { if (this.mode === 'inclinacao' && (this.tilt === null || performance.now() - this.sensorTime > 1500)) { this.mode = 'volante'; document.getElementById('mob-mode').value = 'volante'; this.layout(); this.status.textContent = 'Sensor indisponível. Volante na tela ativado.'; } }, 1800);
    } catch (_) { this.mode = 'volante'; document.getElementById('mob-mode').value = 'volante'; this.layout(); this.status.textContent = 'Não foi possível acessar o sensor. Use o volante na tela.'; }
    finally { this.sensorPending = false; }
  },
  merge(k) {
    if (!this.on || UI.st !== ST.JOGO) return k;
    const touching = this.pointers.size > 0 || this.wheelId !== null;
    if (UI.padN && !touching) return k;
    let s = this.steer;
    if (this.mode === 'inclinacao') {
      const fresh = this.tilt !== null && performance.now() - this.sensorTime < 1000;
      const delta = fresh ? this.tilt - this.neutral : 0;
      const range = +(document.getElementById('mob-sensitivity').value) || 25;
      s = Math.abs(delta) < 1.5 ? 0 : clamp((delta - Math.sign(delta) * 1.5) / range, -1, 1);
    }
    VIN[0] = (k & K_W || this.keys & K_W) ? 1 : 0; VIN[1] = (k & K_S || this.keys & K_S) ? 1 : 0;
    if (!(k & (K_A | K_D))) { VIN[2] = s; k |= K_PADS; }
    return k | this.keys | K_PAD;
  },
  background() {
    this.reset(); if (UI.st === ST.JOGO || UI.st === ST.FITA) uiPause();
    if (MUSIC.audio) { MUSIC.wanted = false; MUSIC.audio.pause(); }
  },
  reset() {
    if (typeof GOL_CONTROLS !== 'undefined') GOL_CONTROLS.stopHorn();
    this.pointers.clear(); this.cameraPointers.clear(); this.keys = 0; this.steer = 0; this.wheelId = null; this.wheelAngle = 0;
    for (const b of this.buttons.keys()) b.classList.remove('pressed'); this.drawWheel();
  },
  layout() { if (!this.el) return; this.wheel.hidden = this.mode !== 'volante'; document.getElementById('mob-center').hidden = this.mode !== 'inclinacao'; },
  sync() {
    if (!this.on || !this.el) return;
    const playing = UI.st === ST.JOGO;
    if (!playing) { this.reset(); this.menuSync(); } this.el.hidden = !playing;
    document.body.classList.toggle('mobile-playing', playing);
    document.getElementById('mob-up').hidden = document.getElementById('mob-down').hidden = !VEH.manual;
  },
  css: `
    .mobile{touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none}
    .mobile #ui{font-size:14px;z-index:20}.mobile #ui>div{max-height:94dvh;overflow-y:auto;touch-action:pan-y;padding:18px;max-width:720px}
    .mobile #ui h1{font-size:28px}.mobile #ui .sub{font-size:11px;margin-bottom:12px}
    .mobile #ui select,.mobile #ui button,.mobile #ui input{min-height:44px;font-size:14px}.mobile #ui .controls-help{display:none}
    .mobile #ui .environment{padding:8px;gap:8px}.mobile #ui .setup-grid{gap:8px}
    .mobile #ui .bt{position:sticky;top:-18px;background:#0c1015;z-index:2;padding:10px 0;margin:0 0 10px}
    .mobile-settings{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding-top:8px;border-top:1px solid #ffffff24}
    .mobile-settings label{display:flex;flex-direction:column;gap:4px;text-align:left}.mobile-settings select{color:#fff;background:#25282d;border:1px solid #777;border-radius:6px;padding:6px}
    .mobile-settings input{width:100%;accent-color:#f4b846}.mobile-settings small{font-size:10px;color:#b9c0ca}.mobile-settings p{grid-column:1/-1;margin:0;font-size:12px;color:#b9c0ca;text-align:left}
    .mobile-weather{grid-column:1/-1;text-align:left}.mobile-weather summary{min-height:44px;display:flex;align-items:center;cursor:pointer;color:#ddd}.mobile-weather summary:before{content:'+';margin-right:8px}.mobile-weather[open] summary:before{content:'−'}
    .mobile-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.mobile #ui .mobile-actions button{font-size:12px;background:#25282d;margin:0;padding:8px 12px}
    .mobile-lights{grid-column:1/-1;padding:10px 0;border-top:1px solid #ffffff24}.mobile-lights h2{font-size:13px!important;letter-spacing:.02em!important;text-transform:none!important;color:#eee!important}
    .mobile-light-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px 12px}.mobile-light-grid label{display:flex;align-items:center;gap:8px;min-height:44px;font-size:13px}
    .mobile-light-grid input[type=checkbox]{width:20px;height:20px;min-height:20px!important;accent-color:#f4b846;margin:0;flex-shrink:0}.mobile-light-grid input:disabled{opacity:.6}
    #mob-plate-note{font-size:11px;margin:4px 0 0;color:#b9c0ca}
    #mobile-controls{position:fixed;inset:0;z-index:9;pointer-events:none}#mobile-controls[hidden],#mobile-controls [hidden]{display:none!important}
    #mobile-controls button{pointer-events:auto;touch-action:none;min-width:44px;min-height:48px;border:1px solid #ffffff66;border-radius:12px;background:#12171de8;color:#fff;font:600 13px system-ui;-webkit-tap-highlight-color:transparent;padding:8px 12px}
    #mobile-controls button:active,#mobile-controls button.pressed{background:#9a6514;border-color:#f4b846}
    .mobile-top{position:absolute;top:max(10px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));display:flex;gap:8px}
    .mobile-top button{width:48px;height:48px;padding:12px!important;border-radius:50%!important}.mobile-top svg{display:block;width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .mobile-left{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:max(14px,env(safe-area-inset-left))}
    #mob-wheel{pointer-events:auto;touch-action:none;position:relative;width:clamp(146px,35vh,186px);height:clamp(146px,35vh,186px);border-radius:50%;background:none;border:0}
    #mob-wheel img{width:100%;height:100%;display:block;pointer-events:none;object-fit:contain;transition:transform .12s ease-out;filter:drop-shadow(0 3px 3px #0009)}#mob-wheel:active img{transition:none}
    .mobile-right{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));right:max(14px,env(safe-area-inset-right));display:flex;flex-direction:column;align-items:flex-end;gap:8px}
    .mobile-shifts,.mobile-pedals{display:flex;gap:8px;align-items:flex-end}.mobile-shifts #mob-up,.mobile-shifts #mob-down{align-self:flex-end;height:48px;width:44px}
    #mobile-controls .mobile-pedals button{position:relative;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;width:88px;height:132px;min-height:132px;background:none;border:0;padding:0;gap:4px}
    .mobile-pedals img{pointer-events:none;object-fit:contain;max-width:84px;height:104px;filter:drop-shadow(0 3px 2px #000a);transition:transform .1s ease-out}
    .mobile-pedals span{pointer-events:none;font-size:12px;padding:3px 7px;border-radius:5px;background:#0c1015d9;white-space:nowrap}
    .mobile-pedals button.pressed img{transform:translateY(5px) scale(.95)}.mobile-pedals button.pressed span{background:#855b16;color:#fff}
    #mobile-controls #mob-hand{display:flex;position:relative;flex-direction:column;align-items:center;justify-content:flex-end;width:116px;height:90px;background:none;border:0;padding:0;gap:2px}
    #mob-hand img{pointer-events:none;object-fit:contain;width:112px;height:64px;transform-origin:18% 80%;filter:drop-shadow(0 3px 2px #0009);transition:transform .12s ease-out}
    #mob-hand span{pointer-events:none;font-size:11px;padding:3px 6px;background:#0c1015d9;border-radius:5px}
    #mob-hand.pressed img{transform:rotate(-24deg) translateY(-4px)}#mob-hand.pressed span{background:#855b16}
    .mobile #gol-controls,.mobile #music-bar,.mobile #mobile-mini,.mobile #clock,.mobile #ht{display:none!important}
    .mobile #hg{right:calc(50% - 95px);bottom:12px;max-width:190px;height:auto!important;width:190px!important;pointer-events:none}.mobile #hs{top:64px}
    @media(max-height:420px){.mobile #hg{width:150px!important;right:calc(50% - 75px)}}
    @media(orientation:portrait){.mobile-settings{grid-template-columns:1fr}.mobile-light-grid{grid-template-columns:1fr 1fr}.mobile #ui .setup-grid,.mobile #ui .environment{grid-template-columns:1fr}.mobile #hg{bottom:190px}}
    @media(prefers-reduced-motion:reduce){#mob-wheel img,.mobile-pedals img,#mob-hand img{transition:none}}
  `
};
