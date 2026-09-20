#!/usr/bin/env bash
set -euo pipefail
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$HERE/server"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required." >&2
  exit 1
fi
major="$(node -p 'process.versions.node.split(`.`)[0]')"
if [ "$major" -lt 20 ]; then
  echo "Node.js 20+ is required (found $(node -v))." >&2
  exit 1
fi
npm install
npm test
printf '\nBLACKCORE Plugin MCP dependencies installed.\n'
printf 'Local HTTP: %s\n' "cd '$HERE/server' && npm start"
printf 'Stdio:      %s\n' "cd '$HERE/server' && npm run stdio"
