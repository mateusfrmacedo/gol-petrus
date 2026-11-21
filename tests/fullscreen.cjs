const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const b={attrs:{},setAttribute(k,v){this.attrs[k]=v}},events={};let enter=0,exit=0;
const document={fullscreenElement:null,fullscreenEnabled:true,documentElement:{},getElementById:()=>b,addEventListener:(n,f)=>events[n]=f};
document.documentElement.requestFullscreen=async function(){assert.equal(this,document.documentElement);enter++;document.fullscreenElement=this;};
document.exitFullscreen=async function(){exit++;document.fullscreenElement=null;};
const ctx=vm.createContext({document});
vm.runInContext(fs.readFileSync('source/js/58_fullscreen.js','utf8')+';globalThis.f=FULLSCREEN;',ctx);
(async()=>{
 const f=ctx.f;f.init();assert(!b.disabled);await f.toggle();assert.equal(enter,1);assert.equal(b.attrs['aria-pressed'],'true');
 await f.toggle();assert.equal(exit,1);assert.equal(b.attrs['aria-pressed'],'false');
 document.fullscreenElement=document.documentElement;events.fullscreenchange();assert.equal(b.attrs['aria-pressed'],'true');
 document.fullscreenElement=null;events.fullscreenchange();assert.equal(b.attrs['aria-pressed'],'false','Esc atualiza o estado do botão');
 document.documentElement.requestFullscreen=async()=>{throw Error('bloqueado')};await f.toggle();assert(b.title.includes('Não foi possível'));assert.equal(b.attrs['aria-pressed'],'false');
 document.fullscreenEnabled=false;f.sync();assert(b.disabled);await f.toggle();assert.equal(enter,1);
 console.log('PASS: entrar/sair de tela cheia, estado após Esc, falha e navegador sem suporte.');
})().catch(e=>{console.error(e);process.exitCode=1});
