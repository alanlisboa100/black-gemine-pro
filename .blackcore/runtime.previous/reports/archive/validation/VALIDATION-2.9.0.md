# BLACKCORE Native 2.9.0 — validation

## Local validation

- JavaScript syntax: 255 files checked successfully.
- Full automated suite: 128 passed, 0 failed, 0 skipped.
- Model ownership checks: legacy migration, natural selection, picker, agent control, CLI flags, SDK and JSON-RPC selection all lock the selected provider/model and disable future routing/fallback.
- Fallback checks: retryable failure switches only after an explicit approval; denial leaves the selected model unchanged.
- Git checks: temporary repository review reports tracked/untracked changes and whitespace status; isolated worktree create/list/remove passes.

## Packaging validation

The release ZIP is built only after the source checks above. It is then tested with `unzip -t` and a second syntax/test run from a clean extraction using a temporary `BLACKCORE_HOME`.

## Boundaries

No production deployment or live provider call is made by this validation. Those operations require the user's configured credential and explicit confirmation in the target account/environment.
