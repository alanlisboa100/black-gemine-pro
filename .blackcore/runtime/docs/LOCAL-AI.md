# Local AI, semantic routing and memory

BLACKCORE 3.7.18 keeps every cloud provider and API key unchanged while adding an optional local OpenAI-compatible provider backed by `llama.cpp`.

## Termux installation

Install BLACKCORE and the optional runtime together:

```bash
bash INSTALAR-BLACKCORE.sh --profile creator --with-local-ai --setup-storage
```

Or install only the local runtime later:

```bash
bash scripts/install-local-ai.sh
blackcore-local-ai start-chat
blackcore-local-ai status
```

The default chat launcher uses the small GGUF reference shown in the official llama.cpp quick start. Override it with a local file or another GGUF repository:

```bash
export BLACKCORE_LLAMA_MODEL="$HOME/models/my-model.gguf"
blackcore-local-ai start-chat
```

Then say naturally: `usa o modelo local`. The selected local model is stored like any other model preference, but no cloud key is removed and no automatic provider switch is enabled.

## Meaning router and Qwen3-Embedding

The always-available router uses private local phrase similarity for important distinctions such as complete app versus index-only site, continuation versus new project, regional editing and soundtrack lock. It sends no text off the device.

An optional OpenAI-compatible embeddings endpoint can strengthen that route with `Qwen3-Embedding-0.6B` or another embedding model. Configure `semanticRouting.embedding` in `~/.blackcore/config/settings.json`:

```json
{
  "semanticRouting": {
    "enabled": true,
    "minScore": 0.64,
    "embedding": {
      "enabled": true,
      "baseUrl": "http://127.0.0.1:8081/v1",
      "model": "Qwen3-Embedding-0.6B",
      "allowRemote": false
    }
  }
}
```

To run a local embedding server, set `BLACKCORE_EMBEDDING_MODEL` to a compatible GGUF file or repository and use `blackcore-local-ai start-embedding`. A non-loopback endpoint is ignored unless `allowRemote=true` was explicitly configured.

## FTS5 project memory

When `sqlite3` with FTS5 is available, recent verified outcomes, failures and targets are indexed under `~/.blackcore/project-memory`. JSON remains the canonical fallback, so missing SQLite never blocks a task. Repeated verified workflows become recommendations in project memory; they do not activate or edit skills automatically.

## Local video transcription

Install official `whisper.cpp` plus a small local model:

```bash
bash scripts/install-video-ai.sh --model tiny
```

The stable model link is stored under `~/.blackcore/video-ai/whisper-model.bin` and is detected automatically for captions. This installation does not touch API keys.
