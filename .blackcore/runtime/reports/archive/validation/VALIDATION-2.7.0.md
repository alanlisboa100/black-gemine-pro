# BLACKCORE Native 2.7.0 — Live Workspace QA

Validated from the 2.7.0 source tree after the 2.6 UI report.

## Automated results
- Node test suite: 104/104 passing.
- Natural-language control corpus: 36/36 passing.
- Tool QA matrix: 34/34 scenarios passing.
- JavaScript syntax: all src/test JS files pass `node --check`.
- Narrow TUI: composer, live composer, model picker, thinking/tools animations fit 54 columns.

## Tool performance audit
The local QA matrix showed filesystem/search/git operations in the low-millisecond range. The expected heavier operations are package/build/verify actions because they execute external build tools. `system_info` now probes tool versions in parallel. `command -v` discovery is cached. GitHub auth status uses a 15s hard ceiling and a 20s success cache; repeated successful checks are returned immediately.

## GitHub reliability
- Dedicated `github` tool supports auth status/login/logout, repositories, issues, PRs and Actions.
- `git auth_status` and `git auth_login_web` are compatibility aliases to recover from a model choosing the wrong tool name.
- GitHub CLI runs with pager, update notifier and interactive prompt disabled during structured checks.
- Missing optional CLI calls are negative-cached per turn, so the model cannot repeatedly execute the same unavailable tool.

## Model/key safety
- `modelLock=true` by default.
- `autoRoute=false` by default.
- `autoFallback=false` by default.
- Cross-provider fallback is disabled by default even if fallback is explicitly enabled.
- Existing 2.6-era configs without the new selection-policy marker are migrated in memory to sticky behavior immediately.
- Provider authentication maps DeepSeek only to `DEEPSEEK_API_KEY`, Cerebras only to `CEREBRAS_API_KEY`, and WaveSpeed only to `WAVESPEED_API_KEY`.
- Doctor reports key source (`environment` vs `BLACKCORE secrets`) without printing credentials.

## Live composer
During a model or tool turn the bottom `MESSAGE · LIVE` composer remains available. Enter queues a message; Ctrl+C cancels the current work. Confirmation prompts temporarily suspend the live composer and resume it afterward.

## Native tool audit
49 built-in definitions are present. On a machine without Ollama, the Ollama tool is intentionally removed from the exposed model tool list. New in this line: browser DOM/screenshot verification, SQLite and public web search.

Advanced capabilities not yet implemented as first-class native tools: full LSP/AST refactoring, Playwright-style click/type browser automation, Docker/container sandbox orchestration, and direct multimodal image attachment into every provider. Existing shell/extensions/MCP can cover some of these when available, but they are not claimed as native 2.7 features.
