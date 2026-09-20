# BLACKCORE Native 3.5.8 — validação da rolagem por toque e barra lateral

Data: 2026-08-12  
Origem: captura real mostrando o marcador ciano parado e relato de que arrastar a tela exibia conteúdo antigo fora do histórico controlado.

## Veredito

**CORREÇÃO APROVADA EM SIMULAÇÃO INTEGRADA.** Na 3.5.7, o rastreamento SGR foi desligado para interromper a avalanche de coordenadas. Isso tornou a barra apenas visual: o gesto era recebido pelo scrollback nativo do Termux, não pelo BLACKCORE. Como o segundo consumidor `readline` já foi removido e o filtro bruto está testado, a 3.5.8 reativa o toque com uma implementação controlada.

## Funcionamento novo

- Deslizar para cima em qualquer ponto do painel central aumenta o deslocamento e mostra linhas mais antigas.
- Deslizar para baixo reduz o deslocamento e retorna ao conteúdo recente.
- Tocar na barra direita salta diretamente para aquela posição proporcional.
- Arrastar o marcador acompanha a posição do dedo.
- `▲` e `▼` continuam indicando os extremos.
- `VIEW LATEST` muda para `VIEW início-fim/total` enquanto o usuário revisa o histórico.
- Ao retornar ao fim, o estado volta para `VIEW LATEST`.
- Coordenadas fora do painel, inclusive na região do teclado Android, são consumidas sem digitar, rolar ou desenhar texto.
- `PgUp/PgDn`, setas modificadas e `Ctrl+Home/End` continuam funcionando.

## Por que textos antigos não devem mais aparecer abaixo

Com mouse tracking desligado, um gesto vertical era processado pelo próprio scrollback do terminal. Isso movia a tela física inteira, trazendo linhas do buffer anterior para perto ou abaixo do compositor. Agora, enquanto o HUD está ativo:

1. o Termux entrega o gesto como relatório SGR;
2. o filtro BLACKCORE remove as coordenadas do fluxo de teclado;
3. somente o transcript interno muda de janela;
4. cabeçalho e compositor são redesenhados nas mesmas linhas fixas;
5. o scrollback externo não recebe o gesto.

## Controle de desempenho

Movimentos de toque podem gerar dezenas de coordenadas por segundo. A 3.5.8:

- acumula deltas sucessivos;
- guarda apenas o alvo mais recente durante arraste da barra;
- redesenha no máximo uma vez a cada 24 ms, aproximadamente 40 FPS;
- aplica o movimento final imediatamente quando o dedo é solto;
- cancela timers pendentes ao suspender ou fechar o HUD.

Isso evita um novo loop de repaint e mantém a barra responsiva.

## Regressão específica

O teste cria 80 linhas controladas e injeta uma sequência SGR completa:

```text
press  x=25 y=20
drag   x=25 y=16
drag   x=25 y=11
release
```

Depois injeta o gesto contrário. São confirmados:

- `scrollOffset > 0` depois de subir;
- a primeira linha visível se torna mais antiga;
- `scrollOffset` diminui depois de descer;
- o cabeçalho mostra `VIEW` durante a revisão;
- nenhuma coordenada aparece na tela;
- barra, cabeçalho e caixa continuam nas regiões fixas.

## Gates executados

| Gate | Resultado |
| --- | ---: |
| Sintaxe JavaScript | 305/305 |
| Suíte Node sequencial | 226/226 |
| Testes focados de HUD/entrada/toque/Markdown | 25/25 |
| Testes exclusivos do fixed composer | 14/14 |
| Falhas, skips e cancelamentos | 0 |

## Compatibilidade

O toque fica ativo por padrão. Para um aparelho ou teclado que apresente incompatibilidade específica:

```bash
BLACKCORE_TERMUX_MOUSE=0 blackcore
```

Esse modo desliga somente gestos; a barra continua indicando posição e as teclas continuam navegando.

## Arquivos principais

- `src/tui/fixed-composer.js`
- `src/tui/input.js`
- `src/tui/ansi.js`
- `test/fixed-composer.test.js`
- `docs/TERMUX.md`

