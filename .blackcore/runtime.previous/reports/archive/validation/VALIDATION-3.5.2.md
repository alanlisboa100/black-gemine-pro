# BLACKCORE Native 3.5.2 — evidência de validação

Data: 2026-08-12  
Escopo: viewport fixo no Termux, fluxo de entrada durante trabalho, animações Creative Lab, auditoria nativa e regressão completa.

## Veredito técnico

**APROVADA para o núcleo e para o viewport em validação automatizada.** A distribuição completa permanece como **piloto controlado** até o teste físico no Termux/GPU e o tratamento dos avisos transitivos da fixture Expo.

## Gates executados

| Gate | Resultado |
|---|---:|
| Sintaxe JavaScript | 303/303 arquivos |
| Suíte Node | 208/208 testes |
| Avaliações contextuais/adversariais | 254/254 |
| Corpus natural coloquial | 38/38 |
| Matriz de ferramentas | 50/50 |
| Agente pai/subagente, undo e nova sessão | passou |
| MCP stdio | protocolo 2026-07-28 e echo passaram |
| npm audit do núcleo | 0 vulnerabilidades |
| npm audit do Studio | 0 vulnerabilidades |
| npm audit da fixture móvel | 30 alertas: 23 altos, 7 moderados, 0 críticos |

## Geometria comprovada

Em uma tela Termux simulada de 54×28:

- linhas 1–4: cabeçalho fixo;
- linhas 5–25: única região com scroll para conversa, Markdown, código e ferramentas;
- linhas 26–28: compositor fixo;
- depois do resize para 48×22: a região rolável passa a 5–19 e o compositor começa na linha 20;
- digitar não altera o cabeçalho; trabalhar, cancelar e redimensionar não apagam o texto pendente;
- menus e editor externo suspendem e restauram o viewport.

## Animações comprovadas

- Vila luminosa com ciclo dia/noite, sete casas, árvores, nuvens, viajante e 24 vaga-lumes.
- Cubo 3D com controle e interação.
- Partículas/corações, stream visual de código e jogo com teclado, toque e ponteiro.
- Runtime determinístico próximo de 60 FPS.
- `prefers-reduced-motion` desativa movimento sem remover o conteúdo renderizado.

## Auditoria

O auditor passou a:

- executar o teste declarado sem depender de uma pasta pessoal gravável;
- separar candidatos a segredo em produção de valores sintéticos em testes/fixtures;
- redigir todos os valores e preservar somente tipo, arquivo e linha;
- produzir notas por componente, gates, hash, P0–P3, limitações e ordem de correção.

Resultado da auditoria de árvore inteira: **80/100 · piloto controlado**. O núcleo e o Studio têm audit de produção zerado; os 30 avisos pertencem ao exemplo `examples/creative-lab-mobile`.

## Limitações honestas

- Não havia aparelho Termux físico conectado, portanto teclado Samsung, orientação, fonte e emulador real ainda precisam de uma checagem humana.
- Chromium/Playwright/GPU real não estavam disponíveis. FPS e interação foram validados por runtime determinístico, sintaxe e contratos, não por inspeção visual física.
- Não houve cobrança de provedores pagos, deploy real, sincronização com conta Supabase real nem APK assinado.

## Reprodução

```bash
npm run verify
npm run eval:natural
node qa-natural-corpus.mjs
node qa-tool-matrix.mjs
node qa-agent-features.mjs
node qa-mcp-stdio.mjs
```
