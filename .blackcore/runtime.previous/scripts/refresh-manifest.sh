#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

find . -type f \
  -not -path './.git/*' \
  -not -path './.blackcore/*' \
  -not -path './node_modules/*' \
  -not -path './dist/*' \
  -not -name 'MANIFEST.txt' \
  -printf '%P\n' | LC_ALL=C sort > MANIFEST.txt

echo "manifest refreshed: $(wc -l < MANIFEST.txt) files"
