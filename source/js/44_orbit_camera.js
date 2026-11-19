// Inspeção externa do Gol por mouse; a perseguição original continua como padrão.
const CAM_ORBIT = {
  active:false, dragging:false, pointer:null, canvas:null, x:0, y:0, yaw:Math.PI, pitch:.16, distance:5.4,
  allowed() { return VEHICLES.current==='gol' && GS.cam===0 && !GS.freeCam && (!GAME.ui || UI.st===ST.JOGO); },
  activate() {
    if(!this.allowed())return false;
    if(!this.active){this.yaw=GS.chaseYaw-GS.yaw+Math.PI;this.pitch=.16;this.distance=Math.min(11,5.4+GS.speed*.022);this.active=true;GS.cut=true;}
    return true;
  },
  reset() { this.active=false;this.stop();this.yaw=Math.PI;this.pitch=.16;this.distance=5.4; },
  stop() {
    const p=this.pointer;this.dragging=false;this.pointer=null;
    if(this.canvas && p!==null && this.canvas.hasPointerCapture(p))this.canvas.releasePointerCapture(p);
  },
  move(dx,dy) {
    this.yaw=((this.yaw-dx*.006)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
    this.pitch=Math.max(.06,Math.min(1.35,this.pitch+dy*.004));
  },
  zoom(delta) { this.distance=Math.max(3,Math.min(11,this.distance*Math.exp(Math.max(-2000,Math.min(2000,delta))*.001))); },
  pose(q) {
    const yaw=GS.yaw+this.yaw+(GS.keys&K_V?Math.PI:0),r=this.distance*Math.cos(this.pitch);
    q[0]=GS.cx+Math.cos(yaw)*r;q[2]=GS.cz+Math.sin(yaw)*r;
    q[1]=Math.max(GS.cy+.8+this.distance*Math.sin(this.pitch),hfAt(q[0],q[2])+.55);
    q[3]=GS.cx;q[4]=GS.cy+.8;q[5]=GS.cz;q[6]=.93;q[7]=0;
  },
  init() {
    const c=this.canvas=document.getElementById('c');
    c.addEventListener('pointerdown',e=>{
      if(e.button!==0 || e.pointerType==='touch' || !this.activate())return;
      this.dragging=true;this.pointer=e.pointerId;this.x=e.clientX;this.y=e.clientY;c.setPointerCapture(e.pointerId);e.preventDefault();this.ui();
    });
    c.addEventListener('pointermove',e=>{
      if(!this.dragging || this.pointer!==e.pointerId)return;
      if(!this.allowed()){this.stop();return;}
      this.move(e.clientX-this.x,e.clientY-this.y);this.x=e.clientX;this.y=e.clientY;
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(name,e=>{if(e.pointerId===this.pointer){this.stop();this.ui();}});
    c.addEventListener('wheel',e=>{if(!this.activate())return;e.preventDefault();this.zoom(e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1));this.ui();},{passive:false});
    c.addEventListener('dblclick',e=>{if(this.allowed()){e.preventDefault();this.reset();this.ui();}});
    addEventListener('blur',()=>this.stop());
  },
  ui() {
    const allowed=this.allowed(),panel=document.getElementById('camera-tools'),b=document.getElementById('orbit-reset');
    if(panel)panel.hidden=!allowed;
    if(b){const text=this.active?'Centralizar câmera':'Girar câmera';if(b.textContent!==text)b.textContent=text;}
    if(!allowed && this.dragging)this.stop();
    if(this.canvas){const cursor=allowed?(this.dragging?'grabbing':'grab'):'';if(this.canvas.style.cursor!==cursor)this.canvas.style.cursor=cursor;}
  }
};
