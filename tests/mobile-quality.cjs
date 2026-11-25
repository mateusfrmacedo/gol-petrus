// Regressões: níveis de nitidez distintos, inicialização completa dos reflexos e fila limitada da GPU.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('source/js/03_mobile_quality.js', 'utf8');
function profile(quality, mobile = true, query = '') {
  const ctx = vm.createContext({ MOBILE_PROFILE: mobile, MOBILE_QUALITY: quality, Q: new URLSearchParams(query), localStorage: { getItem: () => null }, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) });
  vm.runInContext(source + ';globalThis.profile=MOBILE_RENDER;', ctx); return ctx.profile;
}
const eco = profile('economico'), medium = profile('equilibrado'), high = profile('alto'), desktop = profile('alto', false);
assert.deepEqual(Array.from(eco.resolution(915, 412, 2.625)), [960, 432]);
assert.deepEqual(Array.from(medium.resolution(915, 412, 2.625)), [1280, 576]);
assert.deepEqual(Array.from(high.resolution(915, 412, 2.625)), [1600, 720]);
assert.deepEqual(Array.from(high.resolution(720, 360, 1)), [720, 360], 'Não amplia além dos pixels físicos.');
assert.deepEqual(Array.from(high.resolution(1000, 500, .5)), [500, 250]);
assert.deepEqual(Array.from(desktop.resolution(915, 412, 2.625)), [1830, 824]);
assert(!eco.motionBlur && !high.screenReflections); assert(desktop.motionBlur && desktop.screenReflections);
assert.equal(eco.cadence(13), 29.5); assert.equal(eco.cadence(8), 14.6);
assert.equal(profile('alto', true, 'hz=30').cadence(1), 29.5);
assert.equal(profile('alto', true, 'hz=60').cadence(100), 14.6);
for (const p of [eco, medium, high]) {
  const startup = new Set(), moving = new Set(); let updates = 0;
  for (let frame = 0; frame < 3; frame++) for (let k = 0; k < p.cubeCount(frame, false); k++) startup.add(p.cubeFace(frame, false) + k);
  for (let frame = 0; frame < 6 * p.cubeEvery; frame++) if (p.cubeCount(frame, true)) { moving.add(p.cubeFace(frame, true)); updates++; }
  assert.equal(startup.size, 6, 'Luz ambiente precisa das seis faces antes de dirigir.');
  assert.equal(moving.size, 6); assert.equal(updates, 6);
}
(async () => {
  const completions = [], device = { queue: { onSubmittedWorkDone: () => new Promise((resolve, reject) => completions.push({ resolve, reject })) } };
  eco.submitted(device); eco.submitted(device); assert(!eco.hasSlot());
  completions[0].resolve(); await Promise.resolve(); assert(eco.hasSlot());
  eco.submitted(device); assert(!eco.hasSlot()); completions[1].reject(new Error('GPU indisponível')); await Promise.resolve(); assert(eco.hasSlot());
  completions[2].resolve(); await Promise.resolve(); assert.equal(eco.inFlight, 0);
  desktop.submitted(device); assert.equal(desktop.inFlight, 0);
  console.log('PASS: resolução física, três qualidades, fila de dois quadros, recuperação, 30/60 FPS e reflexos completos.');
})().catch(e => { console.error(e); process.exitCode = 1; });
