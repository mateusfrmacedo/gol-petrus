// Cabine 3D baseada nas fotos reais painel-real.jpeg e volante-real.jpeg fornecidas pelo proprietário.
// X = frente, Y = cima, Z = direita. Todas as peças acompanham a carroceria.
const CABIN_ATLAS = {
  radio: [0, .52, .5, .735], climate: [.5, .52, 1, .735],
  speed: [0, .75, .125, 1], rpm: [.125, .75, .25, 1],
};
// Face circular voltada para o motorista, opcionalmente com UV de um mostrador.
function cabinDisc(mb, x, y, z, ry, rz, uv) {
  const n = 48, center = mb.v(x,y,z,-1,0,0,uv ? (uv[0]+uv[2])/2 : 0,uv ? (uv[1]+uv[3])/2 : 0);
  for (let i=0;i<=n;i++) {
    const a=i/n*TAU, cy=Math.sin(a), cz=Math.cos(a);
    mb.v(x,y+ry*cy,z+rz*cz,-1,0,0,uv ? uv[0]+(cz*.5+.5)*(uv[2]-uv[0]) : 0,uv ? uv[1]+(.5-cy*.5)*(uv[3]-uv[1]) : 0);
    if(i) mb.tri(center,center+i,center+i+1);
  }
}
function cabinRing(mb,x,y,z,ry,rz,r) {
  const points=[]; for(let i=0;i<64;i++){const a=i/64*TAU;points.push([x,y+Math.sin(a)*ry,z+Math.cos(a)*rz]);}
  mb.tube(points,r,10,{closed:true,up:[1,0,0]});
}
function cabinFace(mb,x,y,z,w,h,uv) {
  mb.mat(24,0).color(1,1,1);
  mb.quad(x,y-h/2,z-w/2,x,y-h/2,z+w/2,x,y+h/2,z+w/2,x,y+h/2,z-w/2,uv[0],uv[3],uv[2],uv[1]);
}
function carBuildCabin(mb) {
  // Corpo contínuo do painel: topo curvo, testa arredondada e capela elevada do motorista.
  const profile=[[.91,.95],[.79,.966],[.62,.95],[.50,.91],[.455,.845],[.475,.735],[.63,.685],[.91,.73]];
  const n=80, np=profile.length, base=mb.nv;
  const point=(i,j)=>{
    const z=-.724+1.448*i/n,p=profile[(j+np)%np];
    const hump=.092*Math.exp(-Math.pow((z+.36)/.202,4));
    const h=[.15,.55,1,1,.45,0,0,0][(j+np)%np];
    return [p[0]+.025*Math.pow(z/.724,4),p[1]+hump*h,z];
  };
  mb.mat(26,0).color(.048,.050,.055);
  for(let i=0;i<=n;i++)for(let j=0;j<np;j++){
    const p=point(i,j),a=point(i,j-1),b=point(i,j+1),l=point(Math.max(0,i-1),j),r=point(Math.min(n,i+1),j);
    const dx=b[0]-a[0],dy=b[1]-a[1],dzx=r[0]-l[0],dzy=r[1]-l[1],dz=r[2]-l[2];
    mb.v(...p,dy*dz,-dx*dz,dx*dzy-dy*dzx,p[0],p[2]);
  }
  for(let i=0;i<n;i++)for(let j=0;j<np;j++){const a=base+i*np+j,b=base+i*np+(j+1)%np;mb.quadI(a,b,b+np,a+np);}
  // Quatro difusores circulares com aro acetinado, lâminas e lingueta central.
  for(const z of [-.655,-.085,.095,.655]){
    mb.mat(CM.INTERIOR).color(.013,.014,.016); cabinDisc(mb,.424,.847,z,.055,.055);
    cabinRing(mb,.421,.847,z,.058,.058,.006);
    mb.mat(CM.STEEL).color(.31,.33,.35); cabinRing(mb,.414,.847,z,.053,.053,.0045);
    mb.push(m4translate(m4(),0,.847,z)); mb.push(m4rotX(m4(),z < 0 ? .55 : -.55));
    mb.mat(CM.INTERIOR).color(.021,.023,.026);
    for(let k=-1;k<=1;k++){const y=k*.023, width=2*Math.sqrt(Math.max(0,.048**2-y*y));mb.rbox(.410,y,0,.012,.012,width,.003,3);}
    mb.mat(CM.STEEL).color(.19,.20,.21); mb.rbox(.401,0,0,.010,.010,.029,.003,3);
    mb.pop(); mb.pop();
  }
  // Capela e instrumentos, rebaixados sob a borda do painel.
  mb.mat(CM.INTERIOR).color(.007,.008,.010); cabinDisc(mb,.418,.921,-.36,.088,.172);
  mb.mat(CM.INTERIOR).color(.016,.017,.019); cabinRing(mb,.409,.921,-.36,.088,.172,.008);
  mb.mat(24,2).color(1,1,1); cabinDisc(mb,.397,.925,-.427,.048,.048,CABIN_ATLAS.rpm);
  mb.mat(24,1).color(1,1,1); cabinDisc(mb,.397,.925,-.293,.048,.048,CABIN_ATLAS.speed);
  mb.mat(CM.STEEL).color(.23,.24,.25);
  cabinRing(mb,.394,.925,-.427,.049,.049,.0015); cabinRing(mb,.394,.925,-.293,.049,.049,.0015);
  mb.mat(24,3).color(1,1,1); mb.quad(.391,.880,-.378,.391,.880,-.342,.391,.954,-.342,.391,.954,-.378,.25,1,.375,.75);
  // Tampa superior integrada à superfície curva: apenas a junta, sem caixa saliente.
  const lidX=(y,z)=>{
    let x=y>.91 ? .50+(y-.91)/.04*.12 : y>.845 ? .455+(y-.845)/.065*.045 : .475-(y-.735)/.110*.020;
    return x+.025*Math.pow(z/.724,4)-.0015;
  };
  const lid=[];
  for(const [cy,cz,start] of [[.908,.569,0],[.850,.569,PI/2],[.850,.227,PI],[.908,.227,PI*1.5]]){
    for(let i=0;i<=8;i++){const a=start+i/8*PI/2,y=cy+Math.cos(a)*.009,z=cz+Math.sin(a)*.009;lid.push([lidX(y,z),y,z]);}
  }
  mb.mat(CM.INTERIOR).color(.009,.010,.011);mb.tube(lid,.0009,6,{closed:true,up:[1,0,0]});
  // Porta-luvas inferior, com face recuada e puxador discreto.
  mb.mat(26,0).color(.026,.028,.031);mb.rbox(.59,.585,.425,.12,.29,.47,.022,5);
  mb.mat(CM.INTERIOR).color(.009,.010,.012);mb.rbox(.525,.695,.425,.010,.022,.105,.005,3);
  // Moldura vertical do rádio e dos três comandos do ar.
  mb.mat(26,0).color(.019,.020,.022);
  mb.rbox(.447,.655,.006,.080,.277,.266,.026,5);
  mb.mat(26,0).color(.032,.033,.036);
  mb.rbox(.400,.672,.006,.016,.215,.234,.007,4);
  // Texturas do Pioneer e dos comandos são recortes da foto do carro real.
  const photoFace=(y,w,h,uv)=>{
    mb.mat(25,1).color(1,1,1);
    mb.quad(.379,y-h/2,.006-w/2,.379,y-h/2,.006+w/2,.379,y+h/2,.006+w/2,.379,y+h/2,.006-w/2,uv[0],uv[3],uv[2],uv[1]);
  };
  mb.mat(26,1).color(.23,.25,.26); mb.rbox(.395,.711,.006,.011,.170,.247,.005,3);
  mb.mat(CM.INTERIOR).color(.009,.010,.011);mb.rbox(.387,.711,.006,.006,.156,.230,.003,3);
  photoFace(.751,.222,.025,[0,.625,.5,.6875]);
  photoFace(.702,.222,.064,[0,.5,.5,.625]);
  mb.mat(26,1).color(.23,.25,.26);mb.rbox(.395,.602,.006,.011,.092,.247,.006,3);
  photoFace(.602,.222,.080,[.5,.5,1,.625]);
  // Botão do pisca-alerta entre os dois difusores.
  mb.mat(CM.INTERIOR).color(.018,.019,.021); mb.rbox(.417,.774,.006,.012,.029,.044,.005,3);
  mb.mat(CM.LENS).color(.32,.018,.014);
  mb.tri(mb.v(.409,.782,.006,-1,0,0),mb.v(.409,.767,-.005,-1,0,0),mb.v(.409,.767,.017,-1,0,0));
  // Túnel, dois porta-copos, coifa sanfonada e pomo do câmbio manual.
  mb.mat(CM.INTERIOR).color(.025,.026,.028); mb.rbox(-.005,.365,.012,.76,.17,.196,.044,5);
  for(const x of [-.12,.02]){
    mb.mat(CM.INTERIOR).color(.006,.007,.008);
    mb.push(m4translate(m4(),x,.454,.012)); mb.push(m4rotZ(m4(),PI/2));
    cabinDisc(mb,0,0,0,.042,.042); cabinRing(mb,-.001,0,0,.044,.044,.004); mb.pop(); mb.pop();
  }
  mb.mat(CM.INTERIOR).color(.10,.105,.11);
  mb.push(m4translate(m4(),.20,.448,.012)); mb.push(m4rotZ(m4(),PI/2));
  cabinRing(mb,0,0,0,.073,.073,.005); mb.pop(); mb.pop();
  mb.mat(CM.INTERIOR).color(.012,.013,.015);
  mb.cyl(.20,.448,.012,.066,.545,.020,40,true,true);
  for(let k=0;k<4;k++){
    const y=.456+k*.019,r=.06-k*.010;
    const points=[];for(let j=0;j<40;j++){const a=j/40*TAU;points.push([.20+r*Math.cos(a),y,.012+r*Math.sin(a)]);}
    mb.tube(points,.0025,6,{closed:true,up:[0,1,0]});
  }
  mb.mat(CM.INTERIOR).color(.020,.021,.024); mb.rbox(.20,.573,.012,.045,.052,.046,.018,5);
  mb.mat(CM.STEEL).color(.16,.17,.18);mb.rbox(.20,.595,.012,.031,.004,.033,.002,3);
  mb.mat(CM.INTERIOR).color(.014,.015,.016);mb.rbox(-.17,.455,-.103,.29,.041,.033,.013,4);
  // Coluna de direção, alavancas de seta/limpador e forros de porta.
  mb.mat(CM.INTERIOR).color(.018,.019,.021);
  mb.tube([[.305,.845,-.36],[.53,.79,-.36]],.031,16);
  for(const sg of [-1,1]){
    // Forro completo e opaco: fecha a lateral sob o vidro, sem depender da malha externa.
    mb.mat(26,0).color(.022,.024,.027);
    mb.rbox(-.02,.625,sg*.711,1.45,.56,.028,.013,4);
    mb.mat(26,0).color(.035,.037,.041);
    mb.rbox(-.02,.910,sg*.704,1.45,.055,.043,.017,4);
    mb.mat(CM.INTERIOR).color(.012,.013,.015);
    mb.rbox(-.115,.608,sg*.688,.72,.120,.032,.015,4);
    mb.push(m4translate(m4(),.33,.423,sg*.686)); mb.push(m4rotY(m4(),-sg*PI/2));
    cabinDisc(mb,0,0,0,.067,.067); cabinRing(mb,-.002,0,0,.069,.069,.002);
    mb.pop(); mb.pop();
    mb.tube([[.36,.854,-.36+sg*.045],[.32,.863,-.36+sg*.12]],.009,8);
    mb.rbox(.315,.867,-.36+sg*.13,.041,.021,.038,.008,3);
    mb.rbox(-.15,.724,sg*.706,.65,.050,.032,.014,4);
    mb.mat(CM.STEEL).color(.12,.13,.14); mb.rbox(.075,.809,sg*.690,.056,.025,.012,.006,3);
    mb.mat(CM.INTERIOR).color(.018,.019,.021);
  }
}
// Detalhes gráficos pertencem às superfícies 3D; não cobrem a imagem da pista.
function cabinDrawAtlas(g) {
  g.save(); g.textBaseline='middle';g.textAlign='center';
  // Rádio DIN: tela, teclas de memória, dois seletores e slot de CD.
  g.fillStyle='#101113';g.fillRect(0,266,512,110);g.strokeStyle='#45474a';g.lineWidth=3;g.strokeRect(8,273,496,96);
  g.fillStyle='#07090a';g.fillRect(94,302,324,37);g.fillStyle='#a2b8b6';g.font='18px monospace';g.fillText('FM  89.5',256,321);
  g.fillStyle='#050607';g.fillRect(65,285,382,4);
  for(let i=0;i<6;i++){g.fillStyle='#25272a';g.fillRect(108+i*49,347,42,13);g.fillStyle='#a5a8aa';g.font='10px Arial';g.fillText(String(i+1),129+i*49,354);}
  for(const x of [49,463]){g.fillStyle='#08090a';g.beginPath();g.arc(x,328,26,0,TAU);g.fill();g.strokeStyle='#4b4f52';g.lineWidth=3;g.stroke();g.strokeStyle='#c8ccce';g.beginPath();g.moveTo(x,308);g.lineTo(x,315);g.stroke();}
  // Comandos do ar, com marcações e desenho dos três seletores.
  g.fillStyle='#17191b';g.fillRect(512,266,512,110);
  for(let i=0;i<3;i++){
    const x=600+i*166,y=322;
    g.strokeStyle=i===0?'#5683a6':'#85898c';g.lineWidth=3;g.beginPath();g.arc(x,y,42,Math.PI*1.15,Math.PI*1.85);g.stroke();
    if(i===0){g.strokeStyle='#a24440';g.beginPath();g.arc(x,y,42,Math.PI*1.5,Math.PI*1.85);g.stroke();}
    g.fillStyle='#090b0d';g.beginPath();g.arc(x,y,32,0,TAU);g.fill();g.strokeStyle='#36393d';g.lineWidth=2;g.stroke();
    g.strokeStyle='#989da0';g.lineWidth=7;g.beginPath();g.moveTo(x-17,y+11);g.lineTo(x+17,y-11);g.stroke();
    g.fillStyle='#a3a7a9';g.font='13px Arial';g.fillText(i===0?'TEMP':i===1?'0  1  2  3  4':'AR',x,369);
  }
  // Instrumentos: mostradores pretos, escala clara, ponteiros animados pelo shader.
  for(let dial=0;dial<2;dial++){
    const x=dial*128+64,y=448,r=59;
    g.fillStyle='#080b0f';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.strokeStyle='#62666b';g.lineWidth=1.5;g.stroke();
    for(let k=0;k<=40;k++){
      const a=(140+k*6.5)*PI/180,major=k%5===0;
      g.strokeStyle= dial===1&&k>34?'#d3473e':'#c9cdd1';g.lineWidth=major?1.7:.8;g.beginPath();g.moveTo(x+Math.cos(a)*(major?45:49),y+Math.sin(a)*(major?45:49));g.lineTo(x+Math.cos(a)*54,y+Math.sin(a)*54);g.stroke();
      if(major){g.fillStyle='#e0e3e6';g.font='8px Arial';g.fillText(String(dial===0?k*5:k/5),x+Math.cos(a)*36,y+Math.sin(a)*36);}
    }
    g.fillStyle='#aab1b8';g.font='7px Arial';g.fillText(dial===0?'km/h':'rpm x 1000',x,y+23);
  }
  g.fillStyle='#7e0610';g.fillRect(256,384,128,128);
  g.fillStyle='#e92d32';g.fillRect(262,387,116,121);
  g.fillStyle='#ffe7dc';g.font='15px Arial';g.fillText('21:05',320,403);
  g.strokeStyle='#f4b4a9';g.lineWidth=1;g.beginPath();g.moveTo(262,416);g.lineTo(378,416);g.moveTo(262,478);g.lineTo(378,478);g.stroke();
  g.font='9px Arial';g.fillText('km/h',357,470);g.fillText('90°C',286,495);g.fillText('45 km',349,495);
  g.restore();
}
