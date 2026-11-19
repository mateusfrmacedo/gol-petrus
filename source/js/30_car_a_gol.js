// VW Gol G6 (2016+, 4 portas, branco) — a malha vem do pipeline em modelo/ (campo de distância + Blender) e entra aqui
// compactada (zlib) em GOL_B64 (arquivo 30_car_a0_data.js, gerado por modelo/emit_js.py). Referencial do carro: origem no
// chão sob o centro do entre-eixos; X frente, Y cima, Z direita. Unidades: metros.
const CM = { PAINT: 1, PLASTIC: 2, RUBBER: 3, TIRE: 4, HUBCAP: 5, STEEL: 6, CHROME: 7, INTERIOR: 8, LENS: 9, ALU: 10, STRAP: 11, DECAL: 12, UNDER: 13, REFLECTOR: 14, MIRROR: 15, GRILLE: 16, GLOSS: 17, GOL: 18, RIM: 19 };
const GOL = { parts: null };
// lê o binário: por peça (dest, mat, pa, cor, classes?, nV, nI) e depois posições/normais/índices em deltas de 16 bits
async function golDecode() {
  const bin = Uint8Array.from(atob(GOL_B64), c => c.charCodeAt(0));
  const ds = new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate'));
  const buf = new Uint8Array(await new Response(ds).arrayBuffer());
  const dv = new DataView(buf.buffer);
  const n = dv.getUint32(0, true); let o = 4; const hdr = [];
  for (let i = 0; i < n; i++) {
    hdr.push({ dest: buf[o], mat: buf[o + 1], pa: buf[o + 2], col: [buf[o + 3] / 255, buf[o + 4] / 255, buf[o + 5] / 255], hasCls: buf[o + 6], nV: dv.getUint32(o + 7, true), nI: dv.getUint32(o + 11, true) });
    o += 15;
  }
  const u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; };
  for (const [partIndex,p] of hdr.entries()) {
    p.sourceIndex=partIndex;
    const P = p.pos = new Float32Array(p.nV * 3), N = p.nrm = new Float32Array(p.nV * 3), I = p.idx = new Uint32Array(p.nI);
    let ax = 0, ay = 0, az = 0;
    for (let i = 0; i < p.nV; i++) {
      ax = (ax + u16()) & 0xffff; ay = (ay + u16()) & 0xffff; az = (az + u16()) & 0xffff;
      P[i * 3] = ((ax << 16) >> 16) / 8192; P[i * 3 + 1] = ((ay << 16) >> 16) / 8192; P[i * 3 + 2] = ((az << 16) >> 16) / 8192;
    }
    let ox = 0, oy = 0;
    for (let i = 0; i < p.nV; i++) {
      ox = (ox + u16()) & 0xffff; oy = (oy + u16()) & 0xffff;
      let x = ((ox << 16) >> 16) / 32767, y = ((oy << 16) >> 16) / 32767, z = 1 - Math.abs(x) - Math.abs(y);
      if (z < 0) { const tx = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1), ty = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1); x = tx; y = ty; }
      const l = Math.hypot(x, y, z) || 1; N[i * 3] = x / l; N[i * 3 + 1] = y / l; N[i * 3 + 2] = z / l;
    }
    let a = 0; for (let i = 0; i < p.nI; i++) { a = (a + u16()) & 0xffff; I[i] = a; }
    if (p.hasCls & 1) { p.cls = buf.slice(o, o + p.nI / 3); o += p.nI / 3; }
    if (p.hasCls & 2) {   // coordenadas de textura (insertos fotográficos), 16 bits em deltas
      const U = p.uv = new Float32Array(p.nV * 2); let au = 0, av = 0;   // u e v intercalados, cada um com seu acumulador
      for (let i = 0; i < p.nV; i++) { au = (au + u16()) & 0xffff; av = (av + u16()) & 0xffff; U[i * 2] = au / 65535; U[i * 2 + 1] = av / 65535; }
    }
  }
  GOL.parts = hdr;
}
BUILD.push(golDecode);
// textura dos insertos fotográficos (frente e traseira), decodificada pelo navegador
async function golFotoTex() {
  const bin = Uint8Array.from(atob(GOL_FOTO_WEBP), c => c.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([bin], { type: 'image/webp' }), { colorSpaceConversion: 'none' });
  const tex = mkTex(bmp.width, bmp.height, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 5 });
  G.dev.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [bmp.width, bmp.height]);
  genMips(tex, 'rgba8unorm-srgb'); GOL.foto = tex;
}
BUILD.push(golFotoTex);
// joga triângulos de uma peça no construtor: off = deslocamento ao longo da normal; flip inverte faces e normais
function golEmit(mb, p, triMask, off, flip) {
  const P = p.pos, N = p.nrm, I = p.idx, map = new Int32Array(p.nV).fill(-1), nT = p.nI / 3, s = flip ? -1 : 1;
  for (let t = 0; t < nT; t++) {
    if (triMask && !triMask(t)) continue;
    const r = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const i = I[t * 3 + k];
      if (map[i] < 0) map[i] = mb.v(P[i * 3] + N[i * 3] * off, P[i * 3 + 1] + N[i * 3 + 1] * off, P[i * 3 + 2] + N[i * 3 + 2] * off, N[i * 3] * s, N[i * 3 + 1] * s, N[i * 3 + 2] * s, p.uv ? p.uv[i * 2] : 0, p.uv ? p.uv[i * 2 + 1] : 0);
      r[k] = map[i];
    }
    if (flip) mb.tri(r[0], r[2], r[1]); else mb.tri(r[0], r[1], r[2]);
  }
}
// carroceria (com as regiões pintadas no shader), vidros, lentes, forro interno e peças presas à carroceria
// Banco e encosto de cabeça do motorista no modelo importado: a câmera fica no seu volume.
// É separado junto ao piloto para aparecer por fora, sem atravessar os olhos na cabine.
function carDriverSeat(p, t) {
  if (p.dest !== 0 || p.mat !== 21) return false;
  for (let k = 0; k < 3; k++) {
    const i = p.idx[t * 3 + k] * 3, x = p.pos[i], y = p.pos[i + 1], z = p.pos[i + 2];
    if (x < -.15 || x > .10 || y < .71 || y > 1.20 || z < -.61 || z > -.12) return false;
  }
  return true;
}
// Subtrai apenas o volume do painel antigo. Triângulos que atravessam o limite
// são divididos: a parte do forro das portas e das colunas permanece intacta.
function carEmitCabinReplacement(mb, p, driver) {
  const bounds = [[0,-.12,1],[0,1.08,-1],[1,.77,1],[1,.97,-1],[2,-.72,1],[2,.72,-1]];
  const emit = (builder, poly) => {
    if (poly.length < 3) return;
    const ids = poly.map(v => builder.v(...v));
    for (let k = 1; k + 1 < ids.length; k++) builder.tri(ids[0], ids[k], ids[k + 1]);
  };
  driver.mat(p.mat,p.pa).color(...p.col);
  for (let t = 0; t < p.nI / 3; t++) {
    let poly = [];
    for (let k = 0; k < 3; k++) {
      const i = p.idx[t * 3 + k], o = i * 3;
      poly.push([p.pos[o],p.pos[o+1],p.pos[o+2],p.nrm[o],p.nrm[o+1],p.nrm[o+2],p.uv ? p.uv[i*2] : 0,p.uv ? p.uv[i*2+1] : 0]);
    }
    if (carDriverSeat(p,t)) { emit(driver,poly); continue; }
    for (const [axis,edge,sign] of bounds) {
      if (!poly.length) break;
      const inside = [], outside = [];
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k], b = poly[(k+1)%poly.length], da = (a[axis]-edge)*sign, db = (b[axis]-edge)*sign;
        (da >= 0 ? inside : outside).push(a);
        if ((da >= 0) !== (db >= 0)) {
          const u = da / (da-db), v = a.map((value,i) => value+(b[i]-value)*u);
          inside.push(v); outside.push(v);
        }
      }
      emit(mb,outside); poly = inside;
    }
  }
}
function carBuildBody(mb, gl, driver, separateRoof = false) {
  for (const p of GOL.parts) {
    if (separateRoof && golRoofPart(p)) continue;
    if (p.dest !== 0 && p.dest !== 1) continue;
    if (p.cls) {
      const c = p.cls;
      mb.mat(CM.GOL, 0).color(1, 1, 1); golEmit(mb, p, t => c[t] & 1, 0, false);
      mb.mat(CM.INTERIOR, 0).color(0.055, 0.056, 0.06); golEmit(mb, p, t => c[t] & 16, -0.028, true);
      mb.mat(CM.INTERIOR, 1).color(0.2, 0.2, 0.195); golEmit(mb, p, t => c[t] & 32, -0.028, true);
      gl.mat(0).color(0.16, 0.175, 0.18); golEmit(gl, p, t => c[t] & 2, -0.004, false);        // vidros com película escura
      gl.mat(1).color(0.93, 0.95, 0.96); golEmit(gl, p, t => c[t] & 4, 0.003, false);          // lente do farol
      gl.mat(1).color(0.97, 0.93, 0.93); golEmit(gl, p, t => c[t] & 8, 0.0025, false);         // lente da lanterna
      continue;
    }
    const b = p.dest === 0 ? mb : gl;
    b.mat(p.mat, p.pa).color(p.col[0], p.col[1], p.col[2]);
    if (driver && p.dest === 0 && p.mat === 21) {
      carEmitCabinReplacement(b,p,driver);
    } else golEmit(b, p, null, 0, false);
  }
}
// roda de liga 17" com pneu 205/40: eixo Z local, face externa em +Z
function carBuildWheel(mb, mbBlur) {
  for (const p of GOL.parts) {
    if (p.dest !== 2 && p.dest !== 3) continue;
    const b = p.dest === 2 ? mb : (mbBlur || mb);
    b.mat(p.mat, p.pa).color(p.col[0], p.col[1], p.col[2]); golEmit(b, p, null, 0, false);
  }
}
