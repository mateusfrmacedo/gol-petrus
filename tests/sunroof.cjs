const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync('source/js/'+n,'utf8');
const c=vm.createContext({Blob,Response,DecompressionStream,atob,console,assert});
vm.runInContext('const BUILD=[];'+['00_math.js','02_mesh.js','30_car_a0_data.js','30_car_a_gol.js','30_car_c1_roof.js'].map(read).join('\n')+`
const VEHICLES={current:'gol'};SUNROOF.ui=()=>{};
globalThis.check=async()=>{
 await golDecode();
 const a=new MeshBuilder(),ag=new MeshBuilder(),b=new MeshBuilder(),bg=new MeshBuilder(),r=new MeshBuilder(),rg=new MeshBuilder(),d=new MeshBuilder();
 carBuildBody(a,ag);carBuildBody(b,bg,null,true);carBuildSunroof(r,rg,d);
 assert(r.ni>0&&rg.ni>0);assert.equal(a.ni-b.ni,r.ni);assert.equal(ag.ni-bg.ni,rg.ni);
 assert.equal(GOL.parts.filter(golRoofPart).length,2,'only glass and its movable frame are separated');
 for(const m of [r,rg,d])for(let i=0;i<m.nv;i++)for(let k=0;k<3;k++)assert(Number.isFinite(m.f32[i*9+k]));
 const m=m4();SUNROOF.matrix(m);assert(Array.from(m).every((v,i)=>Math.abs(v-m4ident(m4())[i])<1e-7));
 SUNROOF.toggle();for(let i=0;i<3;i++)SUNROOF.advance(.1);assert(SUNROOF.value>0&&SUNROOF.value<.2);
 SUNROOF.matrix(m);assert(Math.abs(m[12])<1e-6&&m[13]>0,'lift before sliding');
 for(let i=0;i<100;i++)SUNROOF.advance(.016);assert.equal(SUNROOF.value,1);SUNROOF.matrix(m);
 assert(m[12]<-.4&&m[13]>0);assert(Math.abs(m[0]*m[0]+m[1]*m[1]-1)<1e-6,'rigid transform');
 SUNROOF.toggle();SUNROOF.advance(.1);const partial=SUNROOF.value;SUNROOF.toggle();SUNROOF.advance(.05);assert(SUNROOF.value>partial,'reverse while moving');
 VEHICLES.current='civic';const before=SUNROOF.value,target=SUNROOF.target;SUNROOF.toggle();SUNROOF.advance(.1);assert.equal(SUNROOF.target,target);assert.equal(SUNROOF.value,before);
 VEHICLES.current='gol';SUNROOF.target=0;for(let i=0;i<200;i++)SUNROOF.advance(.016);assert.equal(SUNROOF.value,0);SUNROOF.matrix(m);assert(Array.from(m).every((v,i)=>Math.abs(v-m4ident(m4())[i])<1e-7));
 assert(GOL_META.frontDetailsBaked);assert(GOL_META.frontDetailParts.length>=12);
 for(const index of GOL_META.frontDetailParts){const p=GOL.parts[index];assert(p.nI>0);for(let i=0;i<p.pos.length;i+=3){const x=p.pos[i],y=p.pos[i+1],z=p.pos[i+2];assert(Number.isFinite(x+y+z)&&x>1.5&&x<2.1);assert(y>.18&&y<.54&&Math.abs(z)<.85);}}
 assert.equal(GOL_META.frontBumperRevision,3);
 for(let k=1;k<=3;k++)assert(GOL_META.frontDetailNames.includes('Frente · lâmina central horizontal '+k));
 for(const side of [-1,1])for(const name of ['divisória branca inclinada','cavidade lateral preta','neblina · lente curva'])assert(GOL_META.frontDetailNames.includes('Frente · '+name+' '+side));
 for(const index of GOL_META.fixedRoofPartIndices)assert(!golRoofPart(GOL.parts[index]),'fixed roof seal must stay on the body');

};`,c);
c.check().then(()=>console.log('PASS: isolated roof meshes, lift/slide/close, reversal, rigid transforms, Civic isolation and fitted fog-light details.')).catch(e=>{console.error(e);process.exitCode=1});
