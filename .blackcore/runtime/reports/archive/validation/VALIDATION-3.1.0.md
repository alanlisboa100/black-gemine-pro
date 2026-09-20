# BLACKCORE Native 3.1.0 validation

## Automated gates

- JavaScript syntax: **275 files clean**.
- Node test suite: **148 passed, 0 failed**.
- Built-in tool matrix: **50 passed, 0 failed**, including every new 3.1 capability family.
- Natural-language intent corpus: **38/38 passed**.
- MCP stdio handshake/tool call: passed on protocol `2026-07-28`.
- `git diff --check`: clean.
- Production npm dependency audit: **0 vulnerabilities**.

## Security assertions

- The selected provider/model remains sticky; routing and fallback are opt-in and live fallback still requires approval.
- Local game/site/animation requests do not expose remote deployment tools.
- Secret scanning returns locations but not secret values.
- PostgreSQL connection passwords remain in the child-process environment rather than model-visible commands.
- API response bodies, headers, SSE and WebSocket messages pass through credential redaction.
- Dependency installation, remote mutations, ADB input/install and container mutations remain confirmation-gated outside `yolo`.

## Installation profiles

`core` keeps the phone-friendly runtime. `web`, `creator`, `android` and `full` progressively add Chromium, media/OCR, Java/Gradle/ADB and the broader database/language/deploy toolchains. Optional Termux package failures do not invalidate the core runtime.
