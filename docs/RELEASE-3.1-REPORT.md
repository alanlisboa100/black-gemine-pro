# BLACKCORE Native 3.1 — capability report

BLACKCORE 3.1 contains 65 native schema-validated tools. The natural conversation contract is unchanged: the user describes the work normally, the selected model stays pinned, and remote deployment tools are withheld unless a deployment/publish request is explicit.

## New professional tool families

| Family | Native tool | Installed software used when available |
| --- | --- | --- |
| Code intelligence | `code_intel` | TypeScript, Python, Rust, Go, Gradle and language formatters |
| Existing documents/OCR | `document_reader` | Poppler, unzip, Tesseract, ImageMagick |
| Media | `media` | FFmpeg/ffprobe, ImageMagick |
| Security | `security_scan` | npm audit, pip-audit, cargo-audit, govulncheck |
| API testing | `api_lab` | Native Node HTTP/SSE/WebSocket runtime |
| Android device QA | `android_device` | ADB / Android platform tools |
| Databases | `postgres` | psql; SQLite remains available separately |
| Ecosystems | `ecosystem` | npm/pnpm/yarn/bun, Python, Cargo, Go, Flutter, Composer |
| Containers | `container` | Docker or Podman |
| Private retrieval | `knowledge_index` | Native local lexical index; no external service |

## Safety invariants

- Secret scans return only type, file and line; matched values are never returned.
- PostgreSQL passwords are converted to process environment variables and never placed in model-visible command arguments.
- API mutations, ADB input/install operations, container mutations and dependency installation request confirmation outside `yolo`.
- Renames are preview-first, checkpointed and followed by a diagnostics recommendation.
- Browser animation reports are measured from real frames in Chromium; BLACKCORE must not claim visual quality without browser evidence.
- Heavy Termux dependencies remain profile-scoped and optional, so one unavailable package does not break the core runtime.
