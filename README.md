# Gol Petrus

**Um VW Gol branco, rebaixado e com rodas 17, para pilotar num circuito de corrida, direto no navegador.**

## Jogar

Pelo navegador: **https://mateusfrmacedo.github.io/gol-petrus/**

Ou no computador: baixe o [`index.html`](index.html) e abra no **Chrome** ou no **Edge**. Precisa de um navegador com **WebGPU** e funciona sem rede. Espere alguns segundos enquanto o circuito é montado e aperte **Começar**.

Para ver só o carro, sem a pista: abra a página com `#carro` no fim do endereço (`#carro-1` a `#carro-6` trocam o ângulo).

## Controles

| | Teclado | Controle |
|---|---|---|
| Acelerar | `W` ou `↑` | Gatilho direito |
| Frear e dar ré | `S` ou `↓` | Gatilho esquerdo |
| Fazer curvas | `A` `D` ou `←` `→` | Analógico esquerdo |
| Freio de mão | `Espaço` | `A` |
| Subir / reduzir marcha | `E` / `Q` | `B` / `LB` |
| Manual / automático | `T` ou seletor no menu | Seletor no menu |
| Trocar a câmera | `C` | `Y` |
| Olhar para trás | Segurar `V` | Segurar `RB` |
| Devolver o carro à pista | `R` | `X` |
| Pausar e abrir o menu | `Esc` | `Start` |

O câmbio manual tem cinco marchas e embreagem automática. O painel mostra a marcha e avisa quando subir. Reduções que excederiam 6.500 rpm são bloqueadas. `S` freia e engata a ré ao parar; as voltas roteirizadas usam o automático.

`C` alterna entre a câmera externa, a visão interna do motorista e a câmera da pista. A cabine usa painel cinza fosco, quatro difusores redondos, rádio, comandos do ar, câmbio manual e volante VW de três raios, com base na referência fornecida do interior. Velocímetro e conta-giros funcionam no próprio painel; os mostradores grandes ficam ocultos nessa câmera. O para-brisa não aplica película nem reflexos na visão interna.

`M` liga e desliga o som, `H` mostra o desempenho, `B` roda o benchmark, `F` mostra a volta roteirizada e `1` a `6` pulam para as poses fixas de câmera.


- **O carro, medido nas fotos.** As proporções vêm de fotos de rua do carro real. Pontos marcados em quatro fotos (cubos das rodas, placa, emblemas, maçanetas, quinas do para-brisa, antena) passam por um ajuste de feixes que resolve as câmeras e a posição 3D de cada ponto, com o entre-eixos de fábrica (2.466 mm) e a placa Mercosul como réguas. O resultado: carro rebaixado (soleira a 24 cm, teto a ~1,41 m), bitola de ~1,46 m e rodas 17. A carroceria é um campo de distância ajustado a esses pontos, extraído por *marching cubes* e limpo no Blender. Os vidros são painéis com a borda no contorno medido. As medidas e de onde veio cada uma estão em [`modelo/nota_medidas.md`](modelo/nota_medidas.md).
- **Frente, traseira e laterais fotográficas.** Faróis, grade, emblemas, neblinas, grade inferior, placa, lanternas, nicho da placa e refletores vêm de vistas de referência (frente, traseira e os dois perfis; nos perfis, que não são câmeras perfeitas, uma correção suave pelos pontos de controle), projetadas na carroceria pelas câmeras resolvidas; a lanterna acende no freio. Ver `modelo/insertos.py` e `modelo/build_car.py`.
- **Sem rack nem escada** no teto, como no carro real.
- **A roda.** Traçada direto de uma imagem de frente da roda (`modelo/RodaGol.png`), que também vai como textura na face: acabamento usinado, rebaixos grafite, furos e calota VW iguais ao original. Antes disso, foi traçada numa foto da roda retificada (5 troncos que se abrem em 10 braços usinados, com 10 raios finos grafite rebaixados entre eles, furação 4×100 e calota VW), extrudada com chanfro no Blender e conferida montada nas fotos do carro.
- **Detalhes desenhados por pixel no shader** (`source/wgsl/mat_car.wgsl`, caso 18): molduras dos vidros, faróis com dois projetores, grade com frisos, grade inferior em colmeia com faróis de neblina, lanternas fumê com o desenho de LED que acende no freio, luz de freio no aerofólio, teto solar, aerofólio preto, vãos das portas, capô e tampa traseira, tampa de combustível e refletores. As mesmas regiões estão em `modelo/regions.py`.
- **Placa Mercosul, emblemas VW, GOL e MSI** em decalques desenhados em canvas.
- **Vidros com película escura** nas laterais e na vigia.
- **Som de três cilindros**, como o motor 1.0 MSI (o Uno tinha quatro).
- A física, a pista e a volta roteirizada continuam as do original.

## Mexer no código

O jogo é um único `index.html` montado a partir de `source/`. Com o [Node.js](https://nodejs.org) 18 ou mais novo, sem instalar pacote nenhum:

```bash
node source/build.mjs
```

A malha do Gol fica embutida em `source/js/30_car_a0_data.js` (compactada). Para gerar de novo, com Python 3, `numpy`, `scipy`, `scikit-image`, `matplotlib`, `opencv-python` e `bpy` (o Blender como módulo: `pip install bpy`):

```bash
cd modelo
python3 fotogrametria.py           # câmeras das fotos e pontos 3D (fotogrametria.json)
python3 gen_body.py 0.0065         # campo de distância + marching cubes
python3 process_body.py 52000 0    # Blender: limpeza, decimate, reprojeção e normais
python3 build_car.py               # peças, vidros, roda e o binário do jogo
python3 emit_js.py ../source/js/30_car_a0_data.js
cd .. && node source/build.mjs
```

Conferência no Blender: `cena.py bloco_roda` monta a cena com as câmeras casadas com as fotos e salva `gol_bloco_roda.blend`; `sobrepor.py bloco_roda` gera as sobreposições; `render_roda.py` faz o close da roda. Esses três precisam das fotos de referência, que não estão no repositório: aponte a pasta delas em `FOTOS` (e as vistas geradas em `REF360`).

## Interior do carro real

A cabine utiliza as fotos do proprietário em `assets/interior/painel-real.jpeg` e `assets/interior/volante-real.jpeg`. O volante tem espessura e aberturas em 3D, com contornos traçados na foto; botões, emblema e revestimento utilizam a própria imagem. Rádio e comandos do ar também usam recortes das fotos reais. O painel e os forros recebem granulado extraído de `PAINEL.png`, com mapa de relevo e rugosidade fosca; a tampa superior do passageiro acompanha a superfície curva do painel.

Para reconstruir o atlas dessas superfícies, execute `python scripts/build-cabin-textures.py` (Pillow, numpy e OpenCV) e depois `node source/build.mjs`. As fotos originais e `painel-detalhes.png` permanecem locais para regenerar o atlas; o jogo publicado incorpora apenas as texturas recortadas. A geometria está em `source/js/30_car_b_cabin.js` e `source/js/30_car_c_parts.js`.

## Modelo editável no Blender

O [Gol branco com teto solar e rodas aro 17](modelo/blender/README.md) está disponível em `.blend`, com texturas incorporadas e prévias da carroceria e da roda. A versão inclui os ajustes da traseira a partir das fotos do carro real. A origem da geometria e a licença informada pelo autor estão registradas junto ao arquivo.

## Créditos e licença

[PolyForm Noncommercial 1.0.0](LICENSE.md): livre para usar, estudar, mudar e compartilhar sem fim comercial.

Required Notice: Copyright (c) 2026 ViktorKav (https://github.com/viktorkav/uno-com-escada)

## Borghi Veículos e músicas

Os painéis publicitários usam a logo fornecida da **Borghi Veículos**, com algumas placas dedicadas a **Nova Aliança**. O Gol usa a placa PETRUS e o aplique preto acompanha a moldura do para-choque traseiro.

Adicione MP3 à pasta [musica](musica/) na branch `main`. Depois da publicação do GitHub Pages, recarregue o jogo: **P** toca/pausa e **0** troca de faixa. As faixas avançam automaticamente e seguem a ordem dos nomes dos arquivos. Veja as instruções na pasta.
