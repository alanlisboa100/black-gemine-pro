# BLACKCORE Supremo Photo Studio v4.0.0

Este documento descreve **apenas o que existe e foi verificado** no runtime local
(`ImageMagick 7.1.2-25 Q16-HDRI aarch64` + Node), sem prometer o que não roda no telefone.

Código: `src/tools/media/photo-supreme.js` (motor de pixels), `src/tools/media/photo-effects.js`
(catálogo de presets), `src/tools/media/photo-editor.js` (ação `supreme_edit` e integração),
`src/tools/media/photo-advisor.js` (menu de escolha), `src/tools/media/regional-intent.js`
(alvo regional `skin`).

## Por que um motor de pixels em Node

Nesta build de `ImageMagick` do Termux, operadores que resolveriam o problema foram testados
e **recusados pelo binário**: `-duotone` (`unrecognized option`), `-curve` (`unrecognized
option`), `-modulus` (`unrecognized option`) e `-function Polynomial` com ordem de coeficientes
não confiável. A saída real foi um motor próprio em Node sobre RGB puro:

```
magick input.jpg -auto-orient -alpha off -depth 8 rgb:frame.raw
→ applySupremePipeline()
→ magick -size WxH -depth 8 rgb:out.raw output.jpg
```

Medição real no telefone (1086×1448, 1.572.528 pixels): decodificação 1,84 s, um passe de LUT
em JS 108 ms, render completo do pipeline em ~5–7 s. Teto deliberado de 16.000.000 pixels
(`MAX_ENGINE_PIXELS`); acima disso o motor recusa em vez de estourar a memória do aparelho.

## Parâmetros que existem (26 em SUPREME_KEYS)

`toneCurve`, `toneCurvePoints`, `toneCurveStrength`, `exposure`, `shadows`, `highlights`,
`whites`, `blacks`, `clarity`, `vibrance`, `hsl`, `skinToneProtection`, `duotone`, `vignette`,
`vignetteMidpoint`, `filmGrain`, `grainSize`, `studioRelight`, `lightLeak`, `neonGlow`,
`glitch`, `portraitBlur`, `whiteBalance`, `whiteBalanceStrength`, `autoWhiteBalance`, `seed`.

Extras de seleção e moldura: `frame`, `frameWidth`, `maskFeather`, `maskExpand`,
`skinBandTight`, `baseGrade`.

### Curvas de tom (`toneCurve`)

Oito curvas nomeadas: `s-curve`, `cinematic`, `matte`, `punchy`, `elevated`, `crushed`,
`reverse-s`, `filmic`. São LUTs de 256 entradas geradas por interpolação monotônica,
**sempre não decrescentes** (não invertam ordem tonal), com `toneCurveStrength: 0`
idêntico à função identidade. `toneCurvePoints` aceita de 2 a 12 pontos normalizados 0–1.

### Zonas tonais

`shadows` / `highlights` / `whites` / `blacks` operam por peso suave de luminância, então
levantar sombra não queima realce. `clarity` é realce de contraste local via luminância
reduzida, com proteção contra halo.

### HSL por banda (`hsl`) — o nome real é `hsl`, não `hslAdjustments`

`hue`, `saturation` e `lightness` por banda, cada uma de −100 a 100, sobre as seis bandas
`red`, `yellow`, `green`, `cyan`, `blue`, `magenta` (`HSL_BANDS`), com `mix` para dose global.
O peso de cada banda é senoidal em torno do centro do matiz: o pico vale 1 e a banda oposta
vale ~0, sem saltos duros entre faixas.

### Proteção de tom de pele (`skinToneProtection`)

Importante: **não é detecção de rosto**. É uma faixa medida de croma `Cb/Cr`
(`SKIN_BAND`: Cb 0,335–0,515, Cr 0,545–0,735, L 0,10–0,94). A máscara pondera quanto de cada
banda HSL pertence ao croma de pele e reduz a alteração de saturação proporcionalmente nesse
ponto. `skinBandTight: true` estreita a faixa (Cb 0,36–0,50, Cr 0,56–0,71).

`editScope: "skin"` e o alvo regional `skin` (termos `pele`, `skin`, `tons de pele`,
`skin tone`, `tom de pele`, `complexão`) reusam essa mesma medição. A cobertura é medida
**antes** de qualquer render: fora de 0,08%–60% a operação é **recusada com o motivo real**,
em vez de virar filtro global escondido. Foto quase monocromática (ilustração, P&B, desenho)
é recusada honestamente — na `Misuki031.jpg` a recusa reporta `0.2%`.

### Grão de filme (`filmGrain`)

Ruído determinístico por `seed` (mesmo arquivo, mesma saída), com `grainSize` de `fine`,
`medium` ou `coarse`. O grão entra por luminância e não descolore a imagem.

### Luz de estúdio (`studioRelight`)

Máscara radial (`buildRadialFocusMask`) centrada na região de foco medida pela análise,
funcionando como *softbox*: levanta a região principal e deixa o fundo respirar.
`neonGlow` faz bloom de realces; `lightLeak` soma um vazamento direcional com cor própria;
`glitch` faz deslocamento RGB em fatias determinísticas; `portraitBlur` desfoca fora do foco.

### Duotone

`duotone: { shadow, highlight, mix }` monta um *gradient map* por LUT e mistura com a base,
sem depender do operador `-duotone`, que não existe neste binário.

## Moldura (`frame`)

Bordas keystone/polaroid (`white`, `black`, `off-white`, `cream`, `film`, `polaroid` ou cor
hex) com largura relativa ao lado menor da foto; `polaroid` usa base inferior mais funda
(fundo ≈ 3,6× o topo). A moldura roda **depois** do motor e altera as dimensões finais, que
são reportadas em `frame` no JSON.

## Presets

Polish: `polish-vibrant`, `polish-teal-orange`, `polish-cyberpunk`, `polish-vintage-film`,
`polish-warm-aesthetic`, `polish-glow`.

Supremo: `supremo-studio`, `supremo-noir`, `supremo-portrait`, `supremo-neon`, `supremo-film`.

Não existem os presets `35mm-classic`, `120mm-medium` nem `tone-curves` — essa versão anterior
do documento os citava sem estarem implementados em lugar nenhum. O equivalente real é
`supremo-film` (grão grosso, curva fosca) e o parâmetro `toneCurve`.

O enum `photoPreset` do `photo_editor` é derivado de `photoEffectPresetTokens()`, então o
catálogo e o schema não podem mais divergir.

## Portas de verificação

- Mudança visível: RMSE normalizado contra a origem, gate > 0,01 em render do mesmo tamanho.
  Render com moldura é validado sem moldura primeiro, porque a moldura muda as dimensões e
  invalidaria a comparação pixel a pixel.
- Escopo regional: mudança média dentro da máscara tem que superar o mínimo do nível e o
  vazamento fora da máscara fica limitado a `max(0,004; inside×0,08)`; vazar recusa o render.
- Fonte quase monocromática: achado `low-chroma-source` no advisor (saturação média < 0,12).
- Original nunca é sobrescrito: o caminho de saída é explícito e o `writable()` exige
  confirmação quando é sobreposto um arquivo existente.

## Prova medida em `Misuki031.jpg` (1086×1448)

| Render | RMSE normalizado | Saturação | Detalhe |
|---|---|---|---|
| original | — | 0,0881 | 12,688 |
| `supremo-portrait` | 0,1124 | 0,2353 | 14,824 |
| passe manual completo | 0,1362 | 0,3484 | 16,940 |
| `auto_edit` + `supremo-studio` | 0,0885 | 0,2636 | 13,655 |
| duotone + glitch + polaroid | canvas 1194×1696 | 0,4475 | 8,429 |

A referência de comparação: o passe antigo de `warm-vintage` marcava RMSE 0,0986 com
saturação final 0,1911. Os renders Supremo chegam a 0,3484 de saturação.

## Suíte

`node --import ./test/setup.js --test --test-concurrency=1 test/*.test.js` → **50 testes, 50
passes, 0 falhas** no telefone, incluindo render real de `supreme_edit`, `auto_edit`, flash,
shake, `rgb_split`, `blur_in`, `speed_curve` e `freeze_frame`.

`test/photo-supreme.test.js` cobre: monotonicidade/limitação/distinção das oito curvas,
seleção de pele por croma (pele quente alta, azul e cinza rejeitados, preto excluído),
passagem por zonas que um passe de contraste comum não alcança, determinismo do grão por
`seed`, schema expondo o motor e todos os tokens do catálogo, resolução de presets por id e
alias, advisor entregando as opções sem tocar em pixel, render real no telefone com gate de
delta visível (sem moldura, para o RMSE ser comparável) e a rota `skin` nos dois sentidos
(recusa medida em foto sem croma + máscara que edita dentro e preserva fora).

Dois defeitos encontrados e corrigidos durante a validação no telefone:

- `buildSkinSelection` empurrava o caminho de saída dentro de `args` e o `renderPhoto()`
  acrescentava de novo; o ImageMagick tentava abrir `skin-selection.png` antes de existir e a
  recusa saía como quebra de pipeline. Agora a recusa chega com o número medido.
- `clamp(value,min,max)` em `photo-editor.js` não tem defaults e era chamado com um único
  argumento na medição de cobertura (`clamp(Number(probe.stdout)||built.coverage)`), o que
  produzia `Math.min(undefined, …)` = `NaN`. A mensagem dizia `covers NaN%`. Corrigido para o
  clamp explícito 0–1; hoje reporta `0.2%` na `Misuki031.jpg`.

Comparação lado a lado gerada: `/storage/emulated/0/Pictures/Misuki031_Supremo_BeforeAfter.jpg`
(1116×584, três painéis de 360×480 com etiquetas). Saturação média medida pelo mesmo método em
cada painel: **0,116 → 0,227 → 0,327**.

Sobre o pedido original de "corrigir o tom de pele": na `Misuki031.jpg` isso **não é
atendível regionalmente**, porque a foto é quase monocromática (Cb 126–131, Cr 127–130;
cobertura de croma de pele medida em 0,13% antes do gate de máscara). A rota regional recusa o
pedido em vez de aplicar filtro global escondido. O caminho que funciona nela é o passe global
do motor (`supremo-portrait` / `supremo-studio`) ou uma máscara manual fornecida via `mask=` /
`regionBoxes`.

## O que NÃO existe aqui (para não vender fantasma)

Camadas e máscaras vetoriais interativas, histórico/undo tipo Photoshop, aceleração por GPU
(CUDA/OpenCL/Vulkan/Metal), sistema de plugins, edição de PSD com camadas, IA de preenchimento
generativo (*inpainting*), *relighting* por IA, detecção de rosto/olho por IA, OCR,
processamento em lote do tipo “exportar 50 posts”, remoção de objeto generativa.

Seleção de detalhe por nome, remoção e substituição de fundo dependem de
`BLACKCORE_PHOTO_SEGMENT_ENDPOINT`/`rembg`, que **não estão instalados nem configurados neste
telefone**; sem backend, essas rotas recusam em vez de fingir.
