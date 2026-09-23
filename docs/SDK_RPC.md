# SDK and RPC

## JavaScript SDK

```js
import {createBlackcoreSession} from "blackcore-native";

const bc = await createBlackcoreSession({
  cwd: process.cwd(),
  ephemeral: true,
  provider: "deepseek",
  model: "deepseek-v4-flash"
});

const answer = await bc.prompt("Inspect this repository and find the failing test.");
console.log(answer);
await bc.close();
```

The SDK also exports `ToolRegistry`, `defineTool`, `ProviderRegistry`, `SessionStore`, and `HookBus`.

Calling `bc.setModel(provider, model)` is an explicit selection: it pins that model, disables automatic routing and disables fallback for later prompts. It returns the resulting lock state.

## RPC

Start:

```bash
blackcore --rpc
```

Protocol is newline-delimited JSON-RPC 2.0 over stdin/stdout.

Methods:
- `prompt` params `{text}`
- `stats`
- `cancel`
- `setModel` params `{provider, model}`
- `tools`

Example request:

```json
{"jsonrpc":"2.0","id":1,"method":"prompt","params":{"text":"List the important files"}}
```

Each JSON object must occupy one physical line.

`setModel` is treated as explicit user intent and returns `{provider, model, modelLock, autoRoute, autoFallback}`. A non-interactive RPC prompt cannot silently approve a fallback.
