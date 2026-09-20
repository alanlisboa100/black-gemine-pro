#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
count=0
while IFS= read -r -d '' f; do
  node --check "$f" >/dev/null
  count=$((count+1))
done < <(find "$ROOT/src" "$ROOT/bin" "$ROOT/extensions" "$ROOT/test" -type f -name '*.js' -print0)
echo "syntax OK: $count JavaScript files"
