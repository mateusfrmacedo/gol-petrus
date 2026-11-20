// Auditoria da malha viária de Nova Aliança: compara o jogo com o OpenStreetMap e procura erros de montagem.
// uso: node scripts/cidade/auditoria.cjs [saida.json]   (gera dados para o mapa completo e a lista de problemas)
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=n=>fs.readFileSync(path.join(__dirname,'../../source/js',n),'utf8');
const ctx=vm.createContext({console,performance,URLSearchParams});
vm.runInContext(`const Q=new URLSearchParams('mapa=nova-alianca');const GAME={mode:'game',capture:false};
${read('00_math.js')}
${read('02_mesh.js')}
${read('12_city0_data.js')}
${read('12_city1_core.js')}
${read('12_city3_mesh.js')}
${read('12_city4_marcos.js')}
${read('12_city5_borghi.js')}
cityBuild(); globalThis.CITY=CITY; globalThis.MARCOS=MARCOS; globalThis.cityRasterQ=cityRasterQ; globalThis.chainAt=chainAt; globalThis.cityParse=cityParse; globalThis.roadClass=roadClass; globalThis.clipPolyline=clipPolyline;`,ctx);
const C=ctx.CITY, q=new Float64Array(12), o=new Float64Array(5), P=[];
const prob=(tipo,grav,x,z,txt)=>P.push({tipo,grav,x:+x.toFixed(1),z:+z.toFixed(1),txt});
const inArea=(x,z,m)=>x>C.X0+m&&x<C.X1-m&&z>C.Z0+m&&z<C.Z1-m;
const rq=(x,z)=>{q[0]=x;q[1]=z;ctx.cityRasterQ(q);return q[9];};
// 1) cada trecho de rua do OSM dentro da área tem asfalto/terra no jogo
const items=ctx.cityParse(); let osmSeg=0, faltando=0; const osm=[];
for(const it of items){ if(it.t!=='w'||!it.tags.hw) continue; const cls=ctx.roadClass(it.tags);
  for(const r of ctx.clipPolyline(it.pts,C.X0*10,C.Z0*10,C.X1*10,C.Z1*10)){ const pts=[]; for(let i=0;i<r.length;i+=2) pts.push([r[i]/10,r[i+1]/10]); osm.push({hw:it.tags.hw,nm:it.tags.nm||'',pts,usada:!!cls});
    if(!cls) continue;
    for(let i=1;i<pts.length;i++){ const [x0,z0]=pts[i-1],[x1,z1]=pts[i],L=Math.hypot(x1-x0,z1-z0); for(let s=2;s<L-2;s+=6){ const x=x0+(x1-x0)*s/L,z=z0+(z1-z0)*s/L; if(!inArea(x,z,3)) continue; osmSeg++; if(rq(x,z)>-0.3){ faltando++; prob('rua do OSM sem pista no jogo','alta',x,z,(it.tags.nm||it.tags.hw)+': ponto da via original fora da pista'); } } } } }
// 2) pontas soltas: nó de uma via só, longe da borda; perto de outra rua = ligação provavelmente faltando
const ends=[];
for(const nd of C.nodes){ if(nd.ends.length!==1||!inArea(nd.x,nd.z,15)) continue; const own=nd.ends[0].ch;
  let best=1e9, nome='';
  for(const ch of C.chains){ if(ch===own) continue; for(let i=0;i<ch.n;i++){ const d=Math.hypot(ch.x[i]-nd.x,ch.z[i]-nd.z)-ch.hw; if(d<best){best=d;nome=ch.cls.name;} } }
  ends.push({x:nd.x,z:nd.z,nome:own.cls.name,dist:best});
  if(best<8) prob('ligação faltando','alta',nd.x,nd.z,`${own.cls.name||'via sem nome'} termina a ${best.toFixed(1)} m de ${nome||'outra via'} sem se ligar`);
  else if(own.cls.urban) prob('rua sem saída','info',nd.x,nd.z,`${own.cls.name||'rua sem nome'} termina aqui (confira se é assim na cidade)`); }
// 3) pedaços da malha desligados do resto
const comp=new Map(); let nc=0, sizes=[];
for(const nd of C.nodes){ if(comp.has(nd)) continue; const st=[nd]; comp.set(nd,nc); let n=0; const chs=new Set();
  while(st.length){ const a=st.pop(); for(const e of a.ends){ chs.add(e.ch); for(const b of [e.ch.a,e.ch.b]) if(!comp.has(b)){comp.set(b,nc);st.push(b);} } }
  sizes.push({id:nc,chs:[...chs]}); nc++; }
sizes.sort((a,b)=>b.chs.length-a.chs.length);
for(const s of sizes.slice(1)){ const L=s.chs.reduce((a,c)=>a+c.L,0); if(!s.chs.length) continue; const ch=s.chs[0]; ctx.chainAt(ch,ch.L/2,o);
  const toca=s.chs.some(c=>!inArea(c.a.x,c.a.z,3)||!inArea(c.b.x,c.b.z,3));
  prob(toca?'trecho isolado (sai pela borda)':'trecho isolado','media',o[0],o[1],`${s.chs.length} via(s), ${L.toFixed(0)} m sem ligação com a malha principal: ${[...new Set(s.chs.map(c=>c.cls.name).filter(Boolean))].join(', ')||'sem nome'}`); }
// 4) cadeias consumidas pelos cruzamentos (cruzamentos muito próximos) e rampas
for(const ch of C.chains){ const free=ch.L-ch.trimA-ch.trimB; if(free<0){ ctx.chainAt(ch,ch.L/2,o); prob('cruzamentos sobrepostos','media',o[0],o[1],`${ch.cls.name||'via'}: trecho de ${ch.L.toFixed(1)} m entre dois cruzamentos fica todo dentro deles`); }
  let mx=0,at=0; for(let i=1;i<ch.n;i++){ const ds=ch.s[i]-ch.s[i-1]; if(ds>2){ const g=Math.abs(ch.y[i]-ch.y[i-1])/ds; if(g>mx){mx=g;at=i;} } }
  if(mx>0.13) prob('rampa forte','media',ch.x[at],ch.z[at],`${ch.cls.name||'via'}: ${(mx*100).toFixed(0)}% de inclinação`); }
// 5) ruas urbanas sem nome
const semNome=C.chains.filter(c=>c.cls.urban&&!c.cls.name);
for(const ch of semNome){ ctx.chainAt(ch,ch.L/2,o); prob('rua sem nome','info',o[0],o[1],`rua urbana de ${ch.L.toFixed(0)} m sem nome no OSM (sem placa)`); }
// 6) casas em cima da rua ou umas sobre as outras
const corners=b=>{const r=[];for(const [a,t] of [[1,1],[1,-1],[-1,1],[-1,-1]]) r.push([b.x+b.ux*b.hd*a-b.uz*b.hw*t,b.z+b.uz*b.hd*a+b.ux*b.hw*t]);return r;};
let casasRua=0; for(const b of C.boxes){ const bad=corners(b).filter(([x,z])=>rq(x,z)<-0.2).length; if(bad){casasRua++; prob('construção sobre a rua','alta',b.x,b.z,`${bad} canto(s) da casa/lote sobre a pista`);} }
const sep=(A,B)=>{for(const [ax,az] of [[A.ux,A.uz],[-A.uz,A.ux],[B.ux,B.uz],[-B.uz,B.ux]]){const ra=A.hd*Math.abs(A.ux*ax+A.uz*az)+A.hw*Math.abs(-A.uz*ax+A.ux*az),rb=B.hd*Math.abs(B.ux*ax+B.uz*az)+B.hw*Math.abs(-B.uz*ax+B.ux*az);if(Math.abs((B.x-A.x)*ax+(B.z-A.z)*az)>=ra+rb-0.15)return true;}return false;};
let sobre=0; const bs=C.boxes; for(let i=0;i<bs.length;i++) for(let j=i+1;j<bs.length;j++){ const A=bs[i],B=bs[j]; if(Math.abs(A.x-B.x)>40||Math.abs(A.z-B.z)>40) continue; if(!sep(A,B)){sobre++; prob('construções sobrepostas','media',(A.x+B.x)/2,(A.z+B.z)/2,'dois lotes/construções ocupam o mesmo espaço');} }
// 7) postes na pista
for(const p of C.poles) if(rq(p.x,p.z)<-0.1) prob('poste na pista','alta',p.x,p.z,'poste sobre o asfalto');
// dados do mapa
const ruas=C.chains.map(ch=>{const pts=[];for(let i=0;i<ch.n;i++)pts.push([+ch.x[i].toFixed(1),+ch.z[i].toFixed(1)]);return{id:ch.id,nm:ch.cls.name,ref:ch.cls.ref,hw:+ch.hw.toFixed(2),u:ch.cls.urban?1:0,d:ch.cls.dirt?1:0,one:ch.cls.one?1:0,L:+ch.L.toFixed(0),pts};});
const casas=C.houses.map(h=>[+h.x.toFixed(1),+h.z.toFixed(1),+h.w.toFixed(1),+h.d.toFixed(1),+Math.atan2(h.nz,h.nx).toFixed(3),h.comm?1:0]);
const pois=C.pois.filter(p=>inArea(p.x,p.z,0)).map(p=>({x:+p.x.toFixed(1),z:+p.z.toFixed(1),nm:p.name,t:p.tags.am||p.tags.sh||p.tags.ls||p.tags.bd||p.tags.lu||p.tags.nt||''}));
const marcos=Object.entries(ctx.MARCOS).filter(([k,v])=>v&&k!=='trees').flatMap(([k,M])=>k==='entrada'?[{k:'portal',x:+M.P.x.toFixed(1),z:+M.P.z.toFixed(1)},{k:'letras',x:+M.L.x.toFixed(1),z:+M.L.z.toFixed(1)}]:[{k,x:+(M.ox??M.cx).toFixed(1),z:+(M.oz??M.cz).toFixed(1)}]);
const blocos=C.blocks.filter(b=>b.kind==='park').map(b=>{let x=0,z=0;for(const k of b.cells){x+=k%C.W;z+=Math.floor(k/C.W);}return{nm:b.name||'',x:+(C.X0+x/b.cells.length).toFixed(1),z:+(C.Z0+z/b.cells.length).toFixed(1),n:b.cells.length};});
const nomes=[...new Set(C.chains.map(c=>c.cls.name).filter(Boolean))].sort();
const res={area:[C.X0,C.Z0,C.X1,C.Z1],stats:{vias:C.chains.length,cruzamentos:C.juncs.length,casas:C.houses.length,nomes:nomes.length,kmRuas:+(C.chains.reduce((a,c)=>a+c.L,0)/1000).toFixed(1),osmPontos:osmSeg,osmFaltando:faltando,componentes:nc,casasSobreRua:casasRua,sobrepostas:sobre},nomes,ruas,osm,casas,pois,marcos,blocos,stops:Array.from(C.stops).map(v=>+v.toFixed(1)),problemas:P};
const out=process.argv[2]||path.join(__dirname,'auditoria.json'); fs.writeFileSync(out,JSON.stringify(res));
const cont={}; for(const p of P) cont[p.tipo]=(cont[p.tipo]||0)+1;
console.log(JSON.stringify(res.stats)); console.log(cont);
