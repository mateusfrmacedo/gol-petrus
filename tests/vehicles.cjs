const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const data = fs.readFileSync(path.join(root, 'source/js/30_car_e0_civic_data.js'), 'utf8');
const ctx = vm.createContext({ assert, console, Buffer, zlib });
vm.runInContext(data + `
const raw=zlib.inflateSync(Buffer.from(CIVIC_B64,'base64'));
let triangles=0, vertices=0; const destinations=new Set();
for(const p of CIVIC_META.parts){
  destinations.add(p.dest); triangles+=p.ni/3; vertices+=p.nv;
  assert(p.offset+p.nv*32+p.ni*4<=raw.length);
  for(let i=0;i<p.nv;i++){
    const o=p.offset+i*32;
    for(let k=0;k<8;k++)assert(Number.isFinite(raw.readFloatLE(o+k*4)));
    assert(Math.abs(Math.hypot(raw.readFloatLE(o+12),raw.readFloatLE(o+16),raw.readFloatLE(o+20))-1)<1e-5);
  }
  for(let i=0;i<p.ni;i++)assert(raw.readUInt32LE(p.offset+p.nv*32+i*4)<p.nv);
}
assert.equal(CIVIC_META.originalSourceTriangles,1157481); assert.equal(triangles,CIVIC_META.triangles);
assert.equal(vertices,CIVIC_META.vertices); assert.equal(destinations.size,9);
assert.equal(CIVIC_META.originalSourceMeshes,237); assert.equal(CIVIC_IMAGES.length,7);
assert.equal(CIVIC_META.wheelStyle.spokePairs,5);assert.equal(CIVIC_META.wheelStyle.openings,10);
assert.equal(CIVIC_META.wheelStyle.lugHoles,5);
assert(Math.abs(CIVIC_META.wheelStyle.nominalDiameter-19*.0254)<1e-8);
assert(Math.abs(CIVIC_META.wheelStyle.width-7*.0254)<1e-8);
assert(CIVIC_META.replacedRimMeshes.length>0);
assert(CIVIC_META.chromeGrilleMeshes.includes('black_m_06_black_m_0'));
assert(CIVIC_META.chromeGrilleMeshes.includes('gum_01_gum_0'));
assert(CIVIC_META.parts.some(p=>p.dest===0&&p.mat===23));
assert.equal(CIVIC_META.removedPlateMeshes.length,2);
assert(!CIVIC_META.parts.some(p=>p.mat===3));
for(let dest=1;dest<=4;dest++){
 assert(CIVIC_META.parts.some(p=>p.dest===dest&&p.mat===21));
 assert(CIVIC_META.parts.some(p=>p.dest===dest&&p.mat===22));
}
for(const p of CIVIC_META.parts.filter(p=>p.dest>=1&&p.dest<=4&&p.mat===5)){
 let min=Infinity,max=0;
 for(let i=0;i<p.nv;i++){const o=p.offset+i*32;const r=Math.hypot(raw.readFloatLE(o),raw.readFloatLE(o+4));min=Math.min(min,r);max=Math.max(max,r);}
 assert(Math.abs(min-CIVIC_META.wheelStyle.beadRadius)<1e-5);
 assert(max>CIVIC_META.wheelR-.001&&max<CIVIC_META.wheelR+.001);
 assert(max-min<.09); // lower sidewall requested with the larger rim
}
assert(CIVIC_META.wheelbase>2.69&&CIVIC_META.wheelbase<2.70);
for(const image of CIVIC_IMAGES){const b=Buffer.from(image.data,'base64');assert.equal(b.readUInt32BE(0),0x89504e47);}
const VP={L:2.362,a:.96,b:1.402,tw:1.33,R:.281,m:900,Izz:1250,halfW:.78,front:1.92,rear:1.72};
const baseline=JSON.stringify(VP), WLX=[],WLZ=[];
const CIVIC={wheelbase:CIVIC_META.wheelbase,wheelR:CIVIC_META.wheelR};
const document={getElementById:()=>null}; const localStorage={setItem(){}};
const GAME={ready:false,mode:'game',ui:false};const GS={};let restarts=0;
function gameRestart(){restarts++;}
${fs.readFileSync(path.join(root, 'source/js/39_vehicles.js'), 'utf8')}
assert.equal(vehicleChoice('civic',true),true);assert.equal(restarts,1);
assert.equal(VP.R,CIVIC_META.wheelR);assert.equal(WLX[0]-WLX[2],VP.L);assert.equal(WLZ[1]-WLZ[0],VP.tw);
assert.equal(vehicleChoice('gol',true),true);assert.equal(JSON.stringify(VP),baseline);
assert.equal(vehicleChoice('missing',true),false);assert.equal(VEHICLES.current,'gol');
`, ctx);
const glb = fs.readFileSync(path.join(root, 'assets/vehicles/civic/honda-civic-2019.glb'));
assert.equal(glb.readUInt32LE(0), 0x46546c67);
assert.equal(glb.readUInt32LE(8), glb.length);
const doc = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/vehicles/civic/manifest.json'),'utf8'));
assert.equal(doc.materials.length, 24); assert.equal(doc.images.length, 7);
assert(!doc.meshes.some(m=>m.primitives.some(p=>p.material===3)));
assert(!manifest.sourceMeshes.some(m=>m.material==='plate'));
assert.equal(doc.meshes.reduce((n, m) => n + doc.accessors[m.primitives[0].indices].count / 3, 0), manifest.triangles);
console.log('PASS: Civic geometry, 19×7 wheels, open spokes, low-profile tire fit, normals, seven textures, GLB and vehicle switching.');
