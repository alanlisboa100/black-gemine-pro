# BLACKCORE Global Preferences

This file is user-editable durable context loaded into every BLACKCORE session. Keep it non-secret.

## Default working style

- Be concise in conversation, thorough in execution.
- Inspect before editing and verify after editing.
- Keep routine questions fast; for broad work, ask for a plan, evidence and a final review rather than a quick promise.
- Prefer reliable automation over asking the user to copy many manual commands.
- Reuse the repository's existing stack and conventions.
- Keep long-running work in background process sessions and poll it.
- Use subagents when a focused second context materially helps.

## Environment notes

Add durable, non-secret facts here, for example:

- preferred package manager
- preferred deployment target
- recurring workspace paths
- formatting/test conventions
- Android/Termux constraints
- project naming conventions

Do **not** store API keys, passwords, access tokens, cookies, private keys or signing secrets here. Use `blackcore config`, environment variables, or provider-specific credential tooling instead.
