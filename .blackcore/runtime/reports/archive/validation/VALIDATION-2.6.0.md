# BLACKCORE Native 2.7.0 — Provider Deck + Composer QA

## What changed

- Dedicated composer TUI replaces the plain readline `you ›` input path.
- `/models` and `/model` now use Provider → Model → Reasoning navigation.
- Providers are grouped visually: DeepSeek, Cerebras, WaveSpeed (and Local/Ollama only when configured with models).
- Provider-specific model screens show current model, context, pricing metadata where configured and short descriptions.
- Model menus use the terminal alternate screen and return to the conversation after selection/cancel.
- Boot/progress, thinking and tool animations were visually refreshed.
- The 2.5.1 slash-command crash fix and 2.4.1 hidden tool-confirmation fix remain present.

## Automated verification

- `npm run verify`: **PASS**
- Node test suite: **92/92 PASS**
- JavaScript syntax check: **230 files PASS**
- Natural-language corpus: **36/36 PASS**
- Tool matrix: **34/34 PASS**
- Natural website E2E: **PASS** (`SITE_CHECK_OK` after a deliberately broken build was corrected by the agent loop)
- 3D cube E2E: **PASS** (`CUBE_INTERACTION_OK`, drag rotation/reset validated)
- Subagent + undo + new-session QA: **PASS**
- MCP stdio 2026 protocol QA: **PASS**
- Isolated clean install: **PASS**, `BLACKCORE Native 2.7.0`, **297 runtime files**

## Real pseudo-terminal UI test

A 54-column pseudo-Termux terminal was used to run the interactive binary, not just helper functions.

Flow tested:

1. Launch BLACKCORE.
2. Composer renders with the real production placeholder.
3. Type `/models`.
4. Provider deck displays DeepSeek, Cerebras and WaveSpeed.
5. Navigate with arrow keys to Cerebras and open it.
6. Select GPT OSS 120B.
7. Select High reasoning.
8. Return to the conversation composer.
9. Exit with `/quit`.

Result:

- Process exit code: **0**
- `BLACKCORE FATAL`: **0 occurrences**
- Rendered lines wider than 54 columns: **0**
- Provider menu, model menu, reasoning menu and composer all appeared correctly.

A second pseudo-terminal pass selected WaveSpeed → GPT-5.6 Luna → Pro and also completed with no fatal error and no >54-column rendered lines.

## Important scope note

This QA validates the BLACKCORE runtime, TUI, provider request adapters and local simulated provider contracts. It does not spend the user's real DeepSeek/Cerebras/WaveSpeed credits or perform a production Vercel/EAS deployment without the user's authenticated accounts.
