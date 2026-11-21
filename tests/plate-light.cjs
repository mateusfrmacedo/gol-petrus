// Executa as fórmulas escalares do próprio WGSL para conferir direção e recorte da luz.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
let source = fs.readFileSync('source/wgsl/plate_light.wgsl', 'utf8')
 .replace(/fn plateLampMask\(lp: vec3f, ln: vec3f\) -> vec2f/, 'function mask(lp, ln)')
 .replace(/\blet\b/g, 'const');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ctx={abs:Math.abs,max:Math.max,clamp,vec2f:(a,b)=>[a,b],smoothstep:(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}};
vm.createContext(ctx);vm.runInContext(source+'\nglobalThis.mask=mask;',ctx);
const back={x:-1,y:0,z:0},up={x:0,y:1,z:0},p=(x,y,z=0,n=back)=>ctx.mask({x,y,z},n);
assert(p(-1.94,.42)[0]>0,'placa recebe iluminação');
assert(p(-1.94,.28,.26)[0]>0,'facho acompanha a moldura que alarga para baixo');
assert.equal(p(-1.94,.47,.26)[0],0,'não clareia fora da borda superior estreita');
for(const y of [.505,.54,.7,1.0]) assert(p(-1.94,y).every(x=>x===0),'sem luz acima da placa');
assert(p(-2.8,0,0,up)[1]>.2,'clarão no asfalto atrás do carro');
assert(p(-2.8,.25,0,up)[1]===0,'clarão de chão não pinta a carroceria');
assert(p(-2.8,0,1.5,up)[1]===0,'mancha no asfalto tem largura limitada');
assert(p(-5,0,0,up)[1]===0,'clarão não alcança longe demais');
assert(p(-2.8,0,0,back)[1]===0,'facho do chão respeita a orientação da superfície');
console.log('PASS: luz da placa para baixo, recorte da moldura e clarão limitado ao chão.');
