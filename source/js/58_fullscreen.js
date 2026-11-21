// Tela cheia do documento inteiro, mantendo os controles e os mostradores sobre o jogo.
const FULLSCREEN = {
  button: null,
  active() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  supported() {
    const root = document.documentElement;
    return !!((root.requestFullscreen && document.fullscreenEnabled !== false) ||
      (root.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false));
  },
  sync() {
    const b = this.button; if (!b) return;
    const active = this.active(), supported = this.supported();
    b.disabled = !supported;
    const label = active ? 'Sair da tela cheia' : 'Entrar em tela cheia';
    b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', String(active));
    b.title = supported ? label + (active ? ' · Esc' : '') : 'Tela cheia indisponível neste navegador';
  },
  async toggle() {
    if (!this.supported()) return;
    try {
      if (this.active()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
      } else {
        const root = document.documentElement;
        await (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      }
      this.sync();
    } catch (err) {
      this.sync();
      this.button.title = 'Não foi possível abrir tela cheia. Tente novamente no navegador.';
    }
  },
  init() {
    this.button = document.getElementById('fullscreen'); if (!this.button) return;
    this.button.onclick = e => { e.currentTarget.blur(); this.toggle(); };
    document.addEventListener('fullscreenchange', () => this.sync());
    document.addEventListener('webkitfullscreenchange', () => this.sync());
    this.sync();
  }
};
