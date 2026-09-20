# BLACKCORE Native 3.7.10 — tratamento visual dark profissional

O modo automático agora foi desenhado para produzir uma edição perceptível, não apenas uma correção técnica. O enquadramento e as dimensões continuam preservados até que o usuário peça recorte ou redimensionamento.

## Visual BLACKCORE

`visualStyle=blackcore-dark` combina quatro controles reais:

1. ponto de preto adaptativo para aprofundar sombras sem destruir áreas que já estão próximas do preto;
2. ponto de branco protegido para separar luzes sem estourar uma imagem que já possui realces críticos;
3. curva sigmoidal para aumentar contraste e profundidade sem simplesmente escurecer tudo;
4. cor cinematográfica mais intensa, com separação fria discreta e tratamento contextual de água, céu, vegetação e montanhas.

Os estilos `natural` e `cinematic` continuam disponíveis. Pedidos com “dark”, “BLACKCORE”, “forte”, “marcante” ou “pretos profundos” usam `editLevel=high` e `visualStyle=blackcore-dark`.

## Proteção de detalhe

O editor mede textura antes e depois do render. Nitidez controlada protege detalhe fino visível em rosto, cabelo e roupa. Se o resultado perder textura demais, o arquivo é rejeitado. A verificação de diferença também depende do nível: alto exige alteração maior que médio, e médio exige mais que básico.

## Etapas no Termux

O HUD mostra `SOURCE`, `PHOTO IQ`, `FRAME LOCK`, `BLACK LEVEL`, `CINEMA COLOR`, `DENOISE`, `DETAIL LOCK`, `SMART CROP`, `TEXT`, `WATERMARK`, `EXPORT` e `QUALITY CHECK`. Durante luz e cor, a tela informa ponto de preto, ponto de branco, força da curva, estilo e saturação planejada.

## Arquivos

O original nunca é sobrescrito. JPG/JPEG, PNG, WebP, AVIF, HEIC/HEIF, TIFF, BMP e primeiro quadro de GIF continuam aceitos conforme os codecs disponíveis no ImageMagick. A saída permanece em outro arquivo e não ganha marca d'água, recorte ou remoção de metadados sem pedido explícito.
