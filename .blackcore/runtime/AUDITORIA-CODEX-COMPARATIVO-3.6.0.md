# Auditoria comparativa — BLACKCORE Native 3.6.0 × fluxo de trabalho Codex

Data: 2026-08-13  
Método: inspeção da implementação 3.6.0, execução de `npm run verify`, leitura da documentação oficial do Codex sobre ciclo local, instruções, testes/revisão e segurança.

Referências oficiais: [Codex CLI](https://learn.chatgpt.com/docs/codex/cli), [boas práticas](https://learn.chatgpt.com/guides/best-practices), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) e [aprovações e segurança](https://learn.chatgpt.com/docs/agent-approvals-security).

## Resultado direto

O BLACKCORE 3.6.0 agora reproduz de forma mais fiel o **método de trabalho local** que faz o Codex útil: contexto persistente, instruções próximas do projeto, escolha explícita de modelo/permissão, inspeção antes de editar, evidência de teste e revisão em tarefas amplas. Ele continua sendo um agente independente para Termux/Linux — não uma cópia da plataforma Codex.

| Medida baseada em evidência | 3.5.5 | 3.6.0 |
| --- | ---: | ---: |
| Prontidão como agente local Termux | 91/100 | **93/100** |
| Paridade funcional local com Codex CLI | 86/100 | **89/100** |
| Paridade de plataforma completa | 74/100 | **75/100** |
| Segurança do harness local | 83/100 | **85/100** |
| UX móvel/HUD em simulação | 92/100 | **93/100** |

As notas medem recursos comprovados por código e testes. Não medem inteligência inerente do modelo, qualidade de uma chave de API, nem comportamento de serviços externos.

## O que entrou nesta versão

| Prática do Codex | Implementação BLACKCORE 3.6 | Evidência |
| --- | --- | --- |
| Instruções persistentes por projeto | Carrega `BLACKCORE.md`, `AGENTS.md` e `AGENTS.override.md` por precedência de diretório | regressão de precedência aprovada |
| Loop local focado | `fast`, `standard`, `deep` adaptativos | testes de classificação aprovados |
| Testar após mudar | gate único exige evidência de teste/build/lint/runtime/visual | cenário de resposta prematura aprovado |
| Revisar antes de encerrar trabalho amplo | gate `REVIEW` pede diff/status ou releitura dos alvos | cenário deep aprovado |
| Não declarar sucesso sem prova | `ok:false` vira falha semântica na UI, recuperação e protocolo | regressão de tool status aprovada |
| Contexto e retomada | estado `lastWork` persistido em sessão | estado exposto por `/work` e `agent_control status` |
| Controle de custo | nenhum gate em leitura/pergunta rápida; máximo de uma inserção automática por fase | lógica de `fast` e contadores de gate |
| Visibilidade da execução | HUD fixo com `SCAN/PLAN/BUILD/CHECK/REVIEW/REPORT` | testes de largura e HUD existentes |

## O que já estava forte e foi preservado

- Ferramentas locais, patches atômicos, checkpoints/undo, processos canceláveis e saída grande paginável.
- Escolha de modelo fixa por padrão, permissões `safe/balanced/yolo`, proteção contra caminhos externos e segredos redigidos.
- Sessões com árvore, retomada, fork, compactação e continuidade de contexto.
- MCP com confiança explícita, auditoria Markdown baixável, pesquisa/notícias verificáveis, análise responsável de links e Studio/Creative Lab.
- Cabeçalho e entrada fixos no Termux, histórico central com trilho e suporte a teclado/toque filtrado.

## Lacunas reais que ainda não são “100% Codex”

1. **Sandbox de sistema operacional (P1).** O Codex possui sandbox e controles aplicados fora do processo do agente. BLACKCORE protege no nível do harness Node; isso é útil, mas não equivale a isolamento por container/namespace/proot.
2. **Revisor independente (P2).** O gate de revisão usa o mesmo agente/modelo em contexto de trabalho, embora com evidências e instruções separadas. Não é um segundo revisor autônomo de segurança.
3. **Nuvem e handoff gerenciado (P2).** Não há fila hospedada, execução em ambiente remoto controlado ou continuação entre dispositivos.
4. **Marketplace/identidade organizacional (P3).** Skills, extensões e MCP funcionam localmente, mas não existe catálogo assinado, OAuth central e política corporativa equivalente.

## Arquitetura recomendada a partir daqui

1. Manter `workStyle: adaptive` como padrão para não desperdiçar tokens.
2. Para auditoria, release, banco remoto, segurança ou arquitetura: usar `/work deep` ou pedir naturalmente “faça uma revisão profunda e entregue evidências”.
3. Usar `balanced` no dia a dia; reservar `yolo` a projetos confiáveis e tarefas reversíveis.
4. Antes de publicar, pedir revisão e ler o diff. O BLACKCORE pode gerar a auditoria e o relatório, mas publicação externa continua sendo decisão humana.
5. Próxima melhoria estrutural: executor opcional isolado por `proot`/container, com workspace montado e rede bloqueada por padrão.

## Conclusão

O BLACKCORE 3.6.0 está mais próximo do **jeito de trabalhar** do Codex: não apenas gera código, mas mantém instruções, planeja quando é necessário, executa, testa, revisa e fala claramente o que foi ou não comprovado. A afirmação correta é: **agente local avançado, verificável e móvel, com grande cobertura do fluxo Codex CLI**. A afirmação incorreta continua sendo: “plataforma Codex completa dentro do Termux”.
