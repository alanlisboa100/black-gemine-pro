# BLACKCORE Native 3.5.1 — validação da correção Termux

Data: 2026-08-12  
Escopo: travamento de ferramentas, cancelamento, fila de entrada, Chromium e apresentação de estado no Termux.

## Veredito

**APROVADA.** O defeito reproduzido na versão 3.5.0 ocorria porque o timeout sinalizava apenas o processo wrapper. Um Chromium ou shell filho podia continuar com os descritores de saída abertos, mantendo a promessa de execução pendente por vários minutos. A 3.5.1 cria um grupo de processos por comando, encerra a árvore completa, escala de `SIGTERM` para `SIGKILL` em 500 ms e força a liquidação controlada caso o Android mantenha pipes abertos.

## Evidência automatizada

| Gate | Resultado |
|---|---:|
| Sintaxe JavaScript | 300/300 arquivos |
| Suíte Node | 202/202 testes |
| Timeout com descendente resistente a `SIGTERM` | passou em ~0,56 s |
| Cancelamento com descendente resistente a `SIGTERM` | passou em ~0,56 s |
| Bloqueio de ferramentas sequenciais pendentes | passou |
| Cancelamento digitado na fila Termux | passou |
| Browser estático sem Playwright | open/snapshot/close passaram |

## Mudanças verificadas

1. `execCapture` inicia comandos POSIX em grupo separado e encerra wrapper e descendentes.
2. O executor devolve resultados `CANCELLED` para chamadas restantes sem executá-las.
3. O loop salva os resultados necessários para manter o histórico válido e sai antes do mecanismo de recuperação.
4. A UI encerra o spinner imediatamente ao cancelar, evitando linhas repetidas de `tools`.
5. `/cancel`, `cancelar`, `cancela`, `pare`, `parar` e `stop` interrompem o turno ocupado; mensagens normais continuam na fila.
6. Chromium usa timeout padrão de 45 s e só tenta o modo headless antigo quando a saída comprova incompatibilidade com `--headless=new`.
7. Sem `playwright-core`, `open`, `snapshot` e `responsive` funcionam em modo estático; ações realmente interativas informam a limitação sem sugerir um bypass via `bash`.

## Limitações preservadas

- O fallback sem Playwright não simula clique, digitação, teclado nem mede frames. Para esses testes, use o perfil `web`/`full` com Playwright e Chromium funcionais.
- No Windows, Node não oferece o mesmo modelo POSIX de grupo de processos; o fallback continua usando o encerramento do processo direto.
- O cancelamento não pode desfazer um efeito externo que um comando tenha concluído antes de receber o sinal. Checkpoints continuam sendo a proteção para mutações locais compatíveis.

## Comando de reprodução

```bash
BLACKCORE_HOME=/tmp/blackcore-351-verify npm run verify
```

Resultado observado: `202 pass · 0 fail`.
