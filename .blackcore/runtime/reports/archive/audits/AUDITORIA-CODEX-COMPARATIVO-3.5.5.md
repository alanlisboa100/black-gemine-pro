# Auditoria comparativa — BLACKCORE Native 3.5.5 × OpenAI Codex CLI

Data: 2026-08-12  
Método: leitura da implementação BLACKCORE, execução da validação local e comparação com a documentação oficial atual do Codex.  
Referências oficiais: [Codex CLI](https://learn.chatgpt.com/docs/codex/cli) e [Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security).

## Veredito direto

**O BLACKCORE está completo como agente local avançado para Termux, mas não é — e não deve ser anunciado como — uma cópia 100% equivalente ao Codex.** Ele cobre o ciclo principal de programação, continuidade, ferramentas, pesquisa, MCP, revisão e relatórios. O Codex permanece superior em isolamento imposto pelo sistema operacional, execução/nuvem gerenciada, ecossistema oficial e revisão automática independente.

| Leitura | Resultado |
| --- | ---: |
| Prontidão como agente local no Termux | **91/100** |
| Paridade funcional local com o Codex CLI | **86/100** |
| Paridade de plataforma completa | **74/100** |
| Segurança do harness BLACKCORE | **83/100** |
| Experiência móvel/HUD | **92/100** em simulação |

Essas notas medem recursos observáveis, testes e limites declarados. Não medem a inteligência pura de um modelo. A naturalidade final depende principalmente do modelo selecionado, do contexto disponível e da qualidade da tarefa.

## Matriz de capacidades

| Área | Codex CLI | BLACKCORE 3.5.5 | Situação |
| --- | --- | --- | --- |
| Ler, editar e executar projeto local | Sim | Sim, com patches, checkpoints e 69 ferramentas | Paridade local |
| Modelos e esforço de raciocínio | Modelos OpenAI e níveis configuráveis | OpenAI, DeepSeek, Cerebras, WaveSpeed e local; seleção fixa | BLACKCORE mais amplo em provedores |
| PLAN/ACT e aprovações | Sandbox e política de aprovação | PLAN/ACT, safe/balanced/yolo e confirmações | Cobertura funcional, isolamento inferior |
| Sessões e retomada | Retomada e continuação | Resume, árvore, jump, fork, clone, labels e compactação | Paridade forte |
| Código, shell, testes e build | Sim | Sim, com detecção de ecossistema e verificação | Paridade local |
| Revisão Git e worktrees | Sim | `/review`, diff check e worktrees | Paridade funcional |
| Imagens | Entrada multimodal | `--image`, `-i` e menções de arquivo para modelos com visão | Paridade condicionada ao modelo |
| Pesquisa web | Pesquisa integrada | Busca, pesquisa multiconsulta, notícias e credibilidade | BLACKCORE mais especializado |
| MCP | Sim | Cliente MCP HTTP/stdio com confiança explícita | Paridade funcional |
| Skills e extensões | Skills/plugins oficiais | Skills, extensões, pacotes, prompts, temas e hooks | Completo localmente; sem marketplace gerenciado equivalente |
| Subagentes | Subagentes e trabalho paralelo/nuvem conforme ambiente Codex | `delegate` isolado; lotes paralelos apenas para ferramentas read-only seguras | BLACKCORE mais limitado |
| Não interativo/automação | `codex exec` e integrações oficiais | One-shot CLI, SDK e JSON-RPC | Paridade local parcial |
| Nuvem/handoff | Execução e continuação em serviços Codex | Não implementado | Lacuna real |
| Revisor automático separado | Pode existir como camada/revisor do ambiente Codex | Não há segundo revisor independente obrigatório | Lacuna real |
| Isolamento pelo sistema operacional | Sandbox imposto pelo ambiente/OS | Validação de caminhos, comandos, rede e aprovações no processo Node | Lacuna crítica de arquitetura |
| Auditoria baixável | Revisão e resultados no fluxo Codex | Relatório Markdown nativo com hash, gates, P0–P3 e notas | Vantagem BLACKCORE |
| Termux/Android | Não é o foco primário | Perfis, permissões, Downloads, HUD estreito e Termux:API | Vantagem BLACKCORE |
| Notícias/perfis públicos | Pesquisa geral | Fluxos específicos com corroboração e limites éticos | Vantagem BLACKCORE |

## O que está realmente completo

### Núcleo de programação — 9,1/10

- Leitura, busca, criação, edição atômica, patch, rename, delete controlado e checkpoints.
- Shell persistente, processos em segundo plano, timeout, cancelamento da árvore de processos e saída paginada.
- Testes, build, lint, typecheck, detecção de Node, Python, Rust, Go, PHP, Flutter e Android.
- Git, revisão, GitHub, worktrees, arquivos, hashes, compactação e restauração.

### Conversa natural e continuidade — 9,3/10

- Mapa de objetivo, alvo, restrições, autonomia, critério de pronto e ambiguidades materiais.
- Referências como “melhora isso” usam o foco recente; escolhas perigosas sem alvo mantêm somente inspeção read-only.
- Ledger de continuidade, árvore de sessão e compactação preservam trabalho longo.
- Benchmark determinístico: 254/254 casos contextuais e 38/38 controles coloquiais.

### Ferramentas e extensibilidade — 9,2/10

- 69 ferramentas nativas com schema, política central, cancelamento onde aplicável e eventos auditáveis.
- MCP moderno, extensões locais, skills, pacotes, hooks, prompts e temas.
- Integrações opcionais com Supabase, Vercel, Netlify, Expo/EAS, Resend e GitHub.

### Pesquisa e auditoria — 9,1/10

- Notícias entregam acontecimentos, datas, relevância, confiança, divergências e fontes, não somente links.
- Links públicos recebem separação entre observação, corroboração, inferência e informação não verificada.
- Auditoria cria Markdown real em Downloads ou `reports/`, com SHA-256, dependências, gates, notas, prioridades e referências.

### Interface Termux — 9,2/10 em simulação

- HUD superior fixo, compositor inferior fixo e painel central emoldurado.
- Barra proporcional na direita com `▲`, trilho, marcador e `▼`.
- `PgUp/PgDn`, linha a linha, início/fim, roda, clique e arraste SGR.
- História longa e código numerado continuam acessíveis sem atravessar topo ou entrada.
- Resize alterna automaticamente entre HUD completo e compacto.

## Lacunas que não podem ser resolvidas só com decoração ou prompt

### P1 — Sandbox imposto pelo sistema operacional

O Codex documenta isolamento e controles aplicados fora do processo do agente. O BLACKCORE hoje protege por validação no harness Node: limite de workspace, classificação de comandos, política de rede, confirmações e redação. Isso reduz risco, mas uma extensão confiada ou falha no próprio processo ainda executa com o usuário do Termux.

**Para chegar mais perto:** executar comandos em `proot`, container, namespace Linux ou serviço auxiliar isolado, com montagem explícita e rede restrita. Isso precisa ser uma camada real, não um texto no prompt.

### P2 — Revisor automático independente

O BLACKCORE tem `/review`, testes, auditoria e gates, mas a mesma execução geralmente propõe e verifica a alteração. Falta uma etapa obrigatória com contexto separado para revisar diff, segurança e critérios de pronto antes da entrega.

### P2 — Orquestração paralela e nuvem

Há subagente `delegate` e paralelismo limitado a ferramentas read-only declaradas seguras. Não existe handoff para tarefas remotas gerenciadas, fila em nuvem, continuação entre dispositivos ou conjunto de agentes paralelos equivalente ao ambiente Codex completo.

### P3 — Marketplace e identidade gerenciados

Skills, extensões, pacotes e MCP funcionam, mas não existe catálogo oficial assinado, instalação com identidade/OAuth central, políticas de organização e atualização gerenciada equivalentes a uma plataforma hospedada.

## Segurança: leitura correta da nota 83/100

| Controle | Estado |
| --- | --- |
| Limite de workspace e proteção contra symlink | Implementado e testado |
| PLAN bloqueando mutações | Implementado e testado |
| Confirmação de ações remotas/perigosas | Implementada e testada |
| Política de rede, redirect e destinos privados | Implementada e testada |
| Redação de credenciais | Implementada e testada |
| Checkpoints/undo | Implementados |
| Confiança explícita de extensões/MCP | Implementada |
| Sandbox do sistema operacional | Não implementado |
| Revisor de aprovação independente | Não implementado |
| Política central de organização/nuvem | Não implementada |

Portanto, o BLACKCORE é adequado para desenvolvimento local controlado com perfil `balanced`, revisão de alterações e segredos fora do repositório. O modo `yolo` e extensões confiadas ampliam deliberadamente o risco.

## Ordem recomendada para uma próxima geração

1. **P1:** sandbox opcional real por `proot`/container, com workspace montado e rede negada por padrão.
2. **P2:** segundo passe de revisão em contexto independente antes de marcar tarefas como concluídas.
3. **P2:** orquestrador de subagentes com limites, dependências, cancelamento e merge de evidências.
4. **P2:** handoff/continuação remota opcional, sem tornar a nuvem requisito do Termux.
5. **P3:** catálogo assinado de extensões/skills com permissões declaradas e atualização verificável.

## Conclusão

O BLACKCORE 3.5.5 já não é um protótipo raso: o núcleo local está funcional, testado e especialmente forte para Termux, relatórios e pesquisa verificável. A afirmação correta é **“agente local avançado e independente, com grande cobertura do fluxo do Codex CLI”**. A afirmação incorreta seria “Codex 100% completo dentro do Termux”, porque nuvem gerenciada, isolamento de OS e governança de plataforma continuam faltando.

