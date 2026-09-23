# Built-in Tools

BLACKCORE keeps tool execution inside the harness rather than asking the model to simulate filesystem, shell, deployment, or network access. Native tools are schema-validated before execution and pass through the permission/security layer.

## Filesystem and patching

- `read`: bounded UTF-8 reads with line numbers.
- `write`: atomic create/replace with checkpoint capture.
- `edit`: exact text replacement with ambiguity checks.
- `patch`: verified unified diff for one file.
- `patch_set`: atomic multi-file unified-diff transaction with rollback.
- `json_edit`: structured JSON updates.
- `file_transaction`: grouped filesystem mutations.
- `ls`, `stat`, `mkdir`, `copy`, `move`, `delete_file`.
- `file_hash`: SHA-256/SHA-512/MD5 file verification.

Mutating file tools enforce workspace policy and integrate with the checkpoint/undo system.

## Search and repository intelligence

- `find`: uses `fd` when available, with an internal JavaScript fallback.
- `grep`: uses `ripgrep` when available, with an internal JavaScript fallback.
- `repo_map`: ranked view of manifests, entry points and important source files.
- `project_detect`: detects Node/Next/React/Expo, Python, Rust, Go, Android/Gradle, CI and deploy metadata.
- `scan`: staged site/repository/file intelligence. `site_map` discovers same-origin routes and page issues; `site_page` focuses one route; `project` ranks code hotspots; `file` narrows analysis to scored line chunks.
- `code_intel`: project-aware diagnostics, symbols, references, reviewed identifier rename and formatting across major ecosystems.
- `knowledge_index`: private local lexical index and retrieval over project code/documents; no external embedding service is required.

Repository indexing respects `.gitignore` and `.blackcoreignore` for normal generated/vendor paths and caches a symbol-oriented map keyed to repository state.

## Shell and processes

- `bash`: bounded shell command with classification, timeout and cancellation.
- `shell_session`: named persistent shell preserving exported variables/cwd state.
- `process_start`, `process_poll`, `process_list`, `process_kill`: long-running jobs such as dev servers and builds.
- `port_check`: check/wait for a TCP port, useful after starting a local app server.

## Git and GitHub

- `git`: status, diff, log, show, branch, remote, add, commit, create branch and push.
- `github`: structured `gh` operations for repository info, issues, pull requests, workflows and Actions runs.
- `worktree`: list, create or remove isolated Git worktrees. Creation/removal asks for confirmation outside `yolo`; the target must remain inside the configured writable workspace boundary.

The terminal also provides `/review` for a fast change dashboard, `/review full` for a bounded colour diff preview, and `/worktree create <branch> [path]` / `/worktree remove <path>` shortcuts. The compact review always runs `git diff --check`; it does not modify Git state.

Destructive Git reset/clean operations are intentionally not exposed as a one-click structured tool. They can only be attempted through shell policy when genuinely requested.

## HTTP, web and artifacts

- `web_fetch`: bounded public HTTP(S) retrieval for pages/resources, with a byte cap before text conversion.
- `web_search`: ranked discovery results with title, URL, domain, source type and snippet when the provider exposes one.
- `web_research`: two to four focused searches combined into a deduplicated source map with query coverage and domain diversity. It deliberately does not label snippets as verified conclusions; selected sources must be opened with `web_fetch`.
- `news_research`: current-news evidence workflow that searches multiple formulations, opens diverse publisher pages with a safe byte bound, extracts dates/descriptions/article text, groups overlapping stories and counts independent domains. The assistant must turn this evidence into the briefing itself; URLs remain supporting references.
- `credibility_check`: public-link, social-profile and claim investigation. It attempts to open the public target, searches identity/corroboration/fact-check evidence and marks commercial/engagement calls to action. It rates evidence and information risk, not a person's character; private, blocked or unavailable material stays explicitly unverified.
- `http_request`: API testing with GET/HEAD/POST/PUT/PATCH/DELETE, JSON bodies, bounded output, and optional bearer injection from a named secret without putting the secret value in the model prompt.
- `download`: streamed, bounded download into the workspace with timeout and atomic final rename.
- `archive`: create/list/extract ZIP/TAR.GZ artifacts; extraction rejects unsafe absolute/`..` member paths before writing.
- `browser`: detect an installed Chromium-compatible browser, inspect rendered DOM, run `audit` for title/lang/viewport/semantic/alt/label evidence, or capture a screenshot. Browser audit is read-only and works against a local URL or workspace file. When Playwright is absent, `open`, `snapshot` and `responsive` transparently use bounded one-shot Chromium runs; click/type/key and frame timing remain explicitly unavailable.
- `document`: build a structured report with cover, table of contents, sections and language metadata as Markdown, standalone themed HTML or PDF. PDF generation uses an installed Chromium browser.
- `document_reader`: inspect/extract PDF, DOCX, PPTX, XLSX and text, with Tesseract OCR for images/scanned PDF when installed.
- `media`: inspect and transform images, video and audio through FFmpeg/ImageMagick.
- `photo_editor`: read-only measured consultation plus professional local editing through ImageMagick: prioritized recommendations and selectable scopes, contextual auto enhancement, focal crop, resize, rotation/flip, light/color, detail, denoise, blur, text, watermark, conversion, compression and verified pixel change.
- `video_editor`: read-only measured consultation plus professional FFmpeg editing: selectable profile, soundtrack, resolution and change plan; scene/motion/music/environment analysis; smart chronological A/V cuts; contextual transitions; color, audio, captions, stabilization, reframe, overlays and verified mobile export.
- `api_lab`: HTTP assertions, GraphQL, SSE, WebSocket probes and OpenAPI endpoint inventory with named-secret injection.
- `security_scan`: redacted secret locations, dependency audits, web security headers and CycloneDX SBOM.

Local/private network requests pass through network policy. Mutating remote HTTP calls require confirmation outside `yolo`.

## Build, package and deploy

- `package_manager`: npm/pnpm/yarn/bun operations with project-aware execution.
- `verify`: detected lint/typecheck/test/build pipeline (`fast`, `standard`, `full`).
- `deploy_preflight`: non-destructive Vercel/Expo/EAS/Android readiness checks.
- `vercel`: identity/project/build/preview deploy/production deploy.
- `expo`: Expo Doctor/start/export/prebuild.
- `eas`: whoami/build/update/submit.
- `gradle`: project Gradle wrapper tasks.
- `android_device`: ADB device inventory, logs, APK install/uninstall, launch and explicit UI inputs.
- `ecosystem`: install/test/lint/build adapters for Node.js, Python, Rust, Go, Flutter and PHP.
- `container`: inspect/build/run Docker or Podman workloads with confirmation for state changes.
- `postgres`: safe `psql` inspection/query using a named URL environment variable; secrets never appear in command text.
- `supabase`: nineteen structured actions for project-local or system CLI installs: status/projects, init/start/stop/link, lint/reset/push, migration new/list, pgTAP, generated types, Function new/list/deploy and secret list/set/unset. Remote writes and database resets are confirmation-gated; secret values are accepted only through an authorized env-file path.

Production/release actions require confirmation except in `yolo` profile.

## Web and browser-game quality

Use the `web-game-qa` prompt for a complete website/game validation pass. It runs project checks, build and logic tests first, then starts a local server, waits for its port, and runs browser audit at desktop/mobile viewports when Chromium is installed. The paired `web-game-quality` skill covers pointer, touch, keyboard, responsive and accessibility expectations. If browser tooling is unavailable, BLACKCORE reports that limitation instead of inventing visual evidence.

## Agent state, diagnostics and local models

- `todo`: structured session task list.
- `memory`: durable non-secret project facts.
- `tool_output`: page/search a full saved log when a command result is too large for the immediate context window.
- `system_info`, `env_names`, `sensitive_path_check`.
- `ollama`: list/pull/remove local Ollama models.
- `delegate`: isolated BLACKCORE subagent added by the agent layer.

## Tool metadata and parallelism

Extensions can register their own tools. Read-only tools can declare `parallelSafe: true`; BLACKCORE batches such calls up to the configured limit. Tool arguments are JSON-schema validated before execution. Every tool call can emit extension hooks and audit events.
