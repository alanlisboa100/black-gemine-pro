# BLACKCORE Native 3.5.7 — validação definitiva da avalanche de números

Data: 2026-08-12  
Evidência do aparelho: coordenadas repetidas como `0;43;50M`, `0;45;50M`, `0;46;51M`, acompanhadas por prompts `>` no painel central ao tocar no teclado Android.

## Veredito

**CAUSA COMPLETA IDENTIFICADA E CORRIGIDA.** A 3.5.6 filtrava o consumidor novo do HUD, mas um segundo consumidor permanecia conectado: o `onkeypress` interno do `readline` criado na inicialização do aplicativo. `rl.pause()` interrompia o fluxo momentaneamente, porém `stdin.resume()` reativava todos os listeners. O leitor antigo recebia cada relatório SGR, imprimia coordenadas no painel central e podia criar prompts `>` ou uma segunda leitura do teclado.

## Correção estrutural

1. O `InputController` registra exatamente quais listeners de `keypress` pertencem ao seu `readline`.
2. Quando o HUD começa, esse listener é removido antes de `stdin.resume()`.
3. O HUD passa a ser o único consumidor funcional da entrada.
4. Ao suspender ou fechar o HUD, o listener original é restaurado uma única vez.
5. Antes de entrar na tela alternativa, BLACKCORE sempre envia `mouse off`, limpando rastreamento deixado por uma execução anterior.
6. No Termux, SGR mouse fica desligado por padrão. Assim, toques no teclado Android não geram coordenadas na fonte.
7. A barra direita permanece como indicador proporcional; a navegação garantida usa `PgUp/PgDn`, setas modificadas e `Ctrl+Home/End`.
8. Mouse físico continua opcional com `BLACKCORE_TERMUX_MOUSE=1 blackcore`.

## Teste com a pilha real

Diferentemente da regressão anterior, o novo teste não chama somente métodos isolados. Ele instancia:

- `PassThrough` representando o TTY;
- `InputController` real;
- `readline/promises` real em modo terminal;
- `FixedComposer` real;
- saída de tela capturada integralmente.

O teste injeta:

```text
ESC[<0;43;50M
ESC[<0;44;
50M
normal
```

E confirma simultaneamente:

- a tela não contém `0;43;50M` nem `0;44;50M`;
- o compositor contém somente `normal`, uma vez;
- a fila permanece vazia;
- nenhum prompt `>` é criado pelo leitor antigo;
- depois que o HUD fecha, o `onkeypress` original do readline volta corretamente.

## Gates executados

| Gate | Resultado |
| --- | ---: |
| Sintaxe JavaScript | 305/305 |
| Suíte Node sequencial | 225/225 |
| Testes focados com InputController real | 21/21 |
| Testes do fixed composer | 13/13 |
| Falhas, skips e cancelamentos | 0 |

## Comportamento esperado no aparelho

- Tocar em qualquer tecla deve produzir somente aquela tecla na caixa inferior.
- Nenhuma coordenada deve surgir no painel central.
- Nenhum `>` adicional deve aparecer enquanto o HUD está ativo.
- Durante a digitação, o texto existe somente embaixo.
- Depois de Enter, a caixa limpa e uma única cópia entra no histórico.
- A barra direita continua acompanhando a posição; use as teclas documentadas para navegar.

## Recuperação de um terminal já preso

Uma execução antiga pode ter deixado mouse tracking habilitado. Encerre o processo e execute:

```bash
printf '\e[?1006l\e[?1002l\e[?1000l'
reset
```

A 3.5.7 envia a sequência de desligamento automaticamente nos próximos inícios e encerramentos.

## Arquivos principais

- `src/tui/input.js`
- `src/tui/fixed-composer.js`
- `src/tui/ansi.js`
- `test/fixed-composer.test.js`
- `docs/TERMUX.md`

