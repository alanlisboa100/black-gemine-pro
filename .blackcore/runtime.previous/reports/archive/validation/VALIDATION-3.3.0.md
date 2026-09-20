# BLACKCORE Native 3.3.0 — validação

Data: 2026-08-12

## Gates da release

| Gate | Resultado |
| --- | --- |
| Sintaxe JavaScript | PASS — 286 arquivos |
| Testes automatizados | PASS — 168/168 |
| Corpus de linguagem natural | PASS — 38/38 |
| Matriz de ferramentas | PASS — 50/50 |
| Agente/checkpoint/undo/sessão | PASS |
| MCP stdio | PASS — protocolo 2026-07-28 |
| Ferramentas nativas | PASS — 66 schemas registrados |
| Audit npm do Core | PASS — 0 vulnerabilidades conhecidas |
| Audit npm de produção do Studio | PASS — 0 vulnerabilidades conhecidas |
| Expo Doctor do mobile | PASS — 20/20 |
| Audit npm mobile | ATENÇÃO — 18 transitivas (7 moderadas, 11 altas, 0 críticas) |

## Evidência específica da 3.3.0

- Renderizador Markdown testado com respostas multilinha, código numerado, tabelas, listas, links e largura de 54 colunas.
- `web_search` e `web_research` testados com ranking, domínio, tipo de fonte, snippets, múltiplas consultas e deduplicação de URL.
- Supabase testada por schemas, construção determinística de comandos, confirmação de mutações e prevenção de exposição de secrets.
- Studio testado por contrato do app/PWA, filtros, normalização, merge, segurança de URL, RLS por usuário e ausência de `service_role`.
- DOM do Studio auditado estaticamente com `lang`, viewport, `main`, navegação, formulários e controles; nenhuma pendência estrutural foi encontrada.
- O projeto mobile atualizado passou nas 20 verificações do Expo Doctor usando instalação limpa do lockfile.

## Fronteiras não executadas

- Sem navegador Chromium instalado para inspeção visual e screenshot do Studio.
- Sem Docker/Supabase local e sem projeto Supabase remoto autenticado.
- Sem build APK/EAS, emulador ou aparelho físico.
- Sem deploy ou mutação de conta Vercel, Netlify, Supabase, Resend, Expo/EAS ou GitHub.
- Sem chamadas pagas reais aos modelos; adaptadores foram verificados por testes determinísticos.

## Decisão

**APROVADA para uso local e teste público controlado.** Produção integral permanece condicionada aos gates externos listados acima.
