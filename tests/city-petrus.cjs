// Integra os lotes manuais e confere que casas, colisões e novas malhas deixam a rua livre.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const base = fs.readFileSync(path.join(__dirname, 'city.cjs'), 'utf8');
const anchor = "${read('12_city5_borghi.js')}";
if (!base.includes(anchor)) throw Error('Atualizar carregador do teste do Petrus');
const extra = `
const P=MARCOS.petrus;
assert.equal(P.referencePads.length,4,'quatro áreas reservadas do entorno');
// SAT com a área inteira de cada casa, incluindo o recuo: nenhuma casa procedural em lote manual.
for(const pad of P.referencePads) {
 const [x,z]=P.at(pad.a,pad.b), A={x,z,ux:P.ux,uz:P.uz,hd:pad.d/2,hw:pad.w/2};
 for(const h of C.houses) {
  const e=h.wall ? h.set/2 : 0, B={x:h.x-h.nx*e,z:h.z-h.nz*e,ux:h.nx,uz:h.nz,hd:h.d/2+e,hw:h.w/2};
  const separate=[[A.ux,A.uz],[-A.uz,A.ux],[B.ux,B.uz],[-B.uz,B.ux]].some(([ax,az])=>{
   const ra=A.hd*Math.abs(A.ux*ax+A.uz*az)+A.hw*Math.abs(-A.uz*ax+A.ux*az);
   const rb=B.hd*Math.abs(B.ux*ax+B.uz*az)+B.hw*Math.abs(-B.uz*ax+B.ux*az);
   return Math.abs((A.x-B.x)*ax+(A.z-B.z)*az)>=ra+rb-0.15;
  });
  assert(separate,'casa genérica sobre '+pad.kind);
 }
}
const meshPetrus=new MeshBuilder(8192), oldBoxes=C.boxes.length, oldCircles=C.circles.length;
petrusNeighborhoodBuild(meshPetrus);
assert(meshPetrus.ni>3000 && meshPetrus.ni<45000,'orçamento de geometria do entorno');
assert.equal(meshPetrus.xfStack.length,0,'transformações restauradas');
for(let i=0;i<meshPetrus.nv;i++) {
 const x=meshPetrus.f32[i*9],y=meshPetrus.f32[i*9+1],z=meshPetrus.f32[i*9+2];
 assert(Number.isFinite(x+y+z),'geometria finita');
 const rq=new Float64Array(12);rq[0]=x;rq[1]=z;cityRasterQ(rq);
 assert(rq[9]>0.05,'geometria do entorno invade a pista: '+rq[9]);
}
assert(C.boxes.length-oldBoxes>=9 && C.circles.length-oldCircles===1,'muros, casas e lixeira têm colisão');
for(const box of C.boxes.slice(oldBoxes)) {
 for(const u of [-1,0,1]) for(const v of [-1,0,1]) {
  const rq=new Float64Array(12);rq[0]=box.x+box.ux*box.hd*u-box.uz*box.hw*v;rq[1]=box.z+box.uz*box.hd*u+box.ux*box.hw*v;cityRasterQ(rq);
  assert(rq[9]>0.05,'colisão do entorno sobre a pista');
 }
}
console.log('PASS: Petrus — lotes sem sobreposição, pista livre, colisões e '+meshPetrus.ni/3+' triângulos.');
`;
const source = base.replace(anchor, anchor + "\n${read('12_city8_petrus.js')}")
 .replace("console.log('PASS: Nova Aliança", extra + "\nconsole.log('PASS: Nova Aliança");
const test = new Module(__filename, module);
test.filename = __filename; test.paths = module.paths; test._compile(source, __filename);
