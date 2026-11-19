# Gol G6 — interior modular e revisão

Esta etapa aplica o método de referências, peças separadas, controles normalizados e reimportação documentado pelo [AnyMachine](https://github.com/apekshik/anymachine/blob/main/PIPELINE.md). As fotos reais do proprietário são a autoridade para o Gol. Não são usadas imagens geradas para inventar peças.

## Conjunto de referência

- Painel e volante: `assets/interior/painel-real.jpeg`, `volante-real.jpeg`, `painel-detalhes.png`.
- Portas e bancos: `/Users/mateus/Downloads/Gol G6 PF/20260416_141702.jpg` e `20260416_141713.jpg`.
- Colunas e teto: `20260416_141935.jpg`, `20260416_142118.jpg`.
- Visão geral do interior: `20260416_141817.jpg`, `20260416_141836.jpg`.
- Carroceria: frente, laterais e traseira dessa mesma pasta. O exterior e as rodas aprovados permanecem preservados nesta etapa.

A folha `revisao/referencias-contato.jpg` organiza as 16 imagens. A foto de abril mostra uma central multimídia diferente; o rádio Pioneer das fotos mais recentes permanece como referência do jogo.

## Peças e controles

| Conjunto | Peças próprias | Controle |
|---|---|---|
| Painel | Casca, tampa superior, porta-luvas e instrumentos | Fixo à carroceria |
| Console | Moldura, rádio, ar, botões, pisca-alerta e túnel | Fixo à carroceria |
| Portas | Forros, comandos, maçanetas e iluminação vermelha | Fixos; não há abertura das portas nesta etapa |
| Volante | Aro, airbag, comandos e raio inferior vazado | `Gol · controles["direcao"]`: 0 esquerda, 0,5 centro, 1 direita |
| Teto | Forro e colunas originais da carroceria; quebra-sóis próprios e vedação separada | Abertura existente preservada |
| Vidros | Para-brisa, vigia, laterais, lentes e vidro do teto separados | `teto_solar`: 0 fechado, 1 elevado e deslizado para trás |
| Rodas | Fonte instanciada nas quatro posições aprovadas | Centros e dimensões do modelo atual |

O arquivo Blender possui grupos semânticos editáveis. O jogo usa a exportação do interior feita a partir desse arquivo, reunida nos lotes de renderização existentes; não foi acrescentado um draw call para cada peça. O volante continua ligado ao esterço da simulação e a textura não contém fundo nos vazados.

## Reconstruir

1. `node scripts/gol/capture-geometry.cjs`
2. Python com bpy: `python scripts/gol/build-blender.py --render`
3. `python scripts/gol/export-review.py`
4. `python scripts/gol/export-interior.py`
5. `node tests/gol-modular.cjs`
6. `node source/build.mjs`

`gol-modular.blend` é o arquivo editável e `gol-modular.glb` inclui uma animação de revisão do volante. A exportação usada pelo jogo fica em `source/js/30_car_b1_refined_data.js`. `validacao.json` e `validacao-glb.json` registram orçamento, eixos, animação e erro dimensional após a reimportação.

## Levar ajustes manuais ao jogo

Abra `gol-modular.blend`, edite as peças do interior e salve. Execute `python scripts/gol/export-interior.py`, `python scripts/gol/export-review.py`, `node tests/gol-modular.cjs` e `node source/build.mjs`. O exportador aplica transformações dos objetos, normais e modificadores avaliados; o volante é exportado relativo à base da coluna, em posição neutra. Preserve os atributos `game_target`, `game_group` e os materiais das peças. A carroceria e os vidros continuam usando o modelo base no jogo, por isso alterações manuais nesses grupos ainda não são importadas por esse exportador.

Os scripts `capture-geometry.cjs` e `build-blender.py` recriam o arquivo a partir do código: use-os apenas para reconstrução completa, pois substituem edições manuais no `.blend`. O teto usa o mesmo movimento por fases no Blender e no jogo.

## Limites conhecidos

As laterais e o verso do volante ainda são aproximações onde as fotos não mostram a geometria. O painel é reconstruído a partir de fotos com perspectiva; não é um levantamento dimensional de fábrica. Portas externas e capô não receberam rig de abertura. O Blender e o jogo usam o mesmo controle de elevação/deslizamento. No jogo, o botão na tela ou a tecla O abre e fecha o teto. A vedação da abertura é fixa; vidro e moldura móvel correm sobre o teto, com defletor articulado.

O Civic não é fonte nem destino desse processo. `civic-preservado.json` registra os hashes de seus arquivos; o teste exige que continuem idênticos.
