#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
roots=("$ROOT/src" "$ROOT/bin")
for optional in extensions test; do
  if [ -d "$ROOT/$optional" ]; then roots+=("$ROOT/$optional"); fi
done
for required in "${roots[@]}"; do
  [ -d "$required" ] || { echo "Missing source directory: $required" >&2; exit 1; }
done
count=0
while IFS= read -r -d '' f; do
  node --check "$f" >/dev/null
  count=$((count+1))
done < <(find "${roots[@]}" -type f -name '*.js' -print0)
echo "syntax OK: $count JavaScript files"
