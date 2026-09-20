# BLACKCORE Native 3.5.3 — validação da interface Termux

Data: 2026-08-12  
Escopo: cabeçalho duplicado, limpeza visual, atividade de ferramentas, resize Android e restauração de telas temporárias.

## Veredito

**APROVADA em validação automatizada.** A interface foi alterada para eliminar o padrão observado na captura: blocos BLACKCORE repetidos no histórico, gráficos de fase excessivos, argumentos JSON, comandos duplicados e respostas HTML brutas.

## Evidência

| Gate | Resultado |
|---|---:|
| Sintaxe JavaScript | 303/303 |
| Suíte Node | 210/210 |
| Avaliações contextuais | 254/254 |
| Corpus natural | 38/38 |
| Matriz de ferramentas | 50/50 |
| Viewport 54×28 | passou |
| Resize 54×28 → 48×22 | limpeza e replay passaram |
| Suspensão/restauração de permissão | tela isolada saiu e voltou corretamente |
| Layout de ferramentas em 54 colunas | todas as linhas dentro da largura |
| Redação de credenciais | nenhum valor sensível apareceu |

## Comportamentos comprovados

- O modo fixo entra em uma tela de terminal isolada e devolve a tela anterior ao sair.
- Resize limpa a geometria antiga antes de recalcular as margens.
- As linhas recentes da conversa são reproduzidas somente na área central.
- O cabeçalho não é registrado no transcript e não reaparece como atividade.
- Permissões, seletor de modelo e editor suspendem a tela fixa e a restauram com o conteúdo recente.
- A marca, modelo, fase e estado cabem em 54 colunas.
- Ferramentas são apresentadas por ação sem serializar argumentos completos.
- Resultados distinguem sucesso, saída não zero, timeout, permissão negada e indisponibilidade.
- Uso de tokens continua oculto por padrão (`showTokenUsage: false`).

## Limite

O teste automatizado cobre sequências ANSI e geometria equivalente ao Termux, mas não substitui a execução na combinação específica de aparelho, versão do Termux, teclado e fonte do usuário. Essa checagem física continua recomendada após a instalação.
