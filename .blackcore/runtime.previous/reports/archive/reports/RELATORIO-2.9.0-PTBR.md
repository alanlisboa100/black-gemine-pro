# Relatório técnico — BLACKCORE Native 2.9.0

## Resultado desta revisão

Esta versão fecha o comportamento que fazia um modelo escolhido pelo usuário poder ser substituído sem autorização. A regra agora é simples: o modelo selecionado pertence ao usuário. Se o usuário escolheu GPT OSS 120B, DeepSeek V4 Flash, Sol, Terra, Luna ou qualquer outro catálogo configurado, o BLACKCORE continua nesse par provedor/modelo até receber uma escolha explícita diferente.

O pacote também adiciona uma camada prática de trabalho em repositórios: revisão Git no TUI e worktrees isolados, sem mexer em estado Git sem confirmação.

## Correção principal: modelo não pula sozinho

### Antes do ajuste

Uma configuração legada podia manter `autoFallback` ligado. Depois de uma falha recuperável, como quota, 401/403, timeout, 429 ou erro 5xx, a camada de fallback podia tentar o próximo candidato configurado. Mesmo que o próprio fallback fosse uma opção habilitada, a troca não mostrava uma confirmação explícita na hora do custo/conta/provedor mudar.

### Agora

1. A seleção manual por conversa natural, seletor `/models`, `--provider/--model`, ferramenta `agent_control`, SDK e JSON-RPC fixa `provider` e `model`.
2. Essa fixação grava `modelLock: true`, `autoRoute: false` e `autoFallback: false`.
3. `/autoroute on` continua existindo, mas é uma permissão explícita para que tarefas futuras possam ser roteadas.
4. `/autofallback on` não troca modelo: apenas deixa uma lista de candidatos pronta para ser oferecida em uma falha real.
5. Em cada falha elegível, o TUI mostra modelo atual, candidato e resumo do erro, depois pede confirmação. Recusar mantém o modelo original e retorna um erro claro.
6. Aceitar cria um fallback temporário somente naquele prompt. A seleção salva para o próximo prompt continua intacta.
7. Um prompt sem interface de confirmação (one-shot/RPC silencioso) recusa fallback automaticamente. Não há aprovação implícita.
8. Configurações antigas passam uma vez pela migração de política v2, que desliga rota/fallback automáticos para impedir que um comportamento antigo volte depois da atualização.

Isso protege tanto a preferência técnica quanto o controle de credenciais e gasto: uma falha de chave ou limite não passa a consumir outro provedor sem decisão do usuário.

## Git: revisão e áreas isoladas

### `/review`

`/review` apresenta um painel enxuto com branch, quantidade de arquivos rastreados, linhas adicionadas/removidas, não rastreados e resultado de `git diff --check`. É somente leitura.

- `/review` — todas as alterações, sem carregar um patch grande.
- `/review full` — inclui prévia colorida do diff, limitada a 30 mil caracteres.
- `/review staged` — apenas o que está no stage.
- `/review working` — apenas o diretório de trabalho.

O modo compacto evita custo de terminal e travamento visual em repositórios grandes; o patch grande só é buscado quando solicitado.

### `/worktree`

`/worktree` lista as áreas Git isoladas. Também há:

```text
/worktree create feature/minha-tarefa
/worktree create feature/minha-tarefa ../pasta-opcional
/worktree remove ../pasta-da-feature
```

O caminho precisa estar na área gravável permitida, não pode ser o diretório atual e criar/remover pede confirmação fora do perfil `yolo`. A ferramenta estruturada `worktree` oferece as mesmas ações para o agente.

## Catálogo de IA nativo

São **13 modelos remotos prontos**, distribuídos em **4 provedores**. Ollama e provedores compatíveis personalizados podem ser adicionados pelo usuário, portanto não entram nessa contagem fixa.

| Provedor | Modelos | Modos de raciocínio expostos |
|---|---:|---|
| DeepSeek | 2 | V4 Flash e V4 Pro: Off, High, Max |
| Cerebras | 2 | GPT OSS 120B: Low, Medium, High; GLM 4.7: Off, On |
| OpenAI direto | 3 | GPT-5.6 Sol, Terra, Luna: None, Low, Medium, High, XHigh, Max |
| WaveSpeed | 6 | Luna: Standard/Pro; GLM 5.2: High/XHigh; MiniMax M3: Off/On; Gemini Flash Lite: Minimal/Low/Medium/High; MiniMax M2.7 e Qwen3 Coder: padrão do provedor |

### Inventário completo

1. DeepSeek V4 Flash
2. DeepSeek V4 Pro
3. Cerebras GPT OSS 120B
4. Cerebras GLM 4.7
5. OpenAI GPT-5.6 Sol
6. OpenAI GPT-5.6 Terra
7. OpenAI GPT-5.6 Luna
8. WaveSpeed GPT-5.6 Luna
9. WaveSpeed GLM 5.2
10. WaveSpeed MiniMax M3
11. WaveSpeed MiniMax M2.7
12. WaveSpeed Qwen3 Coder
13. WaveSpeed Gemini 3.1 Flash Lite

Todos os treze têm suporte declarado para ferramentas. Seis têm visão no catálogo: Sol, Terra, Luna direto, Luna WaveSpeed, MiniMax M3 e Gemini Flash Lite. Os modelos com cerca de 1 milhão de contexto incluem DeepSeek V4 Flash/Pro, OpenAI Sol/Terra/Luna, WaveSpeed Luna, GLM 5.2, MiniMax M3 e Gemini Flash Lite.

## Interface e idioma

- A superfície técnica do CLI permanece em inglês, que é o padrão esperado por usuários de terminal.
- Conversas em português continuam naturais: a preferência de resposta pode ser `auto`, `en` ou `pt-BR`.
- Entrada do usuário não é traduzida nem reescrita automaticamente. Isso evita quebrar caminhos, nomes de arquivos, variáveis, IDs, código e conteúdo entre aspas.
- A animação contínua do TUI continua atualizando somente a linha de status a 8 FPS; o painel inteiro não fica piscando no Termux.

## Integrações presentes

O projeto mantém fluxos nativos para Git/GitHub, browser audit, verificação de projeto, Vercel, Netlify, Supabase, Resend, Expo/EAS, Android/Gradle, MCP, HTTP, SQLite, arquivos, shell, processos, sessões, checkpoints e extensões. Deploy remoto, envio de e-mail e publicação continuam exigindo confirmação fora de `yolo`.

Não foi feita publicação real nesta revisão: isso exige contas, tokens e escolha explícita de ambiente do usuário. Os testes locais verificam os contratos e a CLI sem usar ou revelar chaves.

## Verificações executadas

- Sintaxe de todos os arquivos JavaScript do pacote.
- Regressões de lock de modelo, migração de configuração, fallback aprovado e fallback negado.
- Seleção por conversa natural, menu de modelo, ferramenta de agente, SDK e JSON-RPC.
- Repositório Git temporário com arquivo rastreado alterado, arquivo não rastreado, `git diff --check`, criação/listagem/remoção de worktree isolado.
- Suíte completa antes do empacotamento e nova verificação a partir do ZIP extraído.

## Limites conhecidos e próximos passos seguros

- A política impede troca silenciosa, mas o usuário ainda pode conscientemente ligar `/autoroute on` ou aceitar um fallback quando aparecer a confirmação.
- Preço, disponibilidade e acesso real aos modelos dependem da conta e da chave do provedor; o catálogo local não substitui validação da credencial.
- Para Vercel, Netlify, Supabase e Resend em produção, configure as CLIs/chaves no próprio ambiente e faça o primeiro deploy com confirmação visível.
