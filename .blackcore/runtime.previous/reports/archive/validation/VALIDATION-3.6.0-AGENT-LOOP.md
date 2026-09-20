# BLACKCORE 3.6.0 — Agent Engineering Loop validation

Validation run for the engineering-loop upgrade applied on top of the focused OpenAI + DeepSeek + Google + MCP build.

## New behavior covered

- Deep work requires a concise `todo` plan before the first mutation.
- Verification evidence is tied to the latest mutation revision.
- A later edit invalidates earlier green verification/review evidence.
- Failed verification enters a bounded repair loop (default: 3 cycles).
- Deep work requires review after a current green verification.
- Deep work runs an acceptance pass before the final answer.
- File checkpoints remain explicit and the latest checkpoint metadata is persisted in session state.
- Agent turn/tool/wall-clock budgets are configurable.

## Automated results

- JavaScript syntax: 310 files passed.
- Node test suite: 245/245 passed.
- Contextual natural-language evals: 254/254 passed.
- Plugin/MCP tests: 7/7 passed.
- Plugin server syntax checks: passed.

## Scope limitation

These automated tests validate the runtime state machine, tool policy, file behavior and MCP layer. They do not replace a physical Android/Termux interaction test for keyboard, touch, terminal rendering, battery use or vendor-specific Android behavior.
