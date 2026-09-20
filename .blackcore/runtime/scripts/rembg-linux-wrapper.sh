#!/usr/bin/env bash
set -euo pipefail
BC_HOME="${BLACKCORE_HOME:-$HOME/.blackcore}"
exec "$BC_HOME/photo-ai/rembg-venv/bin/rembg" "$@"
