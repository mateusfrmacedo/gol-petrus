# Cópia para limpeza do computador

O código e o histórico publicado ficam em https://github.com/mateusfrmacedo/gol-petrus.
A cópia completa dos arquivos da pasta fica nos anexos da Release:
https://github.com/mateusfrmacedo/gol-petrus/releases/tag/backup-completo-2026-11-25

O backup inclui fontes, fotos originais, modelos, APKs, referências, arquivos ignorados, ferramentas e cópias antigas locais. A pasta `.git` da raiz é a única exclusão: o histórico publicado pode ser recuperado clonando o repositório. Os repositórios internos das ferramentas são preservados no arquivo.

## Recuperar a pasta

Baixe todas as partes `gol-petrus-pasta.tar.gz.parte-*`, o `SHA256SUMS` e o `manifesto-arquivos.json` da Release para uma mesma pasta vazia. Os comandos abaixo usam macOS ou Linux:

```sh
shasum -a 256 -c SHA256SUMS
cat gol-petrus-pasta.tar.gz.parte-* > gol-petrus-pasta.tar.gz
tar -xzf gol-petrus-pasta.tar.gz
```

A pasta recuperada se chama `Gol de corrida`. O manifesto relaciona os caminhos, tamanhos e hashes SHA-256 dos arquivos, além dos destinos dos links simbólicos. Os ambientes Python, navegador e ferramentas locais podem precisar de reinstalação em outro computador; o arquivo preserva a cópia original, inclusive esses links.

Para recuperar também o histórico Git, clone o repositório em outra pasta e copie sobre ela o conteúdo extraído, incluindo os diretórios ocultos, sem apagar a pasta `.git` criada pelo clone. A Release aponta para o commit que corresponde à cópia.

## Arquivos externos

Esta cópia cobre somente a pasta do projeto. Instalações do Android SDK, Java, Python e chaves de assinatura em outras pastas do computador não fazem parte dela. O APK usa a chave de desenvolvimento do Android; ela não deve ser publicada em um repositório público.
