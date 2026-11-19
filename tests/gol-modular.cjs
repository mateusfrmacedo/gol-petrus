const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,'source/js',n),'utf8');
const c=vm.createContext({Blob,Response,DecompressionStream,atob,console,assert});
const mat=read('30_car_a_gol.js').match(/const CM = .*;/)[0];
vm.runInContext('const BUILD=[];'+mat+'\n'+['00_math.js','02_mesh.js','30_car_a0_data.js','30_car_b1_refined_data.js','30_car_b2_refined.js','30_car_b_cabin.js','30_car_c_parts.js'].map(read).join('\n')+`
const CAR={_t:m4(),_t2:m4(),steerMat:m4()};
globalThis.verify=async()=>{
 await BUILD[0]();assert(GOL_REFINED.ready);const names=new Set(GOL_REFINED_META.parts.map(p=>p.name));
 for(const name of ['painel.casca','porta.motorista','porta.passageiro','volante.airbag','teto.quebra-sol.motorista'])assert(names.has(name),name);
 let end=0;
 for(const p of GOL_REFINED_META.parts){
  assert.equal(p.offset,end);const v=new Float32Array(GOL_REFINED.bytes,p.offset,p.nv*8),idx=new Uint32Array(GOL_REFINED.bytes,p.offset+p.nv*32,p.ni);
  assert(v.every(Number.isFinite));assert(idx.every(i=>i<p.nv));
  for(let i=0;i<v.length;i+=8)assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<.01);
  end=p.offset+p.nv*32+p.ni*4;
 }
 assert.equal(end,GOL_REFINED.bytes.byteLength);assert(GOL_REFINED_META.triangles<120000);
 const body=new MeshBuilder(),glass=new MeshBuilder(),steer=new MeshBuilder();carBuildParts(body,glass);carBuildSteer(steer);
 assert(body.ni>0&&steer.ni>0);assert.equal(body.ni+steer.ni,GOL_REFINED_META.triangles*3);
 assert(Math.abs(CAR.steerMat[13]-(.855-GOL_META.bodyDrop))<1e-6);
 // Conversão Blender -> jogo não pode aplicar o rebaixamento duas vezes.
 for(const name of ['painel.casca','volante.airbag']){
  const parts=GOL_REFINED_META.parts.filter(p=>p.name===name);assert(parts.every(p=>p.ni>0));
 }
 return {parts:names.size,triangles:GOL_REFINED_META.triangles};
};`,c);
(async()=>{
 console.log('Gol modular:',await c.verify());
 const snapshot=JSON.parse(fs.readFileSync(path.join(root,'modelo/gol-refinado/civic-preservado.json'),'utf8'));
 for(const [name,sha]of Object.entries(snapshot)){const current=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');assert.equal(current,sha,'Civic alterado: '+name);}
 const glb=JSON.parse(fs.readFileSync(path.join(root,'modelo/gol-refinado/validacao-glb.json'),'utf8'));assert(glb.animations>=1);assert(glb.bounds_error_mm<3);
 console.log('PASS: Blender roundtrip, buffers, normals, part budget, steering transform, GLB animation and unchanged Civic.');
})().catch(e=>{console.error(e);process.exitCode=1});
