# BLACKCORE 3.8.1 — confiabilidade e revisão funcional

Data: 7 de setembro de 2026.

Esta atualização usa o agente 3.8.0 com as melhorias de interface já entregues e o painel web enviado em grok-workspace.zip. O painel e o agente são aplicações distintas. O painel não está conectado à execução do Termux.

## Correções do agente

1. Corrigido um laço infinito na execução paralela quando uma ferramenta recebia JSON inválido ou quando a configuração de paralelismo era negativa. A chamada agora falha de forma controlada e a fila continua.
2. A leitura de argumentos tolera texto com emoji antes do objeto JSON.
3. Falhas retornadas por ferramentas passam a contar para a proteção contra repetição de chamadas idênticas.
4. Mensagens de erro de ferramentas passam pela remoção de credenciais antes de serem exibidas.
5. Eliminado um padrão de expressão regular que tornava muito lenta a proteção de credenciais em linhas longas. Na mesma matriz local, a etapa com 140.021 caracteres passou de aproximadamente 55.275 ms para 8 ms. Isso mede essa etapa específica, não a velocidade de inferência do modelo.
6. A espera entre tentativas remove seus eventos de cancelamento ao terminar, evitando acúmulo de ouvintes.
7. Cancelar uma resposta em streaming interrompe também um leitor parado. Encerrar a leitura antecipadamente libera a conexão.
8. Respostas interrompidas deixam de ser tratadas como completas. Após exibir texto, o cliente não repete silenciosamente a requisição, evitando duplicação da resposta na tela.
9. Falha ao iniciar um processo é registrada para consulta, em vez de provocar erro de evento não tratado.
10. Pedidos de variantes Gemini ausentes no catálogo não escolhem outra variante silenciosamente nem alteram o raciocínio do modelo anterior.
11. Asserções HTTP que falham são reportadas como falha pela ferramenta api_lab.
12. Restaurados o inicializador isolado de testes e um novo conjunto de casos de entendimento natural. O novo conjunto não é apresentado como recuperação do corpus antigo, que não veio no ZIP.

As melhorias anteriores de cores, menus, animações e atualização parcial do histórico estão incluídas.

## Evidência de validação

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| Testes unitários do agente e interface | 27 aprovados | Cancelamento, streaming, erros, argumentos, menus e timers |
| Sintaxe JavaScript | 241 arquivos aprovados | Código do agente, entrada e testes |
| Matriz de ferramentas | 50/50 aprovados | Arquivos, shell, processos, HTTP local, busca, documentos e adaptadores |
| Controles em linguagem natural | 37/37 aprovados | Modelos, raciocínio, modo, animação, desfazer e sessão |
| Novo corpus de entendimento | 10/10 aprovados | Alvo, restrições, histórico e ambiguidade |
| Agente com provedor simulado | Aprovado | Delegação, criação de arquivo, desfazer e nova sessão |
| MCP por stdio | Aprovado | Conexão, descoberta e chamada local de ferramenta |
| Testes do adaptador de plugin | 6 aprovados, 1 não aplicável | O ZIP não inclui registro de marketplace do repositório |

Na matriz, APIs de deploy, e-mail, banco, Android e navegador usam executáveis simulados; não são testes de contas reais. A etapa de verificação de entrega confirma a rejeição de uma estrutura incompleta, sem enfraquecer a regra de segurança.

O roteiro antigo qa-natural-e2e.mjs não passou: seu servidor simulado tenta escrever antes do planejamento obrigatório e entrega uma estrutura que não atende ao contrato atual. Ele foi preservado e não é contado como aprovado. Esse resultado limita a cobertura de ponta a ponta com tarefas longas; o teste específico de agente/delegação/desfazer passou.

## Limites que continuam existindo

- O aparelho precisa de Node.js 20 ou superior e das dependências de cada função. A auditoria foi executada em Linux/Node 24, sem aparelho Android conectado.
- Modelos de nuvem precisam de credencial, rede, disponibilidade e quota. Nenhuma chamada paga ou conta externa foi usada nesta validação. O catálogo de modelos e os preços embutidos não foram confirmados contra os provedores.
- Edição de mídia depende das ferramentas e modelos locais necessários, como FFmpeg ou removedor de fundo. Os resultados visuais de foto/vídeo não foram validados nesta revisão.
- Acesso a arquivos Android, notificações, navegador visível e execução longa dependem das permissões e das restrições de bateria do sistema.
- Limites padrão do agente foram mantidos: 250 turnos, 500 chamadas de ferramenta, quatro horas de tarefa, 180 segundos por requisição e quatro leituras/agentes em paralelo.
- O orçamento padrão é de 1,8 milhão de tokens totais e US$ 2 estimados por tarefa, compartilhado entre agentes. O valor monetário depende dos preços cadastrados; não equivale à fatura do provedor.
- Saídas grandes continuam paginadas: 120 mil caracteres por saída de ferramenta e 160 mil por leitura, conforme a configuração. Isso protege contexto e memória.
- Modo PLAN, confirmações de operações sensíveis e validação de entregas continuam ativos. A revisão corrige falhas técnicas, não transforma o programa em acesso irrestrito ao sistema.

## Uso

Extraia o ZIP em uma pasta nova. Dentro da pasta BLACKCORE-v3.8.1, execute:

```bash
bash INSTALAR-BLACKCORE.sh
```

O instalador foi mantido, com versão atualizada. Sua execução no Android não foi testada aqui. Para repetir os testes locais:

```bash
npm run verify
npm run test:tools
npm run test:natural
```
