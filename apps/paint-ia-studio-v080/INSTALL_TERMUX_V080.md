# Instalação — BLACK PAINT STUDIO v0.8.0 no Termux

```bash
termux-setup-storage
pkg update -y
pkg install unzip -y

cd ~
rm -rf ~/black-paint-v080
mkdir -p ~/black-paint-v080

unzip /storage/emulated/0/Download/paint_ia_studio_v080_scene_execution_core.zip -d ~/black-paint-v080
cd ~/black-paint-v080/paint-ia-studio-v080

chmod +x setup_termux.sh
./setup_termux.sh
node server.js
```

Abra no navegador:

```text
http://127.0.0.1:3333
```

## Verificação

Em outro terminal:

```bash
cd ~/black-paint-v080/paint-ia-studio-v080
npm run check
npm run test:all
```

## Observação

O motor principal é local e não exige API. O pacote não instala nem chama o workspace xAI/Grok da revisão externa.
