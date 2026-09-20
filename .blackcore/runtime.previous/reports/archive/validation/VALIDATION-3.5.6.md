# BLACKCORE Native 3.5.6 — validação da entrada limpa no Termux

Data: 2026-08-12  
Origem do achado: captura real do Termux mostrando coordenadas SGR (`5;52;25M`, `65;52;25M`, `0;44;51M`) dentro do campo de mensagem e relato de duplicação visual.

## Veredito

**CORREÇÃO APROVADA.** O vazamento numérico não era texto criado pelo modelo: eram coordenadas de roda, clique e arraste emitidas pelo terminal. A versão 3.5.5 entregava o mesmo `stdin` simultaneamente ao decodificador de teclado e ao leitor de mouse. Se o Android dividisse um evento entre pacotes, o prefixo `ESC[<` era visto separado e o restante numérico podia ser interpretado como digitação.

## Correção aplicada

1. O `stdin` bruto agora tem um único consumidor do HUD.
2. Um filtro com estado junta prefixos e coordenadas SGR mesmo quando chegam fragmentados.
3. Eventos completos de mouse são encaminhados somente à navegação do painel.
4. Apenas bytes que não pertencem a mouse seguem para um fluxo interno dedicado ao teclado.
5. Setas e controles fragmentados continuam preservados.
6. Texto UTF-8 normal chega ao compositor exatamente uma vez.
7. Ao enviar, o compositor é apagado antes de a mensagem aparecer uma única vez no histórico.
8. O filtro e os timers são removidos ao suspender, abrir menus ou sair.

## Evidência executada

| Gate | Resultado |
| --- | ---: |
| Sintaxe JavaScript | 305/305 |
| Suíte Node sequencial | 224/224 |
| Testes focados de HUD/entrada/Markdown/largura | 19/19 |
| Testes do fixed composer | 12/12 |
| Falhas, cancelamentos e skips | 0 |

## Regressões novas

### Pacote SGR dividido

O teste envia, em chamadas separadas:

```text
ESC[<
65;52;25M
ESC[
<0;52;12M
teste único
```

Resultado confirmado:

- nenhuma coordenada entra no prompt;
- `teste único` aparece exatamente uma vez;
- o gesto ainda altera a posição do histórico;
- a caixa continua fixa.

### Envio sem duplicação transitória

O teste digita `uma mensagem`, envia e observa a ordem interna de pintura:

- no instante do eco para o histórico, o buffer da caixa já está vazio;
- existe uma única linha correspondente no transcript;
- o texto não permanece simultaneamente no painel inferior e no central.

## O que não mudou

- Cabeçalho, painel central e caixa de mensagem continuam fixos.
- Roda, clique/toque, arraste, `PgUp/PgDn` e `Ctrl+Home/End` continuam disponíveis.
- História longa, código, Markdown, resize e modo compacto continuam aprovados.
- A resposta do modelo continua aparecendo somente no painel central.

## Limite físico restante

A reprodução automatizada usa exatamente a forma fragmentada observada, mas a confirmação final ainda deve ser feita no mesmo aparelho. Se uma versão específica do Termux emitir outro protocolo, a captura dos bytes permitirá acrescentá-lo sem voltar a misturar teclado e mouse.

## Arquivos alterados

- `src/tui/fixed-composer.js`
- `test/fixed-composer.test.js`
- `CHANGELOG.md`
- `README.md`
- `README-PTBR.md`
- `docs/TERMUX.md`

