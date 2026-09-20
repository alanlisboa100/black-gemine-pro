# BLACKCORE Native 2.8.1 — relatório técnico e de UX

Data da revisão: 2026-08-09

## Escopo executado

Esta revisão avaliou o próprio agente BLACKCORE em Termux/Linux: inicialização,
composer, animação de trabalho, seletor de modelos, estado pós-configuração,
sessões, segurança, ferramentas, QA de sites/jogos e integrações opcionais.

O BLACKCORE é uma TUI (interface de terminal), não um painel web. Portanto a
revisão visual foi feita em um TTY real e com testes de renderização de terminal;
o `browser audit` continua sendo usado pelo BLACKCORE para sites que ele cria.

## Resultado

- 251 arquivos JavaScript passaram na checagem de sintaxe.
- 123 testes automatizados passaram; nenhum falhou.
- O CLI foi iniciado em TTY real, o composer, o seletor `/`, `/status` e a
  inicialização animada foram conferidos.
- O catálogo e a resposta de `/status` foram executados sem API key: o painel
  informa corretamente que a chave está ausente, sem fingir login ou conectividade.

## Melhorias feitas nesta versão

### 1. Animação suave no Termux

**Problema encontrado:** durante uma tarefa o composer redesenhava cinco linhas
inteiras a cada 86 ms. Em terminais Android menos potentes isso aumenta I/O e pode
parecer flicker ou animação travada.

**Correção:** o pulso THINK/TOOLS agora atualiza somente a linha de status a 8 FPS
(125 ms). A caixa inteira de mensagem é redesenhada imediatamente apenas ao digitar,
enfileirar texto, mudar a fase ou redimensionar o terminal. A sensação continua viva
sem desperdiçar repinturas.

### 2. Painel seguro de sessão

O cabeçalho passou a mostrar:

- estado `KEY SET`, `KEY NEEDED` ou `LOCAL`;
- provedor e transporte usado, por exemplo `OpenAI · Responses API`;
- modelo, nível de raciocínio, modo PLAN/ACT, workspace e número de ferramentas;
- origem genérica da credencial (`environment` ou `BLACKCORE secrets`) quando existe.

Nenhum token, prefixo de token ou valor secreto é renderizado. `KEY SET` significa
somente que uma credencial foi encontrada; não afirma que a API remota foi validada.
Use `blackcore doctor --api` para fazer essa validação real.

### 3. Composer mais limpo

O rodapé passou a priorizar estado, provedor, modelo, esforço, modo e nome do projeto.
Ele não gasta mais a maior parte da linha com um caminho absoluto que acabava cortado.
O placeholder também foi tornado mais direto para criação, correção, teste e deploy.

### 4. Controle explícito

Foi adicionado `/status`: um painel compacto com API, transporte, modelo, sessão,
ferramentas e política de roteamento/fallback. `/` também passa a sugerir esse painel.

## Inventário de IA e modos

São **4 provedores de API e 13 modelos configurados**. Todos os 13 têm suporte a
tool calling; 6 estão marcados como visão; 9 têm janela de contexto de cerca de 1M
tokens ou mais. A disponibilidade e os limites reais dependem da credencial e do
provedor no momento da chamada.

| Provedor | Modelos | Modos de raciocínio reais expostos |
| --- | --- | --- |
| DeepSeek | V4 Flash, V4 Pro | Off, High, Max |
| Cerebras | GPT OSS 120B | Low, Medium, High |
| Cerebras | Z.ai GLM-4.7 | Off, On |
| OpenAI direto (Responses) | GPT-5.6 Sol, Terra, Luna | None, Low, Medium, High, XHigh, Max |
| WaveSpeed | GPT-5.6 Luna | Standard, Pro |
| WaveSpeed | GLM-5.2 | High, XHigh |
| WaveSpeed | MiniMax M3 | Off, On |
| WaveSpeed | MiniMax M2.7 | padrão do provedor |
| WaveSpeed | Qwen3 Coder | padrão do provedor |
| WaveSpeed | Gemini 3.1 Flash Lite | Minimal, Low, Medium, High |

### Escolha prática

- **Flash / Low / Minimal / Off:** menor latência e custo para ações simples.
- **Medium / High:** padrão para código, correção e testes cotidianos.
- **XHigh / Max / Pro:** arquitetura, debugging difícil e trabalho agentivo longo;
  pode aumentar latência e custo.
- **Sol:** maior qualidade/esforço da rota OpenAI direta.
- **Terra:** equilíbrio para tarefas fortes do dia a dia.
- **Luna:** melhor foco em volume/custo; há rota direta OpenAI e rota WaveSpeed,
  que são produtos/credenciais diferentes.

## Comparação honesta com recursos atuais do Codex

A documentação oficial atual descreve Codex em CLI, extensão IDE e cloud, além de
skills, MCP, subagentes, hooks, worktrees, ambientes locais/nuvem, GitHub Action e
modo não interativo. Ela também lista browser, computer use, busca web, arquivos,
imagem e integrações como capacidades do ecossistema. Fonte: documentação oficial
do Codex/OpenAI.

O BLACKCORE já tem uma boa parte do núcleo local: TUI em Termux, sessões ramificadas,
checkpoints/undo, subagentes, AGENTS.md/BLACKCORE.md, skills/prompts/extensões,
MCP stdio/HTTP, RPC/SDK, segurança por perfis, Git/GitHub, browser audit, SQLite,
Vercel/Netlify/Supabase/Resend/Expo/EAS e 52 ferramentas nativas.

O que não deve ser anunciado como existente hoje:

1. Ambiente cloud próprio, acesso remoto por app e gerenciamento visual de worktrees.
2. Extensão IDE nativa ou painel web clicável. A experiência melhorada é terminal.
3. Uma revisão visual automática completa com comparação pixel a pixel armazenada;
   há screenshot/audit quando Chromium está instalado, mas não um serviço de nuvem.
4. Validação contínua de saúde/custo por provedor em segundo plano. Há `doctor --api`
   sob demanda e contabilização de uso, não monitoramento permanente.
5. Integrações reais já autenticadas de Vercel/Netlify/Supabase/Resend. As ferramentas
   existem e foram testadas com contratos/CLIs; deploy, e-mail e alterações remotas
   continuam exigindo credenciais e confirmação.

Essas lacunas são escolhas importantes para não fingir uma infraestrutura que o
Termux não possui. A próxima evolução de maior retorno seria criar uma camada
opcional de Git worktree + revisão de diff em TUI e um comando de health check
consolidado por provedor; isso pode ser feito sem perder a independência do runtime.

## Regras de idioma

O TUI técnico continua em inglês, que é a melhor escolha para CLI e documentação de
ferramentas. A conversa aceita português naturalmente. A entrada do usuário nunca é
traduzida nem reescrita antes de chegar ao modelo ou às ferramentas: isso protege
paths, código, nomes de arquivos, comandos e contexto técnico. `/language auto`,
`/language en` e `/language pt-BR` alteram apenas a preferência de saída da IA.

## Limites deste teste

Não foi usada uma chave de produção nem foi feito deploy remoto, envio de email ou
alteração em Vercel, Netlify, Supabase, Resend ou GitHub. Logo, esses serviços não
foram declarados como conectados. Para validação real de cada credencial, use
`blackcore doctor --api` e os preflights/deploys sob confirmação.
