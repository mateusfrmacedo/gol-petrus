# Gol Petrus

Simulador de corrida para navegador, com foco na reprodução visual do **VW Gol G6 Petrus** a partir das fotos do carro real. O projeto também oferece um Honda Civic, mantido separado das revisões do Gol.

**[Jogar no GitHub Pages](https://mateusfrmacedo.github.io/gol-petrus/)** · [Modelo do Gol](modelo/blender/README.md) · [Guia de peças e exportação](modelo/gol-refinado/PARTS.md)

## Jogar e compatibilidade

Abra o endereço HTTPS acima em um Chrome ou Edge atualizado, com **WebGPU disponível e GPU compatível**. Aguarde a montagem do cenário e pressione **Começar**. A seleção de veículo fica nos menus inicial e de pausa.

O `index.html` gerado incorpora código, shaders, geometria e texturas da cena. A rádio usa os arquivos MP3 separados da pasta `musica/`. Para executar uma cópia local do repositório:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Depois abra `http://localhost:8765/`. O jogo também oferece vistas isoladas: `#carro`, `#carro-1` a `#carro-6` e `?scene=car&carcam=0`. Os parâmetros `?vehicle=gol` e `?vehicle=civic` selecionam o veículo.

### Erro “Nenhum adaptador WebGPU” no Windows

Essa mensagem ocorre quando `requestAdapter()` retorna vazio, antes de o jogo criar o dispositivo gráfico. O código também verifica recursos e limites da GPU; WebGPU habilitado no navegador é apenas uma parte dos requisitos.

1. Em `chrome://settings/system`, habilite a aceleração gráfica e reinicie o Chrome.
2. Atualize o navegador em `chrome://settings/help`.
3. Confira `chrome://gpu`; se aparecer “Software only”, verifique os drivers da GPU.
4. Se já aparecer “WebGPU: Hardware accelerated” e o erro continuar, registre as seções **Problems Detected**, **Dawn Info**, modelo da GPU e versão do Chrome para diagnóstico.

Referência: [solução de problemas WebGPU — Chrome for Developers](https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips). A aplicação depende de WebGPU e não possui renderizador alternativo em WebGL.

## Recursos implementados

### Gol e interior baseado no carro real

- Carroceria branca, rebaixamento, teto solar, aerofólio, lanternas fumê e placa PETRUS.
- Rodas grafite diamantadas com vazados, chanfros e **face dos raios plana**, conforme a referência. Pneus, diâmetro externo e bitola foram preservados na revisão da face.
- Frente revisada com grade inferior preta, aletas brancas com espessura, refletores e lentes curvas dos neblinas; emblema VW frontal **preto sobre fundo branco**.
- Painel fosco com granulado e microrrelevo extraídos das fotos, quatro difusores circulares, console, rádio Pioneer e comandos do ar.
- Volante com contorno fotográfico, espessura, três braços ligados ao aro e abertura inferior real. Seu giro acompanha o esterço das rodas.
- Conta-giros, velocímetro e tela vermelha funcionando no painel. Na câmera interna do Gol, os mostradores grandes do HUD ficam ocultos.
- Visão do motorista com para-brisa sem película ou reflexos sobre a pista. As laterais e a vigia mantêm o acabamento escuro.
- Revisão de encaixes: remoção de colunas e forros duplicados, ajuste dos difusores e quebra-sóis e correção do canto do painel que ultrapassava a carroceria perto do retrovisor.

As referências orientam a forma e os materiais, mas o modelo continua sendo uma reconstrução visual, com partes aproximadas. Os detalhes e as pendências estão nas [revisões do interior](modelo/gol-refinado/REVISAO-INTERIOR.md) e [do exterior](modelo/gol-refinado/REVISAO-EXTERIOR.md).

### Teto solar articulado

O botão **Abrir/Fechar teto solar** e a tecla **O** comandam o vidro. Ele primeiro se eleva e depois desliza para trás; o movimento pode ser invertido durante a abertura ou o fechamento.

A chapa e o forro originais têm um vão real. Vidro e moldura móvel são separados da vedação fixa, com defletor frontal articulado. O controle `teto_solar`, de 0 a 1, usa as mesmas fases no Blender e no jogo.

### Câmeras e condução

- Câmera externa de perseguição, câmera interna do motorista e câmera da pista.
- Na câmera externa do Gol, **arraste com o botão esquerdo do mouse** para girar ao redor do veículo e use a roda do mouse para ajustar a distância.
- O botão **Girar câmera** ativa a inspeção; **Centralizar câmera** ou duplo clique retorna à perseguição normal. A câmera continua acompanhando o carro em movimento.
- Câmbio manual de cinco marchas com embreagem automática, intervalo entre trocas e bloqueio de reduções que excederiam 6.500 rpm. O automático pode ser selecionado no menu.
- Cronômetro de voltas, retorno à pista, freio de mão, teclado e controle com leitura analógica.
- Volta roteirizada, poses de inspeção e benchmark com estatísticas de desempenho; tempo de GPU quando o navegador disponibiliza `timestamp-query`.

### Som, música e cenário

O áudio do motor é sintetizado em JavaScript por um **AudioWorklet**, com camadas de motor, pneus, vento, piso e ambiente. A rádio MP3 é independente desse áudio.

A pista usa a identificação **PISTA DE TESTE - BORGHI VEÍCULOS**, com materiais da Borghi Veículos e placas de Nova Aliança. O cenário inclui pista, boxes, arquibancadas, vegetação, iluminação, sombras e efeitos atmosféricos.

## Ferramentas e tecnologias usadas

| Recurso | Uso no projeto | Onde está |
|---|---|---|
| HTML, CSS e JavaScript | Interface, simulação, entrada, câmeras e organização da cena | [`source/shell.html`](source/shell.html), [`source/js/`](source/js/) |
| WebGPU e WGSL | Renderizador próprio, materiais, iluminação, sombras, vidro e pós-processamento, incluindo TAA, bloom e desfoque de movimento | [`source/wgsl/`](source/wgsl/), `20_renderer.js`, `21_post.js`, `23_forward.js` |
| Node.js | Montagem do HTML autocontido, captura de geometria e testes | [`source/build.mjs`](source/build.mjs), [`tests/`](tests/) |
| Blender e módulo Python `bpy` | Modelagem editável, materiais, articulações, renders e exportação/reimportação | [`modelo/blender/`](modelo/blender/), [`scripts/gol/`](scripts/gol/) |
| Python e NumPy | Transformações, ajuste de superfícies, tratamento de malhas e validação geométrica | Scripts de modelagem e exportação |
| Pillow e OpenCV | Recortes, retificação, atlas de texturas e mapas de granulado derivados das fotos reais | [`scripts/build-cabin-textures.py`](scripts/build-cabin-textures.py) |
| GLB/glTF | Arquivo portátil de revisão e conferência após reimportação | [`gol-modular.glb`](modelo/gol-refinado/gol-modular.glb) |
| Web Audio e AudioWorklet | Som sintetizado e resposta aos controles da simulação | [`source/js/50_som.js`](source/js/50_som.js) |
| FFmpeg | Vídeo comparativo do ensaio de dano | [`modelo/gol-refinado/danos/`](modelo/gol-refinado/danos/) |
| Git e GitHub Pages | Histórico, publicação do jogo e distribuição dos arquivos | Branch `main` e site publicado |
| Codex | Apoio ao desenvolvimento do código, scripts, revisão e verificações | Fluxo de trabalho de desenvolvimento |

O ambiente de modelagem foi verificado com **bpy 5.3**. Os scripts de render usam fontes e caminhos de referência do ambiente de desenvolvimento em macOS; esses caminhos podem precisar de ajuste em outro sistema. O jogador não precisa instalar Blender ou Python.

### AnyMachine: método de modelagem e revisão

Estamos usando o [método documentado pelo AnyMachine](https://github.com/apekshik/anymachine/blob/main/PIPELINE.md) para orientar a organização do trabalho:

1. Reunir referências do carro real e definir os detalhes que precisam ser reproduzidos.
2. Separar peças por função, com nomes e materiais próprios.
3. Criar controles normalizados para as articulações.
4. Comparar renders e vistas do jogo com as fotos.
5. Exportar, reimportar e verificar dimensões, orientação, normais e animação.

No projeto, isso se traduz no Gol modular, nos scripts de reconstrução e nos relatórios de revisão. AnyMachine é uma referência de método; a execução está nos scripts deste repositório.

### AnyWreck: experimento de dano separado

O [AnyWreck](https://github.com/apekshik/anywreck) foi executado para criar um **ensaio de capô amassado**, com uma peça limpa e outra danificada, relatório e vídeo comparativo. A versão utilizada está fixada no commit `891e45170b1924ac8f70b78b408cd0687897d21f`.

Esse recurso é um experimento visual de preparação de modelos. **Não há deformação por colisão em tempo real no jogo.** O ensaio usa uma chapa simplificada e espessura computacional própria; não representa análise estrutural de acidente. O carro limpo e o Civic ficam fora desse processo.

[Procedimento, limites e resultados](modelo/gol-refinado/danos/README.md) · [Licença MIT do AnyWreck](modelo/gol-refinado/danos/LICENSE-AnyWreck.txt)

## Referências e texturas

As fotos reais fornecidas pelo proprietário orientam painel, volante, portas, teto, rodas, frente, laterais e traseira. A referência visual mais recente prevalece quando aparecem versões diferentes de uma peça; por exemplo, o rádio Pioneer das fotos de novembro foi mantido.

O atlas [`assets/interior/cabine-real.webp`](assets/interior/cabine-real.webp) reúne recortes usados nas superfícies e os mapas do plástico granulado. As fotos originais do interior ficam locais e são excluídas pelo `.gitignore`; a folha de contato de referências também não é publicada.

Para regenerar o atlas, são necessários os originais indicados no [guia de peças](modelo/gol-refinado/PARTS.md):

```sh
python scripts/build-cabin-textures.py
node source/build.mjs
```

## Modelos editáveis e reconstrução

| Arquivo | Finalidade |
|---|---|
| [`modelo/blender/gol-branco.blend`](modelo/blender/gol-branco.blend) | Fonte da carroceria, vidros, emblemas, detalhes externos e rodas |
| [`modelo/gol-refinado/gol-modular.blend`](modelo/gol-refinado/gol-modular.blend) | Interior por peças, controles e cena de revisão |
| [`modelo/gol-refinado/gol-modular.glb`](modelo/gol-refinado/gol-modular.glb) | Exportação portátil para revisão |
| [`modelo/gol-refinado/PARTS.md`](modelo/gol-refinado/PARTS.md) | Peças, controles, exportação e limites conhecidos |
| [`modelo/gol-refinado/validacao-exterior.json`](modelo/gol-refinado/validacao-exterior.json) | Verificações geométricas de teto, frente e face das rodas |
| [`modelo/gol-refinado/validacao-glb.json`](modelo/gol-refinado/validacao-glb.json) | Animação, hashes e erro dimensional após reimportar o GLB |

### Compilar apenas o jogo

Com Node.js disponível, sem instalar dependências JavaScript:

```sh
node source/build.mjs
```

O build reúne os arquivos JavaScript e WGSL em `index.html` e atualiza a reserva `musica/playlist.json`.

### Reconstruir a partir das fontes aprovadas

Com Python preparado com `bpy`, NumPy e Pillow, além de Node.js:

```sh
python modelo/exportar_blender_jogo.py
node scripts/gol/capture-geometry.cjs
python scripts/gol/build-blender.py
python scripts/gol/export-interior.py
python scripts/gol/export-review.py
node tests/gol-modular.cjs
node source/build.mjs
```

A carroceria e as rodas são exportadas para `source/js/30_car_a0_data.js`; o interior editável é exportado para `source/js/30_car_b1_refined_data.js`. As peças são reunidas nos lotes do renderizador para evitar uma chamada de desenho por peça.

`capture-geometry.cjs` e `build-blender.py` recriam a cena modular e substituem edições manuais nela. Para levar **edições manuais do interior** ao jogo, salve o `.blend` e execute apenas `export-interior.py`, `export-review.py`, as verificações e o build. O exportador do interior aplica transformações e modificadores avaliados; carroceria e vidros seguem a fonte base separada. Veja o [fluxo completo](modelo/gol-refinado/PARTS.md).

Os scripts históricos de fotogrametria e geração por campo de distância permanecem como referência de desenvolvimento. A rotina atual de reconstrução usa os modelos editáveis aprovados e os exportadores acima.

### Gerar prévias

```sh
python scripts/gol/render-wheel-review.py
python scripts/gol/render-exterior-review.py
```

As imagens ficam em [`modelo/gol-refinado/revisao/`](modelo/gol-refinado/revisao/). Os scripts atualizam as prévias sem modificar o `.blend` e o GLB já validados.

## Verificações de qualidade

Os testes verificam comportamento e geometria, incluindo encaixe dos braços do volante, separação do teto móvel e da vedação, abertura sem chapa oculta, planicidade das rodas, movimentos equivalentes no Blender e no jogo, câmera por mouse, câmbio e integridade do Civic.

```sh
node tests/gearbox.cjs
node tests/steering.cjs
node tests/steering-spokes.cjs
node tests/cockpit.cjs
node tests/sunroof.cjs
node tests/orbit-camera.cjs
node tests/gol-modular.cjs
node tests/vehicles.cjs
node --test source/tests/musica.test.mjs
```

Com o ambiente Python de modelagem:

```sh
python tests/exterior-model.py
python tests/gol-export.py
```

Os testes Python e de exportação usam a captura intermediária de geometria. Execute `node scripts/gol/capture-geometry.cjs` antes deles em uma cópia nova do repositório.

A revisão visual complementa os testes: vistas internas e externas no jogo, roda em detalhe e comparação do teto aberto/fechado. Os relatórios e as imagens permitem conferir o resultado de cada revisão.

## Honda Civic

O Civic possui carroceria, interior, materiais e rodas grafite de **aro 19 × 7**, baseadas na referência fornecida. Os recursos e o GLB ficam em [`assets/vehicles/civic/`](assets/vehicles/civic/README.md). A física e o som são os sistemas do jogo; o painel importado do Civic tem imagens estáticas, por isso seu HUD informa velocidade e rotação durante a câmera interna.

As revisões atuais se concentram no Gol. Os arquivos do Civic são mantidos separados e a validação modular compara seus hashes com a versão preservada para impedir alterações acidentais.

## Música e publicação

Adicione MP3 à pasta [`musica/`](musica/), respeitando os direitos de publicação. **P** toca/pausa e **0** avança; as faixas seguem a ordem dos nomes e avançam automaticamente. **M** controla o áudio sintetizado do jogo separadamente. A lista é consultada pela API pública do GitHub, com `playlist.json` como reserva.

O GitHub Pages publica a branch **main**, a partir da raiz. Antes de enviar mudanças de código, gere o `index.html` e execute as verificações pertinentes. Alterações de documentação não exigem reconstruir o HTML.

## Controles

| Ação | Teclado / mouse | Controle |
|---|---|---|
| Acelerar | `W` ou `↑` | Gatilho direito |
| Frear e dar ré | `S` ou `↓` | Gatilho esquerdo |
| Fazer curvas | `A` / `D` ou `←` / `→` | Analógico esquerdo |
| Freio de mão | `Espaço` | `A` |
| Subir / reduzir marcha | `E` / `Q` | `B` / `LB` |
| Manual / automático | `T` ou seletor no menu | Seletor no menu |
| Trocar a câmera | `C` | `Y` |
| Olhar para trás | Segurar `V` | Segurar `RB` |
| Devolver o carro à pista | `R` | `X` |
| Pausar / menu | `Esc` | `Start` |
| Abrir / fechar teto do Gol | `O` ou botão na tela | — |
| Girar câmera externa do Gol | Arrastar com o botão esquerdo | — |
| Zoom externo do Gol | Roda do mouse | — |
| Centralizar câmera | Duplo clique ou botão na tela | — |
| Música: tocar / pausar | `P` | — |
| Próxima música | `0` | — |
| Som sintetizado: ligar / desligar | `M` | — |
| Estatísticas de desempenho | `H` | — |
| Benchmark / volta roteirizada | `B` / `F` | — |
| Poses de inspeção | `1` a `6` | — |

## Melhorias ainda em revisão

Os tecidos e formatos dos bancos, insertos e bolsões das portas, profundidade dos comandos do rádio/ar, retrovisor e acabamento inferior continuam aproximados. Portas externas e capô não têm abertura articulada. A reprodução visual não substitui um levantamento dimensional do carro real.

As próximas etapas devem seguir as [pendências registradas na revisão do interior](modelo/gol-refinado/REVISAO-INTERIOR.md), preservando as peças já aprovadas e conferindo o resultado dentro do jogo.

## Créditos e licenças

- **Código do jogo:** [PolyForm Noncommercial 1.0.0](LICENSE.md).
- **Modelo base do Gol:** FreddieSign, com origem e licença Editorial registradas no [guia do modelo](modelo/blender/README.md).
- **Modelo base do Civic:** SQUIR3D, com origem e licença registradas em [`assets/vehicles/civic/`](assets/vehicles/civic/README.md).
- **AnyMachine:** referência do processo de modelagem por peças e revisão, com [documentação do método](https://github.com/apekshik/anymachine/blob/main/PIPELINE.md).
- **AnyWreck:** ferramenta do ensaio de dano, com [licença MIT preservada](modelo/gol-refinado/danos/LICENSE-AnyWreck.txt).
- **Referências visuais:** fotos do carro real e materiais fornecidos pelo proprietário, incluindo Borghi Veículos e Nova Aliança.

A licença do código não substitui as licenças dos modelos, ferramentas, fotografias ou músicas.

Required Notice: Copyright (c) 2026 ViktorKav (https://github.com/viktorkav/uno-com-escada)
