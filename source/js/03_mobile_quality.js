// Perfil móvel: orçamento de efeitos separado da resolução; nenhum modelo de telefone é fixado.
// Referência: https://developer.android.com/games/optimize/optimization-tips
const MOBILE_RENDER = {
  on: MOBILE_PROFILE, inFlight: 0,
  maxEdge: MOBILE_QUALITY === 'alto' ? 1600 : MOBILE_QUALITY === 'equilibrado' ? 1280 : 960,
  shadow: MOBILE_PROFILE ? (MOBILE_QUALITY === 'alto' ? 1536 : 1024) : 2048,
  staticShadow: MOBILE_PROFILE ? 2048 : 4096,
  environment: MOBILE_PROFILE ? 256 : 512,
  environmentMips: MOBILE_PROFILE ? 6 : 7,
  skyWidth: MOBILE_PROFILE ? 2048 : 4096,
  skyHeight: MOBILE_PROFILE ? 512 : 1024,
  aoSamples: MOBILE_PROFILE ? (MOBILE_QUALITY === 'alto' ? 8 : MOBILE_QUALITY === 'equilibrado' ? 6 : 4) : 14,
  fogSamples: MOBILE_PROFILE ? (MOBILE_QUALITY === 'alto' ? 8 : MOBILE_QUALITY === 'equilibrado' ? 6 : 4) : 20,
  motionBlur: !MOBILE_PROFILE,
  screenReflections: !MOBILE_PROFILE,
  cubeEvery: MOBILE_QUALITY === 'economico' ? 3 : 2,
  resolution(width, height, dpr) {
    const scale = this.on ? Math.min(dpr || 1, this.maxEdge / Math.max(width, height)) : Math.min(dpr || 1, 2);
    return [clamp(Math.round(width * scale) & ~1, 320, 5120), clamp(Math.round(height * scale) & ~1, 180, 2880)];
  },
  cadence(worst) {
    let rate = Q.get('hz');
    if (!rate && this.on) try { rate = localStorage.getItem('gta-na-fps'); } catch (_) { /* preferência desta sessão */ }
    if (rate === '30') return 29.5;
    if (rate === '60') return 14.6;
    if (!this.on) return rate === '120' ? 0 : worst > 6.2 ? 14.6 : 0;
    // Abertura mede a GPU com margem: permite 60 quando cabe; caso contrário, busca 30 estáveis.
    return worst > 12 ? 29.5 : 14.6;
  },
  hasSlot() { return !this.on || this.inFlight < 2; },
  submitted(device) {
    if (!this.on) return;
    this.inFlight++;
    device.queue.onSubmittedWorkDone().then(() => { this.inFlight--; }, () => { this.inFlight--; });
  },
  cubeCount(frame, ready) { return !this.on || !ready ? 2 : frame % this.cubeEvery === 0 ? 1 : 0; },
  cubeFace(frame, ready) { return !this.on || !ready ? frame * 2 % 6 : Math.floor(frame / this.cubeEvery) % 6; },
};
