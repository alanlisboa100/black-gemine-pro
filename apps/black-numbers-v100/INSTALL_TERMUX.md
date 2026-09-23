# Instalação no Termux — Black Numbers 1.0.0

Cole no Termux depois de baixar o ZIP:

```bash
termux-setup-storage
pkg update -y
pkg install unzip -y

cd ~
rm -rf ~/black-numbers-v100
mkdir -p ~/black-numbers-v100

ZIP="$(find /storage/emulated/0/Download ~/storage/downloads -maxdepth 1 -type f -iname 'black_numbers_v1.0.0_unified_termux*.zip' 2>/dev/null | head -n1)"
echo "$ZIP"

unzip -o "$ZIP" -d ~/black-numbers-v100
cd ~/black-numbers-v100/black-numbers-v1.0.0

chmod +x install_termux.sh
./install_termux.sh
```

Depois:

```bash
bn status
bn doctor
bn open
```

A interface abre em `http://127.0.0.1:8117`.
