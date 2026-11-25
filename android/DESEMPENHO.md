# Desempenho da versão Android 0.2.0

O objetivo desta rodada é reduzir o custo do motor móvel e melhorar a nitidez. O Nothing Phone (1) do Mateus ainda não foi conectado a esta máquina; nenhum resultado abaixo deve ser interpretado como FPS desse telefone.

## Problemas encontrados e correções

- O seletor limitava a densidade a 1 pixel por pixel lógico. Em muitas telas, Econômico, Equilibrado e Alto terminavam na mesma resolução. Agora os limites são 960, 1280 e 1600 pixels no lado maior, respeitando a densidade física do aparelho.
- O modo móvel ainda calculava desfoque de movimento, reflexos por marcha de raios em espaço de tela e grão cinematográfico. Esses efeitos foram retirados do perfil móvel; o carro e o mapa continuam com a geometria anterior, TAA, sombras, reflexos do ambiente e iluminação.
- Reflexos do ambiente passaram de duas faces por quadro para uma face a cada dois ou três quadros durante a direção. As seis faces continuam sendo preenchidas antes da abertura do jogo.
- Reflexos usam textura de 256, em vez de 512; o céu usa 2048 × 512, em vez de 4096 × 1024. A névoa e a oclusão têm menos amostras no celular.
- O laço móvel não envia outro quadro quando dois ainda aguardam conclusão na GPU. A opção Automática considera a medição inicial para escolher um alvo de 30 ou 60 FPS. Os valores podem ser selecionados manualmente no menu.
- O aquecimento de 6.000 iterações do painel analógico não roda mais no celular, que usa um visor digital.

## Comparação controlada local

Chrome com WebGPU e backend Metal, viewport 915 × 412 e densidade 2,5; mapa de Nova Aliança, 10h, clima limpo, mesma partida, mesma entrada e mesmo número de passos de física. Foram descartados 24 quadros de aquecimento, seguidos de 96 amostras por coleta, usando timestamps da GPU. As posições finais do carro coincidiram. Houve duas coletas da versão anterior e do novo Equilibrado.

| Perfil | Resolução | Tempo médio de GPU por quadro nesta máquina |
|---|---|---|
| Anterior, Econômico | 960 × 432 | 13.34–14.92 ms |
| Novo, Econômico | 960 × 432 | 11.56 ms, uma coleta |
| Novo, Equilibrado | 1280 × 576 | 11.86–13.50 ms |
| Novo, Alto | 1600 × 720 | 13.77 ms, uma coleta |

O Equilibrado renderiza aproximadamente 78% mais pixels que a configuração anterior comparada, com custo de GPU semelhante ou menor nessas coletas. Há variação entre as medições: não é correto prometer uma porcentagem fixa de ganho, nem converter estes tempos em FPS de um Android.

O laço normal por `requestAnimationFrame`, com alvo de 30, também foi exercitado: 30.0 FPS observados nesta máquina, 95 amostras e nenhum erro de GPU. A fila observada por consulta ficou em no máximo 1 quadro; o teste unitário verifica o limite de dois e a recuperação após falha. O renderizador desktop também foi executado com os efeitos originais e sem erro.

## Como testar no telefone

Instale o APK 0.2.0 e comece em **Equilibrado / 30 FPS**. Dirija por alguns segundos e abra a engrenagem: o menu mostra resolução e FPS observados. Se não sustentar uma taxa confortável, use Econômico; em aparelhos com folga, teste Alto ou 60 FPS. A escolha fica salva.

Uma avaliação de desempenho sustentado precisa incluir vários minutos de direção, aquecimento, consumo e diferentes horários/climas no telefone. A inicialização automática é uma estimativa, não uma previsão garantida de desempenho em todo o mapa. A compatibilidade continua exigindo Android 12+ e uma implementação WebGPU adequada.

O APK publicado no Release é gerado da base consolidada do commit. As medições locais acima usam a integração de desenvolvimento, com setores da cidade ainda em revisão; por isso não são uma medição de desempenho do APK no telefone.

## Reprodução e referências

O script `scripts/android/benchmark.mjs` mede a versão atual. `--live` exercita o laço normal a 30 FPS; `--desktop` confere o renderizador completo. `--baseline` usa a cópia local `.tools/mobile-baseline/index.html`, preservada antes das alterações, com a mesma integração da cidade em revisão. JSONs e imagens ficam em `.tools/android-performance/`.

A orientação de reduzir passes desnecessários e medir no hardware de destino segue a [documentação de otimização de jogos do Android](https://developer.android.com/games/optimize/optimization-tips). O [Phone (1) oficial](https://checkout.nothing.tech/pages/phone-1) identifica o Snapdragon 778G+; isso não substitui a medição do jogo no aparelho.
