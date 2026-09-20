---
name: repo-explorer
description: Map unfamiliar repositories before editing. Identify architecture, entry points, test/build commands, configuration, and risk areas.
---

# Repository Explorer

Use this skill when entering an unfamiliar codebase.

## Workflow
1. Run `project_detect` and `repo_map`.
2. Read the main package/build manifests and README.
3. Search for the symbol, route, component, command, or error named by the user.
4. Trace imports/call-sites in both directions before changing behavior.
5. Locate tests adjacent to the affected code.
6. Summarize architecture privately in the working todo list; do not flood the user with file dumps.
7. Make the smallest change that satisfies the request.
8. Verify with the repository's native test/lint/typecheck/build commands.

## Rules
- Never assume a framework version from memory when package manifests are available.
- Prefer `grep`/`find` over recursively reading directories.
- When generated files exist, edit the source of truth instead.
