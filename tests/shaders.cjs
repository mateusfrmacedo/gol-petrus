// Valida todos os shaders WGSL do jogo sem GPU: monta cada variante como o jogo monta (pré-processador wgslPP real,
// mesmas famílias e defs, registradas em tests/shader-variants.json) e passa pelo validador naga.
// Na cidade e no circuito. Requer o naga (cargo install naga-cli); sem ele o teste avisa e é pulado.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process'), vm = require('node:vm');
const root = path.join(__dirname, '..');
function acharNaga() {
  for (const c of [process.env.NAGA, 'naga', path.join(os.homedir(), '.cargo/bin/naga')]) {
    if (!c) continue; try { cp.execFileSync(c, ['--version'], { stdio: 'pipe' }); return c; } catch (e) { /* tenta o próximo */ }
  }
  return null;
}
const naga = acharNaga();
if (!naga) { console.log('PULADO: naga não encontrado (instale com: cargo install naga-cli).'); process.exit(0); }
// WGSL = todos os .wgsl de source/wgsl, como o build faz
const WGSL = {};
for (const f of fs.readdirSync(path.join(root, 'source/wgsl'))) if (f.endsWith('.wgsl')) WGSL[f.slice(0, -5)] = fs.readFileSync(path.join(root, 'source/wgsl', f), 'utf8');
// o pré-processador é o do jogo (copiado de 01_gpu.js em tempo de teste)
const gpu = fs.readFileSync(path.join(root, 'source/js/01_gpu.js'), 'utf8');
const ppSrc = gpu.slice(gpu.indexOf('function wgslPP('), gpu.indexOf('const _modCache'));
const ctx = vm.createContext({ WGSL }); vm.runInContext(ppSrc, ctx);
// struct Frame: gerado no jogo a partir de FRAME_FIELDS (20_renderer.js); o mesmo trecho roda aqui
const ren = fs.readFileSync(path.join(root, 'source/js/20_renderer.js'), 'utf8');
vm.runInContext(ren.slice(ren.indexOf('const FRAME_FIELDS'), ren.indexOf('const frSet4')), ctx);
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'shader-variants.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wgsl-'));
const erros = []; let n = 0;
for (const v of spec.variants) {
  for (const mapa of ['cidade', 'circuito']) {
    if (mapa === 'circuito' && 'CITYONLY' in v.defs) continue;
    if (mapa === 'cidade' && 'CIRCUITONLY' in v.defs) continue;
    const defs = v.bare ? {} : Object.assign({}, spec.base, v.defs);
    delete defs.CITYONLY; delete defs.CIRCUITONLY;
    if (mapa === 'circuito' && !v.bare) { delete defs.CITY; defs.WM_ZS = '2.0'; }
    if (v.src) WGSL[v.name] = `#include common\n#include gbuf\n#include ${v.src}\n#include ${v.name.startsWith('__fwd_') ? 'entry_fwd' : 'entry'}\n`;
    let code;
    try { code = ctx.wgslPP(v.name, defs); } catch (e) { erros.push(`${v.name} (${mapa}): ${e.message}`); continue; }
    const tag = `${v.name}-${Object.keys(v.defs).filter(k => /^(PASS_|GLASS_|DIR|NEIGH|FIRST|UP$|SSR)/.test(k)).join('-') || 'base'}-${mapa}`.replace(/[^\w-]/g, '_');
    const f = path.join(tmp, tag + '.wgsl'); fs.writeFileSync(f, code);
    try { cp.execFileSync(naga, [f], { stdio: 'pipe' }); n++; }
    catch (e) { erros.push(`${tag}:\n${String(e.stderr || e.stdout || e.message).trim().split('\n').slice(0, 14).join('\n')}`); }
  }
}
// arquivo .wgsl que nenhuma variante usa: provavelmente um shader novo que falta registrar
const usados = new Set();
for (const v of spec.variants) { if (v.src) usados.add(v.src); usados.add(v.name); }
const incl = new Set(); for (const k in WGSL) for (const m of WGSL[k].matchAll(/#include\s+(\w+)/g)) incl.add(m[1]);
const soltos = Object.keys(WGSL).filter(k => !k.startsWith('__') && !usados.has(k) && !incl.has(k));
if (soltos.length) console.log('Aviso: shaders sem variante registrada em tests/shader-variants.json: ' + soltos.join(', '));
if (erros.length) { console.error(`FALHA: ${erros.length} variante(s) com erro de WGSL\n\n` + erros.join('\n\n')); process.exit(1); }
console.log(`PASS: ${n} variantes de shader validadas pelo naga (cidade e circuito).`);
