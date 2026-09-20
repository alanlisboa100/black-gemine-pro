# Contributing to BLACKCORE

## Development setup

Requirements: Node.js 20 or newer, npm and Git.

```bash
npm ci
npm run verify
```

Keep changes focused. Add regression tests for behavior changes, preserve the natural-language-first interface, and never make deployment tools available for an unrelated local task.

## Non-negotiable invariants

- A user-selected model is sticky. No silent provider, key or model switching.
- Fallback is opt-in and requires confirmation at the actual failure.
- Credentials are never printed, committed or included in fixtures.
- Local work does not imply deployment or an external write.
- PLAN mode cannot mutate projects.
- Termux/narrow-terminal behavior remains supported.

Before opening a pull request, run `npm run verify`, `npm run package:check` and `git diff --check`. Explain the behavior change, risk and evidence in the PR body.
