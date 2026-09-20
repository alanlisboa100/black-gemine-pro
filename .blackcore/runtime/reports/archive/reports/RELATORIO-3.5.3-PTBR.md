# Relatório técnico — BLACKCORE Native 3.5.3

## O que estava errado

Na captura enviada, o topo era redesenhado dentro do buffer normal do Termux. Mudanças de tamanho, teclado, permissões e reconstruções da interface podiam transformar quadros anteriores do cabeçalho em linhas do histórico. Ao mesmo tempo, cada ferramenta imprimia argumentos JSON, uma prévia do comando e depois partes do resultado; isso repetia a mesma informação e chegava a despejar HTML/CSS na tela.

## Correção aplicada

### Tela fixa isolada

O workspace interativo agora usa uma tela própria do terminal. O shell anterior fica preservado e retorna quando o BLACKCORE fecha. Permissões e seletores saem temporariamente dessa tela; ao retornar, o BLACKCORE reconstrói o topo, a região central e a entrada.

### Resize sem fantasmas

Foi criado um transcript lógico limitado às últimas 500 linhas. Quando largura ou altura mudam, a geometria antiga é apagada, as margens são recalculadas e apenas as linhas recentes que cabem no centro são reproduzidas. Cabeçalho e compositor nunca entram nesse transcript.

### Cabeçalho redesenhado

O topo permanece com quatro linhas:

1. `◆ B L A C K C O R E // NATIVE 3.5.3`
2. `MODEL` com modelo, provedor e raciocínio.
3. Estado atual: `THINK`, `RUN`, `WAIT`, `DONE` ou `READY`.
4. Conexão, modo, quantidade de ferramentas e fila.

O gráfico rosa foi removido. A fase anima quatro vezes por segundo em vez de oito, e um frame idêntico não é reimpresso.

### Ferramentas legíveis

Antes:

```text
◆ bash {"command":"python -m http.server 8000", ...}
$ python -m http.server 8000
✓ bash exit=0 ...conteúdo bruto...
```

Agora:

```text
01 $ BASH · start local server
01 ✓ complete · 41ms
```

Arquivos mostram nome e tamanho; HTTP mostra método e host; portas mostram o número; browser mostra a ação. Falhas mostram somente o motivo útil, como `timed out`, `permission denied`, `not available` ou `command exited 1`.

## Resultado

- 303 arquivos JavaScript válidos.
- 210 testes aprovados, zero falhas.
- 254 avaliações contextuais, 38 comandos naturais e 50 ferramentas aprovados.
- Nenhum JSON de argumentos, segredo, comando longo ou HTML bruto aparece na apresentação normal das ferramentas.

## Limitação honesta

A correção foi validada com uma simulação ANSI de Termux em 54 colunas, inclusive resize e suspensão. O teste final no aparelho real ainda é necessário para confirmar o comportamento da versão específica do Termux, teclado e fonte instalados.
