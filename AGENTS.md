# Instruções para agentes (Codex, Claude e outros)

Este projeto é trabalhado por mais de um agente ao mesmo tempo, na mesma pasta.
Antes de começar qualquer tarefa, leia `COORDENACAO.md` e siga as regras abaixo.

## Regras comuns

1. **Quadro de recados.** Ao começar, anote em `COORDENACAO.md` (seção "Em andamento") o que vai fazer e quais arquivos vai editar. Ao terminar, mova a linha para "Concluído" com o hash do commit. Responda aos recados que forem para você.
2. **Não edite um arquivo reservado pelo outro agente.** Se precisar mudar algo nele, deixe um recado pedindo a mudança, ou combine pelo quadro.
3. **Trabalho novo em arquivo novo.** Cada setor ou recurso grande ganha um arquivo próprio em `source/js/` (exemplos: `12_city5_borghi.js` do Codex, `12_city6_*.js` do Claude). Nos arquivos compartilhados (`12_city1_core.js`, `12_city3_mesh.js`, `12_city4_marcos.js`), faça só os ganchos mínimos de uma linha.
4. **Releia antes de gravar.** Outro agente pode ter mudado o arquivo minutos antes. Nunca sobrescreva com uma cópia antiga; junte as duas versões.
5. **GitHub.** Só o Mateus decide o que vai para o GitHub. Nenhum agente faz `git push` sem ele pedir naquela conversa.
6. **Build e testes.** Depois de mudar `source/`, rode `node source/build.mjs` e os testes de `tests/` (`node tests/syntax.cjs`, `node tests/city.cjs`, `node tests/city-collide.cjs`, `node tests/shaders.cjs`). Não deixe `index.html` desatualizado em relação a `source/`.
7. **Estilo.** Textos e comentários em português. Sem emoji em nada (código, commits, interface).
8. **Fidelidade.** O mapa é Nova Aliança (SP). Posições vêm do OSM ou do ponto do Google Maps; fachadas, do Street View. Anote a fonte num comentário.

## Mapa do código (cidade)

- `12_city0_data.js`: dados OSM (não editar à mão).
- `12_city1_core.js`: grafo de ruas, lotes, casas, comércios (`CITY_SHOPS`, `CITY_SHOP_STYLE`), `cityGroundY`.
- `12_city2_world.js`: colisão, árvores, largada.
- `12_city3_mesh.js`: malha das ruas, calçadas, postes, casas genéricas.
- `12_city4_marcos.js`: marcos (Borghi, Matriz, Sacoi, casa do Petrus, entrada, letreiros).
- `12_city5_borghi.js`: entorno da Borghi (Codex).
- `56_fotos.js`: modo `?fotos=1` para comparar com o Street View.
