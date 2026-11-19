// Interior editável no Blender, reimportado no mesmo formato de vértices do jogo.
// As peças continuam separadas na fonte; no navegador são combinadas nos lotes existentes.
const GOL_REFINED = { ready: false, bytes: null };
BUILD.push(async () => {
  const raw = Uint8Array.from(atob(GOL_REFINED_B64), c => c.charCodeAt(0));
  GOL_REFINED.bytes = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
  for (const p of GOL_REFINED_META.parts) {
    if (p.offset + p.nv * 32 + p.ni * 4 > GOL_REFINED.bytes.byteLength) throw new Error('Interior do Gol: malha incompleta');
  }
  GOL_REFINED.ready = true;
});
function golRefinedEmit(mb, target) {
  for (const p of GOL_REFINED_META.parts) {
    if (p.target !== target) continue;
    mb.part(p.name); mb.mat(p.mat, p.pa).color(p.color[0], p.color[1], p.color[2]);
    const vertices = new Float32Array(GOL_REFINED.bytes, p.offset, p.nv * 8);
    const indices = new Uint32Array(GOL_REFINED.bytes, p.offset + p.nv * 32, p.ni), base = mb.nv;
    for (let i = 0; i < vertices.length; i += 8) mb.v(vertices[i], vertices[i+1], vertices[i+2], vertices[i+3], vertices[i+4], vertices[i+5], vertices[i+6], vertices[i+7]);
    for (let i = 0; i < indices.length; i += 3) mb.tri(base+indices[i], base+indices[i+1], base+indices[i+2]);
  }
  mb.part(null);
}
