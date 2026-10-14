# BLACKCORE Native 3.8.3 — Polish Studio Professional Editing

O editor de fotos ganhou o pacote **Polish Studio**, trazendo ferramentas de edição profissional de alto nível, presets exclusivos e fluxo de trabalho inspirado no que há de mais moderno em edição mobile.

## 🎨 Novos Presets Polish
Consulte o catálogo via `photo_editor action=list_effects`. Os novos presets aplicam curvas, cor, ruído e detalhe de forma reproduzível:

| Preset | Descrição |
|---|---|
| `polish-vibrant` | Cores vivas e nitidez cristalina no estilo Polish Pro. |
| `polish-teal-orange` | Sombras azul-turquesa e realces dourados quentes. |
| `polish-cyberpunk` | Luzes frias azuladas com realces magenta e tons neon. |
| `polish-vintage-film` | Estética analógica 35mm com calor nostálgico e pretos suaves. |
| `polish-warm-aesthetic` | Tons quentes aveludados e iluminação aconchegante para retratos. |
| `polish-glow` | Iluminação difusa suave e brilho etéreo. |

## 🛠️ Novas Ações do Editor
O `photo_editor` agora suporta operações avançadas de edição, todas utilizáveis com `editScope` para aplicação localizada:

- **Ajustes de Efeito**: `vignette`, `film_grain`, `light_leak`, `neon_glow`, `glitch` (aberração cromática), `duotone`.
- **Inteligência Visual**: `portrait_blur` (desfoque de profundidade/bokeh), `clarity` (microcontraste local), `shadows_highlights` (recuperação tonal pro).
- **Enquadramento Social**: `add_border` (molduras minimalistas), `insta_fit` (enquadramento 1:1, 4:5 ou 9:16 com fundo desfocado).

## Exemplo de uso pro
```json
{
  "action": "auto_edit",
  "input": "retrato.jpg",
  "output": "retrato-polish.jpg",
  "photoPreset": "polish-vibrant",
  "editScope": "full",
  "enhanceDetails": true
}
```

## Garantias e Qualidade
- O motor utiliza `ImageMagick` local para renderização reproduzível.
- O gate de qualidade verifica mudanças estruturais nos pixels para evitar falsos edits.
- O escopo de edição (`editScope`) garante que efeitos pro não vazem para áreas preservadas da foto.
