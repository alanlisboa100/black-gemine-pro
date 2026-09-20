# BLACKCORE Native 2.5.1 — Slash command hotfix validation

## User-reported regression reproduced

`/models` on 2.5.0 crashed with:

`TypeError: Cannot read properties of undefined (reading 'write')`

Root cause: `handleCommand()` destructured `ui` from `app`, but the UI instance lives at `app.runtime.ui`. Commands that accessed `ui.write`, `ui.raw`, `ui.notify`, etc. could therefore crash.

## Fixes

- Command handler now resolves UI from `runtime.ui`.
- Interactive slash command dispatch now has an error boundary; one broken command reports `command /... failed` instead of terminating the BLACKCORE process.
- Added a permanent `/models` regression test.
- Added a smoke test across the non-interactive slash-command surface, including help, models, tools, settings, sessions, usage, context, skills, prompts, processes, MCP, packages, source, plan/act, undo/checkpoints, exports and safe error paths.

## QA after the fix

- Automated Node tests: **88/88 passed**.
- JavaScript syntax scan: **228 files passed**.
- Natural-language corpus: **36/36 passed**.
- Tool matrix: **34/34 passed**.
- Natural website + 3D cube E2E: **passed**.
- MCP stdio E2E: **passed**.
- Subagent / undo / new-session QA: **passed**.
- Real pseudo-terminal smoke at **54 columns**: `/models` → `/tools` → `/settings` → `/quit` completed with **exit code 0** and **no `BLACKCORE FATAL`**.
- Isolated clean install: **passed**; `blackcore version` returned **BLACKCORE Native 2.5.1** and the installed runtime contained **294 files**.

## Scope note

The previous 2.5.0 report did not include end-to-end coverage of `/models`; that omission allowed this bug through. 2.5.1 adds that missing regression gate and a command-dispatch safety boundary.

## Final ZIP revalidation

The final `BLACKCORE-NATIVE-2.5.1-SLASH-FIX.zip` was extracted into a fresh directory and re-tested. Results: **88/88 automated tests**, **228 JavaScript files syntax-clean**, **36/36 natural-language corpus**, **34/34 tool matrix**, website E2E (`SITE_CHECK_OK`), cube E2E (`CUBE_INTERACTION_OK`), MCP stdio, 54-column pseudo-terminal `/models`/`tools`/`settings`/`quit`, and isolated clean install all passed.
