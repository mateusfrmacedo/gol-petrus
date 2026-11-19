const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({assert});
vm.runInContext(`
const handlers=new Map(),captures=new Set(),canvas={style:{},addEventListener(n,fn){handlers.set(n,fn)},setPointerCapture(n){captures.add(n)},hasPointerCapture:n=>captures.has(n),releasePointerCapture:n=>captures.delete(n)};
const document={getElementById:id=>id==='c'?canvas:null},addEventListener=()=>{},innerHeight=800;
const VEHICLES={current:'gol'},GAME={ui:true},ST={JOGO:1,PAUSA:2},UI={st:1};
const GS={cam:0,freeCam:false,chaseYaw:0,yaw:0,cx:10,cy:1,cz:20,speed:0,keys:0};
const K_V=128;const hfAt=()=>1;
${fs.readFileSync('source/js/44_orbit_camera.js','utf8')}
CAM_ORBIT.init();
const e={button:0,pointerType:'mouse',pointerId:4,clientX:100,clientY:100,preventDefault(){this.prevented=true}};
handlers.get('pointerdown')(e);assert(CAM_ORBIT.active&&CAM_ORBIT.dragging&&captures.has(4)&&e.prevented);
const q=new Float64Array(8);CAM_ORBIT.pose(q);assert(q[0]<GS.cx&&Math.abs(q[2]-GS.cz)<1e-6);
handlers.get('pointermove')({...e,clientX:100+Math.PI/.006/2,clientY:140});CAM_ORBIT.pose(q);assert(Math.abs(q[0]-GS.cx)<1e-6&&q[2]>GS.cz,'quarter turn views the side');
const distance=Math.hypot(q[0]-q[3],q[1]-q[4],q[2]-q[5]);assert(Math.abs(distance-CAM_ORBIT.distance)<1e-6);
handlers.get('pointerup')(e);assert(!CAM_ORBIT.dragging&&!captures.size);
for(let i=0;i<30;i++)CAM_ORBIT.zoom(-2000);assert.equal(CAM_ORBIT.distance,3);for(let i=0;i<30;i++)CAM_ORBIT.zoom(2000);assert.equal(CAM_ORBIT.distance,11);
CAM_ORBIT.move(1e6,1e6);assert.equal(CAM_ORBIT.pitch,1.35);CAM_ORBIT.move(-1e6,-1e6);assert.equal(CAM_ORBIT.pitch,.06);CAM_ORBIT.pose(q);assert(q.every(Number.isFinite)&&q[1]>=1.55);
handlers.get('dblclick')({preventDefault(){}});assert(!CAM_ORBIT.active);
GS.cam=1;assert(!CAM_ORBIT.activate());GS.cam=0;UI.st=ST.PAUSA;assert(!CAM_ORBIT.activate());UI.st=ST.JOGO;VEHICLES.current='civic';assert(!CAM_ORBIT.activate());VEHICLES.current='gol';assert(CAM_ORBIT.activate());
handlers.get('pointerdown')(e);handlers.get('pointercancel')(e);assert(!CAM_ORBIT.dragging&&!captures.size);
`,c);
console.log('PASS: mouse drag/capture/cancel, orbit position, terrain clearance, zoom/elevation limits, reset and Gol-only external camera.');
