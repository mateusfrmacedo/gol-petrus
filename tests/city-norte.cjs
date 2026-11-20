// Executa a integração completa da cidade incluindo os detalhes opcionais do Norte.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const base = fs.readFileSync(path.join(__dirname, 'city.cjs'), 'utf8');
const anchor = "${read('12_city5_borghi.js')}";
if (!base.includes(anchor)) throw Error('Atualizar carregador do teste do Norte');
const extra = `
const drain = MARCOS.borghi.northDrain;
assert(drain, 'drenagem do Norte integrada ao marco da Borghi');
assert(Math.abs(drain.y-cityGroundY(drain.x,drain.z))<0.001, 'drenagem apoiada no chão');
const northMesh = new MeshBuilder(4096);
borghiNorthDetails(northMesh);
assert(northMesh.ni>1000 && northMesh.ni<20000, 'detalhes com orçamento limitado');
assert(northMesh.xfStack.length===0, 'transformações restauradas');
for(let i=0;i<northMesh.nv;i++) {
 const x=northMesh.f32[i*9], y=northMesh.f32[i*9+1], z=northMesh.f32[i*9+2];
 assert(Number.isFinite(x+y+z), 'detalhe com coordenadas finitas');
 const nq=new Float64Array(12);nq[0]=x;nq[1]=z;cityRasterQ(nq);
 assert(nq[9]>0.05, 'detalhe não invade asfalto: '+nq[9]);
 assert(Math.hypot(x-sx,z-sz)>5, 'saída do Gol livre');
}
console.log('PASS: Norte — drenagem no chão, via e largada livres, geometria limitada.');
`;
const source = base.replace(anchor, anchor + "\n${read('12_city5_norte.js')}")
 .replace("console.log('PASS: Nova Aliança", extra + "\nconsole.log('PASS: Nova Aliança");
const test = new Module(__filename, module);
test.filename = __filename; test.paths = module.paths; test._compile(source, __filename);
