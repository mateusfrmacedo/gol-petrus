// Clima: tradução do tempo real (código WMO, nuvens, temperatura) para os oito tempos do jogo e hora de Brasília.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../source/js/25_clima.js'),'utf8');
const ctx=vm.createContext({localStorage:{getItem:()=>null,setItem(){}},performance,Intl,Date});
vm.runInContext(src,ctx);
const f=(c,n,t)=>ctx.climaDoTempo(c,n,t);
assert.equal(f(0,0,25),'limpo'); assert.equal(f(1,15,25),'ensolarado'); assert.equal(f(0,3,33),'quente');
assert.equal(f(2,40,27),'poucas'); assert.equal(f(2,70,27),'muitas'); assert.equal(f(3,100,22),'nublado');
assert.equal(f(45,100,18),'nublado'); assert.equal(f(61,100,21),'chuva'); assert.equal(f(81,90,24),'chuva'); assert.equal(f(95,100,26),'tempestade');
for(const k in ctx.CLIMA_TIPOS){const T=ctx.CLIMA_TIPOS[k]; assert(T.cover>=0&&T.cover<=1&&T.sun>0&&T.sun<=1.2&&T.nome,k);}
const h=ctx.climaHoraLocal(); assert(h>=0&&h<24);
const utc=new Date().getUTCHours()+new Date().getUTCMinutes()/60; assert(Math.abs(((utc-3-h+48)%24))<0.05||Math.abs(((utc-3-h+48)%24)-24)<0.05,'hora de Brasília (UTC-3)');
console.log('PASS: clima real -> oito tempos do jogo; hora de Brasília.');
