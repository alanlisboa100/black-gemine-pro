# BLACKCORE Native 3.4.0 — validação

Data: 2026-08-12

## Gates

| Gate | Resultado |
| --- | --- |
| Sintaxe JavaScript | PASS — 294 arquivos |
| Testes automatizados | PASS — 183/183 |
| Eval contextual/adversarial | PASS — 254/254 |
| Corpus natural coloquial | PASS — 38/38 |
| Matriz de ferramentas | PASS — 50/50 |
| Agente/checkpoint/undo/sessão | PASS |
| MCP stdio | PASS — 2026-07-28 |
| Audit npm Core | PASS — 0 |
| Audit npm Studio produção | PASS — 0 |
| Audit npm mobile | ATENÇÃO — 18 transitivas, 0 críticas |

## Integração comprovada

- Um pedido ambíguo recebe apenas ferramentas read-only e produz pergunta antes da mutação.
- Um follow-up elíptico herda o foco recente e recupera as ferramentas de ação.
- Uma falha real de ferramenta aparece no estado de replanejamento do próximo ciclo.
- O ledger conserva objetivos, restrições, critérios e resultado anterior.
- Startup e primeiro acesso cabem em 54 colunas e não expõem chaves.

## Decisão

**APROVADA para uso local e piloto controlado.** A naturalidade melhorou de modo mensurável, mas equivalência com Codex não foi testada por benchmark humano pareado.
