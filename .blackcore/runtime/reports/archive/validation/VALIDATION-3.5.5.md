# BLACKCORE Native 3.5.5 — validação do cyber HUD e auditoria de capacidade

Data: 2026-08-12  
Escopo: cabeçalho/entrada fixos, moldura central, navegação lateral, streaming, história, código, resize, regressão geral e comparação com Codex.

## Veredito

**APROVADA em validação automatizada, com checagem física no Termux ainda necessária.** Nenhuma regressão foi encontrada na suíte completa. A aparência e os gestos foram validados por sequências ANSI e geometria estreita simulada; fonte, teclado, versão do Termux e toque real continuam sendo variáveis do aparelho.

## Evidência executada

| Gate | Resultado |
| --- | ---: |
| Sintaxe JavaScript | 305/305 |
| Suíte Node sequencial | 222/222 |
| Testes focados de HUD/Markdown/largura/animação | 17/17 |
| Testes exclusivos do fixed composer | 10/10 |
| Avaliações contextuais/adversariais | 254/254 |
| Corpus de comandos naturais | 38/38 |
| Matriz executável de ferramentas | 50/50 |
| Ferramentas nativas registradas | 69 |
| Falhas, cancelamentos ou skips | 0 |
| `npm audit` do núcleo | 0 vulnerabilidades conhecidas |
| `npm audit` do BLACKCORE Studio | 0 vulnerabilidades conhecidas |
| `npm audit` do exemplo Expo/RN | 30 avisos transitivos (23 altos, 7 moderados) |

`npm run verify` levou aproximadamente 103 segundos no ambiente Linux de validação: cerca de 60 segundos de checagem sintática e 42,6 segundos para a suíte Node.

## Dependências

- O runtime principal preserva zero dependências npm obrigatórias; `playwright-core` é opcional para browser interativo.
- O núcleo e o Studio não apresentaram vulnerabilidades conhecidas no audit desta data.
- O exemplo separado `examples/creative-lab-mobile` mantém a pilha Expo/React Native e apresentou 30 avisos transitivos, principalmente em Metro, React Native e parsers de imagem. As dependências com correção incompatível não foram forçadas, pois isso quebraria o SDK testado.
- O exemplo mobile não é instalado pelo perfil `core`, e nenhum `node_modules` entra no ZIP de release.

## Contratos de interface comprovados

- Em 54×28, as linhas 1–5 pertencem ao HUD, 6–24 ao painel central e 25–28 ao compositor.
- O cabeçalho antes e depois de digitar é idêntico; somente o conteúdo da entrada muda.
- A saída é redesenhada dentro de duas bordas e reserva uma célula para a barra direita.
- O marcador da barra acompanha a posição proporcional do histórico.
- Roda para cima/baixo, clique no topo/fundo e arraste no meio mudam a janela correta.
- Sequências SGR de mouse não entram no texto digitado.
- Uma história de 72 linhas preserva o começo e a conclusão.
- Código numerado e a última linha ficam dentro do orçamento de largura.
- Abrir o teclado/redimensionar limpa fantasmas, escolhe o HUD compacto e reconstrói a saída.
- Suspender para permissões/menus desativa mouse e restaura o ambiente ao voltar.

## Streaming e organização visual

- Linhas completas de ferramenta aparecem imediatamente.
- Fragmentos de token são agrupados e redesenhados no máximo a 20 FPS, evitando um repaint integral por token.
- O cabeçalho mostra marca, versão, modelo, provedor, esforço, fase, modo, ferramentas e estado da visualização.
- A entrada mostra `MESSAGE`, estado `LIVE`, placeholder, fila/cancelamento e ajuda de navegação.
- JSON de ferramentas, HTML bruto, comandos repetidos e resultados enormes continuam resumidos na tela; o resultado completo permanece disponível ao agente pelo armazenamento de saída.

## Testes de animação preservados

A regressão completa continuou aprovando o Creative Lab:

- vila em camadas com ciclo dia/noite, casas, viajante e vaga-lumes;
- cubo 3D com teclado, toque e mouse;
- partículas/corações e jogo interativo;
- stream visual de ferramentas;
- temporização próxima de 60 FPS no runtime determinístico;
- pausa para `prefers-reduced-motion`.

Isso comprova lógica, controles e estados. FPS e aparência na GPU do telefone ainda precisam do perfil `web` e de Chromium real.

## Limitações explícitas

- O teste ANSI não enxerga a fonte instalada, recorte da barra do Android ou comportamento exato do teclado virtual.
- Gestos de roda/toque/arraste dependem de o Termux encaminhar eventos de mouse SGR; os atalhos de teclado continuam como fallback.
- O BLACKCORE aplica segurança no harness, não num sandbox separado do sistema operacional.
- O exemplo Expo/RN precisa acompanhar atualizações upstream antes de ser tratado como grafo limpo para produção.
- Fontes web podem bloquear robôs, exigir login, usar paywall ou alterar HTML.
- Modelos e serviços externos não foram chamados nesta validação; nenhum token de API foi consumido.
- Esta validação não é pentest, certificação nem prova de desempenho em todos os aparelhos.

## Arquivos de evidência

- `src/tui/fixed-composer.js`
- `src/tui/ansi.js`
- `src/tui/ui.js`
- `test/fixed-composer.test.js`
- `test/tui-markdown.test.js`
- `test/tui-width.test.js`
- `test/tui-motion.test.js`
- `test/creative-lab-runtime.test.js`
- `AUDITORIA-CODEX-COMPARATIVO-3.5.5.md`
