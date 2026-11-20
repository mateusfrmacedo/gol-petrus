# Roda Gol — teste local com AnyMachine

Experimento isolado. Não altera o jogo nem os modelos existentes; não publica nem envia as fotos a serviços de geração.

Usa o método de referências e construção por peças do [AnyMachine](https://github.com/apekshik/anymachine/blob/d5e8889eef0b33e0bbe62ddca6f713f94b154b68/PIPELINE.md) e o módulo real `hs.py`, incluído sem alterações em `vendor/` com sua licença MIT. Revisão: `d5e8889eef0b33e0bbe62ddca6f713f94b154b68`. Fonte do módulo: `hardsurface/dugout_blender/props_hand/_common/hs.py`.

A foto `RodaGol.png` determina os dez vazados da face por segmentação e medição. A segunda foto serve de referência visual para acabamento e profundidade. Os contornos medidos ficam em `referencias/contornos-medidos.jpg`. Raios e vazados têm geometria real; somente o emblema central usa recorte fotográfico. O pneu, o tambor, os dez apoios em grafite e os quatro alojamentos são peças separadas construídas com os auxiliares do AnyMachine.

Arquivos em `resultado/`:

- `roda-gol-anymachine.blend`: modelo editável, materiais, câmeras e controle `giro` de 0 a 1 no objeto `Roda · controle giro 0 a 1`.
- `roda-gol-anymachine.glb`: modelo com textura do emblema embutida e animação de uma volta em quatro segundos.
- `comparacao.jpg`: referência e render frontal lado a lado.
- `frente.png`, `tres-quartos.png`, `perfil.png`: renders do modelo.
- `stats.json`, `validacao.json`: medidas adotadas e verificação por reimportação.

Medidas são hipóteses visuais: diâmetro externo do aro 468 mm, pneu 566 mm, largura aproximada 212 mm. Sem medidas físicas ou foto traseira, o verso e a concavidade são aproximações. Sulcos são simplificados, sem textos laterais. O render não reproduz os reflexos iridescentes específicos da fotografia. As microtexturas procedurais ficam no Blender; o GLB usa materiais PBR simples. Não é CAD nem especificação para fabricação.

Recriar usando Python com `bpy`, `numpy`, `opencv-python` e `Pillow` (verificado com bpy 5.3):

```sh
python experimentos/roda-anymachine/build.py --render
python experimentos/roda-anymachine/verify.py
```

Ou no Blender com essas dependências disponíveis:

```sh
blender -b --factory-startup --python experimentos/roda-anymachine/build.py -- --render
blender -b --factory-startup --python experimentos/roda-anymachine/verify.py
```

Nenhuma chave de API ou conexão de rede é necessária para reconstruir.
