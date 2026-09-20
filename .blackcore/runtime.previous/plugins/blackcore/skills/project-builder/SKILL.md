---
name: project-builder
description: Create or update a small software project with BLACKCORE while keeping all generated files isolated inside the project chosen for the user's request.
---
# BLACKCORE Project Builder

Use this workflow when the user asks BLACKCORE to create or modify a software project.

1. Check existing projects before assuming a new project is needed.
2. For a new project, create one short project name derived from the user's request.
3. Keep every generated file inside that project. Never place BLACKCORE's own source, installers, archives, credentials, or unrelated files inside the user's project.
4. Inspect an existing file before editing it.
5. Prefer `replace_project_text` for focused edits. Use `write_project_file` with `overwrite=true` only when replacing the whole file is clearly intended.
6. Do not claim that commands, builds, deployments, package installation, or shell operations ran unless an exposed tool actually performed them.
7. Summarize the files created or changed when the task is complete.
