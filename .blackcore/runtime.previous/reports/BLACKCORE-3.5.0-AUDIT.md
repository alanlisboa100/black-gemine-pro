# Auditoria completa — BLACKCORE Native 3.5.0 · responsável: BLACKCORE Native

> **BLACKCORE AUDIT REPORT · v3.5.0**  
> Gerado em 2026-08-12T14:32:29.527Z · evidências sensíveis redigidas

| Resultado | Nota geral | Escopo | Impressão SHA-256 |
| --- | ---: | --- | --- |
| 🟠 **PILOTO CONTROLADO** | **80/100** | node | `32375c3450a9e89d…` |

> [!IMPORTANT]
> Não publicar amplamente antes de corrigir os achados altos e deixar os gates verdes.

## 1. Resumo executivo

Foram inventariados **444 arquivos** (1.4 MB), incluindo **328 arquivos de código** e aproximadamente **11.507 linhas legíveis**. A auditoria registrou **3 achados**, executou **4 gates** e preservou apenas localizações de possíveis segredos — nunca os valores encontrados.

| Dimensão | Nota | Leitura |
| --- | ---: | --- |
| Segurança | 70/100 | Achados ponderados por P0–P3 |
| Qualidade verificável | 95/100 | Testes, lint, typecheck e build executados |
| Manutenibilidade | 100/100 | Documentação, testes, CI e estrutura |
| Prontidão de entrega | 60/100 | Gates, dependências e bloqueadores |

## 2. Escopo, método e preservação

- **Alvo:** `/workspace/scratch/0947721ed5e4/work/BLACKCORE-NATIVE-3.2.0`
- **Tipo:** diretório/projeto
- **Ecossistema primário:** `node`
- **Ecossistemas/frameworks:** node
- **Método:** inventário, leitura estática limitada, padrões de segredo redigidos, estado Git, dependências, gates selecionados e achados adicionais com referências.
- **Preservação:** o gerador não edita o código auditado. Comandos de verificação podem criar caches ou artefatos normais do próprio projeto; isso é indicado pelos gates.

| Extensão | Arquivos |
| --- | ---: |
| `.js` | 308 |
| `.md` | 85 |
| `.json` | 17 |
| `.sh` | 7 |
| `.mjs` | 6 |
| `.yml` | 5 |
| `[none]` | 3 |
| `.svg` | 2 |
| `.html` | 2 |
| `.css` | 2 |
| `.sql` | 2 |
| `.example` | 1 |

## 3. Evidência e gates executados

| Gate/comando | Estado | Tempo | Evidência resumida |
| --- | --- | ---: | --- |
| npm run test | ✅ PASS | 2277 ms | ℹ duration_ms 1981.012753 |
| examples/blackcore-studio: npm audit --omit=dev --json | ✅ PASS | 240 ms | 0 known vulnerabilities |
| examples/creative-lab-mobile: npm audit --omit=dev --json | ❌ FAIL | 4331 ms | 30 known vulnerabilities |
| root: npm audit --omit=dev --json | ✅ PASS | 940 ms | 0 known vulnerabilities |
| Estado Git | ⏭ SKIP | — | not a Git repository |

### Notas por produto/componente

| Produto/componente | Nota | Estado | Evidência | Limitação principal |
| --- | ---: | --- | --- | --- |
| BLACKCORE Core | **9,8/10** | pronto para uso local | 67 ferramentas; suíte, sintaxe e npm audit verdes. | A qualidade final depende do modelo e dos gates disponíveis. |
| Auditor nativo Markdown | **9,6/10** | pronto | Arquivo real, P0–P3, referências, notas, múltiplos grafos npm e redação de segredos. | Não substitui pentest formal nem ambiente remoto não executado. |
| Interface Termux | **9,5/10** | pronta | Composer estreito estável e cabeçalho persistente. | A aparência depende da fonte e do emulador. |
| BLACKCORE Studio | **9,6/10** | pronto localmente | PWA offline, Supabase RLS e npm audit sem alertas. | Sync remoto depende da conta do usuário. |
| Fixture móvel Expo | **7,2/10** | piloto técnico | Fonte Expo/React Native e contratos estáticos cobertos. | 30 alertas transitivos; APK/dispositivo real não executado. |

**Dependências npm:** 30 total · 0 críticas · 23 altas · 7 moderadas · 0 baixas.

## 4. Índice de achados

| ID | Prioridade | Categoria | Achado | Confiança |
| --- | --- | --- | --- | --- |
| F-01 | **P1 · ALTA** | Segredos | 15 padrão(ões) de possível segredo exigem revisão | revisão manual |
| F-02 | **P1 · ALTA** | Dependências | 23 vulnerabilidade(s) alta(s) em dependências | confirmado |
| F-03 | **P2 · MÉDIA** | Dependências | 7 vulnerabilidade(s) moderada(s) em dependências | confirmado |

## 5. Achados detalhados

### F-01 — P1 · ALTA: 15 padrão(ões) de possível segredo exigem revisão

**Categoria:** Segredos  
**Confiança:** revisão manual

Somente as localizações foram registradas; os valores encontrados foram redigidos e não aparecem neste relatório.

**Impacto**

Uma credencial real versionada pode expor contas ou infraestrutura externa.

**Correção recomendada**

Confirme cada localização, revogue qualquer credencial real, remova-a do histórico e mantenha uma varredura de regressão.

**Evidências:** [R1], [R2], [R3], [R4], [R5], [R6], [R7], [R8], [R9], [R10], [R11], [R12], [R13], [R14], [R15]

### F-02 — P1 · ALTA: 23 vulnerabilidade(s) alta(s) em dependências

**Categoria:** Dependências  
**Confiança:** confirmado

O npm audit encontrou 30 vulnerabilidades conhecidas nos grafos de produção (examples/creative-lab-mobile: 30).

**Impacto**

Pacotes diretos ou transitivos com severidade alta reduzem a confiança da entrega.

**Correção recomendada**

Rastreie os pacotes pais, atualize o framework responsável e valide a compatibilidade.

### F-03 — P2 · MÉDIA: 7 vulnerabilidade(s) moderada(s) em dependências

**Categoria:** Dependências  
**Confiança:** confirmado

O npm audit encontrou 30 vulnerabilidades conhecidas nos grafos de produção (examples/creative-lab-mobile: 30).

**Impacto**

Avisos moderados exigem revisão de alcançabilidade e compatibilidade.

**Correção recomendada**

Planeje uma atualização controlada e mantenha o lockfile monitorado.

## 6. Sinais para revisão manual

Estes sinais **não são vulnerabilidades por si só**. Eles priorizam pontos que merecem leitura humana.

| Sinal | Ocorrências | Primeiras localizações |
| --- | ---: | --- |
| TODO/FIXME pendente | 12 | examples/blackcore-studio/index.html:40, src/tools/audit/audit.js:29, src/tools/audit/audit.js:29, src/tools/audit/audit.js:29, src/tools/scan/scan.js:30 |
| execução de processo | 31 | qa-natural-e2e.mjs:64, qa-natural-e2e.mjs:64, qa-natural-e2e.mjs:67, qa-tool-matrix.mjs:51, qa-tool-matrix.mjs:52 |
| sink HTML inseguro | 5 | src/tools/audit/audit.js:30, src/tools/audit/audit.js:30, src/tools/scan/scan.js:30, src/tools/scan/scan.js:30, test/blackcore-studio.test.js:14 |
| execução dinâmica de código | 1 | test/scan-document.test.js:18 |

## 7. Pontos positivos confirmados

- 87 arquivo(s) de teste foram detectados.
- 2 arquivo(s) de integração contínua foram detectados.
- 12 documento(s) principal(is) de projeto foram detectados.

## 8. Histórico auditável desta sessão

| Métrica | Valor |
| --- | ---: |
| Pedidos do usuário | 0 |
| Respostas do agente | 0 |
| Resultados de ferramentas | 0 |
| Resultados com erro/bloqueio | 0 |
| Tokens registrados | 0 |

| Ferramenta | Chamadas |
| --- | ---: |
| — | 0 |

## 9. Limitações e itens não comprovados

- APIs pagas, contas reais, deploy em produção e dispositivos Android físicos não foram acionados nesta rodada.
- A matriz de 50 cenários, o corpus coloquial de 38 frases e o benchmark contextual de 254 casos foram executados como gates externos de release e estão documentados em VALIDATION-3.5.0.md.
- Padrões de segredo em arquivos de teste são fixtures falsas deliberadas e permanecem sinalizados para revisão manual.
- A análise automatizada e assistida não é certificação formal, pentest externo nem prova de exploração.
- Serviços pagos, contas remotas, dispositivos físicos e produção só são comprovados quando executados explicitamente e registrados como gate.

## 10. Ordem recomendada de correção

1. **F-01 · P1 · ALTA:** Confirme cada localização, revogue qualquer credencial real, remova-a do histórico e mantenha uma varredura de regressão.
2. **F-02 · P1 · ALTA:** Rastreie os pacotes pais, atualize o framework responsável e valide a compatibilidade.
3. **F-03 · P2 · MÉDIA:** Planeje uma atualização controlada e mantenha o lockfile monitorado.

## 11. Referências de evidência

[R1]: `qa-natural-e2e.mjs` linha 59 — atribuição de credencial
[R2]: `test/audit-report.test.js` linha 15 — atribuição de credencial
[R3]: `test/capabilities-3.1.test.js` linha 37 — token GitHub
[R4]: `test/mcp-stdio.test.js` linha 10 — atribuição de credencial
[R5]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial
[R6]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial
[R7]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial
[R8]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial
[R9]: `test/security.test.js` linha 19 — token GitHub
[R10]: `test/tui-motion.test.js` linha 28 — token GitHub
[R11]: `test/tui-motion.test.js` linha 35 — token GitHub
[R12]: `test/tui-motion.test.js` linha 8 — atribuição de credencial
[R13]: `test/tui-status-panel.test.js` linha 9 — chave OpenAI
[R14]: `test/tui-status-panel.test.js` linha 16 — chave OpenAI
[R15]: `test/tui-status-panel.test.js` linha 9 — atribuição de credencial

---

**Veredito:** 🟠 **PILOTO CONTROLADO** · **80/100**  
**Relatório:** gerado pelo BLACKCORE Native 3.5.0; valores sensíveis foram redigidos.
