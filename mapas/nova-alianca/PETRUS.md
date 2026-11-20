# Região da casa do Petrus

Referência: [Street View da Rua José Fagliari](https://www.google.com/maps/@?api=1&map_action=pano&pano=vwJxbELpF4El1dB1dVEZ_A&heading=171&pitch=5), imagens de setembro de 2024, conferidas em 20/11/2026.
O trecho aparece como Rua Humberto Melão na base OSM usada pelo jogo.

Foram preservados a casa de portão bronze e muro com faixas, o vizinho da esquina
com muro arredondado e o vizinho de fachada cinza com cobogó preto. Os três lotes
agora têm uma reserva completa no mapa de ocupação, impedindo casas genéricas
sobre as fachadas existentes.

O lado oposto ganhou uma casa de varanda comprida e telhado cerâmico, portão social
branco com losango, vigas de madeira e duas antenas parabólicas. O lote ao lado
tem muro claro e portão de garagem vertical. A esquina oeste recebeu o terreno
aberto com manchas de solo e muro de tijolo ao fundo. Duas árvores baixas substituem
a distribuição aleatória nesse entorno; a frente da casa do Petrus fica livre.

As calçadas têm juntas, tampas de inspeção e uma lixeira verde-clara vazada. Pisos
acompanham o chão e ficam fora do asfalto. Casas, muros e lixeira recebem colisão.
A geometria adicional tem aproximadamente 2.662 triângulos, sem novas imagens
ou solicitações de rede para carregar o cenário.

Posições seguem o quadro local do marco e a malha de ruas existente. Larguras,
recuos, alturas e fundos ocultos são aproximações visuais; não se trata de um
levantamento métrico. Não foram incorporadas fotografias ou placas privadas.

## Conferência

Abra `?mapa=nova-alianca&fotos=petrus` para comparar quatro vistas às 10h, ao
entardecer e às 21h. A seleção está em `57_petrus_fotos.js` e mantém as câmeras dos
outros setores disponíveis nos respectivos modos. [Folha de revisão](revisao/petrus-entorno.jpg).

```sh
node source/build.mjs
node tests/city-petrus.cjs
node scripts/cidade/auditoria.cjs /tmp/nova-alianca-auditoria.json
```

O teste executa a integração da cidade com o setor do Petrus e verifica sobreposição
de lotes, coordenadas finitas, pista livre, colisões e limite de geometria.
Na versão publicada desta rodada, a auditoria contabilizou 3.449 casas geradas,
zero casas sobre ruas e zero casas sobrepostas. Construções manuais são adicionais.
