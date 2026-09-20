# Extensions

Extensions are JavaScript ESM modules. They are loaded from:
- `~/.blackcore/extensions/` (each file must be listed in `trustedGlobalExtensions`)
- `.blackcore/extensions/` in a trusted project
- installed BLACKCORE package resources

A minimal extension:

```js
export default function (api) {
  api.registerTool({
    name: "answer_42",
    description: "Return 42",
    parameters: {type:"object", properties:{}},
    readOnly: true,
    parallelSafe: true,
    async execute() { return "42"; }
  });

  api.registerCommand("forty-two", async ({ui}) => ui.notify("42"));

  api.on("tool:after", ({name, durationMs}) => {
    if (durationMs > 5000) api.notify(`${name} was slow`, "warn");
  });
}
```

## Extension API

- `registerTool(tool, {override, group})`
- `unregisterTool(name)`
- `registerCommand(name, handler, options)`
- `on(event, handler, options)`
- `registerProvider(type, factory)`
- `setStatus(text)`
- `notify(text, level)`
- `getState(key, fallback)`
- `setState(key, value)`

## Hooks

Current lifecycle events include:
- `prompt:before`
- `prompt:after`
- `model:reasoning`
- `model:response`
- `tool:before`
- `tool:after`
- `tool:error`

`prompt:before` and `tool:before` are cancelable when a handler returns `{cancel:true, reason:"..."}`.

## Trust

Project-local extensions execute code with the same OS account as BLACKCORE. They are therefore loaded only when the project path is present in `trustedProjects`.

Use `/trust`, inspect the source, then `/reload`. To trust one global extension, use `/trust extension ~/.blackcore/extensions/name.js`; only files inside that directory are accepted. Packages explicitly installed through `blackcore package install` or `/package-install` are added to `trustedPackages`, because installation is an explicit execution decision.

## Tool override

An extension can register a tool with an existing name by passing `{override:true}`. Use this for policy wrappers or organization-specific behavior.
