# Relatório técnico — BLACKCORE Native 3.5.1

## Resumo executivo

A 3.5.1 é uma correção de confiabilidade para o travamento de `tools` observado no Termux. O problema não estava no tempo exibido pelo spinner: um comando cancelado podia deixar um processo filho vivo, especialmente Chromium iniciado através de `bash`. Como o filho continuava segurando os pipes, o executor não recebia o evento de encerramento e o agente permanecia ocupado; novas mensagens apareciam como `queued`.

## Correção aplicada

- Árvore inteira de processos encerrada em timeout ou cancelamento.
- Escalonamento automático para `SIGKILL` após 500 ms.
- Saída garantida da promessa de execução mesmo com descritores presos no Android.
- Ferramentas ainda não iniciadas são marcadas como canceladas e não executam.
- Cancelamento não chama `replanning` nem inicia uma nova rodada do modelo.
- Spinner é interrompido antes da mensagem `cancel requested`.
- Palavras naturais de cancelamento funcionam durante a execução no Termux.
- Browser sem Playwright recebe fallback estático; Chromium não sofre mais retry duplo genérico.

## Experiência esperada

Se uma ferramenta travar, pressione `Ctrl+C` ou digite `cancelar`. A linha animada deve parar imediatamente e o turno deve terminar em aproximadamente um segundo. Uma mensagem comum digitada durante o trabalho continua aguardando na fila e é processada quando o turno atual encerra.

## Resultado

Foram validados 300 arquivos JavaScript e 202 testes automatizados, sem falhas. Dois testes criam propositalmente processos resistentes a `SIGTERM`; timeout e cancelamento encerraram cada árvore em aproximadamente 0,56 s.
