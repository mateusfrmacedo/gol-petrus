const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ui = fs.readFileSync('source/js/52_ui.js', 'utf8');
const panel = fs.readFileSync('source/js/51_painel.js', 'utf8');
const setMode = ui.match(/function uiSetGearMode\(manual\) \{[\s\S]*?\n\}/)[0];
const click = ui.match(/\$\('transmission'\)\.onclick = ([^\n]+);/)[1];
const read = panel.slice(panel.indexOf('function hudRead()'), panel.indexOf('\nfunction hudDraw()'));
vm.runInNewContext(`
const elements={'gear-mode':{value:'manual'},transmission:{textContent:'',setAttribute(k,v){this[k]=v}}};
const $=id=>elements[id], VEH={manual:true,gear:1,rpm:1200,time:0}, GS={speed:0};
const UI={warm:false,st:1},ST={JOGO:1},HUD={V:new Float64Array(6)},LAP=[0,0,0,0];
const manualGearbox=()=>VEH.manual,hudGaugeVisibility=()=>{};
${setMode}
${read}
const click=${click};let blurred=0;
hudRead();assert.equal(elements.transmission.textContent,'M · 1');
click({currentTarget:{blur(){blurred++}}});hudRead();
assert.equal(VEH.manual,false);assert.equal(elements['gear-mode'].value,'auto');
assert.equal(elements.transmission.textContent,'A · 1');assert(elements.transmission['aria-label'].includes('Automático'));
VEH.gear=3;hudRead();assert.equal(elements.transmission.textContent,'A · 3');
uiSetGearMode(true);hudRead();assert.equal(elements.transmission.textContent,'M · 3');
VEH.gear=0;hudRead();assert.equal(elements.transmission.textContent,'M · R');assert(elements.transmission.title.includes('Ré'));
UI.st=2;click({currentTarget:{blur(){}}});assert(VEH.manual,'sem alternância pelo botão durante pausa');
assert.equal(blurred,1,'o botão devolve o foco ao jogo');
`, {assert});
console.log('PASS: marcha atual, ré, botão M/A e sincronização com o seletor do menu.');
