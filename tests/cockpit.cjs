const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const game = fs.readFileSync(path.join(__dirname, '../source/js/45_game.js'), 'utf8');
const start = game.indexOf('function gameCamera()');
const end = game.indexOf('\nBUILD.push', start);
const context = vm.createContext({assert});
vm.runInContext(`
const GS={cam:1, yaw:0, keys:0, cx:0, cy:0, cz:0, body:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])};
const VEH={gRoll:0,roll:0}; const RT=[0,1/60]; const CAMQ=new Float64Array(8);
const GOL_META={bodyDrop:.02}; const K_V=128;
const R={casc:{focusOn:false,focus:new Float64Array(3)}};
function setCameraQ(){}
${game.slice(start,end)}
gameCamera();
assert(Math.abs(CAMQ[0]+.22)<1e-10); // behind steering wheel, not on the hood
assert(Math.abs(CAMQ[1]-1.16)<1e-10);
assert(Math.abs(CAMQ[2]+.36)<1e-10); // driver's seat, left side
assert(CAMQ[3]>CAMQ[0]); assert(CAMQ[4]<CAMQ[1]);
assert(CAMQ[6]>1 && CAMQ[6]<1.3);
// Turn and translate the car: the eyes and sightline must follow its local frame.
GS.body.set([0,0,1,0,0,1,0,0,-1,0,0,0,10,2,20,1]);
gameCamera();
assert(Math.abs(CAMQ[0]-10.36)<1e-10);
assert(Math.abs(CAMQ[1]-3.16)<1e-10);
assert(Math.abs(CAMQ[2]-19.78)<1e-10);
assert(Math.abs(CAMQ[3]-10.36)<1e-10); assert(CAMQ[5]>CAMQ[2]);
GS.keys=K_V; gameCamera(); assert(CAMQ.every(Number.isFinite)); assert(CAMQ[5]<CAMQ[2]);
`,context);
console.log('PASS: cockpit position, driver side, field of view, body transform and rear view.');
const panel = fs.readFileSync(path.join(__dirname, '../source/js/51_painel.js'), 'utf8');
const gaugeStart = panel.indexOf('function hudGaugeVisibility()');
const gaugeEnd = panel.indexOf('\nfunction hudShow(', gaugeStart);
vm.runInContext(`const HUD={vis:true,cg:{style:{display:'block'}}};
${panel.slice(gaugeStart,gaugeEnd)}
GS.freeCam=false; GS.cam=1; hudGaugeVisibility(); assert.equal(HUD.cg.style.display,'none');
GS.cam=0; hudGaugeVisibility(); assert.equal(HUD.cg.style.display,'block');
GS.cam=2; hudGaugeVisibility(); assert.equal(HUD.cg.style.display,'block');
HUD.vis=false; hudGaugeVisibility(); assert.equal(HUD.cg.style.display,'none');
HUD.vis=true; GS.cam=1; GS.freeCam=true; hudGaugeVisibility(); assert.equal(HUD.cg.style.display,'block');
`,context);
console.log('PASS: large gauges hidden in cockpit and restored in external cameras; HUD off stays off.');
