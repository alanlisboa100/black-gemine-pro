# BLACKCORE 3.7.14 — edição regional real

Esta versão corrige o caso em que “diminua a luz da janela” escurecia a foto inteira e “coloque brilho nos olhos” virava um efeito global.

## Regra principal

Um pedido localizado precisa de uma seleção localizada real. Se não houver uma seleção confiável, o BLACKCORE para e informa o que falta. Não existe fallback para a foto ou para o vídeo inteiro.

## Foto

O `photo_editor` aceita cinco fontes de seleção:

1. máscara manual em preto e branco;
2. máscara semântica retornada pelo endpoint configurado;
3. transparência útil da imagem;
4. `rembg` para pessoa e fundo;
5. caixas, elipses e polígonos normalizados de 0 a 1.

Use duas elipses pequenas para os olhos. Use um polígono para a janela quando a perspectiva não formar um retângulo perfeito. Depois do render, o BLACKCORE mede a mudança dentro da máscara e o vazamento fora dela. A saída é recusada quando a área não muda ou quando o efeito vaza.

Exemplo de janela em polígono:

```json
{
  "action": "adjust_light",
  "request": "diminui a luz da janela",
  "input": "foto.png",
  "regionTarget": "window",
  "regionPolygons": [{"points": [{"x": 0.03, "y": 0.02}, {"x": 0.44, "y": 0.02}, {"x": 0.42, "y": 0.68}, {"x": 0.04, "y": 0.70}]}],
  "brightness": -24,
  "exposure": -0.45,
  "maskFeather": 3
}
```

## Vídeo

O `video_editor regional_edit` exige uma máscara de vídeo temporal: a área branca acompanha o alvo quadro a quadro e a preta fica preservada. A máscara pode vir de `maskVideo` ou do endpoint `BLACKCORE_VIDEO_SEGMENT_ENDPOINT`. O motor verifica duração e cobertura parcial antes de editar.

O áudio, a ordem das cenas, a duração e a velocidade permanecem travados. Uma imagem fixa, uma caixa parada ou `rembg` executado independentemente por quadro não contam como rastreamento temporal.

```json
{
  "action": "regional_edit",
  "request": "diminui a luz só da janela durante o vídeo",
  "input": "video.mp4",
  "regionTarget": "window",
  "maskVideo": "janela-rastreada.mp4",
  "brightness": -22,
  "exposure": -0.35
}
```

O protocolo do backend está em `docs/REGIONAL-VIDEO-SEGMENTATION-PROTOCOL.md`.
