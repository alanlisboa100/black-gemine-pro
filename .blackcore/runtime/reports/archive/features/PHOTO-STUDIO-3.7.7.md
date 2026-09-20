# BLACKCORE Native 3.7.7 — Professional Photo Studio

O `photo_editor` transforma pedidos naturais em alterações reais de imagem no Termux. O modelo com visão pode interpretar a foto e o pedido; o processamento de pixels é local e reproduzível com ImageMagick.

## Fluxo automático

`auto_edit` abre a foto, corrige a orientação EXIF, cria uma amostra pequena e mede luz, alcance tonal, contraste, saturação, dominante RGB, ruído cromático, detalhe, ambiente e região focal. O plano aplica somente correções limitadas e informa cada uma no resultado.

O editor reconhece sinais de água, céu, grama/vegetação, morro/montanha, pouca luz e realces fortes. Esses rótulos não fingem reconhecimento semântico completo: são medições locais de luminância, posição de cor, saturação e textura usadas para escolher ajustes suaves.

## Ferramentas

| Pedido | Ação real |
|---|---|
| “melhora essa foto” | `auto_edit` |
| “melhora os detalhes” | `enhance_details` |
| “corrige a luz/exposição” | `adjust_light` |
| “corrige as cores/temperatura” | `adjust_color` |
| “tira o ruído” | `denoise` |
| “recorta para Instagram 4:5” | `crop` + `aspectRatio=portrait` |
| “deixa 1080 por 1350” | `resize` |
| “gira/espelha” | `rotate` / `flip` |
| “coloca texto ou logo” | `overlay_text` / `watermark` |
| “converte/comprime” | `convert` / `compress` |

Aspectos disponíveis: `square` (1:1), `portrait` (4:5), `story` (9:16), `landscape` (16:9), `classic-landscape` (4:3) e coordenadas exatas. O recorte automático acompanha o bloco de maior detalhe/saturação com leve preferência central, mas só é executado quando solicitado.

## Formatos e segurança

Entradas: JPG/JPEG, PNG, WebP, AVIF, HEIC/HEIF, TIFF, BMP e primeiro quadro de GIF. A disponibilidade de AVIF/HEIC depende dos codecs do ImageMagick do Termux. Saídas: JPG, PNG, WebP, AVIF, HEIC, TIFF e BMP.

O original nunca é sobrescrito. A saída passa pela política de workspace, captura de checkpoint, cancelamento do processo e limites de thread/memória. `QUALITY CHECK` reabre o arquivo e compara dimensões/pixels; um `auto_edit` sem mudança mensurável é removido e rejeitado.

## Instalação

Use o perfil `creator`, que instala ImageMagick e FFmpeg sem tornar essas ferramentas dependências npm obrigatórias:

```bash
bash INSTALAR-BLACKCORE.sh --profile creator --setup-storage
```

Configurações e chaves continuam fora do runtime substituído em `~/.blackcore/config/`.
