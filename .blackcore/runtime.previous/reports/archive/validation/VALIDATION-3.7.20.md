# BLACKCORE NATIVE 3.7.20 — Validation

## Gemini 3.7 Flash integration

- Catalog ID: `gemini-3.7-flash`.
- Provider: Google AI Studio / Gemini API OpenAI-compatible endpoint.
- Pool policy: first candidate in `google-free-pool`; failover remains Google-only.
- Capabilities: vision, tools, computer-use metadata, 1M context and high reasoning ceiling.
- Natural selection: Portuguese and English phrases such as `usa Gemini 3.7 Flash no high` and `use gemini-3.7-flash`.
- Key handling: the existing four Google key slots remain unchanged; no secret files are rewritten by the catalog update.

## Evidence

- `npm run test:syntax` — passed, 368 JavaScript files.
- `npm test` — passed, 387 tests, 0 failures.
- `node qa-natural-evals.mjs` — passed, 500/500 evaluations.
- Google-specific pool and model-picker tests — passed, including quota advancement and two-key handoff.
- Official model reference checked at `https://ai.google.dev/gemini-api/docs/models` and `https://ai.google.dev/gemini-api/docs/latest-model`.

The Google Free Pool is a routing policy, not a billing guarantee. Actual free quota depends on the user's Google AI Studio project and current Google limits.
