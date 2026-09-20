# Testing BLACKCORE

Run the complete local verification:

```bash
npm run verify
```

Run the standalone natural-understanding report:

```bash
npm run eval:natural
```

It executes 254 deterministic contextual/adversarial cases across ten categories. `test/natural-evals.test.js` keeps the same dataset inside the normal verification gate; `qa-natural-corpus.mjs` separately exercises 38 colloquial local controls.

`test/provider.test.js` starts a local HTTP server that emits OpenAI-compatible SSE chunks, including a tool call whose JSON arguments are split across chunks.

`test/openai-responses.test.js` validates direct OpenAI Responses streaming, native reasoning effort and function-call conversion against a local fake server. It never calls the public API or consumes an API key.

`test/agent-loop.test.js` uses a deterministic fake model provider. The first model turn requests `write`; BLACKCORE executes the real write tool into a temporary project; the second model turn returns a final answer. This validates the harness loop without external API tokens.

Other tests cover session branching/repair, unified and atomic multi-file patches, extension lifecycle, persistent shell state, fixed Termux header/composer geometry, narrow-terminal safety, MCP 2026 behavior, x-mcp-header encoding, network policy, HTTP API requests, archives, file hashing, local port checks, output handles, provider retries/fallbacks, usage accounting, repository ignore rules and workspace security.

`test/fixed-composer.test.js` proves the full five-row/four-row cyber HUD at 54 columns, its compact resize fallback, fixed chrome while typing, right-side proportional rail, wheel/click/drag handling, and bounded long-story/code rendering. `test/creative-lab-runtime.test.js` advances deterministic animation frames to validate the village day/night transition, traveler, 3D cube, particles, tool stream, game controls, approximately 60 FPS timing and reduced-motion pause.

`test/capabilities-3.1.test.js` and `test/audit-report.test.js` verify the 69-tool registry, local private index/retrieval, downloadable audit generation, secret-value redaction, document inspection, and code symbol/reference analysis without external services.

`test/agent-understanding-integration.test.js` verifies that unresolved ambiguity withholds mutating tools, a later elliptical request inherits recent focus, and real tool failure evidence appears in the next model round's replan state.

`test/browser-audit.test.js` validates rendered DOM audit signals without requiring Chromium. A real Chromium-compatible browser remains optional for runtime visual inspection.

For live provider validation:

```bash
blackcore doctor --api
```

That consumes a small real API request using the configured default provider.
