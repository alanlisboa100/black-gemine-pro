#!/usr/bin/env bash
# BLACKCORE v3.8.0 - Instalador Autônomo para Termux e Linux
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Iniciando instalador do BLACKCORE v3.8.0..."
bash "$DIR/INSTALAR-BLACKCORE.sh" "$@"
