# GTA NA para Android

O APK de teste fica em `dist/android/GTA-NA-0.2.0.apk`. É um aplicativo Android com o motor WebGPU original e arquivos locais; não exige publicar mudanças no GitHub. Requer Android 12 ou superior, GPU compatível e Android System WebView atualizado. O número da versão do Android, sozinho, não garante suporte gráfico.

## Instalação e uso

Transfira o APK para o celular e abra o arquivo. Autorize a instalação por esse aplicativo quando o Android solicitar. O pacote usa a assinatura de desenvolvimento local; serve para instalação direta e testes.

- A abertura mostra apenas uma tela simples de Carregando, sem instruções de teclado ou nomes das fases de preparação.
- O aplicativo abre em paisagem, com tela imersiva e câmbio automático. A velocidade e a marcha aparecem em um visor digital pequeno no canto superior direito; os mostradores analógicos foram removidos da versão móvel.
- O volante reproduz a foto do proprietário; os pedais têm aparência de borracha real. Pedais e freio de mão ficam menores, próximos e sem legendas visuais. Segure **Acelerar** ou **Freio / ré** e gire o volante com outro dedo. O freio engata ré depois de parar.
- Toque na **engrenagem → Direção**, escolha inclinação. Segure o telefone na posição de dirigir e toque em **Calibrar inclinação**, dentro do menu. Esse botão não aparece na tela de direção. O controle volta ao volante se o sensor não estiver disponível.
- Na câmera externa, arraste o cenário para olhar ao redor; use dois dedos para aproximar ou afastar. A opção Centralizar câmera, dentro do menu, restaura a perseguição. Reposicionar carro devolve o Gol à rua.
- O menu permite câmbio manual, sensibilidade, clima, horário e três qualidades gráficas. Os botões de marcha aparecem no modo manual.
- Na tela de direção ficam a engrenagem de menu, a câmera e os controles de condução. Faróis, luz da placa, setas e teto solar são configurados dentro do menu. O freio de mão é uma alavanca realista: segure para puxar, solte para liberar. Minimapa e rádio foram retirados da interface móvel a pedido do Mateus.
- Ao enviar o aplicativo para segundo plano, o jogo pausa e os comandos são soltos.

O mapa e o som sintetizado funcionam sem internet. O clima real requer conexão. A rádio não é iniciada no modo móvel e as músicas não entram no APK.

## Compatibilidade

O renderizador não possui alternativa em WebGL. Na abertura, verifica adaptador, limites e compilação. Se o WebView falhar, um diálogo oferece **Testar no Chrome**. Esse modo serve os mesmos arquivos do APK em `127.0.0.1:38765`; não abre o site publicado nem expõe o servidor à rede local. Ao retornar ao aplicativo e escolher Fechar no aviso de compatibilidade, o servidor é encerrado. O Chrome precisa oferecer WebGPU compatível; essa opção não garante funcionamento em uma GPU incompatível.

O perfil móvel agora separa resolução e custo dos efeitos. Econômico permite até 960 pixels no lado maior, Equilibrado até 1280 e Alto até 1600, respeitando os pixels físicos do aparelho. Equilibrado é o padrão. A escolha fica salva entre aberturas do aplicativo.

Desfoque de movimento, grão cinematográfico e reflexos em espaço de tela ficam desligados no celular. Reflexos do ambiente continuam ativos, com texturas menores e atualização distribuída entre quadros. Céu, oclusão e névoa têm orçamento próprio para celular. Os modelos e a física são preservados.

Em **Fluidez**, Automática escolhe alvo de 30 ou 60 FPS a partir da medição inicial de GPU; também é possível selecionar 30 ou 60. Há no máximo dois quadros enviados pelo laço móvel à GPU aguardando conclusão, evitando acúmulo de comandos. O menu mostra a resolução e os FPS observados durante a direção. Para começar no Nothing Phone (1), use **Equilibrado e 30 FPS** e confira a leitura depois de dirigir. O desempenho sustentado, aquecimento e consumo precisam ser verificados no telefone.

A direção e os pedais compartilham a mesma física analógica do controle. A leitura de altura oferece interpolação explícita para GPUs sem `float32-filterable`, usando filtragem da GPU quando o recurso existe. Os shaders registrados usam no máximo 11 texturas por estágio e o dispositivo solicita 16. Veja a medição e seus limites em [DESEMPENHO.md](DESEMPENHO.md).

Não há promessa de FPS: o desempenho e o consumo precisam ser medidos no Nothing Phone do Mateus.

## Reconstrução

Requer JDK 17 e Android SDK 36. O Gradle Wrapper está incluído. No Mac, o script reconhece o JDK 17 do Homebrew e o SDK em `~/Library/Android/sdk`; em outros ambientes, configure `JAVA_HOME` e `ANDROID_HOME`.

```sh
sh scripts/android/build.sh
node tests/mobile.cjs
node tests/mobile-quality.cjs
node tests/mobile-loading.cjs
```

Para revisão automatizada em Chrome de desenvolvimento com depuração remota na porta 9333, sirva o projeto em `127.0.0.1:8765` e execute:

```sh
node scripts/android/browser-check.mjs nova-alianca
node scripts/android/browser-check.mjs circuito
# Se o ambiente não emitir eventos CDP de toque, valide a integração pelo DOM:
node scripts/android/browser-check.mjs nova-alianca --synthetic
```

Essa revisão usa WebGPU real no computador com viewport móvel. A opção `--synthetic` usa PointerEvents no DOM real com captura simulada; o relatório identifica essa alternativa, que não verifica a entrega física de toques pelo Android. Não substitui o teste da GPU e dos sensores físicos do telefone. Capturas e relatórios ficam em `.tools/android-review/`. O emulador disponível foi usado para instalar/abrir o APK e verificar a falha gráfica e o servidor local; seu WebView 133 com GPU emulada não ofereceu adaptador WebGPU.

## Arte dos controles

O gerador integrado isolou e retificou o volante da foto `photo_2026-11-17 21.06.14.jpeg`, preservando aro de couro, três raios, comandos e emblema. A segunda orientação gerou dois pedais de borracha realistas, freio horizontal e acelerador vertical, em fundo transparente; a alavanca de freio de mão foi gerada com couro preto, botão metálico e base sanfonada. São imagens para os comandos sobrepostos; não alteram o modelo 3D do interior. As versões exportadas ficam em `assets/android/controles/`; `node scripts/android/controls.mjs` incorpora os PNGs em `source/js/58_mobile_art.js`.

## Ícones

A arte com teto solar foi adaptada pelo gerador integrado a partir do ícone aprovado. Orientação usada: preservar GTA NA, o Gol com teto de vidro, os personagens e Nova Aliança, reposicionando letras e carro para permanecerem visíveis no recorte circular. A fonte está em `assets/android/gta-na-master.png`; as versões quadrada e redonda, na mesma pasta.

`scripts/android/icons.py` usa Pillow para exportar densidades, máscaras e camadas do Android. As camadas adaptáveis se ajustam a recortes redondos ou quadrados; a camada monocromática permite o tema de ícones do Nothing OS. O primeiro plano ocupa 72 dos 108 dp, com as letras e o carro dentro da área central.

Referências: [ícones adaptáveis](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [conteúdo local no WebView](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) e [WebGPU no Android](https://developer.chrome.com/docs/web-platform/webgpu/overview).
