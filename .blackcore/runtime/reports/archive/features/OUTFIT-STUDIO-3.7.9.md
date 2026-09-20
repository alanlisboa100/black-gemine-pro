# BLACKCORE Native 3.7.9 — figurino profissional em foto e vídeo

O estúdio de figurino executa troca de roupa e virtual try-on reais. Ele recebe a mídia da pessoa e uma foto da nova peça; nunca apresenta contraste, marca d'água ou recompressão como se fossem uma troca de roupa.

## Foto

O pedido natural “troca a roupa nessa foto” é roteado pelo `photo_editor` para o passe generativo `change_outfit_photo`. O backend recebe a pessoa, a peça e uma máscara opcional. A solicitação trava identidade, pose, proporções do corpo, cenário e composição. O BLACKCORE restaura as dimensões originais, exporta uma nova imagem JPG, PNG ou WebP e compara pixels normalizados. Resultado idêntico ou apenas recomprimido é rejeitado.

O HUD mostra dez etapas reais: segurança, fonte, referência da roupa, composição, máscara, envio, AI try-on, identidade, exportação e qualidade.

## Vídeo

O vídeo usa máscara e consistência temporal, mantém ordem, velocidade e duração, recoloca a trilha original sem cortes por padrão e entrega MP4 H.264/AAC. A resolução padrão é 720p e o teto é 2K. SSIM rejeita resultado visualmente igual.

## Backend opcional

Modelos generativos atuais precisam de GPU; pesos pesados não são baixados escondido no telefone. Configure um bridge compatível:

```bash
blackcore config set-secret BLACKCORE_OUTFIT_ENDPOINT 'https://seu-backend.example/'
blackcore config set-secret BLACKCORE_OUTFIT_TOKEN 'seu-token-opcional'
```

O servidor deve implementar `POST /v1/outfit/image` e/ou `POST /v1/outfit/video`, conforme [o protocolo completo](docs/OUTFIT-BACKEND-PROTOCOL.md). Upload remoto só acontece com autorização explícita. SwiftTry é uma referência permissiva para vídeo; adapters de CatV2TON/CatVTON exigem conferência dos termos atuais antes de redistribuição.

## Segurança e arquivos

O recurso substitui roupas mantendo a pessoa vestida. Pedidos para despir, revelar o corpo sob a roupa, gerar nudez ou sexualizar uma pessoa são recusados. A foto e o vídeo originais nunca são sobrescritos. Chaves ficam no armazenamento de configuração já existente e não entram no pacote de runtime.
