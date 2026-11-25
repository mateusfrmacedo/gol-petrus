// Empacota o jogo local e as músicas; não depende de GitHub Pages para abrir a cidade.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
execFileSync(process.execPath, [path.join(root, 'scripts/android/controls.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(root, 'source/build.mjs')], { stdio: 'inherit' });
const output = path.join(root, 'android/app/src/main/assets/game');
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root, 'LICENSE.md'), path.join(output, 'LICENSE.md'));
// Sem rádio na versão Android, conforme solicitado; remove eventual reserva de build anterior.
fs.rmSync(path.join(output, 'musica'), { recursive: true, force: true });
console.log('Recursos Android preparados em ' + output);
