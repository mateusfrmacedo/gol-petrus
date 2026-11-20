# Headroom para relatórios de desenvolvimento

Ferramenta opcional: [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom).
Não faz parte do jogo, do build ou da publicação no Pages.

```sh
python3 -m venv ~/.cache/gol-headroom
~/.cache/gol-headroom/bin/pip install -r scripts/dev/requirements-headroom.txt
node scripts/cidade/auditoria.cjs /tmp/nova-alianca-auditoria.json
~/.cache/gol-headroom/bin/python scripts/dev/headroom-output.py /tmp/nova-alianca-auditoria.json > /tmp/nova-alianca-resumo.txt
```

O script comprime uma cópia do relatório e escreve as contagens estimadas no stderr.
O original permanece no caminho informado para conferir detalhes omitidos. Conteúdo
pequeno ou sem redução é devolvido inteiro. Leia o original antes de decidir uma
correção; compressão não substitui testes nem conserva necessariamente cada linha.

A biblioteca roda localmente, com compressão por modelo desativada e sem chave de
API. Não configura proxy, não altera o Codex nem a sessão do Claude. Esta integração
reduz somente as saídas passadas explicitamente pelo script; não promete economia
automática nos tokens desta conversa. O tokenizer pode buscar seu vocabulário na
primeira execução; se indisponível, a biblioteca usa estimativas.

Verificação local em 20/11/2026: o relatório completo da auditoria da cidade passou
de 140.054 para 83.158 tokens estimados (redução de 40,6%). O tokenizer estava
indisponível nessa medição; os valores são estimativas da biblioteca, não medição
de cobrança ou de economia total da conversa.
