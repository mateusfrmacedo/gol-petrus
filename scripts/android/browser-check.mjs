// Revisão funcional real com CDP: Chrome em execução com --remote-debugging-port=9333.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const synthetic = process.argv.includes('--synthetic');
const out = new URL('../../.tools/android-review/', import.meta.url); fs.mkdirSync(out, { recursive: true });
const pages = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const page = pages.find(p => p.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let next = 0; const pending = new Map(), errors = [];
ws.addEventListener('message', event => {
  const m = JSON.parse(event.data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
  else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const screenshot = async name => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(new URL(name + '.png', out), Buffer.from(s.data, 'base64')); };
try {
  await send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {});
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  const { windowId } = await send('Browser.getWindowForTarget');
  await send('Browser.setWindowBounds', { windowId, bounds: { width: 1200, height: 800, windowState: 'normal' } });
  await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 360, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'landscapePrimary', angle: 90 } });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('gta-na-direcao','volante'); } catch (_) {} window.GtaAndroid = { unavailable: reason => { window.__nativeError = reason; } };" });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/?ui=1&cap=1&mobile=1&hz=60&mapa=' + (process.argv.find(v => ['nova-alianca', 'circuito'].includes(v)) || 'nova-alianca') });
  for (let i = 0; i < 180; i++) {
    const state = await evaluate('window.__cap ? {ready:__cap.ready(),error:__cap.error()} : {}');
    if (state.error) throw Error(state.error);
    if (state.ready) break;
    if (i === 179) throw Error('Inicialização excedeu 180 segundos.');
    await new Promise(r => setTimeout(r, 1000));
  }
  await screenshot('menu');
  console.log('Jogo pronto:', await evaluate('({res:[__cap.G.W,__cap.G.H],mapa:__cap.CITY.on ? "Nova Aliança" : "circuito"})'));
  await evaluate("document.getElementById('b0').click(); new Promise(r=>setTimeout(r,500))");
  await screenshot('inicio-direcao');
  const box = id => evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}})()`);
  const gas = await box('mob-gas'), wheel = await box('mob-wheel');
  assert(gas.width >= 44 && gas.height >= 44);
  if (synthetic) await evaluate(`(()=>{
    // Alternativa explícita para ambientes em que o CDP não emite nenhum toque, inclusive em HTML vazio.
    const active=new Map(), captures=new Map();
    Element.prototype.setPointerCapture=function(id){captures.set(id,this)};
    Element.prototype.hasPointerCapture=function(id){return captures.get(id)===this};
    Element.prototype.releasePointerCapture=function(id){captures.delete(id)};
    window.__testTouch=(type,points)=>{
      const ids=new Set(points.map(p=>p.id));
      for(const p of points){
        let target=captures.get(p.id)||active.get(p.id);
        const fresh=!active.has(p.id); if(!target)target=document.elementFromPoint(p.x,p.y);
        if(type==='touchStart'&&!fresh)continue;
        active.set(p.id,target);
        target.dispatchEvent(new PointerEvent(fresh?'pointerdown':'pointermove',{bubbles:true,cancelable:true,pointerId:p.id,pointerType:'touch',button:0,buttons:1,clientX:p.x,clientY:p.y}));
      }
      for(const [id,target] of active)if(type==='touchCancel'||!ids.has(id)){
        (captures.get(id)||target).dispatchEvent(new PointerEvent(type==='touchCancel'?'pointercancel':'pointerup',{bubbles:true,pointerId:id,pointerType:'touch',button:0,buttons:0}));active.delete(id);captures.delete(id);
      }
    };
  })()`.replace(/^\+/gm,''));
  const touch = async (type, points) => {
    if(synthetic) return evaluate('window.__testTouch('+JSON.stringify(type)+','+JSON.stringify(points)+')');
    await send('Input.dispatchTouchEvent', { type, touchPoints: points.map(p => ({ ...p, radiusX: 3, radiusY: 3, force: 1 })) });
    await new Promise(r=>setTimeout(r,100));
  };
  await touch('touchStart', [{ id: 1, x: gas.x, y: gas.y }]);
  await evaluate('__cap.frames(90)');
  const accelerating = await evaluate('__cap.state()'); assert(accelerating.speed > 1, 'O pedal precisa mover o carro.');
  await touch('touchStart', [{ id: 1, x: gas.x, y: gas.y }, { id: 2, x: wheel.x, y: wheel.y - 45 }]);
  await touch('touchMove', [{ id: 1, x: gas.x, y: gas.y }, { id: 2, x: wheel.x + 45, y: wheel.y }]);
  await evaluate('__cap.frames(20)');
  const turning = await evaluate('__cap.state()'); assert(turning.steer > 0.02, 'Volante e acelerador precisam funcionar juntos.');
  assert.equal(await evaluate("getComputedStyle(document.getElementById('hg')).display"), 'none');
  assert.equal(await evaluate("document.querySelectorAll('.mobile-pedals span,#mob-hand span').length"), 0);
  assert.equal(await evaluate("document.getElementById('mob-speed').textContent"), String(await evaluate('Math.round(__cap.GS.speed*3.6)')));
  assert.equal(await evaluate("document.getElementById('mob-gear').textContent"), (await evaluate('__cap.VEH.gear')) + 'ª');
  await screenshot('dirigindo');
  const hand = await box('mob-hand');
  await touch('touchStart', [{id:1,x:gas.x,y:gas.y},{id:2,x:wheel.x+45,y:wheel.y},{id:3,x:hand.x,y:hand.y}]);
  await evaluate('__cap.frames(2)');
  assert((await evaluate('__cap.state().keys')) & 16, 'A alavanca aciona o freio de mão.');
  await screenshot('freio-de-mao-puxado');
  await touch('touchCancel', []); await evaluate('__cap.frames(30)');
  await evaluate('__cap.VEH.gear=0; __cap.frames(1)');
  assert.equal(await evaluate("document.getElementById('mob-gear').textContent"), 'R');
  await evaluate('__cap.VEH.gear=1; __cap.frames(1)');
  const stoppedInput = await evaluate('__cap.state()'); assert.equal(stoppedInput.thr, 0, 'Cancelar toque solta o acelerador.');
  await evaluate("document.getElementById('mob-pause').click()"); assert.equal(await evaluate('__cap.ui().estado'), 'PAUSA');
  assert.equal(await evaluate("getComputedStyle(document.getElementById('gol-controls')).display"), 'none');
  assert.equal(await evaluate("getComputedStyle(document.getElementById('music-bar')).display"), 'none');
  await evaluate("document.getElementById('mob-high').click()");
  assert.equal(await evaluate("document.getElementById('mob-low').checked"), true, 'O farol alto também liga o baixo pelo menu.');
  await evaluate("document.getElementById('mob-low').click()");
  assert.equal(await evaluate("document.getElementById('mob-high').checked"), false);
  await screenshot('menu-luzes');
  await evaluate("document.getElementById('mob-mode').value='inclinacao';document.getElementById('mob-mode').dispatchEvent(new Event('change'));window.dispatchEvent(new CustomEvent('gta-na-tilt',{detail:0}));document.getElementById('b0').click();for(let i=0;i<20;i++)window.dispatchEvent(new CustomEvent('gta-na-tilt',{detail:-25}));__cap.frames(30)");
  assert((await evaluate('__cap.state()')).steer < -0.02, 'Inclinação precisa virar o volante.');
  await evaluate("window.dispatchEvent(new Event('gta-na-background'))"); assert.equal(await evaluate('__cap.ui().estado'), 'PAUSA');
  await screenshot('configuracao');
  fs.writeFileSync(new URL('relatorio.json', out), JSON.stringify({ entrada: synthetic ? 'PointerEvents sintéticos no DOM real' : 'CDP multitoque', accelerating, turning, stoppedInput, errors }, null, 2));
  assert.equal(await evaluate('__cap.error()'), null, 'A GPU não deve produzir erros.');
  assert.equal(errors.length, 0, 'Erros de execução: ' + JSON.stringify(errors));
  console.log(synthetic ? 'Entrada: PointerEvents sintéticos; teste físico no telefone pendente.' : 'Entrada: CDP multitoque.');
  console.log('PASS: inicialização WebGPU, toque simultâneo, direção analógica, cancelamento, inclinação e pausa.');
} finally { await send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {}); ws.close(); }
