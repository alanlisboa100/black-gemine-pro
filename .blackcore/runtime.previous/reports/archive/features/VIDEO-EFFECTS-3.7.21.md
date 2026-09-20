# BLACKCORE 3.7.21 — pacote visual de vídeo

O editor agora inclui `blackcore-premium-lite`, um pacote local leve para Termux:

- 12 texturas VFX de origem CC0;
- 24 variações de sobreposição com cor, glow, flare, burst, espiral e gráfico;
- transições nativas com duração geral ou duração individual;
- zoom de câmera `face-in-out`, `face-punch`, `subtle-push` e `return-zoom`;
- renderização local com FFmpeg, sem After Effects, Premiere ou download silencioso de modelos.

## Consultar o catálogo

```text
video_editor {"action":"list_effects"}
```

## Aplicar sobreposições escolhidas

```json
{
  "action": "apply_overlay_pack",
  "input": "video.mp4",
  "output": "video-premium.mp4",
  "effectPack": "blackcore-premium-lite",
  "overlays": [
    {"preset": "light-sweep-cyan", "start": 1.2, "duration": 0.65},
    {"preset": "swirl-violet", "start": 4.8, "duration": 0.72, "opacity": 0.2}
  ]
}
```

Se `overlays` não for informado, o editor escolhe uma quantidade conservadora (`overlayCount`, oito por padrão) distribuída pela duração do vídeo. A biblioteca pode conter 24 presets sem obrigar o BLACKCORE a aplicar todos; para uma edição mais carregada, informe `overlayCount` ou uma lista explícita.

## Zoom e transições

```json
{
  "action": "auto_edit",
  "request": "edição profissional com zoom no rosto, aproxima e volta",
  "input": "video.mp4",
  "output": "video-pro.mp4",
  "editLevel": "high",
  "zoomPreset": "face-in-out",
  "focusX": 0.5,
  "focusY": 0.38,
  "zoomStrength": 0.08,
  "transition": "softdissolve",
  "transitionDurations": [0.32, 0.45, 0.28],
  "effectPack": "blackcore-premium-lite",
  "overlayPresets": ["glow-soft-cool", "radial-punch-blue", "crosshair-blue"]
}
```

`focusX` e `focusY` são coordenadas normalizadas do ponto focal; o editor não afirma que encontrou um rosto automaticamente. Alterar pixels somente no rosto continua sendo uma edição regional e exige máscara temporal rastreada.

## Licença

Veja [`assets/video-effects/blackcore-premium-lite/SOURCE-AND-LICENSE.md`](assets/video-effects/blackcore-premium-lite/SOURCE-AND-LICENSE.md) e o texto CC0 incluído no pacote.
