#!/usr/bin/env bash
set -euo pipefail
BC_HOME="${BLACKCORE_HOME:-$HOME/.blackcore}"
BIN_DIR="${PREFIX:-$HOME/.local}/bin"
for name in blackcore blackcore-config blackcore-doctor blackcore-source blackcore-uninstall blackcore-local-ai; do
  rm -f "$BIN_DIR/$name"
done
for d in "${PREFIX:-}/share/bash-completion/completions" "$HOME/.local/share/bash-completion/completions"; do
  [ -n "$d" ] || continue
  rm -f "$d/blackcore" 2>/dev/null || true
done
if [ "${1:-}" = "--purge" ]; then
  rm -rf "$BC_HOME"
  echo "BLACKCORE removido por completo: $BC_HOME"
else
  rm -rf "$BC_HOME/runtime"
  echo "Runtime BLACKCORE removido; configurações/sessões preservadas em $BC_HOME"
fi
