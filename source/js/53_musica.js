// Rádio de MP3 da pasta musica no GitHub. O som do motor continua independente (M).
const MUSIC = { audio: null, tracks: [], index: -1, wanted: false, loading: null, token: 0, status: null, shuffle: false, hist: [] };
function musicNotice(text) {
  if (!MUSIC.status) {
    const el = document.createElement('div'); el.id = 'music-status'; el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;bottom:24px;left:24px;max-width:65vw;padding:10px 14px;border-radius:8px;background:#111d;color:white;font:14px Arial;pointer-events:none;z-index:30';
    document.body.append(el); MUSIC.status = el;
  }
  MUSIC.status.textContent = text; MUSIC.status.hidden = false;
  clearTimeout(MUSIC.hideTimer); MUSIC.hideTimer = setTimeout(() => { MUSIC.status.hidden = true; }, 4500);
}
function musicInit() {
  MUSIC.audio = new Audio(); MUSIC.audio.preload = 'none'; MUSIC.audio.volume = 0.45;
  MUSIC.audio.addEventListener('ended', () => musicNext());
  for (const ev of ['play', 'pause', 'emptied']) MUSIC.audio.addEventListener(ev, musicBar);
  try { MUSIC.shuffle = localStorage.getItem('gol-aleatorio') === '1'; } catch (e) { /* sem armazenamento */ }
  const $m = id => document.getElementById(id);
  if ($m('music-bar')) {
    $m('mus-prev').onclick = () => void musicPrev(); $m('mus-next').onclick = () => void musicNext(); $m('mus-play').onclick = () => musicToggle(); $m('mus-shuf').onclick = () => musicShuffle();
    setInterval(musicBar, 500);
  }
  MUSIC.audio.addEventListener('error', () => { MUSIC.wanted = false; musicNotice('Não foi possível tocar esta faixa. Use 0 para a próxima.'); });
  // A API reflete novos uploads mesmo sem reconstruir o HTML. Manifesto local como reserva.
  MUSIC.loading = (async () => {
    let names = [];
    try {
      const response = await fetch('https://api.github.com/repos/mateusfrmacedo/gol-petrus/contents/musica?ref=main', {cache: 'no-store', signal: AbortSignal.timeout(7000)});
      if (!response.ok) throw new Error('playlist');
      const files = await response.json();
      names = files.filter(f => f.type === 'file' && /\.mp3$/i.test(f.name)).map(f => f.name);
    } catch (_) {
      try { const r = await fetch('musica/playlist.json', {cache: 'no-cache'}); if (r.ok) names = await r.json(); } catch (_) { /* pasta ainda vazia ou offline */ }
    }
    MUSIC.tracks = names.filter(n => typeof n === 'string' && !n.includes('/') && /\.mp3$/i.test(n)).sort((a, b) => a.localeCompare(b, 'pt-BR', {numeric: true}));
  })();
}
async function musicPlay(token) {
  await MUSIC.loading;
  if (token !== MUSIC.token || !MUSIC.wanted) return;
  if (!MUSIC.tracks.length) { MUSIC.wanted = false; musicNotice('Adicione arquivos MP3 à pasta musica no GitHub e recarregue o jogo.'); return; }
  if (MUSIC.index < 0) musicSelect(0);
  try {
    await MUSIC.audio.play();
    if (token !== MUSIC.token || !MUSIC.wanted) return;
    musicNotice(musicName() + ' · P pausa · 0 próxima · 9 anterior');
  } catch (_) { if (token === MUSIC.token) { MUSIC.wanted = false; musicNotice('Pressione P para tentar tocar a música.'); } }
}
function musicSelect(index) {
  MUSIC.index = index % MUSIC.tracks.length;
  MUSIC.audio.src = new URL('musica/' + encodeURIComponent(MUSIC.tracks[MUSIC.index]), document.baseURI).href;
}
function musicToggle() {
  if (!MUSIC.audio) return;
  const token = ++MUSIC.token; MUSIC.wanted = !MUSIC.wanted;
  if (MUSIC.wanted) void musicPlay(token);
  else { MUSIC.audio.pause(); musicNotice('Música pausada · P continua · 0 próxima'); }
}
async function musicNext() {
  if (!MUSIC.audio) return;
  const token = ++MUSIC.token; await MUSIC.loading;
  if (token !== MUSIC.token) return;
  if (!MUSIC.tracks.length) { musicNotice('A pasta musica ainda não tem arquivos MP3.'); return; }
  if (MUSIC.index >= 0) MUSIC.hist.push(MUSIC.index);
  let n = MUSIC.index + 1;
  if (MUSIC.shuffle && MUSIC.tracks.length > 1) { const recentes = new Set(MUSIC.hist.slice(-Math.min(MUSIC.tracks.length - 1, 8)).concat(MUSIC.index)); do n = Math.floor(Math.random() * MUSIC.tracks.length); while (recentes.has(n) && recentes.size < MUSIC.tracks.length); }
  musicSelect(n); MUSIC.wanted = true; void musicPlay(token);
}
// anterior: volta ao começo se a faixa já passou de 3 s; senão, a faixa tocada antes (ou a anterior da lista)
async function musicPrev() {
  if (!MUSIC.audio) return;
  if (MUSIC.audio.currentTime > 3 && MUSIC.index >= 0) { MUSIC.audio.currentTime = 0; return; }
  const token = ++MUSIC.token; await MUSIC.loading;
  if (token !== MUSIC.token || !MUSIC.tracks.length) return;
  const n = MUSIC.hist.length ? MUSIC.hist.pop() : (MUSIC.index - 1 + MUSIC.tracks.length) % MUSIC.tracks.length;
  musicSelect(n); MUSIC.wanted = true; void musicPlay(token);
}
function musicShuffle() {
  MUSIC.shuffle = !MUSIC.shuffle;
  try { localStorage.setItem('gol-aleatorio', MUSIC.shuffle ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
  musicNotice(MUSIC.shuffle ? 'Ordem aleatória ligada' : 'Ordem aleatória desligada'); musicBar();
}
function musicName() { return MUSIC.index >= 0 && MUSIC.tracks[MUSIC.index] ? MUSIC.tracks[MUSIC.index].replace(/\.mp3$/i, '').replace(/[_-]+/g, ' ') : 'Rádio'; }
// barra do rádio (canto superior esquerdo): aparece com o painel do jogo
function musicBar() {
  const bar = document.getElementById('music-bar'); if (!bar) return;
  const show = typeof HUD !== 'undefined' && HUD.vis; bar.classList.toggle('on', !!show); if (!show) return;
  const playing = !!MUSIC.audio && !MUSIC.audio.paused, t = document.getElementById('music-title'), nm = musicName();
  if (t.textContent !== nm) t.textContent = nm;
  const p = document.getElementById('mus-play'); p.setAttribute('aria-pressed', String(playing)); p.setAttribute('aria-label', (playing ? 'Pausar' : 'Tocar') + ' · P');
  document.getElementById('mus-shuf').setAttribute('aria-pressed', String(MUSIC.shuffle));
}
