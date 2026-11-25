// Compara o custo real na GPU deste computador; não representa FPS de um telefone.
import fs from 'node:fs';
const desktop = process.argv.includes('--desktop'), live = process.argv.includes('--live');
const baseline = process.argv.includes('--baseline');
const quality = process.argv.find(v => ['economico', 'equilibrado', 'alto'].includes(v)) || 'economico';
const resolution = process.argv.find(v => /^\d+x\d+$/.test(v)) || '960x432';
const pages = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const directory = new URL('../../.tools/android-performance/', import.meta.url); fs.mkdirSync(directory, { recursive: true });
try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 915, height: 412, deviceScaleFactor: 2.5, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "window.GtaAndroid={unavailable:()=>{}};try{localStorage.setItem('gta-na-direcao','volante')}catch(_){}" });
  const prefix = baseline ? '.tools/mobile-baseline/' : '';
  await send('Page.navigate', { url: `http://127.0.0.1:8765/${prefix}?ui=1&${live ? 'hz=30' : 'cap=1'}&perf=1&mobile=${desktop ? 0 : 1}&mapa=nova-alianca&quality=${quality}&res=${resolution}` });
  for (let i = 0; i < 180; i++) {
    const state = await evaluate('window.__cap ? {ready:__cap.ready(),error:__cap.error()} : {}');
    if (state.error) throw Error(state.error);
    if (state.ready) break;
    if (i === 179) throw Error('Inicialização excedeu o prazo.');
    await new Promise(r => setTimeout(r, 1000));
  }
  await evaluate("document.getElementById('b0').click();__cap.hora(10);__cap.clima('limpo');__cap.GS.held=1;" + (live ? "__cap.G.dev.queue.onSubmittedWorkDone()" : "__cap.frames(24);__cap.G.dev.queue.onSubmittedWorkDone()"));
  if (live) await new Promise(r=>setTimeout(r,1000));
  await new Promise(r => setTimeout(r, 100));
  await evaluate('__cap.perfStart()');
  const start = performance.now();
  let pendingMax=0;
  if (live) for (let i=0;i<30;i++) { await new Promise(r=>setTimeout(r,100)); pendingMax=Math.max(pendingMax,(await evaluate('__cap.mobilePerformance()')).pendingFrames); }
  else for (let i = 0; i < 24; i++) await evaluate('(async()=>{__cap.frames(4);await __cap.G.dev.queue.onSubmittedWorkDone();await new Promise(r=>setTimeout(r,0))})()');
  const elapsed = performance.now() - start;
  await new Promise(r => setTimeout(r, 100));
  const report = await evaluate('__cap.perfReport()');
  const hardware = await evaluate('({gpu:__cap.G.dev.adapterInfo?.description || "não informado",resolution:[__cap.G.W,__cap.G.H],error:__cap.error(),x:__cap.VEH.x,z:__cap.VEH.z})');
  if (hardware.error) throw Error(hardware.error);
  const values = report.gpu.filter(v => v > 0).sort((a, b) => a - b);
  const intervals=report.raf.slice(5).filter(v=>v>0);
  const result = { baseline, desktop, live, quality, observedFps: live ? 1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length) : null, pendingMax: live ? pendingMax : null, ...hardware, samples: values.length, gpuMeanMs: values.reduce((a, b) => a + b, 0) / values.length, gpuP95Ms: values[Math.floor(values.length * .95)], wallMsPerFrame: elapsed / (live ? report.n : 96), perPassMs: report.per, note: 'GPU do computador; não mede FPS, temperatura ou consumo do Nothing Phone.' };
  if (!values.length) throw Error('A GPU não forneceu amostras de tempo.');
  const name = `${live ? 'ao-vivo' : desktop ? 'desktop' : baseline ? 'antes' : 'depois'}-${quality}-${resolution}`;
  fs.writeFileSync(new URL(name + '.json', directory), JSON.stringify(result, null, 2) + '\n');
  await evaluate('__cap.frames(1)');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(new URL(name + '.png', directory), Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify(result));
} finally { ws.close(); }
