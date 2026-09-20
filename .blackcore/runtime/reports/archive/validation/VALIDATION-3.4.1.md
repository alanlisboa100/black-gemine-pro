# BLACKCORE Native 3.4.1 — validação

Data: 2026-08-12

## Gates

| Gate | Resultado |
| --- | --- |
| Sintaxe JavaScript | PASS — 294 arquivos |
| Testes automatizados | PASS — 186/186 |
| Eval contextual/adversarial | PASS — 254/254 |
| E2E natural: site e cubo 3D | PASS — 11 ciclos do provedor |
| Matriz de ferramentas | PASS — 50/50 |
| TUI Termux 54 colunas | PASS |
| Audit npm Core | PASS — 0 |
| Audit npm Studio produção | PASS — 0 |
| Audit npm mobile | ATENÇÃO — 30 transitivas, 0 críticas |

## Regressões comprovadas

- A inicialização interativa imprime apenas uma identidade compacta; não repete splash, painel de controle e linha de pronto.
- A entrada ocupa três linhas exatas em 54 colunas e mantém modelo/raciocínio visíveis antes e durante a digitação.
- Termux e terminais abaixo de 72 colunas não recebem sequências ANSI de região de rolagem; a resposta usa saída linear estável.
- Caminho completo, transporte, origem da chave e contagem de tokens não aparecem na conversa normal.
- “Dedo ou mouse” é entendido como suporte aos dois modos de interação, não como escolha arquitetural pendente.
- Chaves continuam ocultas; informações detalhadas permanecem nos comandos de status e uso.

## Limites

- Em Termux, o compositor fixo durante uma resposta fica desativado para evitar corrupção do histórico visual. A caixa normal volta ao final da resposta.
- Não houve benchmark humano cego contra Codex, execução com modelo pago, APK instalado, Supabase autenticado nem deploy de produção.
- O lockfile do exemplo Expo registra 7 alertas moderados e 23 altos, todos transitivos, nenhum crítico. Expo/React Native ainda não oferecem uma resolução compatível completa no grafo atual.

## Decisão

**APROVADA para uso local e piloto controlado.** A correção 3.4.1 resolve a falha visual reproduzida no Termux sem reduzir as proteções, ferramentas ou continuidade da 3.4.0.
