# Revisão do interior — 19/11/2026

Referências: fotos reais `photo_2026-11-17 21.06.12.jpeg`, `photo_2026-11-17 21.06.14.jpeg`, `PAINEL.png` e imagens de abril em `/Users/mateus/Downloads/Gol G6 PF/`. A revisão compara forma, encaixe e materiais; as fotos não fornecem medidas de fábrica nem todas as vistas.

## Problemas encontrados e corrigidos

| Região | Divergência | Correção nesta revisão |
|---|---|---|
| Colunas A | Duas peças adicionais cilíndricas duplicavam as colunas já existentes na carroceria. Apareciam como canos pelo lado de fora. Uma tentativa com barras achatadas também se mostrou deslocada e foi descartada. | Removidas as peças adicionais; preservadas as colunas originais. Acabamento interno fosco nas superfícies existentes. |
| Saídas de ar | Os aros e lâminas ficavam avançados e retos em relação à face curva do painel. | Reposicionados conforme a superfície e inclinados para acompanhar a testa do painel. |
| Quebra-sóis | Estavam muito baixos e afastados do forro. | Reduzida a profundidade, elevados e acrescentados pequenos suportes. |
| Teto | O forro estava claro demais em relação à foto de abril, que mostra revestimento escuro ao redor da abertura. | Forro e molduras escurecidos; quebra-sóis mantidos claros. |
| Porta do passageiro | Repetia os quatro comandos de vidro da porta do motorista. | Passageiro com um comando; motorista mantém quatro. |

Os braços laterais do volante também foram prolongados até sobrepor fisicamente o aro. As peças do miolo receberam faces traseiras e o raio inferior ganhou paredes internas/externas, preservando a abertura vazada. Isso corrige a aparência de miolo solto apontada pelo proprietário.

## Elementos coerentes com as fotos, ainda aproximados em 3D

- Volante: frente traçada na foto real, com emblema, comandos e abertura inferior. A espessura e o verso continuam aproximados; não é uma digitalização completa da peça.
- Instrumentos: conta-giros à esquerda, velocímetro à direita e tela vermelha central. Escalas e posições não foram calibradas com medidas físicas.
- Console: rádio Pioneer e comandos extraídos das fotos mais recentes. A central multimídia da foto de abril é diferente e não foi usada para substituir o Pioneer.
- Painel: quatro difusores circulares, casca escura com granulado e tampa superior do passageiro presentes. Curvaturas, folgas e dimensões ainda são aproximadas.

## Divergências que continuam abertas

1. **Bancos:** o tecido real tem trama fina e zonas bem definidas de tecido/apoio lateral. O modelo usa formas e costuras genéricas; os gomos horizontais não reproduzem o revestimento das fotos. Assentos, encostos e apoios de cabeça precisam de uma revisão própria.
2. **Forros de porta:** as fotos mostram insertos com costura/padrão, bolsões, puxadores e transições mais trabalhadas. O modelo atual ainda usa volumes simplificados, sem esse padrão do inserto.
3. **Comandos do ar e rádio:** as faces usam recortes reais, mas parte da profundidade é sugerida pela textura. Seletores, botões e nichos precisam de volumes próprios para corresponder também em vistas laterais.
4. **Retrovisor interno:** a carcaça é simplificada e o reflexo é uma aproximação, não uma imagem real da traseira. Detalhes do suporte e do pendente não foram reproduzidos integralmente.
5. **Acabamento inferior:** pedais, fixações, iluminação vermelha do assoalho, trilhos e detalhes dos tapetes não estão reproduzidos com a fidelidade das fotos.
6. **Proporções:** painel, portas e posição dos instrumentos foram reconstruídos por perspectiva. Uma comparação dimensional exata exige medidas reais; imagens tiradas do banco traseiro não devem ser comparadas como se fossem a câmera do motorista.

Não se considera o interior uma cópia exata concluída. Esta etapa remove os erros de encaixe mais evidentes e registra o restante para orientar a próxima modelagem.

## Teto solar e para-choque

O jogo agora separa o vidro e a moldura móveis do teto branco e usa um movimento de elevação/deslizamento para trás, com defletor frontal, orientado pela foto `20260416_142118.jpg`. Botão na tela ou tecla **O** abre/fecha, inclusive invertendo o movimento. O controle não atua no Civic. O Blender usa agora o mesmo movimento de elevação/deslizamento do jogo, com vedação fixa separada e abertura real na chapa e no forro originais. O teste `tests/exterior-model.py` compara as matrizes nos dois ambientes.

As molduras dos neblinas, aletas pintadas e refletores claros foram acrescentados ao para-choque seguindo `20260416_141206.jpg` e `20260416_141159.jpg`. Isso é um refinamento sobre a carroceria existente, não uma nova digitalização do para-choque completo.

## Verificação

Os testes cobrem separação das duas peças móveis, conservação da quantidade de triângulos, elevação antes do deslizamento, retorno à posição fechada, inversão de movimento, matrizes rígidas, buffers exportados e integridade do Civic por hashes. A revisão visual é feita no jogo, pela câmera do motorista e por uma vista externa, sem publicar esta etapa.


## Revisão externa complementar

A [revisão de teto, frente e rodas](REVISAO-EXTERIOR.md) substitui os detalhes frontais planos anteriores por peças com volume no modelo base. Corrige também o canto do painel que escapava para fora perto do retrovisor.
