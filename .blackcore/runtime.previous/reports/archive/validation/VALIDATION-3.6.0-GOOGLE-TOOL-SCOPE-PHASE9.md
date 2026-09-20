# BLACKCORE Native 3.6.0 — Google Tool Scope Phase 9

Phase 9 hardens Google requests after a real Termux report showed repeated HTTP 400 responses before tool execution while the TUI exposed the full native tool registry.

## Behavior

- All BLACKCORE tools remain installed. Google requests receive a task-relevant active subset capped at 20 declarations per model round.
- Core coding/agent tools are retained first; website, web research, API, database, Android, deploy, document, media, archive, and security tools are added according to the current task text.
- OpenAI and DeepSeek continue receiving their normal tool set; this scope is Google-specific.
- Google-bound JSON schemas are normalized to a conservative function-calling subset (`type`, `description`, `properties`, `required`, `enum`, `items`) while the original internal schemas remain unchanged for execution-time validation.
- HTTP provider errors now extract and display the provider's actual error message instead of dumping a truncated JSON envelope.
- Google four-key context handoff, same-model locking, Google Free Pool behavior, and up-to-four safe parallel agents remain unchanged.

## Validation gates

Run from the extracted release root:

```bash
npm run test:syntax
npm test
npm run eval:natural
npm run plugin:test
```

Targeted Phase 9 tests cover Google tool capping, website/API task selection, non-Google preservation, schema normalization, and the serialized Google OpenAI-compatible request body.

This release is request-shape tested locally. A live Google call requires the user's own configured AI Studio credentials and is intentionally not performed by the release test suite.
