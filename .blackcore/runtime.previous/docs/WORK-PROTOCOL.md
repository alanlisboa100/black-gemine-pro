# Protocolo de trabalho BLACKCORE 3.6

O BLACKCORE 3.6 aplica um ciclo de trabalho inspirado nas práticas públicas do Codex: entender o pedido, inspecionar o contexto, executar apenas o necessário, testar e revisar antes de entregar. O objetivo é aumentar a confiabilidade sem transformar uma pergunta simples em uma cadeia cara de chamadas ao modelo.

## Perfis adaptativos

| Perfil | Quando entra | Caminho exigido |
| --- | --- | --- |
| `fast` | perguntas, explicações e leitura sem mudanças | entender → responder |
| `standard` | mudanças focadas de código, configuração ou conteúdo | entender → inspecionar → executar → verificar → relatar |
| `deep` | arquitetura, auditoria ampla, segurança, migração, release ou pedido de “fazer tudo” | entender → inspecionar → planejar → executar → verificar → revisar → relatar |

O padrão é `adaptive`. Ele é econômico: não adiciona uma chamada de revisão a uma explicação comum. Para forçar um perfil, use `/work fast`, `/work standard` ou `/work deep`; `/work` mostra o último ciclo com as evidências reais.

## Gates automáticos

Depois de uma mutação em tarefa `standard` ou `deep`, uma resposta final sem evidência dispara uma única solicitação interna de verificação. O agente deve rodar o menor check que realmente prove o resultado: teste específico, lint, typecheck, build, execução local, teste de navegador ou outro comando adequado ao projeto.

Em tarefa `deep`, depois de uma verificação bem-sucedida, existe mais um gate de revisão. O agente deve abrir o diff/status do Git ou reler os alvos modificados para procurar regressões, requisitos esquecidos, efeitos colaterais e arquivos não relacionados. Se corrigir algo nesse momento, deve verificar de novo.

Um processo que terminou não é automaticamente uma aprovação. O executor entende resultados estruturados como `{"ok": false}` como falha. Quando não há comando de verificação detectável, o estado é `unverified`; a resposta precisa declarar a limitação, não dizer “testado”.

## Evidência e sessão

O estado de cada turno é salvo em `lastWork` da sessão:

- perfil, fase atual e alvos alterados;
- número de inspeções e mutações;
- tentativas e resultado de verificação;
- tentativa e resultado da revisão;
- gates usados e status final: `read-only`, `verified`, `verification-only` ou `unverified`.

Esse registro acompanha a retomada de sessão e também aparece por conversa natural via `agent_control status`. Ele não grava segredos: textos e alvos passam pela mesma redação usada nas saídas das ferramentas.

## Interface Termux

O HUD fixo mostra fases curtas e legíveis: `SCAN`, `PLAN`, `BUILD`, `CHECK`, `REVIEW` e `REPORT`. Cabeçalho e caixa de mensagem continuam fora do histórico rolável; apenas respostas, código e atividades passam pelo painel central. Nada desse fluxo despeja argumentos JSON, comandos completos ou chaves na tela.

## Limites honestos

O protocolo melhora o harness local, mas não cria por mágica as camadas de plataforma do Codex. O BLACKCORE ainda não tem sandbox imposto pelo sistema operacional, revisor independente separado do modelo principal, execução em nuvem gerenciada ou marketplace organizacional assinado. Por isso, `balanced` é o padrão recomendado e mudanças importantes continuam pedindo revisão humana antes de publicação.
