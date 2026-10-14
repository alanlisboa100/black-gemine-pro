# BLACKCORE 3.8.2 — Atualização Estilo CapCut no Editor de Vídeo 🎬⚡

O editor de vídeo nativo do BLACKCORE foi atualizado com recursos profissionais inspirados no **CapCut**, **TikTok** e **Instagram Reels**. A renderização continua 100% local com aceleração FFmpeg no Termux/Android e Linux, sem dependência de nuvem, sem marcas d'água forçadas e com sincronização de pitch e áudio.

---

## 🚀 Novas Funcionalidades CapCut

### 1. Curva de Velocidade Dinâmica (`speed_curve`)
Permite aplicar speed ramping suave que acelera e desacelera dramaticamente sem perder o pitch do áudio:
- **`hero`**: 1.0x normal ➔ 2.5x rush ➔ 0.4x slow motion épico de ação ➔ 1.2x retorno.
- **`bullet`**: 1.0x ➔ 3.0x aceleração ➔ 0.35x super slow motion bullet time ➔ 1.5x.
- **`flash_in`**: 3.2x entrada veloz que freia para 1.0x no momento de foco.
- **`flash_out`**: 1.0x ritmo normal com aceleração final rápida de 3.2x.
- **`montage`**: alternância rítmica rápido-lento-rápido (2.2x ➔ 0.5x ➔ 2.2x ➔ 0.5x).
- **`jump_cut`**: cortes rítmicos acelerados para reels dinâmicos (1.8x ➔ 0.6x ➔ 2.0x).

```json
{
  "action": "speed_curve",
  "input": "video.mp4",
  "output": "video-speedramp.mp4",
  "curvePreset": "hero"
}
```

---

### 2. Congelar Quadro de Ação (`freeze_frame`)
Congela um quadro chave no ponto de clímax por uma duração definida (ex: 0.8s), com zoom punch de ação opcional e continuidade do vídeo sem descompasso:

```json
{
  "action": "freeze_frame",
  "input": "video.mp4",
  "output": "video-freeze.mp4",
  "time": 2.4,
  "freezeDuration": 0.8,
  "freezePunch": true
}
```

---

### 3. Tremor de Câmera / Camera Shake (`shake`)
Adiciona tremor de impacto nos graves ou na cena inteira, com controle de intensidade e frequência sem deixar bordas pretas:

```json
{
  "action": "shake",
  "input": "video.mp4",
  "output": "video-shake.mp4",
  "shakeIntensity": 4,
  "shakeFrequency": 18,
  "start": 1.2,
  "duration": 0.6
}
```

---

### 4. Flash Branco de Impacto / Strobe (`flash`)
O clássico White Flash do CapCut em batidas ou cortes, com decaimento exponencial suave ou estrobo rítmico:

```json
{
  "action": "flash",
  "input": "video.mp4",
  "output": "video-flash.mp4",
  "start": 0,
  "duration": 0.22
}
```

Ou modo estroboscópico rítmico:
```json
{
  "action": "flash",
  "input": "video.mp4",
  "output": "video-strobe.mp4",
  "strobe": true,
  "strobeInterval": 0.5,
  "duration": 0.15
}
```

---

### 5. Aberração Cromática / RGB Split Glitch (`rgb_split`)
Separa os canais de cor R e B com deslocamento horizontal dinâmico, criando a estética cyberpunk e glitch do CapCut/TikTok:

```json
{
  "action": "rgb_split",
  "input": "video.mp4",
  "output": "video-glitch.mp4",
  "rgbSplitOffset": 8
}
```

---

### 6. Desfoque de Abertura / Blur-In (`blur_in`)
O vídeo abre com desfoque cinemático suave e entra em foco nítido nos primeiros segundos:

```json
{
  "action": "blur_in",
  "input": "video.mp4",
  "output": "video-intro.mp4",
  "blurDuration": 0.85,
  "blurRadius": 24
}
```

---

## 🎨 Estilo CapCut no `auto_edit`

Basta solicitar em linguagem natural ou definir `"style": "capcut"`:

```json
{
  "action": "auto_edit",
  "request": "faz uma edição viral estilo capcut com batidas, flash branco e cor moderna",
  "input": "video.mp4",
  "output": "video-capcut-pro.mp4",
  "style": "capcut",
  "editLevel": "high"
}
```

O modo CapCut ativa automaticamente:
- **Transições CapCut**: `fadewhite` (flash branco), `zoomin`, `hblur` (whip blur), `pixelize` (pixel glitch), `fadefast` e `smoothleft`.
- **Look de Cor CapCut**: padrão `capcut-teal-orange` (realces alaranjados quentes e sombras turquesa) ou `capcut-vibrant` (saturação viva e microcontraste).
- **Legendas CapCut**: `captionStyle: "capcut"` (amarelo vibrante, contorno preto sólido e sombra de alto contraste) ou `"tiktok"` (branco com tarja translúcida).
- **Punch Flash Rítmico**: nos drops e batidas musicais, aplica punch zoom e flash branco de 0.18s nos momentos chave.

---

## 🎬 Catálogo Expandido de Transições Nativas

As seguintes novas transições foram integradas ao motor nativo e ao catálogo `blackcore-premium-lite`:
- `fadewhite` / `whiteflash`: Flash de luz branca entre cenas.
- `fadefast`: Corte rápido de 0.16s para reels de alta energia.
- `hblur`: Whip pan com desfoque horizontal de movimento.
- `pixelize`: Transição de pixels e dissolução digital retrô.
- `squeezeh`: Compressão horizontal dinâmica estilo smartphone.
- `circleclose`: Fechamento de íris circular veloz.
- `zoomout`: Recuo com dissolve de foco invertido.

---

## 📊 Preset de Recomendação `capcut-viral`

Ao executar `video_editor analyze`, o assistente agora sugere diretamente o preset:
- **`capcut-viral`**: Montagem dinâmica vertical (9:16 com blur background), sincronização rítmica de cortes, flash branco, cor teal-orange e legendas prontas para publicação viral.
