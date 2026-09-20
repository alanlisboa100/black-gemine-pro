# BLACKCORE Native 3.6.0 — Google 4-Key Pool / Phase 7

## Scope

Phase 7 adds a Google-only multi-credential layer without changing BLACKCORE's manual model-selection policy.

Configured slots:

1. `GEMINI_API_KEY`
2. `GEMINI_API_KEY_2`
3. `GEMINI_API_KEY_3`
4. `GEMINI_API_KEY_4`

Commands:

```bash
blackcore login google 1
blackcore login google 2
blackcore login google 3
blackcore login google 4
blackcore logout google 2
```

Slot 1 is backward compatible with existing installations that already use `GEMINI_API_KEY`.

## Routing guarantees

The following model ownership settings remain unchanged:

```text
modelLock: true
autoRoute: false
autoFallback: false
crossProviderFallback: false
```

For a manually selected Google model, BLACKCORE may change only the Google credential slot. The model remains fixed.

For `google-free-pool`, BLACKCORE tries the available Google credential slots for the current model before advancing through the existing curated Google model list. It never crosses into OpenAI or DeepSeek.

## Key-pool behavior

- Sticky key selection: the last successful Google slot stays active until an eligible error occurs.
- Google-to-Google key failover on authentication/quota/timeout/server availability errors.
- Per-key/model cooldowns for quota and transient failures.
- Global cooldown for a clearly invalid credential (`401`).
- Honors `Retry-After` when supplied by the provider.
- Runtime-local RPM, TPM and RPD counters are maintained per key/model; the RPD bucket follows the Google Pacific-day boundary.
- Native Gemma 4 requests use the same key-pool behavior as Gemini OpenAI-compatible requests.
- Key values remain in BLACKCORE's private secret store/environment and are never written into a project repository.

## Curated Google catalog preserved

1. `google-free-pool`
2. `gemini-3.5-flash-lite`
3. `gemini-3.1-flash-lite`
4. `gemma-4-31b-it`
5. `gemma-4-26b-a4b-it`
6. `gemini-3.6-flash`
7. `gemini-3.6-flash`

## Final validation

- JavaScript syntax: **325 files OK**
- General automated tests: **276 / 276 passed**
- Natural-understanding eval: **254 / 254 passed**
- Plugin/MCP tests: **7 / 7 passed**
- Google-specific coverage includes:
  - four login slot mappings;
  - manual-model key failover without model changes;
  - key exhaustion before Google Free Pool advances model;
  - native Gemma 4 key failover;
  - stale Google catalog refresh;
  - model-lock and cross-provider fallback protections.

## Operational note

BLACKCORE does not infer whether a Google key belongs to a Free or paid project. Slots are tried in configured order and the last successful slot remains sticky. Put Free and paid projects in the slot priority you want to use.
