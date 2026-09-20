
# BLACKCORE Native 3.7.14 — complete feature checklist

## 3.7.14 strict regional photo and video editing

- Natural request is enforced at the tool boundary: localized intent never defaults to the full frame.
- Photo selection supports manual/semantic masks, normalized rectangles, ellipses and polygons with feathering and measured coverage.
- Window, eye and face recipes cap destructive adjustments and keep approved edits inside the selected pixels.
- Selected-photo quality gate measures visible inside change and negligible outside leakage.
- Video `regional_edit` consumes a real temporal grayscale mask from a file or configured segmentation backend.
- Temporal-mask duration and partial coverage are verified; soundtrack, speed and timeline stay unchanged.
- Missing photo selection or video tracking produces a clear stop instead of a fake global edit.

## 3.7.13 measured video consultation

- Read-only video diagnosis for analyze/recommend/choose-first requests; no output media is created.
- Prioritized findings based on duration, silence, black frames, scene density, motion, loudness, peaks, BPM, environment samples, resolution and estimated active duration.
- Selectable basic, medium, high, music-locked, visual-polish and vertical-social plans.
- Explicit soundtrack policy, 720p/1080p/2K choice and optional cuts, transitions, rhythm, contextual color, audio, stabilization, captions, music, reframe, text and watermark changes.
- Capability report separates creative model planning, local scene/music intelligence, Whisper model readiness, FFmpeg stabilization, photo-only rembg and external temporal GPU backends.
- Conversation policy waits for the user's approval before render while preserving direct complete-edit requests.

## 3.7.12 measured photo consultation

- Read-only photo diagnosis for analyze/recommend/choose-first requests; it creates no edited output.
- Prioritized findings for exposure, clipping, contrast, cast, saturation, noise, detail, composition and likely environment, each backed by measured evidence.
- Selectable light, color, detail, denoise, crop, text and watermark categories plus natural, cinematic and BLACKCORE preset plans.
- Capability-aware scope menu that marks full/manual-mask, subject/background and named-detail selection as ready or unavailable without simulation.
- Conversation policy waits for the user's choice before editing, then executes only approved categories.
- Optional secrets-safe `rembg` installer uses an isolated Ubuntu PRoot on Termux; heavy text-prompt segmentation is restricted to a separate NVIDIA Linux host.

## 3.7.11 verified selective photo editing

- Full-frame, subject, background, named-detail and manual-mask scopes for auto grade, light, color, detail, denoise and blur operations.
- Manual masks execute locally with feather, expand/erode and inversion controls; white always means edit the selected region after normalization.
- Automatic subject/background selection uses meaningful source alpha, optional installed `rembg`, or an explicitly configured segmentation endpoint.
- Named details require a real semantic backend and `regionPrompt`; unavailable selection fails clearly instead of being simulated.
- Pixel gate measures inside strength, changed-pixel coverage and outside-mask leakage before accepting a result.
- Dedicated `AI PHOTO STUDIO` brand asset, separate from the existing video watermark.
- Fourteen-stage photo HUD adds `EDIT SCOPE` and `MASK EDGE`.

## 3.7.10 strong BLACKCORE photo grade

- Adaptive black/white points plus sigmoidal contrast create deep shadows and separated highlights without a blanket exposure reduction.
- `natural`, `cinematic` and `blackcore-dark` styles have distinct, level-scaled tonal and color profiles.
- Strong requests route to high `blackcore-dark`; basic, medium and high have increasing visible-delta thresholds.
- Fine texture is measured before and after rendering; excessive detail loss rejects the output.
- Auto enhancement preserves source framing and dimensions unless crop or resize was explicitly requested.
- The HUD exposes frame, black-level, cinema-color and detail locks with real plan values.

## 3.7.9 professional photo outfit studio

- `photo_editor change_outfit` and `outfit_editor change_outfit_photo` perform the same real GPU-backed virtual try-on path for natural photo requests.
- Clothing-only automatic or supplied masks with identity, pose, body, background and composition locks.
- Original photo dimensions and framing preserved; professional JPG, PNG and WebP export.
- Pixel-delta quality gate rejects an unchanged or merely recompressed image instead of reporting a fake edit.
- Clothed-only safety policy and explicit remote-upload consent; credentials remain in named secrets.

## 3.7.8 professional video outfit studio

- Real garment-reference virtual try-on through an explicitly configured GPU backend.
- Automatic or supplied clothing mask, temporal tracking, identity/background preservation and clothed-only policy.
- Original audio, duration, scene order and speed are preserved by default.
- MP4 H.264/AAC output, mobile 720p default, 1080p option and hard 2K maximum.
- Remote privacy opt-in, named-secret authentication, cancellation and no silent model downloads.
- SSIM and media-contract quality gate rejects unchanged or watermark-only results.
- Dedicated readable progress stages in the Termux HUD.

## 3.7.7 professional photo studio

- Natural `photo_editor auto_edit` analyzes the photo before changing it: exposure, dynamic range, contrast, color cast, saturation, noise, sharpness, environment and focal region.
- Context-aware, restrained enhancement for water/sky, grass/vegetation, textured mountains, low light and harsh highlights.
- Smart focal crop only when requested, with square, 4:5 portrait, 9:16 story, 16:9 landscape, 4:3 classic or exact coordinates.
- Dedicated resize, rotate, flip, light, color, detail, denoise, blur, text, watermark, convert and compress actions.
- JPG/JPEG, PNG, WebP, AVIF, HEIC/HEIF, TIFF, BMP and GIF input support subject to installed ImageMagick codecs.
- Original-preserving outputs, checkpoint capture, cancellation, bounded ImageMagick memory/thread settings and a visible-pixel quality gate.
- Twelve-stage mobile HUD and an exact final change report instead of generic quality claims.

## 3.7 professional video studio

- Lightweight local scene-color sampling classifies low/harsh light, water, sky, grass/vegetation and textured mountain landscapes without adding a mandatory vision dependency.
- Per-scene adaptive filters apply capped gamma, brightness, color balance, saturation, contrast and detail changes before the global studio/cinematic grade.
- Basic, medium and high use progressively deeper but duration-bounded sampling; `environmentEnhancement` and `environmentStrength` provide explicit control.
- The result records per-scene environment labels/confidence and reports only categories that actually received a filter.
- Local full-depth video analysis: streams, scenes, silence, black frames, loudness, audio peaks, beat times and estimated BPM.
- Chronological joint A/V auto editing trims picture and embedded sound together, with matched xfade/acrossfade transitions and no hidden speed change.
- Auto-Editor-inspired activity modes combine audio silence and low motion; the default keeps a scene whenever either sound or picture remains active.
- PySceneDetect-style content boundaries and Editly-style declarative timelines drive sparse, contextual transitions without desktop dependencies.
- Explicit `preserveSourceAudio` keeps the song continuous while retaining chronological visuals; arbitrary highlight replacement is never the default.
- Sampled SSIM edit-delta verification excludes the watermark area and rejects a joint render that remains visually too similar.
- Motion-aware scene scoring protects dance/action shots; sparse beat-adjacent cuts replace arbitrary visual inserts and transition-at-every-scene behavior.
- Requested/estimated funk, pagode, sertanejo and pop profiles guide eased dissolve, heart, burst, zoom and optional visual reverse effects.
- Fast 720p mobile-HD default, hard 2K ceiling, Lanczos scaling and source-aware bitrate control.
- Complete automatic edit pipeline with smart gap removal, target-duration fitting, professional picture/audio transitions and real output probing.
- Beat-synced music, automatic speech ducking, denoise, compression, loudness mastering and true-peak limiting.
- Multi-clip montage normalization; 9:16, 1:1, 16:9 or custom reframing; blurred background; six color looks; two-pass stabilization.
- Supplied subtitles or optional local Whisper/whisper.cpp transcription, with clean/social/cinematic burned-caption styles.
- Natural final-report contract: visible/audible edits and output path only.

- Adaptive work profiles keep read-only questions fast, require verification after changed code, and add review evidence for deep architecture, audit, security and release work.
- One bounded work gate prevents a premature “done” after mutation; semantic `ok: false` results remain failures throughout the UI, recovery and final work status.
- Persistent `lastWork` session state records phase, targets, verification/review evidence and an honest final status.
- The fixed Termux HUD surfaces SCAN, PLAN, BUILD, CHECK, REVIEW and REPORT without exposing command/JSON noise.

- Vertical swipes anywhere inside the central canvas navigate BLACKCORE's retained transcript instead of the host terminal scrollback.
- Rail taps and drags map proportionally to the visible range and repaint the cyan thumb.
- Pointer movement is coalesced to a bounded 24 ms repaint cadence; outside-canvas coordinates are consumed without side effects.
- The isolated keyboard path and detached readline listener prevent every SGR report from becoming prompt text or old terminal output.
- Keyboard navigation remains available, and `BLACKCORE_TERMUX_MOUSE=0` provides an explicit compatibility fallback.

- The dormant readline `onkeypress` consumer is detached while the fixed HUD owns stdin and restored on suspend/exit.
- Termux mouse tracking is explicitly reset and disabled by default, preventing Android keyboard taps from creating SGR coordinate floods.
- Keyboard history navigation remains guaranteed; physical mouse users can explicitly opt in.
- End-to-end regression drives the real `InputController`, readline and raw stream together.

- Stateful raw-input filter separates chunked SGR mouse reports from keyboard text before Node key decoding.
- Numeric coordinate fragments never leak into the prompt; ordinary text is decoded exactly once.
- Submission clears the fixed composer before painting the single retained user-message echo.
- Regression coverage reproduces split Termux packets and the transient duplicate-message ordering.

- Cyan/magenta BLACKCORE HUD derived from the supplied mobile reference, using only portable ANSI/Unicode primitives that Termux can render reliably.
- Persistent framed output canvas with a right-side position rail, proportional thumb, oldest/latest arrows and visible live/history state.
- Page, line, wheel, rail click and SGR mouse-drag navigation keep the header and message composer fixed.
- Taller HUD on normal phone dimensions automatically falls back to the compact layout when the Android keyboard leaves too little height.
- Streaming output is buffered to a bounded 20 FPS repaint while complete lines render immediately, avoiding per-token full-screen churn.
- Long-story regression proves the beginning and conclusion remain reachable; code/Markdown keep a width budget inside the central frame.
- Capability comparison against official Codex documentation records local parity, stronger BLACKCORE-specific areas and platform limits that cannot honestly be claimed as equivalent.

- News research opens diverse publisher pages, groups overlapping coverage and counts independent corroboration before the assistant writes a readable briefing.
- Public social-profile/link checks separate identity evidence, claim support, information risk and commercial/engagement patterns without declaring a person's character.
- Oversized articles are collected up to a safe bound instead of failing before useful metadata and text can be extracted.
- Fixed Termux history scrolls with PgUp/PgDn, Ctrl or modified arrows and Ctrl+Home/End while the BLACKCORE header and message composer stay pinned.
- Long explanations wrap to the visible width and preserve their conclusion instead of ending in an ellipsis.

- Isolated alternate-screen workspace with transcript replay after Android resize and clean restoration around permission prompts.
- Stylized BLACKCORE wordmark, quieter phase animation and concise model/provider/reasoning/status rows.
- Numbered human-readable tool activity without raw argument JSON, duplicated shell commands or HTML/result dumps.

- Persistent four-row header and three-row composer with a bounded central scroll region on Termux.
- Header/model/input survive typing, long code output, tools and Android keyboard/orientation resize.
- Creative Lab village with day/night cycle, houses, clouds, traveler and fireflies alongside cube, particles, code and game checks.
- Self-contained verification in read-only home environments and fixture-aware secret classification in audit reports.

- Native `audit_report` produces evidence-backed Markdown in the workspace or Termux Downloads.
- Global and per-product scores, P0–P3 findings, file/line references, nested npm audits, Git/session evidence and honest limitations.
- Project settings cannot lower global policy or inject execution-capable integrations.
- Explicitly trusted MCP with minimal stdio environment, authorized HTTP and mutation confirmation.

## 3.4 contextual understanding and recovery

- Advisory turn-understanding map that preserves the original message while surfacing goals, targets, constraints, done signals, discretion and ambiguity.
- Recent-focus resolution for elliptical follow-ups plus a hard mutation gate for consequential requests with no resolvable target.
- Compaction-independent continuity ledger and evidence-driven tool-failure recovery/replanning.
- Truthful narrow-safe startup animation and private first-launch setup panel.
- 254-case contextual/adversarial natural-language evaluation suite.

## 3.3 Studio and evidence UX

- Multiline-safe terminal Markdown with numbered code, tables, tasks, source links and structured summary/research headings.
- Multi-query `web_research` source maps with URL deduplication and domain coverage.
- Nineteen Supabase actions with project-local CLI resolution and confirmation for remote/destructive work.
- Offline-first BLACKCORE Studio PWA with optional Auth/RLS Supabase synchronization.
- Expo SDK 57 mobile fixture with reproducible lockfile and Expo Doctor verification.

## 3.1.0 professional tools

- 69 native schema-validated tools in the current release, including downloadable audits, code intelligence, OCR/document extraction, media pipelines, security scanning, API lab, ADB, PostgreSQL, containers, private local retrieval and verified news/profile research.
- Chromium animation frame timing and responsive multi-width evidence.
- Profile-scoped Poppler, Tesseract, Android platform tools and broader language ecosystems for Termux.
- Confirmation gates for dependency installation and all newly exposed state-changing actions.

## 3.0.0 professional runtime

- Real image attachments for declared vision models; session files persist metadata rather than base64 payloads.
- Interactive Chromium sessions with controlled navigation, snapshots, input actions and console collection.
- AI-guided staged scans for websites, repositories and files, with ranked next-step targets.
- Structured Markdown, standalone HTML and PDF document/report generation in the user's language.
- Symlink-aware workspace security and explicit refusal to swap a non-vision model automatically.
- Locked npm dependency graph, installer profiles, rollback, SBOM and signed-by-checksum release artifacts.
- Expanded GitHub CI and public contribution/security workflow.

## 2.9.2 creative validation fixtures

- `examples/creative-lab`: responsive local web site, Canvas 3D cube, heart particles and keyboard/mouse/touch game.
- `examples/creative-lab-mobile`: Expo/EAS Android APK source fixture with native motion and touch interactions.
- Regressions cover fixture structure, accessibility affordances, syntax, APK config and secret-free source.

## 2.9.1 natural local workflow

- Local requests expose local work first: inspect, edit, test, build and browser-audit a game/site/app without attempting a cloud deployment.
- Remote deploy and account tools are hidden and executor-blocked until the user explicitly asks for that remote service.
- Slash palette is limited to `/models`, `/plan`, `/act` and `/quit`; ordinary work is conversational.

## 2.9.0 model ownership and Git workflow

- Manual provider/model selection is sticky across natural language, picker, SDK and JSON-RPC calls.
- Automatic routing is opt-in; provider fallback is opt-in and each real fallback still requires a live user approval.
- Temporary fallback never overwrites the selected model for the next task.
- `/review`, `/review full`, `/review staged` and `/review working` summarize Git changes with a bounded color patch preview.
- `/worktree` lists isolated workspaces; create/remove integrates confirmation and workspace-write policy.

## 2.8.1 terminal workspace polish

- Safe control panel with key-state indicator (`KEY SET` / `KEY NEEDED`), provider transport, model, effort, mode, workspace and tool count.
- `/status` dashboard for a safe post-login/session summary; no secret or token prefix is ever rendered.
- Composer footer prioritizes ready state and project name over a clipped absolute path.
- Live composer animation uses a partial one-row refresh at 8 FPS, with immediate full redraw only for user input or resize.

## 2.8.0 direct OpenAI and quality pass

- English CLI/TUI labels with configurable assistant output language and no automatic input translation.
- Direct `OPENAI_API_KEY` support for GPT-5.6 Sol, Terra and Luna through the Responses API.
- Native None/Low/Medium/High/XHigh/Max reasoning picker for each direct GPT-5.6 model.
- Streamed Responses API text/function calls and preserved tool-call history.
- Browser semantic/responsive audit plus a website/browser-game QA prompt and skill.

## 2.7.2 reliability/performance
- Live composer remains visible during model/tool execution; follow-up messages are queued.
- Sticky model/provider selection by default; auto-route and auto-fallback are opt-in.
- Cross-provider fallback disabled by default to prevent silent key/provider changes.
- Cached command discovery and GitHub auth status.
- Optional unavailable Ollama tool removed from the model tool list at runtime.
- Browser inspection/screenshot, SQLite, web search, Netlify, Supabase and Resend added to the native toolset.
- Deploy, Function publishing and transactional email sends now have explicit confirmation gates.
- `/thinking` updates the active model's real persisted reasoning level instead of only a legacy global flag.
- HTTP redirects are re-authorized and response bodies are byte-bounded before parsing.
- Global/package extension loading now requires explicit trust.

# BLACKCORE Native 2.7.0 — capability checklist

## Model & reasoning UX
- Natural model/effort selection
- Visual `/models` provider → model → reasoning picker
- Dedicated composer TUI with history, slash suggestions and compact status footer
- Visual `/` command palette
- Per-model reasoning persistence
- DeepSeek native Off/High/Max
- OpenAI GPT-5.6 native None/Low/Medium/High/XHigh/Max
- Google Gemini model-specific reasoning levels
- Ultra/xhigh conversational alias to strongest supported native level

## Natural interaction
- [x] natural-language-first terminal conversation
- [x] local conversational intent handling before API calls
- [x] natural model switching with explicit-choice priority
- [x] natural PLAN/ACT switching
- [x] natural reasoning-effort control
- [x] natural undo/session/animation controls
- [x] model-side `agent_control` self-management tool
- [x] slash commands retained only as optional shortcuts
- [x] automatic model routing when user has not pinned a model

## Agent runtime
- [x] streaming agent loop and tool calling
- [x] DeepSeek and OpenAI-compatible providers
- [x] provider fallback/retry/backoff/cancellation
- [x] session tree, branches, compaction and usage accounting
- [x] checkpoints and undo
- [x] subagents/delegation
- [x] persistent project memory and hierarchical instructions
- [x] skills, prompts, packages, extensions and hooks
- [x] MCP stdio + HTTP
- [x] SDK and JSON-RPC

## Coding and project work
- [x] read/write/edit/atomic patch/multi-file transactions
- [x] grep/find/repo map/symbol index
- [x] bash, persistent shell and background processes
- [x] Git and GitHub helpers
- [x] package/project detection and verification pipelines
- [x] Vercel, Expo/EAS and Android/Gradle integrations
- [x] HTTP/download/archive/hash/port tools
- [x] large tool-output handles instead of destructive truncation

## Safety and terminal
- [x] workspace boundaries and sensitive-file policy
- [x] destructive-command classification
- [x] secret redaction
- [x] private-network/SSRF guard
- [x] safe/balanced/yolo profiles
- [x] responsive animated TUI tested at 54 columns

## Focused provider catalog
- OpenAI is the primary provider: GPT-5.6 Sol, Terra and Luna.
- DeepSeek keeps V4 Flash and V4 Pro.
- Google AI Studio keeps the curated Gemini 3.x and 2.5 catalog.
- Legacy WaveSpeed, Cerebras and OrcaRouter model-provider entries are removed from runtime configuration and model selection.
