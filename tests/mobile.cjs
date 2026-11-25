// Regressões dos comandos móveis: multitoque, cancelamento, sensor, pausa e prioridade do controle.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
let now = 100;
const buttons = new Map();
function element(id) {
  if (!buttons.has(id)) buttons.set(id, { value: '25', attrs: {}, setAttribute(k,v) {this.attrs[k]=v}, events: {}, classList: { add() {}, remove() {} }, setPointerCapture() {}, addEventListener(name, fn) { this.events[name] = fn; } });
  return buttons.get(id);
}
const ctx = vm.createContext({ console, performance: { now: () => now }, document: { getElementById: element }, clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  UI: { st: 1, padN: 0 }, ST: { INICIO: 0, JOGO: 1, PAUSA: 2 }, VIN: new Float64Array(3), K_W: 1, K_S: 2, K_A: 4, K_D: 8, K_SPACE: 16, K_PAD: 256, K_PADS: 512,
  Q: new URLSearchParams(), matchMedia: () => ({ matches: false }) });
vm.runInContext(fs.readFileSync('source/js/59_mobile.js', 'utf8') + ';globalThis.mobile = MOBILE;', ctx);
const m = ctx.mobile; m.on = true;
m.hold('gas', 1); m.hold('brake', 2);
const press = (id, pointerId) => element(id).events.pointerdown({ pointerId, preventDefault() {} });
press('gas', 1); press('brake', 2); m.steer = .7;
assert.equal(m.merge(0), 1 | 2 | 256 | 512); assert.deepEqual(Array.from(ctx.VIN), [1, 1, .7]);
element('brake').events.pointercancel({ pointerId: 2 }); m.merge(0); assert.deepEqual(Array.from(ctx.VIN), [1, 0, .7]);
element('gas').events.lostpointercapture({ pointerId: 1 }); m.merge(0); assert.equal(ctx.VIN[0], 0);
ctx.UI.padN = 1; ctx.VIN.set([.3, .2, -.4]); assert.equal(m.merge(256 | 512), 256 | 512); assert.deepEqual(Array.from(ctx.VIN), [.3, .2, -.4]);
ctx.UI.padN = 0; m.mode = 'inclinacao'; m.sensor(5); assert.equal(m.neutral, 5);
for (let i = 0; i < 25; i++) m.sensor(30);
m.merge(0); assert(ctx.VIN[2] > .8); m.calibrate(); m.merge(0); assert.equal(ctx.VIN[2], 0);
now += 2000; m.merge(0); assert.equal(ctx.VIN[2], 0, 'Sensor antigo não vira o carro.');
m.sensor(NaN); assert(Number.isFinite(m.tilt));
press('gas', 3); m.reset(); assert.equal(m.keys, 0); assert.equal(m.pointers.size, 0);
ctx.UI.st = 2; assert.equal(m.merge(0), 0);
assert.equal(m.menuAvailable(), true); ctx.UI.st=1; assert.equal(m.menuAvailable(), false);
ctx.VEHICLES={current:'gol'}; ctx.SND={ctx:null,run:false,mute:false};
vm.runInContext(fs.readFileSync('source/js/43_accessories.js','utf8')+';globalThis.controls=GOL_CONTROLS;',ctx);
ctx.UI.st=2; assert.equal(ctx.controls.available(),true); ctx.controls.toggleHigh(); assert(ctx.controls.lights&&ctx.controls.high);
ctx.controls.toggleLights(); assert(!ctx.controls.lights&&!ctx.controls.high);m.reset();
console.log('PASS: multitoque, cancelamento, perda de captura, prioridade do controle, calibração, sensor antigo e pausa.');
