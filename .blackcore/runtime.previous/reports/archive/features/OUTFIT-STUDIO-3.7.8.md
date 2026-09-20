# BLACKCORE Native 3.7.8 — Video Outfit Studio

O editor de figurino faz troca de roupa e virtual try-on em um vídeo já existente. Ele exige duas entradas reais: o vídeo da pessoa e uma imagem da nova peça. Não existe modo falso que apenas adiciona logo ou altera contraste.

## O que acontece no vídeo

1. O BLACKCORE preserva a linha do tempo original.
2. A peça é enviada com categoria, descrição e política `clothed-only`.
3. O backend produz máscara da roupa e consistência temporal entre quadros.
4. O BLACKCORE recoloca a música original sem cortes e sem acelerar o vídeo.
5. A saída é convertida para MP4 H.264/AAC, 720p por padrão e nunca acima de 2K.
6. Uma verificação de mudança visual rejeita cópias idênticas ou edições que só colocaram marca d'água.

## Por que o modelo não fica dentro do Termux

Modelos atuais de video virtual try-on usam diffusion/DiT e GPU. Colocar seus pesos no telefone deixaria o pacote enorme e o processo seria lento ou inviável. Por isso o BLACKCORE 3.7.8 fornece um cliente leve e um protocolo de backend GPU. Nenhum peso é baixado sem a decisão do usuário.

Arquitetura recomendada: [SwiftTry](https://github.com/VinAIResearch/SwiftTry), por fornecer uma base de video virtual try-on com licença BSD-3-Clause. O protocolo também aceita bridges independentes para CatV2TON ou outro backend compatível; nenhum código ou peso de terceiros é incorporado neste pacote.

## Configuração

Guarde o endereço e o token no arquivo de chaves já existente ou nas variáveis abaixo:

```bash
blackcore config set-secret BLACKCORE_OUTFIT_ENDPOINT 'https://seu-backend.example/'
blackcore config set-secret BLACKCORE_OUTFIT_TOKEN 'seu-token-opcional'
```

O envio a um servidor remoto só ocorre quando a chamada confirma `allowRemote=true`. Use `backend_status` para testar disponibilidade antes de enviar mídia. Consulte [o contrato completo](docs/OUTFIT-BACKEND-PROTOCOL.md).

## Segurança

O recurso troca uma roupa por outra e mantém a pessoa vestida. Pedidos de nudificação, retirada de roupa para revelar o corpo ou geração de nudez são recusados. A mídia original nunca é sobrescrita.
