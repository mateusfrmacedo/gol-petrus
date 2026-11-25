// A tela cobre a preparação do jogo, oculta o teclado e é removida também após falha.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('source/js/04_mobile_loading.js', 'utf8');
function context(mobile, ui) {
  const nodes = [], hint = { hidden: false };
  const document = { head: { append(el) { nodes.push(el); } }, body: { append(el) { nodes.push(el); } },
    getElementById: () => hint, createElement: tag => ({ tag, setAttribute(k, v) { this[k] = v; }, remove() { this.removed = true; } }) };
  const ctx = vm.createContext({ MOBILE_PROFILE: mobile, GAME: { ui }, document });
  vm.runInContext(source + ';globalThis.loading=MOBILE_LOADING;', ctx); return { loading: ctx.loading, nodes, hint };
}
const mobile = context(true, true), cover = mobile.loading.el;
assert(cover.innerHTML.includes('Carregando…')); assert.equal(cover.role, 'status'); assert(mobile.hint.hidden);
mobile.loading.finish(); assert(cover.removed); assert.equal(mobile.loading.el, null); mobile.loading.finish();
assert.equal(context(false, true).nodes.length, 0); assert.equal(context(true, false).nodes.length, 0);
const withoutGpu = vm.createContext({ URLSearchParams, location: { search: '?mobile=1', hash: '' }, navigator: {} });
vm.runInContext(fs.readFileSync('source/js/01_gpu.js','utf8')+';globalThis.initGpu=gpuInit;',withoutGpu);
assert.rejects(withoutGpu.initGpu(), /WebGPU indisponível/).then(() => console.log('PASS: carregamento simples, atalhos ocultos, conclusão e diagnóstico sem WebGPU.')).catch(e=>{console.error(e);process.exitCode=1});
