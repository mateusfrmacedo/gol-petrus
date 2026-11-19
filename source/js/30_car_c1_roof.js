// Teto externo deslizante: sobe antes de correr para trás, como nas fotos do Gol.
const SUNROOF = {
  value: 0, target: 0, seconds: 1.8,
  toggle() { if (VEHICLES.current !== 'gol') return; this.target = this.target ? 0 : 1; this.ui(); },
  advance(dt) {
    if (VEHICLES.current !== 'gol' || !Number.isFinite(dt) || dt <= 0) return;
    const step = Math.min(dt, .1) / this.seconds;
    this.value += Math.sign(this.target-this.value) * Math.min(step, Math.abs(this.target-this.value));
  },
  matrix(out, deflector = false) {
    const u = this.value, smooth = x => x*x*(3-2*x);
    const lift = smooth(Math.min(1,u/.2)), slide = smooth(Math.max(0,(u-.2)/.8));
    const cfg=GOL_META.sunroof;
    const angle = deflector ? -.8*lift : (cfg ? cfg.angle : -.025)*slide;
    const px = deflector ? (cfg ? cfg.frontX : .21) : .145, py = cfg ? cfg.hingeY : deflector ? 1.34 : 1.335;
    const c = Math.cos(angle), s = Math.sin(angle); m4ident(out);
    out[0]=c;out[1]=s;out[4]=-s;out[5]=c;
    out[12]=px-c*px+s*py-(deflector?0:(cfg?cfg.travel:.46)*slide);
    out[13]=py-s*px-c*py+(deflector?0:(cfg?cfg.lift:.035)*lift);
    return out;
  },
  ui() {
    const b=document.getElementById('sunroof'); if(!b)return;
    const visible = VEHICLES.current==='gol' && UI.st===ST.JOGO;
    b.hidden=!visible;
    const text=this.target?'Fechar teto solar · O':'Abrir teto solar · O';
    if(b.textContent!==text)b.textContent=text;
    b.setAttribute('aria-pressed',String(!!this.target));
    b.title=this.value===this.target?(this.value?'Teto aberto':'Teto fechado'):(this.target?'Abrindo teto':'Fechando teto');
  }
};
// As peças móveis já estão separadas do teto branco no modelo importado.
function golRoofPart(p) {
  if(Array.isArray(GOL_META.roofPartIndices))return GOL_META.roofPartIndices.includes(p.sourceIndex);
  if(p.dest>1 || !p.nV)return false;
  for(let i=0;i<p.pos.length;i+=3)if(p.pos[i]<-.56||p.pos[i]>.16||p.pos[i+1]<1.32||Math.abs(p.pos[i+2])>.42)return false;
  return true;
}
function carBuildSunroof(solid, glass, deflector) {
  // A fonte estava basculada; primeiro ajusta para a posição fechada na curvatura do teto.
  const cfg=GOL_META.sunroof,mx=m4rotZ(m4(),cfg?cfg.normalization:.095),px=.145,py=cfg?cfg.hingeY:1.335;
  mx[12]=px-mx[0]*px-mx[4]*py;mx[13]=py-mx[1]*px-mx[5]*py;
  solid.push(mx);glass.push(mx);
  for(const p of GOL.parts)if(golRoofPart(p)){
    const b=p.dest===1?glass:solid;b.mat(p.mat,p.pa).color(...p.col);golEmit(b,p,null,0,false);
  }
  solid.pop();glass.pop();
  deflector.mat(21,12).color(.009,.011,.013);
  deflector.rbox(cfg?cfg.frontX-.035:.175,cfg?cfg.hingeY:1.343,0,.07,.005,.74,.002,3);
}
