# BLACK NUMBERS v1.0.0 — Upgrade Report

## Falhas corrigidas

1. **Dois cérebros separados**: web v0.3 e Python v0.2 não compartilhavam estado. Agora a web é servida pelo daemon Python e usa a mesma API/SQLite.
2. **Self-evolution apenas como diário**: agora altera parâmetros reais de estratégia com base nos scores e falhas recentes.
3. **Loop de mentor offline**: saúde/cooldown por endpoint e retry/backoff de tarefas.
4. **Conhecimento quase não ingerido**: ingestão agora aceita Markdown/TypeScript/JSON/BN/HTML/CSS além de JS/Python, é deduplicada por SHA-256 e resumível.
5. **Visão = “verificado” cedo demais**: scanner visual cria somente `observed` com confiança baixa até validação posterior.
6. **JS arbitrário no Lab**: blocos `js` são rejeitados por padrão; linguagem declarativa segura é o caminho principal.
7. **Gramática sem núcleo oficial**: parser/compilador `.bn` agora existe em Python, com validação de nodes, targets, screens e expressões temporais seguras.
8. **Eventos sem limite**: retenção limitada para evitar banco inflado.
9. **Tarefas sem estado de evidência**: novo fluxo de estágio explícito e status de retry.
10. **Termux pesado demais**: interface estática; Node não é requisito de runtime.

## Limites honestos

- O compilador v1.0 valida uma gramática visual mínima; ainda não é um compilador nativo completo para Android/Web.
- A visão ainda é percepção de baixo nível (cor, foco, contraste, borda), não reconhecimento semântico neural.
- Aprendizado local é memória + validação + adaptação de estratégia; não significa atualização automática de pesos neurais.
