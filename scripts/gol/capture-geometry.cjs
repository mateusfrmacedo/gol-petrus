// Captura a geometria do Gol em seções, sem iniciar WebGPU nem carregar o Civic.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'modelo/gol-refinado');
const files=['00_math.js','02_mesh.js','30_car_a0_data.js','30_car_a_gol.js','30_car_b_cabin.js','30_car_c_parts.js','30_car_c1_roof.js'];
const ctx=vm.createContext({Blob,Response,DecompressionStream,atob,console});
vm.runInContext('const BUILD=[];\n'+files.map(n=>fs.readFileSync(path.join(root,'source/js',n),'utf8')).join('\n')+`
const CAR={_t:m4(),_t2:m4(),steerMat:m4()};
globalThis.capture=async()=>{
 await golDecode();
 const body=new MeshBuilder(1<<18),glass=new MeshBuilder(),driver=new MeshBuilder(),wheel=new MeshBuilder(1<<16),steer=new MeshBuilder();
 body.part('carroceria');glass.part('vidros');carBuildBody(body,glass,driver,true);body.part(null);glass.part(null);
 carBuildParts(body,glass);wheel.part('rodas.fonte');carBuildWheel(wheel);wheel.part(null);carBuildSteer(steer);
 const roof=new MeshBuilder(),rg=new MeshBuilder(),deflector=new MeshBuilder();roof.part('teto.vedacao-movel');rg.part('vidros.teto-solar');deflector.part('teto.defletor');carBuildSunroof(roof,rg,deflector);roof.part(null);rg.part(null);deflector.part(null);
 return {builders:[['body',body],['glass',glass],['wheel',wheel],['steer',steer],['roof',roof],['roof-glass',rg],['deflector',deflector]],matrix:Array.from(CAR.steerMat),meta:GOL_META,bodyAtlas:GOL_FOTO_WEBP};
};`,ctx);
function compact(builder,section){
 const remap=new Map(),v=[],indices=[]; const end=section.end??builder.ni;
 // Cada grupo de material/cor mantém as suas próprias coordenadas e normais.
 const groups=new Map();
 for(let i=section.start;i<end;i+=3){
  const first=builder.idx[i],b=first*36,key=Array.from(builder.u8.slice(b+28,b+36)).join(',');
  if(!groups.has(key))groups.set(key,{mat:builder.u8[b+28],pa:builder.u8[b+29],color:Array.from(builder.u8.slice(b+32,b+35),x=>x/255),vertices:[],indices:[],map:new Map()});
  const g=groups.get(key);
  for(let k=0;k<3;k++){
   const index=builder.idx[i+k];if(!g.map.has(index)){
    const f=index*9,n=index*18;g.map.set(index,g.vertices.length/8);
    g.vertices.push(builder.f32[f],builder.f32[f+1],builder.f32[f+2],builder.i16[n+6]/32767,builder.i16[n+7]/32767,builder.i16[n+8]/32767,builder.f32[f+5],builder.f32[f+6]);
   }g.indices.push(g.map.get(index));
  }
 }
 return Array.from(groups.values(),g=>{delete g.map;return g;});
}
(async()=>{
 const result=await ctx.capture(),meshes=[];
 for(const [target,builder]of result.builders)for(const s of builder.sections||[]){
  if((s.end??builder.ni)<=s.start)continue;
  meshes.push({name:s.name,target,groups:compact(builder,s)});
 }
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'geometry-source.json'),JSON.stringify({schema:1,units:'metres',axes:'X forward, Y up, Z right',steerMatrix:result.matrix,gol:result.meta,meshes}));
 fs.writeFileSync(path.join(out,'texturas/carroceria.webp'),Buffer.from(result.bodyAtlas,'base64'));
 console.log(JSON.stringify({meshes:meshes.length,triangles:meshes.reduce((n,m)=>n+m.groups.reduce((v,g)=>v+g.indices.length/3,0),0)}));
})().catch(e=>{console.error(e);process.exitCode=1});
