const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(script);
// Use the real drivetrain and tire physics on a flat test surface, without rendering.
const source = script.slice(script.indexOf('const PHYS_DT'), script.indexOf('// colisão com as barreiras laterais:'));
const context = vm.createContext({ assert, console });
vm.runInContext(`const PI=Math.PI, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const GS={replayOn:false,ai:false}; const TRK={L:1000};
const ZONE={ASPHALT:0,KERB:1,GRASS:2,GRAVEL:3,ROUGH:4,PIT:5};
${source}
vehicleGround=()=>{}; function vehicleCollide(){}
function setup(gear=1, speed=0) { VEH.manual=true; GS.replayOn=false; GS.ai=false; VEH.gear=gear; VEH.shiftTime=0; VEH.vx=speed; VEH.vy=VEH.r=0; VEH.omega.fill(speed/VP.R); }
setup(); assert.equal(vehicleShift(1),true); assert.equal(VEH.gear,2);
assert.equal(vehicleShift(1),false); // one shift per clutch interval
for(let i=0;i<23;i++) vehicleStep(0);
assert.equal(vehicleShift(-1),true); assert.equal(VEH.gear,1);
setup(1); assert.equal(vehicleShift(-1),false);
setup(5); assert.equal(vehicleShift(1),false);
setup(3,40); assert.equal(vehicleShift(-1),false); assert.equal(VEH.gear,3);
setup(3,15); assert.equal(vehicleShift(-1),true);
setup(1,14); vehicleStep(K_W); assert.equal(VEH.gear,1); // manual holds at limiter
setup(1,14); VEH.manual=false; vehicleStep(K_W); assert.equal(VEH.gear,2);
setup(1,14); GS.replayOn=true; vehicleStep(K_W); assert.equal(VEH.gear,2); assert.equal(vehicleShift(1),false);
setup(1,14); GS.ai=true; vehicleStep(K_W); assert.equal(VEH.gear,2);
setup(); vehicleStep(K_S); assert.equal(VEH.gear,0); assert.equal(vehicleShift(1),false);
VEH.vx=0; vehicleStep(K_W); assert.equal(VEH.gear,1);
setup(2,10); vehicleShift(1); vehicleStep(K_W); assert(VEH.shiftTime>0); assert(Number.isFinite(VEH.rpm));
console.log('PASS: JavaScript syntax; manual shifts, cooldown, gear limits, over-rev protection, limiter, automatic, replay, AI, reverse.');`, context);
