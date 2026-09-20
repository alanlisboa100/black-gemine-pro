---
name: api-integrator
description: Integrate OpenAI-compatible and other HTTP APIs robustly with retries, streaming, auth, and tool calling.
---

# API Integrator

For API integrations:
- verify base URL and model ID from configuration/docs;
- keep secrets outside source;
- implement timeouts, cancellation, retry only for retryable failures;
- preserve structured API error bodies;
- handle streaming framing incrementally;
- ensure tool-call argument JSON can arrive across multiple deltas;
- keep assistant tool-call messages and tool results in protocol order;
- add a fake-server integration test.

DeepSeek V4 thinking + tools requires preserving `reasoning_content` across the tool-call turn.
