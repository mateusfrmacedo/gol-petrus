const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync('source/js/'+n,'utf8');const c=vm.createContext({assert,console});
vm.runInContext(`const GOL_META={bodyDrop:.02};${read('00_math.js')}${read('02_mesh.js')}${read('30_car_a_gol.js').match(/const CM = .*;/)[0]}${read('30_car_c_parts.js')}
const CAR={_t:m4(),_t2:m4(),steerMat:m4()},mb=new MeshBuilder();carBuildSteer(mb);
for(const name of ['volante.comandos.esquerdos','volante.comandos.direitos']){
 const section=mb.sections.find(p=>p.name===name),ids=new Set(Array.from(mb.idx.slice(section.start,section.end)));
 let joinsRim=false,reachesHub=false,hasBack=false;
 for(const id of ids){const a=id*9,x=mb.f32[a],y=mb.f32[a+1],z=mb.f32[a+2];assert(Number.isFinite(x+y+z));
  // Solid cross-section of the side of the rim: centre radius 461.5 px, section radius 38.5 px.
  const radial=Math.hypot(y,z),r=461.5/1024*.372,thickness=38.5/1024*.372;
  if((x+.003)**2+(radial-r)**2<thickness**2)joinsRim=true;
  if(radial<.09)reachesHub=true;if(x>.02)hasBack=true;
 }
 assert(joinsRim,name+' must physically intersect the rim');assert(reachesHub,name+' must reach the centre');assert(hasBack,name+' must have a closed back');
}
`,c);console.log('PASS: both lateral spokes overlap the rim in 3D, reach the hub and have thickness/back faces.');
