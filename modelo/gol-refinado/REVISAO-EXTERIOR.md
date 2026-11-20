# Revisão externa — teto, frente e rodas

Referências principais: `20260416_141206.jpg`, `20260416_141159.jpg`, `20260416_142118.jpg`, fotos do proprietário de novembro e `RodaGol.png`. O emblema frontal segue a especificação explícita do proprietário: VW preto, fundo branco. O Civic foi preservado.

## Alterações

| Região | Causa identificada | Correção |
|---|---|---|
| Teto solar | O vidro se movia sobre a chapa ainda inteira; a vedação também era movimentada indevidamente. | Cortadas chapa e camada interna no vão. Eliminada a tampa inferior que o Boolean criava na malha importada. Vidro curvo e moldura móveis separados da vedação fixa. Defletor fino articulado. Removidos os blocos planos de forro/moldura que atravessavam a curvatura e geravam pontas pretas externas. Mantido o forro original curvo e recortado. |
| Para-choque frontal | Molduras e faixas adicionadas como superfícies planas davam aparência de adesivo. O neblina não tinha refletor e lente com volume. | Removidos os remendos procedurais. Aletas brancas fechadas, com ponta afilada e chanfros; copo do refletor, moldura e lente abaulada dos neblinas no Blender. Grade inferior em preto acetinado. |
| Perto do retrovisor | O painel e a parede frontal da cabine avançavam além do contorno externo na base do para-brisa. | Painel afunilado em direção ao para-brisa, parede frontal estreitada na parte superior. A carroceria externa não foi remendada para esconder essa peça. |
| Emblema VW frontal | Cores e resposta metálica não correspondiam ao preto/branco solicitado. | Textura em preto sobre branco e material não metálico. Normal e relevo preservados. |
| Face das rodas | Os raios tinham uma variação radial de profundidade, produzindo concavidade. | Removida essa variação da face principal e dos rebaixos. Miolo alinhado, parafusos reposicionados, vazados e chanfros preservados. Pneu, diâmetro e bitola não foram modificados. |

## Arquivos

- `modelo/blender/gol-branco.blend`: modelo base corrigido.
- `modelo/gol-refinado/gol-modular.blend`: carro editável com controle normalizado `teto_solar`, em fases iguais às do jogo.
- `modelo/gol-refinado/gol-modular.glb`: revisão exportada e reimportada para conferir dimensões.
- `source/js/30_car_a0_data.js`: exportação compactada da carroceria, vidros, emblemas e rodas.
- `source/js/30_car_b1_refined_data.js`: interior corrigido, incluindo o afunilamento na frente do painel.
- `validacao-exterior.json`: medidas geométricas da revisão. A planicidade da face tem desvio RMS aproximado de 0,15 mm no modelo; isso não representa medição do carro real.

A ferramenta `scripts/gol/refine-exterior.py` usa a cópia-base local preservada em `.local-backups/exterior-2026-11-19/`, para evitar reaplicar correções sobre uma malha já modificada. Para a reconstrução normal do jogo, use o `.blend` corrigido com `modelo/exportar_blender_jogo.py`, depois capture e exporte o interior conforme `PARTS.md`.

## Validação

`tests/exterior-model.py` lança raios pelo vão em nove posições para detectar chapas/tampas indevidas, mede a face da roda, exige seis aletas sólidas e compara o movimento do teto no Blender com o cálculo usado no jogo. `tests/sunroof.cjs` exige a vedação fixa fora das peças móveis e verifica as peças frontais efetivamente exportadas. A validação modular confere as normais, orçamento de triângulos, reimportação do GLB e hashes intactos do Civic.

O para-choque continua baseado na carroceria importada, com os detalhes reconstruídos pelas fotos. Dimensões e curvas não foram digitalizadas a partir de um levantamento físico. Esta etapa permanece local e não foi publicada.
