const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync('source/js/'+n,'utf8');
const c=vm.createContext({Blob,Response,DecompressionStream,atob,console,assert});
vm.runInContext('const BUILD=[];'+['00_math.js','02_mesh.js','30_car_a0_data.js','30_car_a_gol.js','30_car_c1_roof.js'].map(read).join('\n')+`
globalThis.check=async()=>{
 await golDecode();
 const groups={front:[],mirror:[],rear:[]};
 for(const item of GOL_META.turnSignalParts){
  const p=GOL.parts[item.index];assert.equal(p.mat,30);assert.equal(p.pa,item.side<0?0:1);
  assert(p.nI>0);assert(p.pos.every(Number.isFinite));
  let minZ=Infinity,maxZ=-Infinity;
  for(let k=0;k<p.pos.length;k+=3){minZ=Math.min(minZ,p.pos[k+2]);maxZ=Math.max(maxZ,p.pos[k+2]);}
  assert(item.side<0?maxZ<-.4:minZ>.4,'canal da seta deve coincidir com o lado físico: '+item.name);
  const key=item.name.startsWith('Seta · farol')?'front':item.name.startsWith('Seta · retrovisor')?'mirror':'rear';groups[key].push(item);
 }
 assert.equal(groups.front.length,2);assert.equal(groups.mirror.length,2);assert.equal(groups.rear.length,18);
 for(const group of Object.values(groups)){assert.equal(group.filter(p=>p.side<0).length,group.length/2);}
 const d=new MeshBuilder();carBuildSunroof(new MeshBuilder(),new MeshBuilder(),d);
 for(let i=0;i<d.nv;i++)assert(d.f32[i*9+1]<GOL_META.sunroof.hingeY-.015,'defletor recolhido abaixo da chapa');
 return Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]));
};`,c);
c.check().then(groups=>console.log('PASS: setas dedicadas e lados corretos, ré independente e defletor recolhido.',groups)).catch(e=>{console.error(e);process.exitCode=1});
const shader=fs.readFileSync('source/wgsl/mat_car.wgsl','utf8');
const reverse=shader.split('case 23u:')[1].split('case 22u:')[0];assert(!reverse.includes('blink'),'ré branca não pode virar seta');
