# Providers

BLACKCORE 3.6.0 Focused ships with **three model providers only**: OpenAI, DeepSeek and Google AI Studio. The terminal agent, MCP/plugin layer, tools and deployment integrations are unchanged; only the model catalog and credential surface are focused.

## Selection policy

Manual selection through natural language, `/models`, CLI `--provider/--model`, SDK or RPC pins the chosen model. Automatic routing/fallback stays off unless the user explicitly enables it. New installs start on **OpenAI GPT-5.6 Luna**.

Legacy settings that still reference WaveSpeed, Cerebras, OrcaRouter or another removed model provider are migrated at load time to the focused catalog. Their old provider entries are not exposed again.

## OpenAI — primary

Endpoint: `https://api.openai.com/v1`

Credential: `OPENAI_API_KEY`

Login:

```bash
blackcore login openai
```

Built-in models:

- `gpt-5.6-sol` — strongest option for difficult engineering work.
- `gpt-5.6-terra` — balanced quality/cost option.
- `gpt-5.6-luna` — default, optimized for high-volume everyday coding and agent work.

All three use the Responses API adapter and expose `none`, `low`, `medium`, `high`, `xhigh` and `max` reasoning levels.

## DeepSeek

Endpoint: `https://api.deepseek.com`

Credential: `DEEPSEEK_API_KEY`

Login:

```bash
blackcore login deepseek
```

Built-in models:

- `deepseek-v4-flash`
- `deepseek-v4-pro`

Both expose `off`, `high` and `max` reasoning modes.

## Google AI Studio

Endpoint: `https://generativelanguage.googleapis.com/v1beta/openai`

Credentials: `GEMINI_API_KEY` plus optional slots `GEMINI_API_KEY_2` through `GEMINI_API_KEY_8`. Secrets are global to BLACKCORE and are not stored in project repositories.

```bash
blackcore login google 1
blackcore login google 2
blackcore login google 3
blackcore login google 4
blackcore login google 5
blackcore login google 6
blackcore login google 7
blackcore login google 8
```

Built-in catalog:

- `google-free-pool`
- `gemini-3.8-flash`
- `gemini-3.7-flash`
- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`
- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`
- `gemini-3.6-flash`
- `gemini-3.6-flash`

The four-key layer does not change the selected model. It only provides Google-to-Google credential failover. The `google-free-pool` is still the only mode that automatically changes Google models.

## Automatic routing

When `/autoroute on` is explicitly enabled, BLACKCORE now prefers the focused catalog:

- fast work: Luna first;
- normal coding work: Luna/Terra first;
- hard architecture/debugging: Sol/Terra first;
- DeepSeek and Gemini remain alternatives inside the same three-provider catalog.

The default remains a user-pinned model with autorouting disabled.
