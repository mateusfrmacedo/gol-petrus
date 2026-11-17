// Rádio de MP3 da pasta musica no GitHub. O som do motor continua independente (M).
const MUSIC = { audio: null, tracks: [], index: -1, wanted: false, loading: null, token: 0, status: null };
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
    musicNotice('♫ ' + MUSIC.tracks[MUSIC.index].replace(/\.mp3$/i, '') + ' · P pausa · 0 próxima');
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
  musicSelect(MUSIC.index + 1); MUSIC.wanted = true; void musicPlay(token);
}
