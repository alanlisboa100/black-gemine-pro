# BLACK NUMBERS 1.0.0 — Unified Termux Core

Versão consolidada do núcleo Python v0.2 e das melhores ideias do workspace web v0.3.

## O que mudou

- Uma única memória SQLite para CLI, daemon e interface web.
- Linguagem `.bn` compilada pelo núcleo Python.
- JavaScript legado bloqueado por padrão.
- Pipeline de conhecimento: `observed → hypothesis → compiled → tested → validated → consolidated`.
- Retry/backoff real para modelos offline; nenhuma tempestade de 8 mil eventos.
- Evolução de estratégia que realmente muda `retrieval_top_k`, limiar de promoção e foco do currículo.
- Ingestão resumível e deduplicada de `.md/.txt/.py/.js/.ts/.tsx/.json/.bn/.html/.css/.sh`.
- Scanner visual registra observações provisórias; nunca chama pixel scan de conhecimento verificado automaticamente.
- Interface mobile local em `127.0.0.1:8117` sem Node/Vite obrigatório.
- API e bridge para BLACKCORE.

## Instalar no Termux

```bash
termux-setup-storage
pkg update -y
pkg install unzip -y
cd ~
rm -rf ~/black-numbers-v100
mkdir -p ~/black-numbers-v100
unzip /storage/emulated/0/Download/black_numbers_v1.0.0_unified_termux.zip -d ~/black-numbers-v100
cd ~/black-numbers-v100/black-numbers-v1.0.0
chmod +x install_termux.sh
./install_termux.sh
```

Depois:

```bash
bn status
bn open
bn doctor
```
