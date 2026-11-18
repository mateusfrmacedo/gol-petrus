// Civic com carroceria importada, rodas da referência ampliadas para aro 19 e recursos incorporados no HTML.
const CIVIC = {
  hubs: CIVIC_META.hubs, wheelR: CIVIC_META.wheelR, wheelbase: CIVIC_META.wheelbase,
  slotBody: 0, slotWheel: [], slotBrake: [], inp: new Float64Array(2),
  _t: m4(), _r: m4(), tris: CIVIC_META.triangles, textures: [], bg: null,
  async build() {
    const raw = Uint8Array.from(atob(CIVIC_B64), c => c.charCodeAt(0));
    const buffer = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
    this.slotBody = objSlot();
    for (let i = 0; i < 4; i++) { this.slotWheel.push(objSlot()); this.slotBrake.push(objSlot()); }
    const fam = this.fam = mkFamily('civic', { src: 'mat_civic', noCube: true, cull: 'none' });
    const set = this.set = new MeshSet(fam);
    const mul = mkFwdFamily('civicGlassMul', { src: 'civic_glass', defs: { GLASS_MUL: '' }, blend: { color: { srcFactor: 'dst', dstFactor: 'zero' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } });
    const add = mkFwdFamily('civicGlassAdd', { src: 'civic_glass', defs: { GLASS_ADD: '' }, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } });
    const glass = this.glass = { items: [], bg: null, draw(pass) {
      if (VEHICLES.current !== 'civic' || !mul.pipe || !add.pipe) return;
      if (!this.bg) this.bg = fwdBindGroup(mul);
      pass.setBindGroup(3, this.bg);
      for (let k = 0; k < 2; k++) {
        pass.setPipeline(k ? add.pipe : mul.pipe);
        for (const it of this.items) {
          R.dyn2[0] = it.slot * 256; pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1);
          pass.setVertexBuffer(0, it.mesh.vb); pass.setIndexBuffer(it.mesh.ib, 'uint32'); pass.drawIndexed(it.mesh.count);
        }
      }
    } };
    for (const p of CIVIC_META.parts) {
      const vertices = new Float32Array(buffer, p.offset, p.nv * 8);
      const indices = new Uint32Array(buffer, p.offset + p.nv * 32, p.ni);
      const mb = new MeshBuilder(p.nv); mb.mat(p.mat).color(1, 1, 1);
      for (let i = 0; i < vertices.length; i += 8) mb.v(vertices[i], vertices[i + 1], vertices[i + 2], vertices[i + 3], vertices[i + 4], vertices[i + 5], vertices[i + 6], vertices[i + 7]);
      mb.idx = new Uint32Array(indices); mb.ni = indices.length;
      const slot = p.dest === 0 ? this.slotBody : p.dest <= 4 ? this.slotWheel[p.dest - 1] : this.slotBrake[p.dest - 5];
      const mesh = mb.upload();
      if (p.mat === 0 || p.mat === 1 || p.mat === 13) glass.items.push({ mesh, slot });
      else set.add(mesh, slot, 3);
    }
    for (const image of CIVIC_IMAGES) {
      const bytes = Uint8Array.from(atob(image.data), c => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), { colorSpaceConversion: 'none' });
      const format = image.normal ? 'rgba8unorm' : 'rgba8unorm-srgb';
      const levels = 1 + Math.floor(Math.log2(Math.max(bmp.width, bmp.height)));
      const tex = mkTex(bmp.width, bmp.height, format, TU.RT | TU.TB | TU.CD, { mipLevelCount: levels });
      G.dev.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [bmp.width, bmp.height]);
      genMips(tex, format); bmp.close(); this.textures.push(tex);
    }
    R.drawables.push({ draw: (pass, ctx) => {
      if (VEHICLES.current !== 'civic' || (ctx.kind === KIND.SHADOW && ctx.cascade === 3)) return;
      if (!this.bg) {
        if (!fam.bgl3) return;
        this.bg = G.dev.createBindGroup({ layout: fam.bgl3, entries: this.textures.map((t, binding) => ({ binding, resource: t.createView() })) });
      }
      pass.setBindGroup(3, this.bg); set.draw(pass, ctx);
    } });
    R.transparents.push(glass);
    const body = m4(), zero = new Float32Array(4); this.place(body, zero, zero); this.place(body, zero, zero);
  },
  place(body, spin, susp) {
    objPrev(this.slotBody).set(objModel(this.slotBody)); objModel(this.slotBody).set(body);
    const t = this._t, r = this._r;
    for (let i = 0; i < 4; i++) {
      const h = this.hubs[i], left = (i & 1) === 0;
      const angle = -(i < 2 ? this.inp[0] : 0) + (left ? PI : 0);
      m4rotY(t, angle); t[12] = h[0]; t[13] = h[1] + susp[i]; t[14] = h[2];
      const brake = this.slotBrake[i]; objPrev(brake).set(objModel(brake)); m4mul(objModel(brake), body, t);
      m4rotZ(r, left ? spin[i] : -spin[i]); m4mul(t, t, r);
      const slot = this.slotWheel[i]; objPrev(slot).set(objModel(slot)); m4mul(objModel(slot), body, t);
    }
  },
};
BUILD.push(() => CIVIC.build());
