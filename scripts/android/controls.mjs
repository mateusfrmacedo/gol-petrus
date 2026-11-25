// Incorpora as imagens aprovadas para manter o HTML e o APK autocontidos.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../../', import.meta.url);
const names = { wheel: 'volante', brake: 'freio', gas: 'acelerador', handbrake: 'freio-de-mao' };
const images = {};
for (const [key, name] of Object.entries(names)) {
  images[key] = 'data:image/png;base64,' + fs.readFileSync(new URL('assets/android/controles/' + name + '.png', root)).toString('base64');
}
const output = new URL('source/js/58_mobile_art.js', root);
fs.writeFileSync(output, '// Arquivo gerado por scripts/android/controls.mjs. Volante baseado na foto do proprietário de 17/11/2026; pedais ilustrativos realistas.\nconst MOBILE_ART = ' + JSON.stringify(images) + ';\n');
console.log('Controles incorporados em ' + fileURLToPath(output));
