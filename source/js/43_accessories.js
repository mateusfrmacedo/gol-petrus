// Comandos do Gol: farol baixo/alto, indicadores e buzina enquanto pressionada.
const GOL_CONTROLS = {
  lights: false, high: false, plate: false, signal: 0, phase: 0, flash: true,
  hornKeys: new Set(), audioCtx: null, hornGain: null, buttons: null,
  available() { return VEHICLES.current === 'gol' && UI.st === ST.JOGO; },
  toggleLights() { if (!this.available()) return; this.lights=!this.lights; if(!this.lights)this.high=false; this.ui(); },
  toggleHigh() { if (!this.available()) return; this.high=!this.high; if(this.high)this.lights=true; this.ui(); },
  togglePlate() { if(!this.available())return;this.plate=!this.plate;this.ui(); },
  toggleSignal(side) {
    if (!this.available()) return;
    this.signal=this.signal===side?0:side;this.phase=0;this.flash=true;this.ui();
  },
  horn(source, on) {
    if(on && this.available())this.hornKeys.add(source);else this.hornKeys.delete(source);
    this.audio();this.ui();
  },
  stopHorn() { this.hornKeys.clear();this.audio(); },
  audio() {
    const ctx=SND.ctx;
    const on=this.available() && SND.run && !SND.mute && this.hornKeys.size>0;
    if(on && ctx && this.audioCtx!==ctx) {
      this.audioCtx=ctx;const gain=this.hornGain=ctx.createGain();gain.gain.value=0;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2200;
      gain.connect(filter);filter.connect(ctx.destination);
      for(const hz of [400,500]) { const osc=ctx.createOscillator();osc.type='sawtooth';osc.frequency.value=hz;osc.connect(gain);osc.start(); }
    }
    if(this.hornGain && ctx===this.audioCtx) {
      const gain=this.hornGain.gain;gain.cancelScheduledValues(ctx.currentTime);
      gain.setTargetAtTime(on?.065:0,ctx.currentTime,.012);
    }
  },
  advance(dt) {
    if(VEHICLES.current!=='gol'){this.stopHorn();return;}
    if(Number.isFinite(dt)&&dt>0)this.phase=(this.phase+dt)%.8;
    this.flash=this.phase<.4;this.audio();
  },
  write(params) {
    const gol=VEHICLES.current==='gol';
    params[2]=gol&&this.lights?(this.high?2:1):0;
    params[6]=gol&&this.signal===-1&&this.flash?1:0;
    params[7]=gol&&this.signal===1&&this.flash?1:0;
    params[8]=gol&&this.plate?1:0;
  },
  init() {
    this.buttons={panel:document.getElementById('gol-controls'),low:document.getElementById('gol-low'),high:document.getElementById('gol-high'),plate:document.getElementById('gol-plate'),left:document.getElementById('gol-left'),right:document.getElementById('gol-right'),horn:document.getElementById('gol-horn')};
    const b=this.buttons;
    for(const [button,fn]of [[b.low,()=>this.toggleLights()],[b.high,()=>this.toggleHigh()],[b.plate,()=>this.togglePlate()],[b.left,()=>this.toggleSignal(-1)],[b.right,()=>this.toggleSignal(1)]])button.onclick=e=>{fn();e.currentTarget.blur();};
    b.horn.addEventListener('pointerdown',e=>{if(e.button!==0||!this.available())return;e.preventDefault();b.horn.setPointerCapture(e.pointerId);this.horn('pointer'+e.pointerId,true);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.horn.addEventListener(type,e=>this.horn('pointer'+e.pointerId,false));
    b.horn.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();this.horn('button',true);}});
    b.horn.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();this.horn('button',false);}});
    b.horn.addEventListener('blur',()=>this.horn('button',false));
    addEventListener('keydown',e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,select,textarea,[contenteditable="true"]')||!this.available())return;
      if(!['KeyL','KeyK','KeyZ','KeyX','KeyJ','KeyI'].includes(e.code))return;
      e.preventDefault();if(e.repeat)return;
      if(e.code==='KeyL')this.toggleLights();else if(e.code==='KeyK')this.toggleHigh();
      else if(e.code==='KeyI')this.togglePlate();else if(e.code==='KeyZ')this.toggleSignal(-1);else if(e.code==='KeyX')this.toggleSignal(1);else this.horn('keyboard',true);
    });
    addEventListener('keyup',e=>{if(e.code==='KeyJ')this.horn('keyboard',false);});
    addEventListener('blur',()=>this.stopHorn());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopHorn();});
    this.ui();
  },
  ui() {
    if(!this.available()&&this.hornKeys.size)this.stopHorn();
    const b=this.buttons;if(!b)return;b.panel.hidden=!this.available();
    const states=[[b.low,this.lights],[b.high,this.high],[b.plate,this.plate],[b.left,this.signal===-1],[b.right,this.signal===1],[b.horn,this.hornKeys.size>0]];
    for(const [button,on]of states)button.setAttribute('aria-pressed',String(!!on));
    b.left.classList.toggle('lit',this.signal===-1&&this.flash);b.right.classList.toggle('lit',this.signal===1&&this.flash);
  }
};
