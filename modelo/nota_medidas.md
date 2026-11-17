# Gol branco: etapa 1 (proporções e roda)

## Origem de cada medida

| Medida | Valor | Origem |
|---|---|---|
| Entre-eixos | 2,466 m | Ficha técnica do Gol G7 2017 (régua da cena) |
| Comprimento | 3,897 m | Ficha técnica (vínculo entre os para-choques medidos) |
| Placa Mercosul | 0,400 × 0,130 m | Norma (régua nas fotos 26, 28 e 29) |
| Raio do pneu | 0,297 m | Medido (0,295 a 0,299 entre as soluções); bate com 205/40 R17, que fica como hipótese |
| Miolo da roda até o centro | 0,79 a 0,80 m | Medido; dá bitola de ~1,47 m, mais larga que a de fábrica (1,429 m), o que é coerente com rodas de mercado |
| Altura da soleira | 0,24 m | Medido (rebaixado: a ficha dá 0,163 m de vão livre com pneu 175/70 R14) |
| Teto | ~1,40 a 1,42 m | Medido (de fábrica: 1,464 m; o carro está rebaixado) |
| Para-choque dianteiro / traseiro | x = 2,03 / −1,87 m | Medido |
| Quinas do para-brisa | base (0,96; 0,98; ±0,62), topo (0,24; 1,32; ±0,54) | Medido |
| Contorno das janelas laterais | 7 pontos | Medido na foto 11.26.25, projetados no plano do vidro |
| Lanterna, tampa de combustível | | Medidos numa foto só, com profundidade estimada |
| Desenho da roda | 5 troncos de ±24°, 10 braços de 30 mm e 10 raios finos rebaixados; furação 4×100 | Traçado na foto 11.26.27 retificada e ajustado por sobreposição (IoU) |

## Como as câmeras foram casadas

Marquei de 7 a 20 pontos em cada foto: cubos das rodas, contato com o chão, cantos da placa, emblemas, maçanetas, retrovisores, quinas do para-brisa e antena. Um ajuste de feixes resolve juntos as quatro câmeras (distância focal, centro óptico, distorção) e a posição 3D dos pontos.

Erro médio de reprojeção por foto:
- 25: 0,8 px
- 26: 5,8 px
- 28: 1,7 px
- 29: 2,4 px

No Blender, o emblema projeta a 1 px do ponto marcado.

## O que ainda difere das fotos

- **Rodas na foto 26:** os pontos das rodas ficam de 15 a 20 px fora. A câmera está muito perto e a foto parece recortada, então os cantos têm mais distorção do que o modelo de lente consegue representar.
- **Frente:** a base do para-choque e as tomadas laterais ainda são um volume único, sem a abertura inferior nem as molduras dos neblinas.
- **Traseira:** o volume do para-choque, que avança na base, é aproximado, e o nicho da placa ainda não existe.
- **Roda:** os braços reais afinam levemente perto do aro e têm cantos mais vivos. A concavidade foi estimada (18 mm).
- **Peças separadas, vãos dos painéis, faróis, lanternas, grades, emblemas e materiais finais** ficam para a próxima etapa.
- **Superfícies que nenhuma foto mostra** são aproximadas: fundo do carro, parte de dentro das caixas de roda e lado de dentro dos raios.

## Vistas da pasta gol-360-rodas-revisadas (adicionadas depois)

São imagens geradas, não fotos: a placa muda de uma vista para outra (GOL2C37, FVG2D68, RFT3H26...). Por isso testei cada uma contra os pontos já medidos nas fotos reais, resolvendo uma câmera para ela:

| Vista | Erro médio | Uso |
|---|---|---|
| gol-06 traseira | 4,4 px (~6 mm) | Referência de forma e detalhes da traseira |
| gol-00 frente | 6,9 px (~1,2 cm) | Referência de forma e detalhes da frente |
| gol-03 perfil esq. | 9,6 px (~2 cm) | Só detalhes; o teto sai ~6 cm mais alto que na foto real 11.26.25 |
| gol-12 vista de cima | 37 px (até ~20 cm) | Sem câmera possível; não serve para medir |

Correção aplicada com base nelas: a estufa e o ombro traseiros ficaram até ~7 cm mais estreitos por lado (a foto real 11.26.28 já indicava sobra no mesmo lugar). As fotos reais continuam sendo a autoridade; detalhes que só aparecem nas vistas geradas (ponteira de escapamento, por exemplo) ficam marcados como não confirmados.
