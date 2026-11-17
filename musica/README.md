# Músicas do jogo

Adicione os arquivos `.mp3` diretamente nesta pasta e faça commit na branch `main`. Depois que o GitHub Pages publicar os arquivos, recarregue o jogo.

- **P**: toca ou pausa a música.
- **0** (ou zero numérico): passa para a próxima faixa e inicia a reprodução.
- Ao terminar uma faixa, a próxima toca automaticamente. A lista volta ao início após a última.

O jogo consulta esta pasta pela API pública do GitHub e ordena as faixas pelo nome. Para escolher a ordem, use nomes como `01 - Minha música.mp3`. O botão M controla o som do motor separadamente.

`playlist.json` é uma reserva gerada por `node source/build.mjs` quando a API estiver indisponível. Para atualizá-la junto com os uploads, execute o build antes do commit. Use arquivos de áudio que você possa publicar.
