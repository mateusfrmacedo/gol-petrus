// Publica apenas os recursos usados pelo jogo. Modelos e fontes ficam no repositório.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'gol-petrus-site-')));
assert(out !== root && !root.startsWith(out + path.sep), 'A saída não pode conter a pasta do projeto.');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(!html.includes('// ---- 30_car_e'), 'O site deve usar o build padrão, sem o Civic. Execute node source/build.mjs.');
assert(!/\bconst CIVIC\s*=/.test(html), 'O HTML contém o modelo do Civic.');
if (fs.existsSync(out)) assert(fs.readdirSync(out).length === 0, 'Escolha uma pasta de saída vazia para evitar publicar arquivos antigos.');
fs.mkdirSync(path.join(out, 'musica'), { recursive: true });
const files = ['index.html', 'LICENSE.md', '.nojekyll'];
for (const name of fs.readdirSync(path.join(root, 'musica'), { withFileTypes: true })) {
  if (name.isFile() && (/\.mp3$/i.test(name.name) || name.name === 'playlist.json')) files.push('musica/' + name.name);
}
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(out, file));
const bytes = files.reduce((sum, file) => sum + fs.statSync(path.join(out, file)).size, 0);
fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify({
  revision: process.env.GITHUB_SHA || null, vehicles: ['gol'], files, bytes
}, null, 2) + '\n');
console.log(`Site preparado em ${out}: ${files.length} arquivos, ${(bytes / 1024 / 1024).toFixed(1)} MiB; Civic excluído.`);
