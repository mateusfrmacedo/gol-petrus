# GTA NA para Android

O APK de teste fica em `dist/android/GTA-NA-0.1.0.apk`. É um aplicativo Android com o motor WebGPU original e arquivos locais; não exige publicar mudanças no GitHub. Requer Android 12 ou superior, GPU compatível e Android System WebView atualizado. O número da versão do Android, sozinho, não garante suporte gráfico.

## Instalação e uso

Transfira o APK para o celular e abra o arquivo. Autorize a instalação por esse aplicativo quando o Android solicitar. O pacote usa a assinatura de desenvolvimento local; serve para instalação direta e testes.

- O aplicativo abre em paisagem, com tela imersiva e câmbio automático.
- O volante reproduz a foto do proprietário; os pedais têm aparência de borracha real. Segure **Acelerar** ou **Freio / ré** e gire o volante com outro dedo. O freio engata ré depois de parar.
- Toque na **engrenagem → Direção**, escolha inclinação. Segure o telefone na posição de dirigir e toque em **Calibrar inclinação**. O controle volta ao volante se o sensor não estiver disponível.
- Na câmera externa, arraste o cenário para olhar ao redor; use dois dedos para aproximar ou afastar. A opção Centralizar câmera, dentro do menu, restaura a perseguição. Reposicionar carro devolve o Gol à rua.
- O menu permite câmbio manual, sensibilidade, clima, horário e três qualidades gráficas. Os botões de marcha aparecem no modo manual.
- Na tela de direção ficam a engrenagem de menu, a câmera e os controles de condução. Faróis, luz da placa, setas e teto solar são configurados dentro do menu. O freio de mão é uma alavanca realista: segure para puxar, solte para liberar. Minimapa e rádio foram retirados da interface móvel a pedido do Mateus.
- Ao enviar o aplicativo para segundo plano, o jogo pausa e os comandos são soltos.

O mapa e o som sintetizado funcionam sem internet. O clima real requer conexão. A rádio não é iniciada no modo móvel e as músicas não entram no APK.

## Compatibilidade

O renderizador não possui alternativa em WebGL. Na abertura, verifica adaptador, limites e compilação. Se o WebView falhar, um diálogo oferece **Testar no Chrome**. Esse modo serve os mesmos arquivos do APK em `127.0.0.1:38765`; não abre o site publicado nem expõe o servidor à rede local. Ao retornar ao aplicativo e escolher Fechar no aviso de compatibilidade, o servidor é encerrado. O Chrome precisa oferecer WebGPU compatível; essa opção não garante funcionamento em uma GPU incompatível.

O perfil econômico limita a renderização a 960 pixels no lado maior e reduz as sombras. Equilibrado permite até 1280; alto, até 1600. O limite também respeita a largura lógica da tela, evitando renderizar desnecessariamente na densidade física inteira do telefone. A direção e os pedais compartilham a mesma física analógica do controle. A leitura de altura oferece interpolação explícita para GPUs sem `float32-filterable`; os shaders registrados usam no máximo 11 texturas por estágio e o dispositivo solicita 16.

Não há promessa de FPS: o desempenho e o consumo precisam ser medidos no Nothing Phone do Mateus.

## Reconstrução

Requer JDK 17 e Android SDK 36. O Gradle Wrapper está incluído. No Mac, o script reconhece o JDK 17 do Homebrew e o SDK em `~/Library/Android/sdk`; em outros ambientes, configure `JAVA_HOME` e `ANDROID_HOME`.

```sh
sh scripts/android/build.sh
node tests/mobile.cjs
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
