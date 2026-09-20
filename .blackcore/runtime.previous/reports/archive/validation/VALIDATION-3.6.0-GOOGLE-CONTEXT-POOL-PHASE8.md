# BLACKCORE Native 3.6.0 — Google Context Pool Phase 8

Phase 8 upgrades the four-key Google integration from simple credential failover to a resilient execution pool.

## Behavior

- A selected Google model remains locked. `modelLock`, `autoRoute`, `autoFallback`, and `crossProviderFallback` semantics are unchanged.
- Every model request contains the full current BLACKCORE session/tool context. If a Google credential becomes unavailable on a retryable provider/network failure, the same request is retried on another configured Google credential.
- With multiple Google keys and streaming enabled, output is handoff-buffered until a credential completes successfully. Partial text from an abandoned credential is not emitted, avoiding duplicated/corrupted continuation after failover.
- Provider instances are retained for the duration of the turn so key affinity and Google Free Pool model state survive tool-call rounds.
- Concurrent Google workers lease the least-busy available credential. Four independent workers can therefore occupy four distinct configured key slots instead of all starting on slot 1.
- Deep task-graph work now exposes `delegate_ready`, which automatically launches the largest safe dependency-ready wave, capped at four agents. Conflicting/dependent writer nodes remain sequential.
- Google Free Pool still exhausts available credentials on the current curated model before advancing to the next curated Google model, and never crosses to another provider automatically.

## Validation gates

Run from the extracted release root:

```bash
npm run test:syntax
npm test
npm run eval:natural
npm run plugin:test
```

Targeted Phase 8 tests include four-worker credential leasing, handoff-safe streaming, context preservation, and a four-node automatic `delegate_ready` wave.
