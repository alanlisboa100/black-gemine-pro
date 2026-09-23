#!/data/data/com.termux/files/usr/bin/bash
set -e
command -v bn >/dev/null 2>&1 || exit 0
bn start >/dev/null 2>&1 || true
python3 - <<'PY' >/dev/null 2>&1 || true
import json,urllib.request
req=urllib.request.Request('http://127.0.0.1:8117/v1/core/heartbeat',data=b'{}',headers={'Content-Type':'application/json'})
urllib.request.urlopen(req,timeout=2).read()
PY
