# Google Free Pool

BLACKCORE keeps model choice manual by default. The optional `google/google-free-pool` model is the only automatic model-switching mode added here, and its scope is intentionally narrow: it can switch only between the curated Google AI Studio free-tier candidates configured in `providers.google.freePoolModels`.

Default pool order (Trio Supremo):

1. `gemini-3.8-flash`
2. `gemini-3.7-flash`
3. `gemini-3.6-flash`
4. `gemini-3.5-flash-lite`
5. `gemini-3.1-flash-lite`
6. `gemma-4-31b-it`
7. `gemma-4-26b-a4b-it`
8. `gemini-2.5-flash`

`gemini-3.8-flash`, `gemini-3.7-flash` and `gemini-3.6-flash` form the core high-performance trio of the pool. If 3.8 encounters server saturation (HTTP 503) or quota exhaustion (429), it automatically fails over to 3.7 and then 3.6 without losing session state or context.

The pool advances when the active Google model returns a quota, availability, timeout, or server error. It never switches to OpenAI or DeepSeek and does not enable BLACKCORE's global `autoRoute` or `autoFallback` settings.

Gemini models use Google's OpenAI-compatible endpoint. Gemma 4 models use the native Gemini `generateContent` endpoint so BLACKCORE can preserve function calls, function responses, system instructions, multimodal input, and Gemma's `minimal` / `high` thinking control.

The pool is a routing policy, not a billing guarantee. Google rate limits are project- and model-specific and can change; check the active quotas and billing tier in Google AI Studio.


## Four-key Google pool

BLACKCORE can keep up to four independent Google AI Studio credentials in the global secrets store:

- `GEMINI_API_KEY`
- `GEMINI_API_KEY_2`
- `GEMINI_API_KEY_3`
- `GEMINI_API_KEY_4`

Configure them without placing keys in project files:

```bash
blackcore login google 1
blackcore login google 2
blackcore login google 3
blackcore login google 4
```

For a manually selected Google model, BLACKCORE keeps the model locked and fails over only between configured Google key slots on quota/auth/timeout/server availability errors. For `google-free-pool`, it first tries the available key slots for the current model, then advances to the next curated Google model if the current model is unavailable across the key pool. It never crosses into OpenAI or DeepSeek.

Key slots are tried in sequential order from the last successful slot (1→2→3→4, wrapping). The last working slot stays sticky for the next turn so a dead key does not interrupt the conversation: the same messages, tools, and model are retried on the next configured Google credential. Parallel workers still spread across free keys by in-flight count. BLACKCORE does not guess billing tier from a key. Runtime accounting is tracked per key/model for local RPM, TPM and RPD visibility. Quota responses honor `Retry-After` when Google provides it; otherwise BLACKCORE applies bounded per-key/model cooldowns. Slot 1 remains fully backward compatible with the original `GEMINI_API_KEY`.

## Google request tool scope

BLACKCORE keeps the complete native tool registry installed, but Google model requests expose only a task-relevant subset capped at 20 declarations per round. This keeps coding/agent essentials available while dynamically adding website, browser/media, research, API, database, Android, deploy, document, archive, or security tools when the task calls for them. OpenAI and DeepSeek are not affected by this Google-specific scope.

Before serialization to Google, function parameter schemas are normalized to a conservative function-calling subset. The original BLACKCORE schemas are retained internally and still validate tool arguments at execution time.
