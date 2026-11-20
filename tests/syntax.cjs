// Sintaxe do jogo montado: compila (sem executar) cada <script> do index.html e cada arquivo de source/js.
// Pega erros que os testes por arquivo não pegam, como uma vírgula ou parêntese a mais num arquivo sem teste próprio.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), erros = [];
for (const f of fs.readdirSync(path.join(root, 'source/js')).filter(f => f.endsWith('.js'))) {
  try { new vm.Script(fs.readFileSync(path.join(root, 'source/js', f), 'utf8'), { filename: f }); } catch (e) { erros.push(`${f}: ${e.message}`); }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let n = 0;
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  n++; try { new vm.Script(m[1], { filename: 'index.html#script' + n }); } catch (e) { erros.push(`index.html, script ${n}: ${e.message} (rode node source/build.mjs depois de corrigir)`); }
}
if (erros.length) { console.error('FALHA de sintaxe:\n' + erros.join('\n')); process.exit(1); }
console.log(`PASS: sintaxe de source/js e dos ${n} scripts do index.html.`);
