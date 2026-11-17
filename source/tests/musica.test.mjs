import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import assert from 'node:assert/strict';
const source = readFileSync(new URL('../js/53_musica.js', import.meta.url), 'utf8');
function setup(api, fallback = []) {
  let localRequests = 0;
  class Audio {
    paused = true; currentTime = 0; listeners = {};
    addEventListener(event, fn) { this.listeners[event] = fn; }
    async play() { this.paused = false; }
    pause() { this.paused = true; }
  }
  const ctx = createContext({ Audio, URL, AbortSignal, setTimeout: () => 0, clearTimeout() {},
    document: {baseURI: 'https://example.com/gol-petrus/', body: {append() {}}, createElement: () => ({style: {}, setAttribute() {}})},
    fetch: async url => {
      if (url.startsWith('https://api.github.com/')) return {ok: api !== null, json: async () => api};
      localRequests++; return {ok: true, json: async () => fallback};
    }
  });
  new Script(source + '\nglobalThis.radio={MUSIC,musicInit,musicToggle,musicNext};').runInContext(ctx);
  return {r: ctx.radio, requests: () => localRequests};
}
const flush = () => new Promise(r => setImmediate(r));
{
  const {r, requests} = setup([{type:'file',name:'02 ação.MP3'}, {type:'file',name:'01 som.mp3'}, {type:'dir',name:'pasta.mp3'}, {type:'file',name:'README.md'}]);
  r.musicInit(); await r.MUSIC.loading;
  assert.deepEqual(Array.from(r.MUSIC.tracks), ['01 som.mp3','02 ação.MP3']); assert.equal(requests(), 0);
  r.musicToggle(); await flush(); assert.equal(r.MUSIC.audio.paused, false);
  assert.equal(r.MUSIC.audio.src, 'https://example.com/gol-petrus/musica/01%20som.mp3');
  r.musicToggle(); assert.equal(r.MUSIC.audio.paused, true);
  await r.musicNext(); await flush(); assert.equal(r.MUSIC.index, 1); assert.equal(r.MUSIC.audio.paused, false);
  r.MUSIC.audio.listeners.ended(); await flush(); assert.equal(r.MUSIC.index, 0);
}
{
  const {r, requests} = setup(null, ['reserva.mp3','../fora.mp3','texto.txt']);
  r.musicInit(); await r.MUSIC.loading;
  assert.deepEqual(Array.from(r.MUSIC.tracks), ['reserva.mp3']); assert.equal(requests(), 1);
}
{
  const {r} = setup([]); r.musicInit(); await r.MUSIC.loading;
  r.musicToggle(); await flush(); assert.equal(r.MUSIC.wanted, false); assert.match(r.MUSIC.status.textContent, /Adicione arquivos MP3/);
  await r.musicNext(); assert.match(r.MUSIC.status.textContent, /ainda não tem/);
}
console.log('Rádio: API, filtro de arquivos, nomes com acentos, pausa, próxima, avanço automático, reserva e pasta vazia verificados.');
