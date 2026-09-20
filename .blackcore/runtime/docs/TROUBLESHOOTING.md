# Troubleshooting

## `Missing API key`

Run `blackcore config` or export the provider's environment variable.

## `model not found`

Check the exact model ID in `~/.blackcore/config/settings.json`. Provider catalogs can change independently of BLACKCORE.

## `rg` / `fd` not found

BLACKCORE has JavaScript fallbacks, but install the native tools for speed:

```bash
pkg install ripgrep fd
```

## UI width problems

Report the exact error and `echo $COLUMNS; tput cols` output. Built-in BLACKCORE rendering truncates line-oriented UI based on actual terminal columns; extensions must do the same.

## Vercel/EAS command not found

```bash
npm i -g vercel eas-cli
```

Then authenticate through their official CLIs.

## Session appears wrong

Use `/session` and `/tree` to inspect the active branch. `/jump` changes the active pointer. `/clone` creates a new session from the active branch.

## Restore last edits

Use `/checkpoints`, then `/undo`. Git remains the preferred long-term history mechanism.

## Provider 400 after tool calls

For custom providers, inspect their required tool-call history fields. The built-in DeepSeek provider specifically preserves V4 reasoning content for thinking-mode tool calls.
