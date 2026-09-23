# Black Core ↔ Black Numbers 1.0

O módulo roda localmente em `127.0.0.1:8117` e compartilha um único SQLite com CLI, daemon e UI.

## Endpoints

- `GET /health` / `GET /v1/status`
- `POST /v1/core/heartbeat`
- `POST /v1/task`
- `POST /v1/observe`
- `POST /v1/learn`
- `POST /v1/compile`
- `POST /v1/cycle`
- `GET /v1/knowledge`
- `GET /v1/tasks`
- `GET /v1/journal`
- `GET /v1/strategy`

## Python

```python
from modules.black_numbers.bridge.black_numbers_bridge import heartbeat, task, observe, compile_bn
heartbeat()
task("Crie uma animação relacional de pulso", priority=2)
observe("resultado de uma IA", resposta, source="gemini", confidence=.45)
compile_bn("node Core : diamond { x: 0.5; y: 0.5; r: 36 }\nscreen Main { root: Core }")
```

A observação externa entra como `observed`; não é promovida a verdade automaticamente.
