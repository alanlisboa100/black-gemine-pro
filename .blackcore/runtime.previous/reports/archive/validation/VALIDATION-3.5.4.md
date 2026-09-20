# BLACKCORE Native 3.5.4 — validação de pesquisa e interface Termux

Data: 2026-08-12  
Escopo: notícias, verificação pública de links/perfis, páginas grandes, relatório estreito, histórico rolável e estabilidade da release.

## Veredito

**APROVADA em validação automatizada, com ressalvas externas explícitas.** O núcleo passou em todos os gates funcionais. Fontes com paywall/login, perfis privados, desempenho da GPU e a combinação física Termux/teclado continuam dependendo do ambiente real.

## Evidência executada

| Gate | Resultado |
| --- | ---: |
| Sintaxe JavaScript | 305/305 |
| Suíte Node sequencial | 218/218 |
| Avaliações contextuais/adversariais | 254/254 |
| Corpus de comandos naturais | 38/38 |
| Matriz executável de ferramentas | 50/50 |
| Ferramentas nativas registradas | 69 |
| Testes focados da mudança | 20/20 |
| `npm audit` do núcleo | 0 vulnerabilidades conhecidas |
| `npm audit` do BLACKCORE Studio | 0 vulnerabilidades conhecidas |
| Redação de credenciais | somente fixtures sintéticas sinalizadas; valores nunca exibidos |

O comando oficial de testes usa concorrência 1 para evitar disputa de memória/processos no Termux. A suíte inteira levou aproximadamente 41 segundos no ambiente Linux de validação.

## Pesquisa de notícias comprovada

- Duas consultas complementares coletam candidatos em fontes abertas.
- Páginas de veículos diferentes são abertas dentro de limites de tempo, quantidade e bytes.
- Título, descrição, veículo, data e trecho legível são extraídos como evidência.
- Coberturas sobre o mesmo acontecimento são agrupadas e recebem contagem de domínios independentes.
- A resposta é instruída a entregar o acontecimento, data, relevância, confiança e divergências antes dos links.
- Respostas grandes preservam um prefixo útil e informam truncamento, em vez de abortar com `response too large`.
- Parágrafos e listas são quebrados na largura do terminal; tabelas largas deixam de ser o formato padrão para notícias.

## Links e perfis públicos comprovados

- Instagram, TikTok, X/Twitter, YouTube, Facebook e Threads são reconhecidos.
- O alvo público é aberto quando possível e combinado com buscas de identidade, presença oficial, alegações, golpes e fact-checks.
- O relatório separa observação direta, corroboração, inferência e pontos não verificados.
- Chamadas comerciais e padrões de engajamento são sinais descritivos; não viram acusação automática.
- Perfil privado, bloqueio de login, número de seguidores ou ausência de selo nunca são usados sozinhos para chamar uma pessoa de falsa ou fraudulenta.

## Viewport e navegação comprovados

- Cabeçalho e compositor ficam fora do transcript rolável.
- `PgUp`/`PgDn`, `Ctrl+Up`/`Ctrl+Down`, Shift/Alt+setas e `Ctrl+Home`/`Ctrl+End` navegam pelo histórico retido.
- Novas linhas aumentam um contador enquanto o usuário lê conteúdo antigo, sem puxar a tela de volta ao final.
- Enviar uma mensagem retorna à saída ao vivo.
- Resize recalcula a área central e redesenha as regiões fixas sem misturar cabeçalho, resposta e caixa de mensagem.
- Linhas longas quebram sem perder a conclusão.

## Dependências e limites

- O BLACKCORE principal e o Studio não têm vulnerabilidades npm conhecidas nesta data.
- O exemplo opcional `examples/creative-lab-mobile` usa as versões estáveis publicadas de Expo 57 e React Native compatível, mas o audit aponta avisos transitivos no Metro/React Native, principalmente a partir de parsers de imagem do toolchain. O registro npm ainda não oferece versão estável compatível sem esses avisos; forçar o downgrade sugerido quebraria o contrato do SDK atual.
- O exemplo mobile não é instalado pelo `npm install` da raiz e seus `node_modules` não entram no ZIP. Ainda assim, o alerta está mantido na auditoria para não esconder risco de build.
- Não houve teste com conta remota real nem publicação externa.
- A validação ANSI estreita não substitui a última checagem visual no telefone do usuário.

## Arquivos de referência

- `src/tools/web/investigate.js`
- `src/tools/web/fetch.js`
- `src/security/network.js`
- `src/tui/fixed-composer.js`
- `src/tui/markdown.js`
- `src/context/system-prompt.js`
- `test/web-investigation.test.js`
- `test/fixed-composer.test.js`
- `test/network-security.test.js`
- `test/tui-markdown.test.js`

O relatório detalhado, com notas por produto, P0–P3 e ordem de correção, está em `RELATORIO-3.5.4-PTBR.md`.
