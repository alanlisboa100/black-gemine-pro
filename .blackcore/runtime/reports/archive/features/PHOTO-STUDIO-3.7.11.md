# BLACKCORE Native 3.7.11 — edição seletiva de fotos

O editor agora separa **o tratamento** de **onde ele pode atuar**. A correção dark, cinematográfica, de luz, cor, nitidez, ruído ou desfoque é produzida primeiro; depois uma máscara real limita o resultado à área escolhida. O original permanece intacto.

## Escopos

| Pedido natural | `editScope` | Como a região é obtida |
|---|---|---|
| “edita a foto inteira” | `full` | quadro completo, sem máscara |
| “melhora só a pessoa” | `subject` | alpha útil, `rembg`, máscara fornecida ou backend |
| “faz a edição só no fundo” | `background` | inversão do assunto local ou máscara direta do backend |
| “melhora apenas a grama/os olhos/a camisa” | `detail` | máscara fornecida ou backend semântico com `regionPrompt` |
| “edita só esta área marcada” | `mask` | arquivo de máscara manual |

Na máscara manual, branco significa “editar” e preto significa “preservar”. `maskFeather` suaviza a borda, `maskExpand` dilata ou corrói a seleção e `invertMask` troca as áreas.

## Seleção honesta

A versão não chama uma correção global de “edição de fundo”. Assunto e fundo automáticos precisam de transparência significativa na imagem, do comando opcional `rembg` instalado ou de um endpoint de segmentação. Um detalhe descrito em texto precisa de segmentação semântica real. Sem uma dessas fontes, o trabalho para com uma explicação clara.

## Verificação

Antes da exportação final, o editor compara amostras RGB do original, do resultado seletivo e da máscara. A saída precisa provar:

- diferença média suficiente dentro da região;
- pixels realmente alterados dentro da seleção;
- diferença mínima fora da máscara;
- dimensões, textura e força geral compatíveis com o pedido.

Uma seleção sem mudança visível ou uma edição que vaza pelo quadro é rejeitada.

## Marca de foto

A marca nativa das imagens agora usa `BLACKCORE // AI PHOTO STUDIO`. O recurso de vídeo continua usando seu arquivo separado `AI VIDEO STUDIO`.

## Exemplos

```text
Melhora esta foto no modo alto, estilo BLACKCORE, mas edita só o fundo.

Deixa apenas a pessoa mais nítida e preserva completamente o cenário.

Realça a água; não muda o barco nem o céu.

Usa esta máscara e aplica o tratamento dark somente na parte branca.
```

O HUD mostra 14 etapas. `EDIT SCOPE` informa o alvo; `MASK EDGE` informa a origem e a cobertura real da seleção.
