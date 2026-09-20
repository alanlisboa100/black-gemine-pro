# Auditoria completa — BLACKCORE Native 3.5.2 · responsável: BLACKCORE Native

> **BLACKCORE AUDIT REPORT · v3.5.2**  
> Gerado em 2026-08-12T16:02:38.901Z · evidências sensíveis redigidas

| Resultado | Nota geral | Escopo | Impressão SHA-256 |
| --- | ---: | --- | --- |
| 🟠 **PILOTO CONTROLADO** | **80/100** | node | `c29c719a96f54827…` |

> [!IMPORTANT]
> Não publicar amplamente antes de corrigir os achados altos e deixar os gates verdes.

## 1. Resumo executivo

Foram inventariados **454 arquivos** (1.4 MB), incluindo **332 arquivos de código** e aproximadamente **11.895 linhas legíveis**. A auditoria registrou **5 achados**, executou **4 gates** e preservou apenas localizações de possíveis segredos — nunca os valores encontrados.

| Dimensão | Nota | Leitura |
| --- | ---: | --- |
| Segurança | 68/100 | Achados ponderados por P0–P3 |
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
| `.js` | 312 |
| `.md` | 90 |
| `.json` | 18 |
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
| npm run test | ✅ PASS | 2213 ms | ℹ duration_ms 1960.56995 |
| examples/blackcore-studio: npm audit --omit=dev --json | ✅ PASS | 222 ms | 0 known vulnerabilities |
| examples/creative-lab-mobile: npm audit --omit=dev --json | ❌ FAIL | 7559 ms | 30 known vulnerabilities |
| root: npm audit --omit=dev --json | ✅ PASS | 1657 ms | 0 known vulnerabilities |
| Estado Git | ⏭ SKIP | — | not a Git repository |

### Notas por produto/componente

| Produto/componente | Nota | Estado | Evidência | Limitação principal |
| --- | ---: | --- | --- | --- |
| BLACKCORE Core / agente | **9,8/10** | aprovado | 208 testes, 254 avaliações contextuais, 50 cenários de ferramentas e MCP 2026 verdes. | Provedores públicos não foram cobrados nesta auditoria local. |
| Viewport fixo Termux | **9,7/10** | aprovado com validação física recomendada | Linhas 1–4 e três linhas finais fixas, scroll central, digitação e resize Android cobertos por testes. | Sem aparelho Termux físico conectado nesta execução. |
| Creative Lab / vila e animações | **9,6/10** | aprovado | Vila dia/noite, cubo, partículas, código, jogo, 60 FPS simulado e reduced motion passaram. | Sem Chromium/Playwright/GPU real neste ambiente. |
| Auditor nativo | **9,7/10** | aprovado | Relatório Markdown, gates, scores, hashes, redaction e separação entre fixtures e candidatos operacionais testados. | Não substitui pentest ou certificação externa. |
| BLACKCORE Studio PWA | **9,6/10** | aprovado | PWA, modelo local, conflitos e RLS Supabase cobertos por testes; npm audit de produção executado. | Sincronização contra uma conta Supabase real não foi exercitada. |
| Creative Lab Mobile / Expo | **7,2/10** | fixture controlada | Contrato Expo/EAS, entradas e ausência de secrets operacionais validados. | Alertas transitivos do Expo/React Native e ausência de build em dispositivo físico. |

**Dependências npm:** 30 total · 0 críticas · 23 altas · 7 moderadas · 0 baixas.

## 4. Índice de achados

| ID | Prioridade | Categoria | Achado | Confiança |
| --- | --- | --- | --- | --- |
| F-02 | **P1 · ALTA** | Dependências | 23 vulnerabilidade(s) alta(s) em dependências | confirmado |
| F-01 | **P2 · MÉDIA** | Segredos em testes | 16 padrão(ões) de possível segredo estão restritos a testes/fixtures | revisão manual |
| F-03 | **P2 · MÉDIA** | Dependências | 7 vulnerabilidade(s) moderada(s) em dependências | confirmado |
| P2-VISUAL-PHYSICAL | **P2 · MÉDIA** | Validação visual | Validação física em Termux e GPU real permanece pendente | confirmado |
| P3-LEGACY-FALLBACK | **P3 · BAIXA** | Manutenibilidade | Compositor linear legado permanece como fallback | confirmado |

## 5. Achados detalhados

### F-02 — P1 · ALTA: 23 vulnerabilidade(s) alta(s) em dependências

**Categoria:** Dependências  
**Confiança:** confirmado

O npm audit encontrou 30 vulnerabilidades conhecidas nos grafos de produção (examples/creative-lab-mobile: 30).

**Impacto**

Pacotes diretos ou transitivos com severidade alta reduzem a confiança da entrega.

**Correção recomendada**

Rastreie os pacotes pais, atualize o framework responsável e valide a compatibilidade.

### F-01 — P2 · MÉDIA: 16 padrão(ões) de possível segredo estão restritos a testes/fixtures

**Categoria:** Segredos em testes  
**Confiança:** revisão manual

Os candidatos aparecem somente em testes, QA ou fixtures. Isso reduz a probabilidade de exposição operacional, mas não prova que os valores sejam fictícios; todos permanecem redigidos.

**Impacto**

Fixtures com formato real podem gerar falso positivo e, se alguém inserir uma credencial verdadeira em teste, ainda podem vazar.

**Correção recomendada**

Confirme que todos são valores sintéticos e mantenha os exemplos claramente marcados como fixtures.

**Evidências:** [R1], [R2], [R3], [R4], [R5], [R6], [R7], [R8], [R9], [R10], [R11], [R12], [R13], [R14], [R15], [R16]

### F-03 — P2 · MÉDIA: 7 vulnerabilidade(s) moderada(s) em dependências

**Categoria:** Dependências  
**Confiança:** confirmado

O npm audit encontrou 30 vulnerabilidades conhecidas nos grafos de produção (examples/creative-lab-mobile: 30).

**Impacto**

Avisos moderados exigem revisão de alcançabilidade e compatibilidade.

**Correção recomendada**

Planeje uma atualização controlada e mantenha o lockfile monitorado.

### P2-VISUAL-PHYSICAL — P2 · MÉDIA: Validação física em Termux e GPU real permanece pendente

**Categoria:** Validação visual  
**Confiança:** confirmado

A geometria fixa e as animações passaram em testes determinísticos, mas este ambiente não disponibilizou aparelho Termux, Chromium ou Playwright para inspeção visual física.

**Impacto**

Diferenças específicas de emulador de terminal, teclado Samsung/Android, fonte ou driver gráfico podem exigir ajuste fino.

**Correção recomendada**

Instalar a 3.5.2 no Termux, executar o perfil web, testar rotação/teclado e abrir Creative Lab em 360, 768 e 1280 px antes de distribuição ampla.

**Evidências:** [R17], [R18], [R19]

### P3-LEGACY-FALLBACK — P3 · BAIXA: Compositor linear legado permanece como fallback

**Categoria:** Manutenibilidade  
**Confiança:** confirmado

O novo viewport fixo é o caminho interativo principal; o compositor linear anterior permanece no código para terminais sem suporte mínimo.

**Impacto**

Duas superfícies de entrada aumentam moderadamente o custo de manutenção.

**Correção recomendada**

Manter os testes dos dois caminhos e remover o legado somente após telemetria/feedback confirmar compatibilidade do viewport fixo.

**Evidências:** [R20]

## 6. Sinais para revisão manual

Estes sinais **não são vulnerabilidades por si só**. Eles priorizam pontos que merecem leitura humana.

| Sinal | Ocorrências | Primeiras localizações |
| --- | ---: | --- |
| TODO/FIXME pendente | 12 | examples/blackcore-studio/index.html:40, src/tools/audit/audit.js:30, src/tools/audit/audit.js:30, src/tools/audit/audit.js:30, src/tools/scan/scan.js:30 |
| execução de processo | 31 | qa-natural-e2e.mjs:64, qa-natural-e2e.mjs:64, qa-natural-e2e.mjs:67, qa-tool-matrix.mjs:51, qa-tool-matrix.mjs:52 |
| sink HTML inseguro | 5 | src/tools/audit/audit.js:31, src/tools/audit/audit.js:31, src/tools/scan/scan.js:30, src/tools/scan/scan.js:30, test/blackcore-studio.test.js:14 |
| execução dinâmica de código | 1 | test/scan-document.test.js:18 |

## 7. Pontos positivos confirmados

- 90 arquivo(s) de teste foram detectados.
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

- O viewport fixo foi validado por emulação determinística de geometria ANSI/Termux em 54 colunas e redimensionamento Android; esta execução não teve um aparelho Termux físico conectado.
- Chromium e playwright-core não estavam instalados neste ambiente de auditoria. A animação foi validada por runtime determinístico, sintaxe, DOM/contratos e 60 FPS simulado; inspeção visual humana em GPU/dispositivo real permanece recomendada.
- O projeto Expo é uma fixture de demonstração para APK e conserva alertas transitivos do ecossistema; não é um aplicativo móvel de produção certificado.
- A análise automatizada e assistida não é certificação formal, pentest externo nem prova de exploração.
- Serviços pagos, contas remotas, dispositivos físicos e produção só são comprovados quando executados explicitamente e registrados como gate.

## 10. Ordem recomendada de correção

1. **F-02 · P1 · ALTA:** Rastreie os pacotes pais, atualize o framework responsável e valide a compatibilidade.
2. **F-01 · P2 · MÉDIA:** Confirme que todos são valores sintéticos e mantenha os exemplos claramente marcados como fixtures.
3. **F-03 · P2 · MÉDIA:** Planeje uma atualização controlada e mantenha o lockfile monitorado.
4. **P2-VISUAL-PHYSICAL · P2 · MÉDIA:** Instalar a 3.5.2 no Termux, executar o perfil web, testar rotação/teclado e abrir Creative Lab em 360, 768 e 1280 px antes de distribuição ampla.
5. **P3-LEGACY-FALLBACK · P3 · BAIXA:** Manter os testes dos dois caminhos e remover o legado somente após telemetria/feedback confirmar compatibilidade do viewport fixo.

## 11. Referências de evidência

[R1]: `qa-natural-e2e.mjs` linha 59 — atribuição de credencial · fixture
[R2]: `test/audit-report.test.js` linha 15 — atribuição de credencial · fixture
[R3]: `test/audit-report.test.js` linha 39 — atribuição de credencial · fixture
[R4]: `test/capabilities-3.1.test.js` linha 37 — token GitHub · fixture
[R5]: `test/mcp-stdio.test.js` linha 10 — atribuição de credencial · fixture
[R6]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial · fixture
[R7]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial · fixture
[R8]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial · fixture
[R9]: `test/model-selection-lock.test.js` linha 37 — atribuição de credencial · fixture
[R10]: `test/security.test.js` linha 19 — token GitHub · fixture
[R11]: `test/tui-motion.test.js` linha 28 — token GitHub · fixture
[R12]: `test/tui-motion.test.js` linha 35 — token GitHub · fixture
[R13]: `test/tui-motion.test.js` linha 8 — atribuição de credencial · fixture
[R14]: `test/tui-status-panel.test.js` linha 9 — chave OpenAI · fixture
[R15]: `test/tui-status-panel.test.js` linha 16 — chave OpenAI · fixture
[R16]: `test/tui-status-panel.test.js` linha 9 — atribuição de credencial · fixture
[R17]: `src/tui/fixed-composer.js` linha 71 — configuração das margens fixas
[R18]: `test/fixed-composer.test.js` linha 13 — geometria Termux e scroll central
[R19]: `test/creative-lab-runtime.test.js` linha 36 — runtime de animação e FPS
[R20]: `src/tui/input.js` linha 47 — seleção entre viewport fixo e fallback

---

**Veredito:** 🟠 **PILOTO CONTROLADO** · **80/100**  
**Relatório:** gerado pelo BLACKCORE Native 3.5.2; valores sensíveis foram redigidos.
