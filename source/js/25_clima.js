// Clima: oito tempos (do céu limpo à tempestade) com nuvens, luz do sol, névoa, chão molhado, chuva na tela e raios.
// "Clima real": usa a hora de Brasília e o tempo atual de Nova Aliança (Open-Meteo, sem chave), atualizado a cada 10 min.
const CLIMA_TIPOS = {
  //            nuvens  sol   névoa  molhado chuva  vento  raio
  limpo:      { cover: 0.22, sun: 1.0,  fog: 0.8, wet: 0,    rain: 0,    wind: 0.6, storm: 0, nome: 'Sem nuvens' },
  ensolarado: { cover: 0.42, sun: 1.0,  fog: 1.0, wet: 0,    rain: 0,    wind: 0.8, storm: 0, nome: 'Ensolarado' },
  quente:     { cover: 0.30, sun: 1.12, fog: 1.6, wet: 0,    rain: 0,    wind: 0.4, storm: 0, nome: 'Sol quente' },
  poucas:     { cover: 0.52, sun: 0.95, fog: 1.0, wet: 0,    rain: 0,    wind: 0.9, storm: 0, nome: 'Poucas nuvens' },
  muitas:     { cover: 0.68, sun: 0.7,  fog: 1.3, wet: 0,    rain: 0,    wind: 1.1, storm: 0, nome: 'Muitas nuvens' },
  nublado:    { cover: 0.88, sun: 0.22, fog: 2.2, wet: 0.1,  rain: 0,    wind: 1.2, storm: 0, nome: 'Nublado' },
  chuva:      { cover: 0.95, sun: 0.1,  fog: 3.2, wet: 0.85, rain: 0.6,  wind: 1.6, storm: 0, nome: 'Chuva' },
  tempestade: { cover: 1.0,  sun: 0.04, fog: 4.5, wet: 1.0,  rain: 1.0,  wind: 2.6, storm: 1, nome: 'Tempestade' },
};
const CLIMA = {
  modo: 'ensolarado', real: false, tipo: 'ensolarado',
  cur: { cover: 0.42, sun: 1, fog: 1, wet: 0, rain: 0, wind: 0.8, storm: 0 }, flash: 0, raio: 0,
  info: '', temp: null, ultima: 0, erro: '', baseFog: 0.0008, baseWind: null,
};
(() => {
  try { const m = localStorage.getItem('gol-clima'); if (m && (m in CLIMA_TIPOS)) CLIMA.modo = CLIMA.tipo = m; CLIMA.real = localStorage.getItem('gol-clima-real') === '1'; } catch (e) { /* sem armazenamento */ }
  if (typeof Q !== 'undefined' && Q.has('clima') && Q.get('clima') in CLIMA_TIPOS) { CLIMA.modo = CLIMA.tipo = Q.get('clima'); CLIMA.real = false; }
  if (typeof Q !== 'undefined' && (Q.has('fotos') || Q.has('cap'))) CLIMA.real = false;
  Object.assign(CLIMA.cur, CLIMA_TIPOS[CLIMA.tipo]);
})();
// código WMO + cobertura de nuvens + temperatura -> um dos oito tempos
function climaDoTempo(code, nuvens, temp) {
  if (code >= 95) return 'tempestade';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return code >= 63 && code !== 80 && code !== 81 ? 'chuva' : 'chuva';
  if (code === 45 || code === 48) return 'nublado';
  if (nuvens >= 85 || code === 3) return 'nublado';
  if (nuvens >= 55) return 'muitas';
  if (nuvens >= 25) return 'poucas';
  if (temp != null && temp >= 31) return 'quente';
  return nuvens < 8 ? 'limpo' : 'ensolarado';
}
const CLIMA_DESC = { 0: 'céu limpo', 1: 'quase limpo', 2: 'parcialmente nublado', 3: 'encoberto', 45: 'neblina', 48: 'neblina', 51: 'garoa fraca', 53: 'garoa', 55: 'garoa forte', 61: 'chuva fraca', 63: 'chuva', 65: 'chuva forte', 80: 'pancadas fracas', 81: 'pancadas de chuva', 82: 'pancadas fortes', 95: 'trovoada', 96: 'trovoada com granizo', 99: 'trovoada com granizo' };
// hora de Brasília (fuso de Nova Aliança), em horas decimais
function climaHoraLocal() {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const g = t => +(p.find(x => x.type === t) || { value: 0 }).value;
  return g('hour') + g('minute') / 60 + g('second') / 3600;
}
async function climaBuscar() {
  CLIMA.ultima = performance.now();
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-21.0164&longitude=-49.4981&current=temperature_2m,weather_code,cloud_cover,precipitation,wind_speed_10m&timezone=America%2FSao_Paulo';
    const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(), c = j.current;
    CLIMA.temp = c.temperature_2m; CLIMA.tipo = climaDoTempo(c.weather_code, c.cloud_cover, c.temperature_2m);
    CLIMA.info = `${Math.round(c.temperature_2m)}°C · ${CLIMA_DESC[c.weather_code] || CLIMA_TIPOS[CLIMA.tipo].nome.toLowerCase()} · nuvens ${c.cloud_cover}%`;
    CLIMA.erro = '';
  } catch (e) { CLIMA.erro = 'sem conexão com o serviço de clima'; }
  climaUI();
}
function climaSetReal(on) {
  CLIMA.real = on;
  try { localStorage.setItem('gol-clima-real', on ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
  if (on) { todSet(climaHoraLocal(), true); TOD.rate = 1 / 3600; climaBuscar(); }
  else { CLIMA.tipo = CLIMA.modo; CLIMA.info = ''; CLIMA.erro = ''; const sp = document.getElementById('tempo'); TOD.rate = sp ? TOD.rates[sp.value] || 0 : TOD.rate; }
  climaUI();
}
function climaSet(tipo) {
  CLIMA.modo = tipo; try { localStorage.setItem('gol-clima', tipo); } catch (e) { /* sem armazenamento */ }
  if (CLIMA.real) climaSetReal(false);
  CLIMA.tipo = tipo; climaUI();
}
// a cada quadro (antes do sol): aproxima os parâmetros do tempo escolhido em ~4 s e cuida dos raios
function climaFrame(dt) {
  if (CLIMA.real) {
    if (performance.now() - CLIMA.ultima > 600000) climaBuscar();
    const h = climaHoraLocal(); if (Math.abs(((h - TOD.hour + 36) % 24) - 12) < 11.98) todSet(h, true);   // relógio de verdade
  }
  const T = CLIMA_TIPOS[CLIMA.tipo], c = CLIMA.cur, k = 1 - Math.exp(-dt / 1.4);
  let mudou = false;
  for (const n of ['cover', 'sun', 'fog', 'wet', 'rain', 'wind', 'storm']) { const d = T[n] - c[n]; if (Math.abs(d) > 1e-4) { c[n] += d * (n === 'wet' && d < 0 ? k * 0.15 : k); mudou = true; } else c[n] = T[n]; }   // o chão seca devagar
  if (mudou) TOD.dirty = true;
  // névoa e vento
  R.fog[0] = CLIMA.baseFog * c.fog;
  if (!CLIMA.baseWind) CLIMA.baseWind = Array.from(R.wind);
  R.wind[2] = CLIMA.baseWind[2] * c.wind;
  // raios: clarão duplo, intervalo aleatório
  CLIMA.flash *= Math.exp(-dt / 0.07);
  if (c.storm > 0.5) {
    CLIMA.raio -= dt;
    if (CLIMA.raio <= 0) { CLIMA.flash = 0.8 + Math.random() * 0.6; CLIMA.raio = 4 + Math.random() * 11; CLIMA.duplo = 0.12 + Math.random() * 0.1; }
    if (CLIMA.duplo > 0) { CLIMA.duplo -= dt; if (CLIMA.duplo <= 0) CLIMA.flash = Math.max(CLIMA.flash, 0.6 + Math.random() * 0.5); }
  }
}
function climaUI() {
  const b = document.getElementById('clima-real'), sel = document.getElementById('clima'), info = document.getElementById('clima-info');
  if (b) { b.setAttribute('aria-pressed', CLIMA.real ? 'true' : 'false'); b.textContent = CLIMA.real ? 'Clima real: ligado' : 'Usar clima real'; }
  if (sel) { sel.value = CLIMA.real ? CLIMA.tipo : CLIMA.modo; sel.disabled = false; }
  if (info) info.textContent = CLIMA.real ? (CLIMA.erro || (CLIMA.info ? 'Nova Aliança agora: ' + CLIMA.info : 'buscando o clima de Nova Aliança…')) : '';
  const hr = document.getElementById('hora'); if (hr) hr.disabled = CLIMA.real;
  const tp = document.getElementById('tempo'); if (tp) tp.disabled = CLIMA.real;
}
function climaInit() {
  const b = document.getElementById('clima-real'), sel = document.getElementById('clima');
  if (b) b.onclick = () => climaSetReal(!CLIMA.real);
  if (sel) sel.onchange = e => climaSet(e.target.value);
  if (CLIMA.real) climaSetReal(true); else climaUI();
}
