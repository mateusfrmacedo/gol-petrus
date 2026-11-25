// Mapa de Nova Aliança: dados, malha viária, rasters, física do chão, lugares modelados e malhas (sem GPU).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'../source/js',n),'utf8');
// Escolha inicial real: cidade por padrão, preservando mapa explícito ou escolha salva.
const mapChoice=read('12_city1_core.js').match(/CITY\.on = \(\(\) => \{[\s\S]*?\}\)\(\);/)[0];
function chosenMap(query='', saved=null, capture=false) {
 const c=vm.createContext({Q:new URLSearchParams(query),GAME:{mode:'game',capture},CITY:{},localStorage:{getItem:()=>saved}});
 vm.runInContext(mapChoice,c); return c.CITY.on;
}
assert.equal(chosenMap(),true); assert.equal(chosenMap('', 'circuito'),false);
assert.equal(chosenMap('mapa=circuito','nova-alianca'),false);
assert.equal(chosenMap('mapa=nova-alianca','circuito'),true); assert.equal(chosenMap('',null,true),false);
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
assert(CITY.on,'?mapa=nova-alianca liga a cidade');
cityBuild();
const C=CITY, q=new Float64Array(12), o=new Float64Array(5);
assert(C.chains.length>500 && C.juncs.length>300 && C.houses.length>2000, 'malha viária e casas: '+JSON.stringify(C.stats));
// vias: perfis sem degraus nem rampas impossíveis; nós com altura única
for (const ch of C.chains) { for (let i=1;i<ch.n;i++){ const ds=ch.s[i]-ch.s[i-1]; if(ds>0.5) assert(Math.abs(ch.y[i]-ch.y[i-1])/ds<0.2,'rampa '+ch.cls.name); }
  assert(Math.abs(ch.y[0]-ch.a.y)<1e-6 && Math.abs(ch.y[ch.n-1]-ch.b.y)<1e-6,'pontas presas aos nós'); }
// partida na via, faixa da direita, longe da borda
chainAt(C.spawn.ch,C.spawn.s,o); q[0]=o[0];q[1]=o[1]; cityRasterQ(q); assert(q[9]<-1,'partida sobre o asfalto');
const sp=C.spawn, lane=sp.ch.hw*0.48, sx=o[0]-o[3]*sp.dir*lane, sz=o[1]+o[2]*sp.dir*lane;
const exit=MARCOS.borghi.at(-MARCOS.borghi.D/2,0);
assert(Math.hypot(sx-exit[0],sz-exit[1])<8, 'Gol parte junto à saída da Borghi');
assert(o[3]*sp.dir>0,'Gol alinhado para seguir em direção ao centro');
q[0]=sx;q[1]=sz;cityRasterQ(q);assert(q[9]<-1,'Gol na faixa da direita, fora da calçada');
// raster coerente com a malha: o centro de cada cadeia é via, e a 1 m além da calçada urbana não é
let n=0; for (const ch of C.chains){ if(ch.L-ch.trimA-ch.trimB<4) continue; chainAt(ch,(ch.trimA+ch.L-ch.trimB)/2,o); q[0]=o[0];q[1]=o[1]; if(q[0]<C.X0+2||q[0]>C.X1-2||q[1]<C.Z0+2||q[1]>C.Z1-2) continue; cityRasterQ(q); assert(q[9]<-ch.hw*0.6,'centro da via '+ch.id+' '+q[9]); assert(Math.abs(q[10]-o[4])<0.06,'altura da via no raster '+ch.cls.name+' '+(q[10]-o[4]).toFixed(3)); n++; }
assert(n>400); if(globalThis.__bad){console.log(globalThis.__bad.length, JSON.stringify(globalThis.__bad.slice(0,12)));}
// terreno: abaixo do asfalto e na altura da calçada
for (const ch of C.chains.filter(c=>c.cls.urban).slice(0,60)) { if(ch.L-ch.trimA-ch.trimB<10) continue; chainAt(ch,(ch.trimA+ch.L-ch.trimB)/2,o); const nx=-o[3],nz=o[2];
  assert(cityTerrainH(o[0],o[1])<o[4]-0.2,'terreno sob a rua');
  const w=ch.hw+1.2; q[0]=o[0]+nx*w;q[1]=o[1]+nz*w; cityRasterQ(q); if(q[9]>0.3&&q[9]<C.SW-0.3&&(q[11]&ST_URBAN)) assert(Math.abs(cityTerrainH(q[0],q[1])-(q[10]+C.CURB))<0.05,'calçada'); }
// lugares modelados presentes e reservados (nenhuma casa genérica em cima)
for (const k of ['borghi','sacoi','petrus','matriz']) assert(MARCOS[k],'lugar '+k);
for (const k of ['borghi','sacoi','petrus']) { const M=MARCOS[k]; for (const h of C.houses) assert(Math.hypot(h.x-M.ox,h.z-M.oz)>9,'casa sobre '+k); }
assert(C.houses.some(h=>h.shop==='MARKIN MOTOS' && !h.borghiRef), 'oficina preservada fora dos lotes residenciais de referência');
assert(C.houses.filter(h=>h.borghiRef).length===5, 'cinco lotes de referência no entorno da Borghi');
assert(MARCOS.borghi.neighbors.every(h=>C.houses.includes(h)), 'lotes da Borghi preservados após resolver sobreposições');
assert(MARCOS.matriz.paved.length>800 && MARCOS.trees.length>40,'praça matriz com piso e árvores');
// malhas (sem GPU): geometria finita
var hfAt=(x,z)=>cityTerrainH(x,z); var mkFamily=()=>({bgl3:{}}); class RangeSet{constructor(){this.r=[];} add(){} upload(mb){this.mb=mb}}
var WORLD={stats:{tris:{},ranges:{}}}; var worldDefs=()=>({}); var R={drawables:[]}; var PROPS={sets:[]};
var atlasBuild=()=>({createView(){}}); var G={dev:{createBindGroup:()=>({})}};
marcosAtlas=()=>{ CITY.plates={}; for(const ch of CITY.chains) if(ch.cls.name) CITY.plates[ch.cls.name]='x'; return {tex:{createView(){}}, REG:new Proxy({}, {get:()=>[0,0,1,1]})}; };
cityRoadsBuild(); cityPropsBuild();
for (const mb of [WORLD.ribbon.mb, ...R.drawables.map(d=>d.mb).filter(Boolean)]) { for (let i=0;i<mb.nv*9;i+=9) assert(Number.isFinite(mb.f32[i]+mb.f32[i+1]+mb.f32[i+2]),'vértice finito'); }
// meio-fio e calçada nunca desenhados em cima da pista de outra via (o carro parecia afundar no asfalto)
{ const mb=WORLD.ribbon.mb, f=mb.f32, ix=mb.idx; let bad=0, tot=0; const q2=new Float64Array(12), ex=[];
  for (let t=0;t<mb.ni;t+=3){ const a=ix[t]; if(mb.u8[a*36+28]!==2||mb.u8[a*36+29]===2) continue; tot++;
    const cx=(f[ix[t]*9]+f[ix[t+1]*9]+f[ix[t+2]*9])/3, cz=(f[ix[t]*9+2]+f[ix[t+1]*9+2]+f[ix[t+2]*9+2])/3; q2[0]=cx; q2[1]=cz; cityRasterQ(q2); if(q2[9]<-0.8){ bad++; if(ex.length<12) ex.push([Math.round(cx),Math.round(cz),+q2[9].toFixed(1)]); } }
  assert(tot>1000 && bad===0, 'calçada/meio-fio sobre a pista: '+bad+' de '+tot+' '+JSON.stringify(ex)); }
// postes da rede apoiados no chão de verdade (nada flutuando nem enterrado)
for (const P of C.poles) assert(Math.abs(P.y-cityGroundY(P.x,P.z))<0.03,'poste fora do chão '+P.x.toFixed(0)+','+P.z.toFixed(0));
// asfalto voltado para cima (a face da frente é a de cima)
{ const mb=WORLD.ribbon.mb, f=mb.f32, ix=mb.idx; let up=0, tot=0; for (let t=0;t<mb.ni;t+=3){ const a=ix[t]*9,b=ix[t+1]*9,c=ix[t+2]*9; if(mb.u8[ix[t]*36+28]!==0) continue; const ux=f[b]-f[a],uz=f[b+2]-f[a+2],vx=f[c]-f[a],vz=f[c+2]-f[a+2]; const cy=uz*vx-ux*vz; tot++; if(cy>0) up++; } assert(up/tot>0.999,'triângulos do asfalto virados para cima '+up+'/'+tot); }
// setor Sul (12_city6_sul.js): comércios do Google no lote certo, fachada da UBS e caixas d'água sólidas
for (const sh of SUL_SHOPS) assert(C.shops.includes(sh[0]),'comércio do Sul sem lote: '+sh[0]);
assert(C.signs.some(s=>s.name==='UBS NOVA ALIANÇA'),'letreiro da UBS');
{ const [x,z]=llToXZ(...SUL_CAIXAS_LL); assert(C.circles.filter(c=>Math.hypot(c.x-x,c.z-z)<9&&c.r>1.9).length===2,"duas caixas de água com colisão"); }
// Centro (12_city7_centro.js): galpão no lote certo e torres sólidas, sem casa em cima da base
assert(CENTRO.lotes.length===CENTRO_LOTES.length,'lotes de referência do Centro'); assert(CENTRO.escola && C.signs.some(s=>s.name==='E. M. ABDO AYRUTH'),'escola Abdo Ayruth na Rui Barbosa');
for (const T of CENTRO_TORRES) { assert(C.circles.some(c=>Math.hypot(c.x-T.xz[0],c.z-T.xz[1])<0.1&&c.r>2),'torre com colisão'); assert(!C.houses.some(h=>!h.centroRef&&Math.hypot(h.x-T.xz[0],h.z-T.xz[1])<Math.max(h.d,h.w)/2),'casa em cima da torre'); }
for (const sh of OESTE_SHOPS) assert(C.shops.includes(sh[0]),'comércio do Oeste sem lote: '+sh[0]);
assert(new Set(C.signs.map(s=>s.name)).size<=80,'letreiros demais para o atlas (80 vagas): '+new Set(C.signs.map(s=>s.name)).size);
// quadras da Borghi e do Centro (12_city9b_quadras.js): vãos fechados sem sobrepor lotes nem invadir calçada
assert(QUADRAS.novas+QUADRAS.alargadas>5,'vãos fechados: '+JSON.stringify(QUADRAS));
{ const L=C.houses.filter(h=>h.quadra||h.quadraAlargada); for (const h of L) { assert(quadrasLivre(h),'casa nova na calçada'); for (const o of C.houses) if (o!==h) assert(!quadrasSobrepoe(quadrasCaixa(h),quadrasCaixa(o),0.05),'casa nova sobre outra'); } }
console.log('PASS: Nova Aliança — '+C.chains.length+' vias, '+C.juncs.length+' cruzamentos, '+C.houses.length+' casas; perfis, rasters, calçadas, partida, lugares modelados e malhas.');
`,ctx);
