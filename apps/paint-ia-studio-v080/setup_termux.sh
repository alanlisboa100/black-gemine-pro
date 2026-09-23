#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🖤 BLACK PAINT STUDIO v0.8.0 — setup Termux"

if ! command -v pkg >/dev/null 2>&1; then
  echo "ERRO: este instalador foi feito para Termux (comando pkg ausente)." >&2
  exit 1
fi

pkg update -y
pkg install -y python nodejs

# Do NOT upgrade pip itself on Termux: the packaged pip is managed by pkg and
# forcing an upgrade can break the Python package. Prefer the native Pillow pkg.
if ! python3 - <<'PY' >/dev/null 2>&1
from PIL import Image
print(Image.__version__)
PY
then
  echo "[deps] Pillow não encontrado; tentando pacote nativo do Termux..."
  if ! pkg install -y python-pillow; then
    echo "[deps] python-pillow indisponível; instalando libs e usando pip como fallback..."
    pkg install -y clang make libjpeg-turbo libpng freetype
    python3 -m pip install --no-cache-dir -r requirements.txt
  fi
fi

mkdir -p gallery runtime blackcore_visual/memory
chmod +x engine_cli.py paint_cli.py photo_cli.py paint_studio_pro.py paint_studio_v06_pro.py 2>/dev/null || true

python3 - <<'PY'
from PIL import Image
from blackcore_visual import VisualEngine
engine = VisualEngine()
status = engine.memory_status()
print("✅ Python/Pillow OK")
print("✅ Misuki spec:", "carregada" if status.get("misuki_spec_loaded") else "não carregada")
print("✅ Cenários:", len(status.get("scenario_profiles") or []))
PY

node --check server.js

echo "✅ Instalação verificada."
echo "▶ Rode: node server.js"
echo "🌐 Abra: http://127.0.0.1:3333"
