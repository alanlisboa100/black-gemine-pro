# BLACKCORE Native 2.4.0 — Validation

## Final results

- Automated Node tests: **74/74 passed**
- JavaScript syntax scan: **222 files passed**
- Natural-language corpus: **30/30 passed**
- Tool QA matrix: **34/34 scenarios passed**
- Built-in tools: **46**
- Natural E2E website flow: **passed** (create → intentional build failure → repair → rebuild/test/server validation)
- Natural E2E 3D cube flow: **passed** (creation → drag rotation math → reset validation)
- Subagent/session/undo QA: **passed**
- Clean isolated install: **passed**, `BLACKCORE Native 2.4.0` reported correctly
- TUI arrow-key picker in pseudo-TTY: **passed**
- Model → reasoning two-stage picker in 54 columns: **passed**
- Slash command palette in 54 columns: **passed**

## Model reasoning controls validated

- DeepSeek V4 Flash / Pro: Off, High, Max
- Cerebras GPT OSS 120B: Low, Medium, High
- Cerebras GLM 4.7: Off / On with parsed reasoning and `clear_thinking: false` in agentic mode
- Natural `Ultra` / `xhigh`: maps to the strongest native level actually supported by the current model

## Provider behavior added/tested

- DeepSeek V4 thinking body and `reasoning_content` replay across tool-call rounds
- Cerebras GPT-OSS native `reasoning_effort`
- Cerebras GLM native reasoning disable/enable controls
- Cerebras `reasoning` response field normalized into BLACKCORE session reasoning
- Per-model reasoning settings persisted independently
- 2.3 configuration migration to the Cerebras-specific adapter

## Limits of this validation

No real user API key, paid Vercel deployment, or paid EAS build was executed in this environment. Provider HTTP behavior was validated against controlled OpenAI-compatible endpoints, and deployment tools were validated with CLI stubs/preflight. Real billing/authentication remains dependent on the user's accounts.
