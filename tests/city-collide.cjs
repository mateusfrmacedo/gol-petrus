// Colisão em Nova Aliança: casas (com muro e quintal da frente), postes e placas são sólidos; o carro não atravessa,
// nem parado dentro, nem batendo a 110 km/h.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'../source/js',n),'utf8');
const ctx=vm.createContext({console,performance,URLSearchParams,assert});
vm.runInContext(`const Q=new URLSearchParams('mapa=nova-alianca');const GAME={mode:'game',capture:false};
${read('00_math.js')}
${read('02_mesh.js')}
${read('12_city0_data.js')}
${read('12_city1_core.js')}
${read('12_city3_mesh.js')}
${read('12_city4_marcos.js')}
${read('12_city5_borghi.js')}
${read('12_city6_sul.js')}
${read('12_city7_centro.js')}
${fs.existsSync(path.join(__dirname,'../source/js/12_city8_petrus.js'))?read('12_city8_petrus.js'):''}
${read('12_city9_oeste.js')}
${read('12_city9b_quadras.js')}
cityBuild();
const VP={halfW:0.78,front:1.92,rear:1.72};
const VEH={x:0,z:0,yaw:0,vx:0,vy:0,r:0,hits:0};
${read('12_city2_world.js').match(/const _col[\s\S]*?\n}\nfunction cityCollide\(\)[\s\S]*?\n}\n/)[0]}
const C=CITY;
assert(C.boxes.length>=C.houses.length,'caixas de colisão das casas: '+C.boxes.length);
assert(C.circles.length>=C.poles.length,'postes sólidos');
// o retângulo do carro sobrepõe a caixa? (separação de eixos)
function overlap(B){const c=Math.cos(VEH.yaw),s=Math.sin(VEH.yaw),hl=(VP.front+VP.rear)/2,hw=VP.halfW,co=(VP.front-VP.rear)/2,px=VEH.x+c*co,pz=VEH.z+s*co,dx=B.x-px,dz=B.z-pz;
  for(const [ax,az] of [[c,s],[-s,c],[B.ux,B.uz],[-B.uz,B.ux]]){const rc=hl*Math.abs(c*ax+s*az)+hw*Math.abs(-s*ax+c*az),rb=B.hd*Math.abs(B.ux*ax+B.uz*az)+B.hw*Math.abs(-B.uz*ax+B.ux*az);if(Math.abs(dx*ax+dz*az)>=rc+rb-0.02)return false;}return true;}
function poleIn(P){const c=Math.cos(VEH.yaw),s=Math.sin(VEH.yaw),hl=(VP.front+VP.rear)/2,hw=VP.halfW,co=(VP.front-VP.rear)/2,dx=P.x-VEH.x-c*co,dz=P.z-VEH.z-s*co,lx=dx*c+dz*s,lz=-dx*s+dz*c,qx=clamp(lx,-hl,hl),qz=clamp(lz,-hw,hw);return Math.hypot(lx-qx,lz-qz)<P.r-0.02;}
const rnd=mkRng(42);
// 1) carro largado meio metro dentro da frente de casas com muro: sai para fora
let n=0;
for(const h of C.houses.filter(h=>h.wall&&h.set>1).slice(0,300)){
  const B=C.boxes.find(b=>Math.abs(b.ux-h.nx)<1e-9&&Math.abs(b.uz-h.nz)<1e-9&&Math.hypot(b.x-h.x,b.z-h.z)<h.set);
  assert(B,'caixa do muro');
  const fx=B.x-B.ux*B.hd, fz=B.z-B.uz*B.hd;   // meio do muro da frente
  VEH.yaw=Math.atan2(B.uz,B.ux)+(rnd()-0.5)*0.8; VEH.x=fx-B.ux*(VP.front-0.5)*Math.cos(0); VEH.z=fz-B.uz*(VP.front-0.5); VEH.vx=VEH.vy=VEH.r=0;
  for(let k=0;k<20;k++) cityCollide();
  assert(!overlap(B),'carro ficou dentro do muro de uma casa'); n++;
}
assert(n>100);
// 2) batida de frente a 30 m/s (passo de 1/120 s): nunca passa do muro
for(const h of C.houses.filter(h=>h.wall&&h.set>1).slice(300,400)){
  const B=C.boxes.find(b=>Math.abs(b.ux-h.nx)<1e-9&&Math.hypot(b.x-h.x,b.z-h.z)<h.set);
  const fx=B.x-B.ux*B.hd, fz=B.z-B.uz*B.hd;
  VEH.yaw=Math.atan2(B.uz,B.ux); VEH.x=fx-B.ux*6; VEH.z=fz-B.uz*6; VEH.vx=30; VEH.vy=0; VEH.r=0;
  for(let k=0;k<120;k++){ const c=Math.cos(VEH.yaw),s=Math.sin(VEH.yaw); VEH.x+=(VEH.vx*c-VEH.vy*s)/120; VEH.z+=(VEH.vx*s+VEH.vy*c)/120; VEH.yaw+=VEH.r/120; cityCollide(); }
  const a=(VEH.x-fx)*B.ux+(VEH.z-fz)*B.uz; assert(a<0,'atravessou o muro a 108 km/h');
}
// 3) poste no meio do carro: é empurrado para fora
for(const P of C.circles.slice(0,300)){ VEH.yaw=rnd()*6.28; VEH.x=P.x+(rnd()-0.5); VEH.z=P.z+(rnd()-0.5); VEH.vx=VEH.vy=VEH.r=0; for(let k=0;k<20;k++) cityCollide(); assert(!poleIn(P),'poste dentro do carro'); }
console.log('PASS: colisão — '+C.boxes.length+' caixas e '+C.circles.length+' obstáculos redondos; o carro não fica dentro nem atravessa a 108 km/h.');
`,ctx);
