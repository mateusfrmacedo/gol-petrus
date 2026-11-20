# Honda Civic

Modelo original de **SQUIR3D**: https://sketchfab.com/3d-models/honda-civic-2019-598a9665b5214a01b3379502899e5823

O arquivo `honda-civic-2019.glb` contém a carroceria e o interior capturados do visualizador, com rodas grafite baseadas na fotografia fornecida pelo usuário e ampliadas para aro 19. A conversão mantém os dados da carroceria, aplica as matrizes da hierarquia e converte centímetros para metros. As linhas da ferramenta de inspeção e os triângulos degenerados de ligação das tiras não são superfícies do carro e não são desenhados.

As placas SQUIR dianteira e traseira foram removidas da geometria do jogo e do GLB.

As rodas usam dez raios em cinco pares, aberturas reais entre raios, cinco furos com parafusos, barril de sete polegadas e calota com o emblema Honda da referência. A face fotográfica é retificada e aplicada a uma malha com concavidade, chanfros e espessura. O talão dos pneus é ajustado para o aro 19, reduzindo a altura da lateral e preservando o diâmetro externo e a posição das rodas. Os discos e as pinças do carro permanecem separados. O gerador está em `scripts/civic_wheel17.py`; a fotografia original de aro 17 e as medidas atuais ficam em `wheel-17/`.

No jogo, as peças são agrupadas por material e vínculo mecânico para reduzir chamadas de desenho. Pneus, aros e discos giram; pinças e pastilhas acompanham o esterço. Os materiais são adaptados ao renderizador WebGPU do jogo: a iluminação, as reflexões e o pós-processamento são diferentes dos do Sketchfab. A física e o som são os sistemas do jogo, não uma simulação de uma motorização de fábrica.

As imagens do quadro de instrumentos e da central multimídia são as do modelo original. Os indicadores do HUD continuam visíveis na câmera interna do Civic para informar velocidade e rotação reais.

`source.json` registra a autoria e a licença **Editorial** informada pelo serviço para esse recurso. A licença do código do jogo não altera a licença do modelo.

As seis texturas do carro usam as variantes de maior resolução em potência de dois, como no userscript: pneus de 2048², freios e console de 1024², tela e placa de 512×256. A permutação de transporte dos pixels é revertida conforme o shader do visualizador. Uma sétima textura vem da fotografia da roda. O arquivo inclui os 21 materiais do carro, dois materiais da nova roda e um material cromado para as grades frontais.

Para regenerar os recursos, execute `scripts/decode-civic-textures.py` com a pasta dos originais e uma pasta de saída. Depois execute `scripts/import-civic.py` com a captura JSON e essa pasta de saída. O arquivo `manifest.json` relaciona todas as peças convertidas. O HTML incorpora os recursos e funciona sem buscar o modelo no Sketchfab.
