// Montagem do carro, contrato com o jogo (CAR) e visualizador isolado (?scene=car).
const CAR = {
  wheelbase: GOL_META.axf * 2, trackF: GOL_META.track, trackR: GOL_META.track, wheelR: GOL_META.wheelR,
  hubs: GOL_META.hubs || [[1.2335, 0.298, -0.728], [1.2335, 0.298, 0.728], [-1.2335, 0.298, -0.728], [-1.2335, 0.298, 0.728]],
  slotBody: 0, slotWheel: [0, 0, 0, 0], slotSteer: 0, slotRoof: null, slotDeflector: null,
  steerMat: m4(), tris: 0, _t: m4(), _t2: m4(), _t3: m4(), set: null, glass: null, atlasBG: null, fam: null, driver: null,
  build() {
    const fam = CAR.fam = mkFamily('car', { src: 'mat_car', noCube: true, defs: { NO_WET: '' } });
    CAR.slotBody = objSlot(); for (let i = 0; i < 4; i++) CAR.slotWheel[i] = objSlot(); CAR.slotSteer = objSlot(); CAR.slotRoof = objSlot(); CAR.slotDeflector = objSlot();
    const set = CAR.set = new MeshSet(fam), glass = CAR.glass = new GlassSet();
    const mb = new MeshBuilder(1 << 18), gl = new MeshBuilder(1 << 14);
    const driver = new MeshBuilder(1 << 14);
    carBuildBody(mb, gl, driver, true);
    const roof=new MeshBuilder(), roofGlass=new MeshBuilder(), deflector=new MeshBuilder();
    carBuildSunroof(roof,roofGlass,deflector);
    set.add(roof.upload(),CAR.slotRoof,3);glass.add_(roofGlass.upload(),CAR.slotRoof);
    CAR.deflector=set.add(deflector.upload(),CAR.slotDeflector,3);
    if (typeof carBuildParts === 'function') carBuildParts(mb, gl);
    CAR.tris = (mb.ni + gl.ni + roof.ni + roofGlass.ni + deflector.ni) / 3;
    set.add(mb.upload(), CAR.slotBody, 3); glass.add_(gl.upload(), CAR.slotBody);
    if (typeof carBuildWheel === 'function') {
      const w = new MeshBuilder(1 << 15), wb = new MeshBuilder(1 << 11); carBuildWheel(w, wb); const wm = w.upload(), wbm = wb.upload(); CAR.tris += 4 * (w.ni + wb.ni) / 3;
      for (let i = 0; i < 4; i++) { set.add(wm, CAR.slotWheel[i], 3); set.add(wbm, CAR.slotWheel[i], 1); }   // disco de borrão: só no passe principal
    }
    carBuildDriver(driver); CAR.driver = set.add(driver.upload(), CAR.slotBody, 3); CAR.tris += driver.ni / 3;
    if (typeof carBuildSteer === 'function') { const s = new MeshBuilder(1 << 12); carBuildSteer(s); CAR.tris += s.ni / 3; set.add(s.upload(), CAR.slotSteer, 3); }
    const tex = typeof carAtlas === 'function' ? carAtlas() : mkTex(4, 4, 'rgba8unorm-srgb');
    // desenhável: liga o atlas (grupo 3) e não entra no mapa de sombras estático do mundo
    R.drawables.push({ draw(pass, ctx) {
      if (VEHICLES.current !== 'gol') return;
      if (ctx.kind === KIND.SHADOW && ctx.cascade === 3) return;
      if (!CAR.atlasBG) { if (!fam.bgl3) return; CAR.atlasBG = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: tex.createView() }, { binding: 1, resource: GOL.foto.createView() }, { binding: 2, resource: CABIN_IMAGES.texture.createView() }] }); }
      CAR.driver.flags = objParams(CAR.slotBody)[3] > .5 ? 2 : 3;
      pass.setBindGroup(3, CAR.atlasBG); set.draw(pass, ctx);
    } });
    R.transparents.push({ draw(pass) { if (VEHICLES.current === 'gol') glass.draw(pass); } });
    m4ident(CAR._t); CAR.place(CAR._t, CAR._z4, CAR._z4); CAR.place(CAR._t, CAR._z4, CAR._z4);
  },
  _z4: new Float32Array(4),
  // escreve as matrizes de todos os slots (e guarda as anteriores para os vetores de movimento). Sem alocação.
  // steer (ângulo das rodas dianteiras, + = direita) e ângulo do volante vêm de CAR.inp[0..1]: nenhum número passa por
  // argumento (o V8 poria cada um em caixa na heap a cada chamada).
  inp: new Float64Array(2),
  place(body, spin, susp) {
    const steer = CAR.inp[0], steerWheelAngle = CAR.inp[1];
    const t = CAR._t2, t2 = CAR._t3;
    if (CAR.slotRoof !== null) {
      if(CAR.deflector)CAR.deflector.flags=SUNROOF.value>.005?3:0;
      objPrev(CAR.slotRoof).set(objModel(CAR.slotRoof));SUNROOF.matrix(t);m4mul(objModel(CAR.slotRoof),body,t);
      objPrev(CAR.slotDeflector).set(objModel(CAR.slotDeflector));SUNROOF.matrix(t,true);m4mul(objModel(CAR.slotDeflector),body,t);
    }
    objPrev(CAR.slotBody).set(objModel(CAR.slotBody)); objModel(CAR.slotBody).set(body);
    for (let i = 0; i < 4; i++) {
      const s = CAR.slotWheel[i], h = CAR.hubs[i], left = (i & 1) === 0;
      objPrev(s).set(objModel(s));
      // roda: T(cubo + suspensão) · Ry(esterço [+π à esquerda]) · Rz(giro)
      const a = -(i < 2 ? steer : 0) + (left ? PI : 0), c = Math.cos(a), sn = Math.sin(a);
      const g = left ? spin[i] : -spin[i], cg = Math.cos(g), sg = Math.sin(g);
      // Ry(a) * Rz(g)
      t[0] = c * cg; t[1] = sg; t[2] = -sn * cg; t[3] = 0;
      t[4] = -c * sg; t[5] = cg; t[6] = sn * sg; t[7] = 0;
      t[8] = sn; t[9] = 0; t[10] = c; t[11] = 0;
      t[12] = h[0]; t[13] = h[1] + susp[i]; t[14] = h[2]; t[15] = 1;
      m4mul(objModel(s), body, t);
    }
    objPrev(CAR.slotSteer).set(objModel(CAR.slotSteer));
    const ca = Math.cos(steerWheelAngle), sa = Math.sin(steerWheelAngle); t2.fill(0); t2[0] = 1; t2[5] = ca; t2[6] = sa; t2[9] = -sa; t2[10] = ca; t2[15] = 1;
    m4mul(t, CAR.steerMat, t2); m4mul(objModel(CAR.slotSteer), body, t);
  },
};
BUILD.push(async () => {
  CAR.build();
  if (GAME.mode === 'car') {
    buildTestGround();
    // vistas do visualizador (#carro-N): 3/4 dianteira esq., 3/4 traseira dir., lateral, frente, traseira, de cima
    const CV = [[4.6, 1.35, -3.4, 0.1, 0.62, 0, 0.5], [-4.8, 1.5, 3.2, -0.2, 0.62, 0, 0.5], [0.05, 0.9, -7.5, 0.05, 0.7, 0, 0.5], [6.5, 0.9, 0.0, 0, 0.62, 0, 0.36], [-6.5, 1.0, 0.0, 0, 0.62, 0, 0.36], [3.0, 4.2, -3.0, 0, 0.7, 0, 0.7], [2.6, 0.75, -1.9, 1.2, 0.5, -0.4, 0.45]];
    const cv = CV[+(Q.get('carcam') || 0)] || CV[0];
    GAME.init = () => { setCamera(cv[0], cv[1], cv[2], cv[3], cv[4], cv[5], cv[6]); R.cube.pos.set([0, 0.9, 0]); };
    window.__car = CAR;
  }
});
