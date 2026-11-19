# AnyWreck — ensaio isolado para o Gol

Foi executado o [AnyWreck](https://github.com/apekshik/anywreck), commit `891e45170b1924ac8f70b78b408cd0687897d21f`, conforme seu [fluxo de trabalho](https://github.com/apekshik/anywreck/blob/main/SKILL.md). A licença MIT está em `LICENSE-AnyWreck.txt`. A ferramenta serve aqui para criar variantes visuais de peças danificadas no Blender. Nenhum dano foi ligado às colisões do jogo.

## Resultado

- `capo-limpo.blend`: chapa fechada de ensaio, separada do carro.
- `capo-amassado.blend` e `.glb`: variante gerada pelo AnyWreck.
- `revisao-anywreck.mp4`: comparação em giro de 360°, com mesma escala, material e iluminação.
- `anywreck-report.json`: métricas da execução; `perfil-gol.json` e `impacto.json`: intenção e parâmetros.

O capô usa uma superfície suave ajustada às amostras do modelo do Gol e contorno simplificado. O proxy tem **30 mm de espessura computacional** para manter uma casca fechada estável na resolução escolhida. Isso não representa a espessura real de chapa nem uma análise estrutural do veículo. Ensaios com uma casca de 6 mm produziram ondulações e variação excessiva de área e foram rejeitados.

Nesta execução, o impacto pede 12 mm de profundidade, raio de 140 mm, sem desgaste ou ferrugem. O relatório registra deslocamento máximo de 16,4 mm, variação de área de +0,07%, volume relativo de 0,9906 e 33.114 triângulos na saída. O critério local exige variação de área abaixo de 3% na malha de simulação e no resultado, além de ferrugem zero. O vídeo foi conferido em vistas de cima e sob luz rasante.

Esse resultado é um estudo visual. Não inclui para-choques quebrando, vidros estilhaçando, abertura de portas, deformação em tempo real ou avaliação de segurança. O carro limpo, seus controles e o Civic não passam pelo AnyWreck.

## Reproduzir

Requer Git, Python com `bpy`, `numpy`, Pillow e FFmpeg. A execução foi verificada com bpy 5.3; o projeto de origem documenta Blender 5.2.

```sh
git clone https://github.com/apekshik/anywreck .tools/anywreck
git -C .tools/anywreck checkout 891e45170b1924ac8f70b78b408cd0687897d21f
python scripts/gol/prepare-wreck.py
python scripts/gol/run-wreck.py
python scripts/gol/review-wreck.py
ffmpeg -y -framerate 8 -i modelo/gol-refinado/danos/frames/%03d.png -vf 'pad=ceil(iw/2)*2:ceil(ih/2)*2' -c:v libx264 -pix_fmt yuv420p -movflags +faststart modelo/gol-refinado/danos/revisao-anywreck.mp4
```

Execute o FFmpeg apenas depois de `review-wreck.py` passar. A preparação e a execução escrevem somente nesta pasta; não substituem a carroceria do jogo. Não envie fotos ou arquivos originais do proprietário para serviços externos sem autorização.
