# Auditoria completa — BLACKCORE Native 3.5.4 · responsável: BLACKCORE QA

> **BLACKCORE AUDIT REPORT · v3.5.4**  
> Gerado em 2026-08-12T19:02:02.485Z · evidências sensíveis redigidas

| Resultado | Nota geral | Escopo | Impressão SHA-256 |
| --- | ---: | --- | --- |
| 🟠 **PILOTO CONTROLADO** | **77/100** | node | `9fe1ea81e16b1244…` |

> [!IMPORTANT]
> Não publicar amplamente antes de corrigir os achados altos e deixar os gates verdes.

## 1. Resumo executivo

Foram inventariados **460 arquivos** (1.5 MB), incluindo **334 arquivos de código** e aproximadamente **12.299 linhas legíveis**. A auditoria registrou **6 achados**, executou **4 gates** e preservou apenas localizações de possíveis segredos — nunca os valores encontrados.

| Dimensão | Nota | Leitura |
| --- | ---: | --- |
| Segurança | 62/100 | Achados ponderados por P0–P3 |
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
| `.js` | 314 |
| `.md` | 94 |
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
| npm run test | ✅ PASS | 41431 ms | ℹ duration_ms 40521.178592 |
| examples/blackcore-studio: npm audit --omit=dev --json | ✅ PASS | 986 ms | 0 known vulnerabilities |
| examples/creative-lab-mobile: npm audit --omit=dev --json | ❌ FAIL | 3033 ms | 30 known vulnerabilities |
| root: npm audit --omit=dev --json | ✅ PASS | 1275 ms | 0 known vulnerabilities |
| Estado Git | ⏭ SKIP | — | not a Git repository |

### Notas por produto/componente

| Produto/componente | Nota | Estado | Evidência | Limitação principal |
| --- | ---: | --- | --- | --- |
| Entendimento natural e continuidade | **9,3/10** | aprovado | 254/254 avaliações contextuais e 38/38 comandos coloquiais. | A qualidade final continua condicionada ao modelo de IA escolhido. |
| Interface fixa e histórico | **9,0/10** | aprovado em simulação | Cabeçalho/compositor fixos, resize, wrapping, PageUp/PageDown e linhas não lidas cobertos por regressões. | Falta validação visual no aparelho e teclado físicos do usuário. |
| Notícias e pesquisa aberta | **8,8/10** | aprovado com limites externos | Coleta limitada, abertura de veículos, metadados, agrupamento e corroboração por domínio testados. | Paywall, anti-bot e páginas dinâmicas podem reduzir a evidência disponível. |
| Verificação de links e perfis públicos | **8,6/10** | aprovado com ressalvas | Instagram e outras redes recebem investigação de identidade, alegações, sinais comerciais e engajamento. | Perfil privado ou bloqueado resulta em evidência insuficiente, não em veredito sobre a pessoa. |
| Auditoria e relatórios Markdown | **9,2/10** | aprovado | Relatório nativo com SHA-256, notas, P0-P3, referências, dependências, gates e redação de segredos. | Não substitui pentest externo, perícia ou certificação formal. |
| Ferramentas de código e execução | **9,1/10** | aprovado | 69 ferramentas nativas; matriz executável 50/50 e suíte Node 218/218. | Ferramentas opcionais exigem dependências presentes no ambiente. |
| Sites, jogos e animações | **8,8/10** | aprovado em runtime controlado | Vila, cubo, partículas, toque, teclado, responsividade, FPS e reduced-motion têm testes determinísticos. | FPS e aparência final precisam ser confirmados na GPU do telefone. |
| Segurança e credenciais | **9,0/10** | aprovado com revisão de fixtures | Redação, limites de workspace/rede, redirects e exemplos sintéticos são testados. | Credenciais reais devem continuar fora do repositório e ser rotacionadas se expostas. |
| Supabase e integrações externas | **8,4/10** | pronto para uso configurado | RLS por usuário, cliente sem service role e fluxos de CLI/preflight cobertos. | Sem credenciais e projeto real, não há comprovação de produção. |
| Empacotamento e instalação Termux | **8,8/10** | aprovado em CI/Linux | Instalador por perfis, doctor, arquivo ZIP, manifest, SBOM e checksums. | Pacotes disponíveis variam conforme repositório e versão do Termux. |

**Dependências npm:** 30 total · 0 críticas · 23 altas · 7 moderadas · 0 baixas.

## 4. Índice de achados

| ID | Prioridade | Categoria | Achado | Confiança |
| --- | --- | --- | --- | --- |
| F-02 | **P1 · ALTA** | Dependências | 23 vulnerabilidade(s) alta(s) em dependências | confirmado |
| F-01 | **P2 · MÉDIA** | Segredos em testes | 16 padrão(ões) de possível segredo estão restritos a testes/fixtures | revisão manual |
| F-03 | **P2 · MÉDIA** | Dependências | 7 vulnerabilidade(s) moderada(s) em dependências | confirmado |
| P2-DEVICE | **P2 · MÉDIA** | Validação móvel | A validação final no Termux físico continua pendente | confirmado |
| P2-LIVE-WEB | **P2 · MÉDIA** | Pesquisa externa | Fontes sociais e noticiosas ao vivo podem impor bloqueio, login ou paywall | confirmado |
| P3-KEYBOARD | **P3 · BAIXA** | Ergonomia | Alguns teclados Android não exibem PageUp e PageDown | provável |

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

### P2-DEVICE — P2 · MÉDIA: A validação final no Termux físico continua pendente

**Categoria:** Validação móvel  
**Confiança:** confirmado

O comportamento de cabeçalho, histórico e compositor foi comprovado em simulação ANSI estreita, inclusive resize, mas não foi capturado nesta auditoria em um aparelho Android real.

**Impacto**

Teclado virtual, fonte, terminal e gestos podem revelar diferenças de ergonomia não visíveis na simulação.

**Correção recomendada**

Instalar o ZIP 3.5.4 no aparelho, executar o roteiro de scroll/resize e anexar capturas curta e longa.

**Evidências:** [R17]

### P2-LIVE-WEB — P2 · MÉDIA: Fontes sociais e noticiosas ao vivo podem impor bloqueio, login ou paywall

**Categoria:** Pesquisa externa  
**Confiança:** confirmado

A implementação preserva evidência útil de respostas grandes e testa páginas controladas, mas serviços externos podem negar conteúdo ou mudar o HTML.

**Impacto**

Algumas investigações terão confiança limitada ou precisarão de fontes alternativas.

**Correção recomendada**

Mostrar claramente evidência insuficiente, continuar a busca em fontes independentes e nunca converter bloqueio em acusação.

**Evidências:** [R18], [R19]

### P3-KEYBOARD — P3 · BAIXA: Alguns teclados Android não exibem PageUp e PageDown

**Categoria:** Ergonomia  
**Confiança:** provável

O TUI aceita PageUp/PageDown, Ctrl+setas, Shift/Alt+setas e Ctrl+Home/End, porém a disponibilidade física das combinações depende do teclado.

**Impacto**

O usuário pode precisar ativar a linha de teclas extras do Termux.

**Correção recomendada**

A configuração de extra-keys já foi documentada; confirmar o atalho no aparelho do usuário.

**Evidências:** [R20], [R21]

## 6. Sinais para revisão manual

Estes sinais **não são vulnerabilidades por si só**. Eles priorizam pontos que merecem leitura humana.

| Sinal | Ocorrências | Primeiras localizações |
| --- | ---: | --- |
| TODO/FIXME pendente | 12 | examples/blackcore-studio/index.html:40, src/tools/audit/audit.js:30, src/tools/audit/audit.js:30, src/tools/audit/audit.js:30, src/tools/scan/scan.js:30 |
| execução de processo | 31 | qa-natural-e2e.mjs:64, qa-natural-e2e.mjs:64, qa-natural-e2e.mjs:67, qa-tool-matrix.mjs:51, qa-tool-matrix.mjs:52 |
| sink HTML inseguro | 5 | src/tools/audit/audit.js:31, src/tools/audit/audit.js:31, src/tools/scan/scan.js:30, src/tools/scan/scan.js:30, test/blackcore-studio.test.js:14 |
| execução dinâmica de código | 1 | test/scan-document.test.js:18 |

## 7. Pontos positivos confirmados

- 91 arquivo(s) de teste foram detectados.
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

- O viewport foi validado por sequências ANSI e larguras simuladas; ainda falta a última checagem em um aparelho Termux real com o teclado do usuário.
- A pesquisa de notícias foi testada com páginas controladas e contratos de evidência; disponibilidade, paywall, login e mudanças dos sites podem limitar a coleta ao vivo.
- A análise de perfis usa somente dados públicos e evidência aberta. Ela avalia alegações e sinais informacionais, não determina caráter, intenção ou culpa.
- Nenhuma conta remota real de Supabase, Vercel, GitHub, Resend, Expo ou provedor de IA foi alterada durante esta auditoria.
- Desempenho visual de animações depende do navegador, GPU, memória, temperatura e economia de bateria do telefone.
- A análise automatizada e assistida não é certificação formal, pentest externo nem prova de exploração.
- Serviços pagos, contas remotas, dispositivos físicos e produção só são comprovados quando executados explicitamente e registrados como gate.

## 10. Ordem recomendada de correção

1. **F-02 · P1 · ALTA:** Rastreie os pacotes pais, atualize o framework responsável e valide a compatibilidade.
2. **F-01 · P2 · MÉDIA:** Confirme que todos são valores sintéticos e mantenha os exemplos claramente marcados como fixtures.
3. **F-03 · P2 · MÉDIA:** Planeje uma atualização controlada e mantenha o lockfile monitorado.
4. **P2-DEVICE · P2 · MÉDIA:** Instalar o ZIP 3.5.4 no aparelho, executar o roteiro de scroll/resize e anexar capturas curta e longa.
5. **P2-LIVE-WEB · P2 · MÉDIA:** Mostrar claramente evidência insuficiente, continuar a busca em fontes independentes e nunca converter bloqueio em acusação.
6. **P3-KEYBOARD · P3 · BAIXA:** A configuração de extra-keys já foi documentada; confirmar o atalho no aparelho do usuário.

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
[R11]: `test/tui-motion.test.js` linha 37 — token GitHub · fixture
[R12]: `test/tui-motion.test.js` linha 44 — token GitHub · fixture
[R13]: `test/tui-motion.test.js` linha 8 — atribuição de credencial · fixture
[R14]: `test/tui-status-panel.test.js` linha 9 — chave OpenAI · fixture
[R15]: `test/tui-status-panel.test.js` linha 16 — chave OpenAI · fixture
[R16]: `test/tui-status-panel.test.js` linha 9 — atribuição de credencial · fixture
[R17]: `test/fixed-composer.test.js` — contrato automatizado do viewport fixo
[R18]: `src/tools/web/investigate.js` — coleta e contrato de evidência
[R19]: `src/tools/web/fetch.js` — recuperação limitada de conteúdo grande
[R20]: `docs/TERMUX.md` — atalhos e extra-keys do histórico
[R21]: `src/tui/fixed-composer.js` — tratamento de teclas

---

**Veredito:** 🟠 **PILOTO CONTROLADO** · **77/100**  
**Relatório:** gerado pelo BLACKCORE Native 3.5.4; valores sensíveis foram redigidos.
