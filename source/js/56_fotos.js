// Fotos de conferência (index.html?fotos=1): câmeras fixas nos lugares modelados de Nova Aliança em três horários,
// montadas numa folha só. A folha pode ser guardada como referência (no navegador) e comparada com a próxima rodada:
// cada foto ganha a porcentagem de pixels que mudaram e um mapa das diferenças. No circuito usa as poses fixas do carro.
const FOTOS = {
  on: Q.has('fotos'), horas: [10, 18.35, 21], tw: 480, th: 270, shots: [], sheet: null, ref: null, scores: null, done: false,
};
// câmera do outro lado da rua, em três quartos: descobre de que lado do lote fica a rua (eixo u do quadro do lugar),
// recua até a calçada oposta e olha o centro da fachada
function fotoCamLugar(nome, M, recuo, alt, alvoY, lado) {
  const D = M.D || 20, W = M.W || 15; let best = 1, bd = 1e9;
  for (const sg of [1, -1]) { const r = nearestChain(M.ox + M.ux * sg * (D / 2 + 6), M.oz + M.uz * sg * (D / 2 + 6)); if (r && r.d < bd) { bd = r.d; best = sg; } }
  const fx = M.ox + M.ux * best * D / 2, fz = M.oz + M.uz * best * D / 2;            // centro da fachada
  const ex = fx + M.ux * best * recuo + M.zx * W * (lado || 0.35), ez = fz + M.uz * best * recuo + M.zz * W * (lado || 0.35);
  return { nome, eye: [ex, terrainH(ex, ez) + alt, ez], alvo: [fx, terrainH(fx, fz) + alvoY, fz], fov: 0.9 };
}
function fotoCams() {
  if (!CITY.on) return null;
  const L = [];
  if (MARCOS.borghi) L.push(fotoCamLugar('Borghi Veículos', MARCOS.borghi, 16, 2.0, 2.6));
  if (MARCOS.sacoi) L.push(fotoCamLugar('Supermercado Sacoi', MARCOS.sacoi, 30, 2.5, 3.5));
  if (MARCOS.matriz) {   // de dentro da praça, no lado leste, olhando a fachada e a torre da igreja (oeste)
    const M = MARCOS.matriz, vm = (M.v0 + M.v1) / 2, e = M.at(M.u1 + 8, vm - 6), t = M.at(M.u0 + 10, vm);
    if (M.church) { const ch = M.church, p = M.at(ch.u, ch.v), fx = p[0] + M.ex * ch.D / 2, fz = p[1] + M.ez * ch.D / 2, ex2 = fx + M.ex * 13 + M.sx * 1.5, ez2 = fz + M.ez * 13 + M.sz * 1.5;
      L.push({ nome: 'Igreja Matriz', eye: [ex2, terrainH(ex2, ez2) + 1.8, ez2], alvo: [fx, terrainH(fx, fz) + 10.5, fz], fov: 1.25 }); }
    L.push({ nome: 'Praça Matriz', eye: [e[0], terrainH(e[0], e[1]) + 9, e[1]], alvo: [t[0], terrainH(t[0], t[1]) + 7, t[1]], fov: 1.0 });
  }
  if (MARCOS.petrus) L.push(fotoCamLugar('Casa do Petrus', MARCOS.petrus, 13, 1.8, 2.2));
  { const h = CITY.houses.find(h => h.shop === 'Prisma'); if (h) { const fx = h.x - h.nx * h.d / 2, fz = h.z - h.nz * h.d / 2, ex = fx - h.nx * 13 + h.fx * 4, ez = fz - h.nz * 13 + h.fz * 4;
    L.push({ nome: 'Papelaria Prisma', eye: [ex, terrainH(ex, ez) + 1.7, ez], alvo: [fx, terrainH(fx, fz) + 2.6, fz], fov: 0.8 }); } }
  if (MARCOS.entrada) {   // pórtico de quem chega pela rodovia e as letras no campo
    const E = MARCOS.entrada, P = E.P, ex = P.x - P.ux * 38 - P.vx * P.dl, ez = P.z - P.uz * 38 - P.vz * P.dl;
    L.push({ nome: 'Entrada (pórtico)', eye: [ex, terrainH(ex, ez) + 1.7, ez], alvo: [P.x, terrainH(P.x, P.z) + 4.5, P.z], fov: 0.95 });
    const T = E.L, lx = T.x + T.nx * 26, lz = T.z + T.nz * 26;
    L.push({ nome: 'Letreiro Nova Aliança', eye: [lx, terrainH(lx, lz) + 1.7, lz], alvo: [T.x, terrainH(T.x, T.z) + 1.3, T.z], fov: 0.8 });
  }
  // rua: vista do alto de um cruzamento urbano (postes, calçadas, placas)
  const c = CITY.cams[Math.floor(CITY.cams.length / 3)];
  if (c) { const s = CITY.spawn, o = new Float64Array(5); chainAt(s.ch, s.s, o); L.push({ nome: 'Rua (partida)', eye: [o[0] - o[2] * 14, o[4] + 3.2, o[1] - o[3] * 14], alvo: [o[0] + o[2] * 30, o[4] + 1, o[1] + o[3] * 30], fov: 1.0 }); }
  return L;
}
const fotoEspera = ms => new Promise(r => setTimeout(r, ms));
async function fotosRun() {
  const cams = fotoCams(), W = FOTOS.tw, H = FOTOS.th;
  const lista = cams ? FOTOS.horas.flatMap(h => cams.map(c => ({ h, c }))) : POSES.slice(0, 3).map((p, i) => ({ h: 16, pose: i, nome: p.nome }));
  const cols = cams ? cams.length : 3, rows = Math.ceil(lista.length / cols);
  const sheet = document.createElement('canvas'); sheet.width = cols * W; sheet.height = rows * H;
  const g = sheet.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height);
  TOD.rate = 0; GS.frozen = true;
  CLIMA.real = false; CLIMA.tipo = 'ensolarado'; Object.assign(CLIMA.cur, CLIMA_TIPOS.ensolarado); CLIMA.flash = 0;   // sempre o mesmo tempo, para comparar rodadas
  let hora = -1;
  for (let i = 0; i < lista.length; i++) {
    const it = lista[i];
    if (it.h !== hora) {
      hora = it.h; todSet(hora, true); renderStaticShadow();
      __cap.frames(24); await computeSH(); __cap.frames(8); await computeSH();
    }
    if (it.pose !== undefined) __cap.pose(it.pose);
    else { const c = it.c; __cap.cam(c.eye[0], c.eye[1], c.eye[2], c.alvo[0], c.alvo[1], c.alvo[2], c.fov); }
    __cap.frames(14);
    const x = (i % cols) * W, y = Math.floor(i / cols) * H;
    g.drawImage(G.canvas, x, y, W, H);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y + H - 22, W, 22); g.fillStyle = '#fff'; g.font = '13px system-ui,sans-serif';
    g.fillText((it.c ? it.c.nome : it.nome) + ' · ' + todFmt(it.h), x + 8, y + H - 7);
    FOTOS.shots.push({ nome: it.c ? it.c.nome : it.nome, hora: todFmt(it.h), x, y });
    await fotoEspera(0);
  }
  FOTOS.sheet = sheet; FOTOS.cols = cols;
  try { FOTOS.ref = localStorage.getItem('gol-fotos-ref'); } catch (e) { FOTOS.ref = null; }
  if (FOTOS.ref) FOTOS.scores = await fotosCompara(FOTOS.ref);
  FOTOS.done = true; window.__fotos = FOTOS; fotosTela();
}
// porcentagem de pixels que mudaram (diferença de cor acima de um limiar) em cada foto, e o mapa das diferenças
async function fotosCompara(refUrl) {
  const img = new Image(); img.src = refUrl; await img.decode();
  const S = FOTOS.sheet, w = S.width, h = S.height;
  if (img.width !== w || img.height !== h) return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const a = g.getImageData(0, 0, w, h), b = S.getContext('2d').getImageData(0, 0, w, h), d = g.createImageData(w, h);
  const scores = FOTOS.shots.map(() => 0), W = FOTOS.tw, H = FOTOS.th;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, e = Math.abs(a.data[o] - b.data[o]) + Math.abs(a.data[o + 1] - b.data[o + 1]) + Math.abs(a.data[o + 2] - b.data[o + 2]);
    const v = Math.min(255, e * 2); d.data[o] = v; d.data[o + 1] = v * 0.25; d.data[o + 2] = 0; d.data[o + 3] = 255;
    if (e > 48 && (y % H) < H - 22) scores[Math.floor(y / H) * FOTOS.cols + Math.floor(x / W)]++;
  }
  g.putImageData(d, 0, 0); FOTOS.diff = c;
  return scores.map(n => +(100 * n / (W * (H - 22))).toFixed(2));
}
function fotosTela() {
  const S = FOTOS.sheet, box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;z-index:50;background:#111;color:#eee;overflow:auto;font:14px system-ui,sans-serif;padding:12px';
  const bt = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'margin:0 8px 10px 0;padding:.45em .9em;font:inherit;color:#fff;background:#25282d;border:1px solid #777;border-radius:.4em;cursor:pointer'; b.onclick = f; return b; };
  const img = new Image(); img.src = S.toDataURL('image/png'); img.style.cssText = 'max-width:100%;display:block';
  const info = document.createElement('p');
  if (FOTOS.scores) info.textContent = 'Mudança em relação à referência: ' + FOTOS.shots.map((s, i) => `${s.nome} ${s.hora}: ${FOTOS.scores[i]}%`).join(' · ');
  else info.textContent = FOTOS.ref ? 'A referência guardada tem outro tamanho; guarde esta rodada como nova referência.' : 'Nenhuma referência guardada ainda. Guarde esta rodada para comparar as próximas.';
  let mostrandoDiff = false;
  box.append(
    bt('Baixar PNG', () => { const a = document.createElement('a'); a.href = img.src; a.download = 'fotos-gol-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.png'; a.click(); }),
    bt('Guardar como referência', () => { try { localStorage.setItem('gol-fotos-ref', S.toDataURL('image/jpeg', 0.82)); info.textContent = 'Referência guardada neste navegador.'; } catch (e) { info.textContent = 'Não coube no armazenamento do navegador: baixe o PNG.'; } }),
  );
  if (FOTOS.diff) box.append(bt('Mostrar / ocultar diferenças', () => { mostrandoDiff = !mostrandoDiff; img.src = (mostrandoDiff ? FOTOS.diff : S).toDataURL('image/png'); }));
  box.append(info, img); document.body.appendChild(box);
}
if (FOTOS.on) { const t = setInterval(() => { if (GAME.ready) { clearInterval(t); fotosRun().catch(e => { console.error('fotos: ' + e); FOTOS.erro = String((e && e.stack) || e); FOTOS.cidade = CITY.on; window.__fotos = FOTOS; }); } }, 300); }
