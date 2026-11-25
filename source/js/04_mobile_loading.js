// A abertura móvel mostra uma única mensagem enquanto GPU, mapa e materiais são preparados.
const MOBILE_LOADING = {
  el: null,
  init() {
    if (!MOBILE_PROFILE || !GAME.ui) return;
    const style = document.createElement('style');
    style.textContent = `#mob-loading{position:fixed;inset:0;z-index:100;background:#0c1015;color:#edf0f3;display:grid;place-content:center;justify-items:center;gap:14px;font:14px/1.4 system-ui;text-align:center}
      #mob-loading .loading-ring{width:28px;height:28px;border:2px solid #ffffff28;border-top-color:#edf0f3;border-radius:50%;animation:mobile-loading-spin .9s linear infinite}
      @keyframes mobile-loading-spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){#mob-loading .loading-ring{animation:none}}`;
    document.head.append(style);
    const cover = document.createElement('div'); cover.id = 'mob-loading'; cover.setAttribute('role', 'status');
    cover.innerHTML = '<span class="loading-ring" aria-hidden="true"></span><span>Carregando…</span>';
    document.body.append(cover); this.el = cover;
    const hint = document.getElementById('hint'); if (hint) hint.hidden = true;
  },
  finish() { if (this.el) this.el.remove(); this.el = null; },
};
MOBILE_LOADING.init();
