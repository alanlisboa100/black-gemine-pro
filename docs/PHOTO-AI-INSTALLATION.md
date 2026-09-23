# Instalação opcional das IAs de seleção de foto

O editor completo funciona localmente com ImageMagick. Os componentes abaixo são opcionais e servem para criar máscaras automáticas.

## Pessoa e fundo no Termux: rembg

O instalador usa um Ubuntu 24.04 isolado pelo `proot-distro`, instala `rembg` com CPU em um ambiente Python privado e cria um comando `rembg` acessível ao BLACKCORE. Ele não escreve em `~/.blackcore/config/secrets.json`.

No diretório da versão:

```bash
bash scripts/install-photo-ai.sh --mode rembg
rembg --version
```

O BLACKCORE chama o modelo compacto `u2netp` por padrão e baixa seus pesos somente no primeiro uso. Para escolher outro modelo conscientemente, use `bash scripts/install-photo-ai.sh --mode rembg --model MODEL` — a escolha fica em `~/.blackcore/photo-ai/rembg-model` — ou defina `BLACKCORE_REMBG_MODEL`. A própria biblioteca `rembg` é MIT, mas os pesos têm licenças independentes; o modelo grande `bria-rmbg` não é selecionado automaticamente porque sua licença pode exigir acordo pago para uso comercial. Esse caminho seleciona assunto e fundo; ele não entende sozinho um pedido específico como “somente os olhos” ou “somente a camisa”.

Depois disso, o editor também aceita `remove_background` (PNG/WebP transparente) e `replace_background` (uma segunda foto fornecida em `backgroundInput`).

Para revisar os comandos sem instalar:

```bash
bash scripts/install-photo-ai.sh --mode rembg --dry-run
```

## Detalhes por texto: Grounded SAM 2 em computador NVIDIA

Grounded SAM 2 combina detecção por texto com SAM 2, mas depende de PyTorch, pesos grandes e uma GPU CUDA. Por isso o instalador recusa esse modo dentro do Termux. Execute em um computador Linux NVIDIA:

```bash
bash scripts/install-photo-ai.sh --mode grounded-sam2
```

Esse comando instala o projeto e os checkpoints num ambiente privado. Ele não cria um serviço automaticamente: ainda é necessário disponibilizar um adaptador HTTP compatível com [o protocolo de segmentação do BLACKCORE](PHOTO-SEGMENTATION-PROTOCOL.md) e configurar:

```text
BLACKCORE_PHOTO_SEGMENT_ENDPOINT=http://IP-DO-COMPUTADOR:9000/
BLACKCORE_PHOTO_SEGMENT_TOKEN=seu-token-opcional
```

Ao usar outro aparelho, a foto sai do telefone. Use `allowRemote=true` somente depois de escolher e confiar no servidor.

## Contorno leve por ponto/caixa: MobileSAM

O MobileSAM oficial é Apache-2.0, menor que o SAM original e aceita prompts por ponto ou caixa. Ele é útil para refinar o contorno de uma região já localizada; sozinho, não transforma a palavra “janela” em coordenadas. Para esse aterramento por texto ainda é necessário um detector compatível, como o caminho Grounded SAM 2.

O instalador prepara o pacote oficial em um host Python separado:

```bash
bash scripts/install-photo-ai.sh --mode mobile-sam
```

O modo é recusado dentro do Termux porque a distribuição oficial ainda depende de PyTorch/TorchVision. No telefone, use caixas/polígonos/máscaras manuais ou `rembg`; conecte MobileSAM/ONNX por `BLACKCORE_PHOTO_SEGMENT_ENDPOINT` quando houver um host compatível.

## Remoção e isolamento

- O runtime principal e as chaves do BLACKCORE ficam separados dos componentes de foto.
- No Termux, o ambiente do `rembg` se chama `blackcore-photo-ai`.
- No Linux, os ambientes opcionais ficam em `~/.blackcore/photo-ai`.
- Nenhum peso pesado é baixado silenciosamente pela edição comum.
