// Setor Oeste comercial de Nova Aliança: ruas Rio Preto, São Paulo, Quintino Bocaiúva, Francisco Coco, Gotardi (trecho oeste)
// e Av. da Saudade até o Sacoi. Levantamento de 20/nov/2026 pelo Google Maps; fachadas pelo Street View quando conferidas.
// Arquivo do Claude (ver COORDENACAO.md). A casa do Petrus e a R. José Fagliari ficam com o Codex (12_city8_petrus.js).

// comércios: nome, lat, lon, fundo do letreiro, letra, rua (para cair no lote certo)
const OESTE_SHOPS = [
  ['SUPERMERCADO SOUZA', -21.0174237, -49.5017529, '#c62828', '#ffffff'],
  ['PALHERANI', -21.0171709, -49.5013378, '#0d47a1', '#ffffff', 'Rua Rio Preto'],
  ['ELETROLON', -21.0166498, -49.5018942, '#fdd835', '#0d47a1'],
  ['ADS EMBALAGENS', -21.0170469, -49.5024690, '#263238', '#ffffff', 'Rua Quintino de Socaiuva'],
  ['COZINHA DE FAMÍLIA', -21.0156513, -49.5014433, '#6d4c41', '#fff3e0', 'Rua Francisco Coco'],
  ['MADEIRAS NOVA ALIANÇA', -21.0162217, -49.5026998, '#5d4037', '#ffe0b2'],
  ['GB MOTOS', -21.0168788, -49.5004218, '#212121', '#ff9800', 'Rua São Paulo'],
  ['SALÃO CÁTIA FIOCHE', -21.0179137, -49.5014018, '#f8bbd0', '#880e4f'],
  ['MINEIRINHO SUPERMERCADO', -21.0175079, -49.5004969, '#2e7d32', '#ffeb3b', 'Rua Gotardi'],
  ['IRMÃO LANCHES', -21.0173020, -49.4999849, '#e65100', '#ffffff', 'Rua Gotardi'],
  ['ESPETINHO PÔR DO SOL', -21.0173899, -49.5003270, '#bf360c', '#ffe082', 'Rua Gotardi'],
  ['FARMÁCIA NOVA ALIANÇA', -21.0168029, -49.5015527, '#00796b', '#ffffff'],
  // pontas do Centro que apareceram nesta busca
  ['RADIOVAL MÓVEIS', -21.0163632, -49.4992722, '#d32f2f', '#ffffff'],
  ['FARMÁCIA POPULAR', -21.0162081, -49.4986189, '#1565c0', '#ffffff'],
  ['LUCATTO & CANDEIRA', -21.0150847, -49.4977830, '#00897b', '#ffffff'],
  ['LOJA DO BIGODE', -21.0160010, -49.4982979, '#37474f', '#ffffff'],
];
const OESTE_SHOP_STYLE = {
  'SUPERMERCADO SOUZA': { kind: 'simples', col: [0.94, 0.93, 0.9], sub: 'SUPERMERCADO', signH: 1.0, signW: 5.5 },
  'PALHERANI': { kind: 'simples', col: [0.93, 0.93, 0.92], sub: 'MÓVEIS E ELETRO', signH: 1.0 },
  'ELETROLON': { kind: 'simples', col: [0.95, 0.9, 0.62], sub: 'ELÉTRICA · HIDRÁULICA · TINTAS', signH: 0.95 },
  'MADEIRAS NOVA ALIANÇA': { kind: 'simples', col: [0.8, 0.72, 0.6], sub: 'ESTRUTURAS DE MADEIRA', signH: 0.9 },
};
for (const s of OESTE_SHOPS) CITY_SHOPS.push(s);
Object.assign(CITY_SHOP_STYLE, OESTE_SHOP_STYLE);
