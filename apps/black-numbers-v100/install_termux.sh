#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
APP_DIR="$HOME/.blackcore/modules/black_numbers"
BIN_DIR="$PREFIX/bin"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP="$HOME/.blackcore/backups/black_numbers_$(date +%Y%m%d_%H%M%S)"

echo "◆ BLACK NUMBERS 1.0.0 // TERMUX INSTALLER"
command -v pkg >/dev/null 2>&1 || { echo "Este instalador é para Termux."; exit 1; }

echo "[0/7] Dependências..."
pkg update -y
pkg install -y python python-pillow curl

mkdir -p "$(dirname "$APP_DIR")" "$BACKUP"

echo "[1/7] Parando versão anterior com segurança..."
if command -v bn >/dev/null 2>&1; then bn stop >/dev/null 2>&1 || true; fi
if [ -f "$APP_DIR/data/daemon.pid" ]; then kill "$(cat "$APP_DIR/data/daemon.pid")" >/dev/null 2>&1 || true; sleep 1; fi

echo "[2/7] Backup da memória/configuração anterior..."
if [ -d "$APP_DIR" ]; then
  [ -f "$APP_DIR/data/black_numbers.db" ] && cp -f "$APP_DIR/data/black_numbers.db" "$BACKUP/black_numbers.db" || true
  [ -f "$APP_DIR/config.json" ] && cp -f "$APP_DIR/config.json" "$BACKUP/config.json" || true
  [ -d "$APP_DIR/knowledge_repo" ] && cp -a "$APP_DIR/knowledge_repo" "$BACKUP/knowledge_repo" || true
  mv "$APP_DIR" "$BACKUP/previous_tree"
else
  echo "  instalação nova"
fi

echo "[3/7] Instalando núcleo unificado..."
mkdir -p "$APP_DIR"
cp -a "$SRC_DIR/." "$APP_DIR/"
if [ -f "$BACKUP/black_numbers.db" ]; then cp -f "$BACKUP/black_numbers.db" "$APP_DIR/data/black_numbers.db"; fi
if [ -d "$BACKUP/knowledge_repo" ]; then rm -rf "$APP_DIR/knowledge_repo"; cp -a "$BACKUP/knowledge_repo" "$APP_DIR/knowledge_repo"; fi

# Preserve only user-specific model/mentor settings. Keep v1 safety/timeouts/backoff.
if [ -f "$BACKUP/config.json" ]; then
python3 - "$BACKUP/config.json" "$APP_DIR/config.json" <<'PY'
import json,sys
old=json.load(open(sys.argv[1])); new=json.load(open(sys.argv[2]))
om=old.get('model',{}) if isinstance(old.get('model'),dict) else {}
for k in ('primary_base_url','name','temperature','max_tokens'):
    if k in om: new['model'][k]=om[k]
if isinstance(old.get('mentors'),list): new['mentors']=old['mentors']
ob=old.get('black_core',{}) if isinstance(old.get('black_core'),dict) else {}
for k in ('process_markers','discovery_ports'):
    if k in ob: new['black_core'][k]=ob[k]
json.dump(new,open(sys.argv[2],'w'),indent=2,ensure_ascii=False)
PY
fi

echo "[4/7] Criando comandos bn / blacknumbers..."
cat > "$BIN_DIR/bn" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec python3 "$HOME/.blackcore/modules/black_numbers/bnctl.py" "$@"
EOF
chmod +x "$BIN_DIR/bn"
ln -sf "$BIN_DIR/bn" "$BIN_DIR/blacknumbers"
hash -r

echo "[5/7] Migrando banco e testando..."
cd "$APP_DIR"
python3 -c 'from bnlib import db; c=db(); c.close(); print("DB/migração OK")'
python3 -m unittest discover -s tests -v

echo "[6/7] Iniciando serviço local..."
bn start

echo "[7/7] Doctor..."
bn doctor

echo
echo "✓ BLACK NUMBERS 1.0.0 instalado."
echo "  Interface: http://127.0.0.1:8117"
echo "  Abrir: bn open"
echo "  Status: bn status"
echo "  Testar: bn doctor"
echo "  Backup anterior: $BACKUP"
