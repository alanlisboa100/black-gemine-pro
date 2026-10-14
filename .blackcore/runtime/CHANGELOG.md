# 3.8.1 Google key handoff tuning

- Expanded the Google AI Studio credential pool from four to eight slots (`GEMINI_API_KEY` through `GEMINI_API_KEY_8`) across defaults, login, setup, help and model-picker surfaces.
- Removed full-response buffering during healthy multi-key streaming. Silent quota/auth/server failures still fail over before output, while a stream that already became visible is never replayed on another key.
- Detect Google `RetryInfo.retryDelay` hints and daily-quota errors so exhausted keys stay out of rotation for the appropriate cooldown instead of being retried every minute.
- Cached Pacific-day formatters and the in-process secrets map to reduce hot-path key-selection overhead, especially on Termux.

# 3.7.22

- Added `photo_editor list_effects` and seven deterministic local photo finishes: clean natural, cinematic, BLACKCORE Dark, warm vintage, Social Pop, Mono Noir and Studio Neutral.
- Added real `remove_background` and `replace_background` photo actions through optional `rembg`, with transparent-output validation, second-image validation and measurable-change quality gates.
- Switched BLACKCORE photo subject/background masks to the compact configurable `u2netp` model by default with edge decontamination; model selection remains explicit through `BLACKCORE_REMBG_MODEL` or the installer flag.
- Documented model-weight licensing separately from the MIT `rembg` code and kept heavyweight/generative models out of the phone package.

# 3.7.21

- Added the bundled BLACKCORE Premium Lite video effects pack with 12 CC0 source textures and 24 named overlay variants for light, glow, flare, burst, swirl and graphic treatments.
- Added `video_editor list_effects` and `apply_overlay_pack` with explicit per-overlay timing, opacity and preset selection.
- Added independent `transitionDurations` for scene-by-scene timing and `zoomPreset` camera moves with a configurable focal point, including smooth face-in/return composition.
- Kept face zoom separate from regional pixel editing: only actual face retouching requires temporal tracking.

# 3.7.20

- Added Google's stable `gemini-3.7-flash` to the Google AI Studio catalog and first position in the strict Google Free Pool.
- Added natural model selection for “Gemini 3.7 Flash”, Portuguese punctuation variants and direct `agent_control` requests.
- Added high reasoning defaults, model-picker labels and computer-use capability metadata for Gemini 3.7 Flash.
- Preserved Google-only failover and the existing key-slot safety rules; no paid-provider fallback was added.

# 3.7.19

- Added private Chromium profiles that persist logged-in sessions between BLACKCORE runs without returning cookies, tokens or credential storage to the model.
- Added visible manual login for Termux:X11/Linux displays; passwords, MFA codes and security answers are blocked from AI-driven typing.
- Added confirmation gates for authenticated send, publish, purchase, delete, upload, save and account-changing controls.
- Added natural Portuguese/English routing for browser, logged-account and login requests, plus the optional Termux `--with-browser` installation flag.
- Kept Android Chrome data isolated: BLACKCORE uses its own private browser profile instead of attempting to copy another application's protected session.

# 3.7.18

- Added optional local GGUF chat through the OpenAI-compatible `llama.cpp` server without requiring or deleting cloud API keys.
- Added a hybrid multilingual meaning router with an optional batched Qwen3-Embedding endpoint for complete app/site, continuation and selective media decisions.
- Upgraded project memory to a SQLite FTS5 index with transparent JSON fallback and safe verified-workflow learning.
- Added official `whisper.cpp` installation and automatic local model discovery for video transcription/captions.
- Added MobileSAM point/box protocol fields and a safe optional host installer while retaining strict no-global-fallback regional editing.
- Extended `blackcore doctor`, the Termux installer and tests for local AI, FTS5, semantic routes and key preservation.

# 3.7.17

- Expand natural task understanding from 254 to 500 deterministic Portuguese/English scenarios, including colloquial verbs, indirect requests, deep follow-ups, constraints, acceptance language, questions and local/remote/archive scope.
- Recognize named image, video and audio files as first-class targets and keep regional/media constraints attached to the requested file.
- Improve pronoun and continuation resolution for phrases such as “continua daí”, “mexe nele”, “segue de onde parou” and “aplica isso lá também”.
- Expand Google Free Pool topic routing for Android apps, Supabase/RLS/SQL, photo, video, outfits, audit/security, APIs, GitHub research, sites and archives within the 20-tool limit.
- Distinguish “quero um site” from “quero analisar este site” so creation wording cannot accidentally restart inspection or repair work.
- Add a cross-capability natural-context test matrix covering specialized tools, execution boundaries, media targets and project continuation.

# 3.7.16

- Interpret “só com index”, “somente index”, “arquivo único” and equivalent English wording as an explicit self-contained single-file website contract instead of an incomplete-site failure.
- Validate explicit index-only animations and games for embedded styling/behavior and reject missing local CSS/JavaScript references.
- Reject index.html, generic web packages and implicit PWAs as mobile application delivery; generic app requests now require a real Expo/React Native, Flutter or Android project with configuration, source, run/build and test/check commands.
- Recognize creation requests phrased naturally with “quero”, “preciso” and accented “faça” when isolating and validating projects.
- Add Portuguese regression and end-to-end repair coverage for complete sites, intentional index-only projects and mobile apps that initially produce only index.html.

# 3.7.15

- Add an enforced deliverable contract so a complete website cannot pass with only `index.html`; linked CSS/JavaScript, mobile metadata, README and framework build/check scripts are verified where applicable.
- Add complete application contracts for Expo/React Native, Flutter, Android and installable PWAs, rejecting partial or fake app structures before the agent reports completion.
- Add Supabase migration and owner-scoped RLS verification for SELECT, INSERT, UPDATE and DELETE, including `WITH CHECK` gates and privileged-client-secret detection.
- Fix project continuity so follow-up creation language stays in the active project; a new folder now requires an explicit another/new/separate/from-scratch request.
- Keep live Termux projects under `~/BLACKCORE-Projects` by default while preserving shared Downloads for imports and exported packages.
- Expand `blackcore doctor` with `ffprobe`, real tool-version output and correct Termux installation guidance for FFmpeg, ImageMagick and rembg.
- Expand the release verification command to include syntax, the full Node suite, 254 natural-language evaluations, plugin syntax and plugin tests.
- Preserve existing credentials, configuration and sessions during installation and follow-up work.

# 3.7.14

- Fix the critical localized-edit routing bug: requests such as “reduce the window light” or “brighten only the eyes” can no longer fall through to a full-frame filter.
- Require every natural photo/video edit call to carry the original request so the engine can independently enforce regional intent instead of trusting prompt routing alone.
- Add normalized photo boxes, eye-friendly ellipses and irregular polygons as real local mask sources alongside manual and semantic masks.
- Add target-specific safety recipes for windows, eyes and faces, plus selected-area coverage and outside-leakage verification.
- Add `video_editor regional_edit` with a real grayscale temporal-mask video or opt-in segmentation endpoint; masked compositing preserves the soundtrack, duration and speed.
- Reject localized video edits when temporal tracking is unavailable instead of applying the effect to all frames.
- Add regressions for window-only exposure, two-eye selections, explicit full-frame intent, temporal masks and every prohibited global fallback.
- Preserve `~/.blackcore/config/secrets.json` during staged Termux installation exactly as before.

# 3.7.13

- Add a read-only video consultation that converts measured picture, timeline, music, audio and mobile-export evidence into prioritized recommendations.
- Add selectable basic, medium, high, music-locked, picture-only and vertical-social plans plus explicit soundtrack and resolution policies.
- Add optional change choices for smart cuts, transitions, beat pacing, adaptive scene color, audio processing, stabilization, captions, music, reframe, text and watermark.
- Report active planning model, local scene/music intelligence, Whisper model readiness, FFmpeg stabilization and honest external-backend limitations.
- Keep rembg photo-only to prevent frame-mask flicker and require a compatible temporal backend before claiming Grounded SAM 2 or outfit tracking in video.
- Require analyze/recommend requests to stop before rendering and wait for the user's selection; direct complete-edit requests remain immediate.
- Add regression coverage for measured advice, no-output analysis, AI readiness, conversation policy and the Termux activity display.

# 3.7.12

- Add a read-only photo consultation that turns measured image defects into prioritized findings, concrete recommendations and selectable edit categories.
- Add natural, cinematic and BLACKCORE preset plans plus full, subject, background, named-detail and manual-area choices with honest capability status.
- Require the agent to wait for the user's selection after an analyze/recommend request; direct edit requests keep their existing immediate behavior.
- Add an optional Termux `rembg` installer in an isolated Ubuntu 24.04 PRoot without modifying BLACKCORE secrets.
- Add a separate NVIDIA Linux installer path for Grounded SAM 2 and explicitly require an HTTP adapter instead of pretending the heavy model runs as a phone-native service.
- Add regression coverage for no-mutation analysis, advice quality, selection readiness, installer isolation and Termux refusal of the GPU stack.

# 3.7.11

- Add real selective photo editing scopes for the full image, subject, background, named detail and supplied masks.
- Add local mask normalization with feather, dilate/erode and inversion controls; white marks edited pixels.
- Use meaningful source alpha or optional installed `rembg` for local subject/background selection, with an opt-in semantic segmentation backend for named regions.
- Verify measurable change inside the selected area and negligible leakage outside it before delivery.
- Add `EDIT SCOPE` and `MASK EDGE` to the 14-stage photo HUD and report the actual mask source and coverage.
- Split branding so still images use `BLACKCORE // AI PHOTO STUDIO` while videos keep `AI VIDEO STUDIO`.
- Preserve the original photo, framing defaults, BLACKCORE dark grade, safe runtime staging and existing API keys.

# 3.7.10

- Replace the subtle photo auto-grade with adaptive black/white points, strong sigmoidal contrast and visibly differentiated basic, medium and high profiles.
- Add `natural`, `cinematic` and `blackcore-dark` visual styles; strong/dark/BLACKCORE requests select high `blackcore-dark` by instruction.
- Intensify color and environment-aware water, sky, vegetation and mountain treatment while capping already-saturated inputs.
- Protect facial, hair and clothing texture through stronger controlled sharpening and a post-render detail-loss rejection gate.
- Add level-aware RMSE thresholds so a professional/high request cannot pass with a barely visible edit.
- Preserve framing and source dimensions by default and report before/after tone, saturation and detail measurements.
- Rename photo HUD phases to `FRAME LOCK`, `BLACK LEVEL`, `CINEMA COLOR` and `DETAIL LOCK`.

# 3.7.9

- Integrate safe, backend-powered clothing replacement directly into `photo_editor` through `change_outfit`.
- Add the native `outfit_editor change_outfit_photo` path for JPG/JPEG, PNG, WebP, AVIF, HEIC/HEIF, TIFF and BMP inputs.
- Add a still-image backend contract with automatic or supplied clothing masks, identity/body/background/composition locks and clothed-only safety.
- Preserve original photo dimensions and framing, then export a new JPG, PNG or WebP without overwriting the source.
- Add a real normalized pixel-delta gate that rejects unchanged and merely recompressed model output.
- Expand the Termux outfit HUD with composition lock, identity lock, photo export and quality verification stages.
- Keep endpoint/token secrets outside the runtime package and require explicit consent before remote uploads.

# 3.7.8

- Added `outfit_editor` for real, backend-powered video wardrobe replacement and virtual try-on.
- Added temporal mask/tracking job contract, direct-video and asynchronous job responses, cancellation and bounded downloads.
- Preserves the source soundtrack and timeline by default, exports H.264/AAC MP4 at 720p by default, and enforces a 2K ceiling.
- Added visible-change SSIM verification so unchanged, watermark-only or fake outfit renders are rejected.
- Added a dedicated Termux HUD: garment intelligence, clothed-only safety, mask/tracking, GPU generation, audio lock, mobile export and quality check.
- Remote uploads require explicit `allowRemote=true`; credentials are read only from named secrets and never printed.
- Unsafe nudification/undressing requests are rejected; safe outfit replacement remains available.
- No model weights are bundled or downloaded silently. The phone client uses an optional SwiftTry-compatible GPU bridge.

# 3.7.7

- Add `photo_editor`, a complete local ImageMagick photo studio selected automatically for Portuguese or English photo/image editing requests.
- Add request-driven `auto_edit` with exposure, tonal range, color-cast, saturation, noise, sharpness, environment and focal-region analysis before any pixel change.
- Add gentle contextual photo correction for water, sky, grass/vegetation, mountains, low light and harsh highlights without a mandatory heavy vision framework.
- Add focal-region crops for 1:1, 4:5, 9:16, 16:9, 4:3 and exact geometry; no crop is performed during generic enhancement unless requested.
- Add resize, rotate, flip, light/color controls, detail recovery, denoise, blur, text, built-in/custom watermark, format conversion and phone-friendly compression.
- Add original-file protection, checkpoint integration, cancellation, bounded ImageMagick resources and a pixel-delta quality gate that rejects a fake no-change auto edit.
- Add a compact twelve-stage photo HUD and exact change reporting, plus deterministic analysis and real ImageMagick render regressions.
- Keep the `creator` profile as the photo/video profile and preserve `~/.blackcore/config/secrets.json` during staged runtime replacement.

# 3.7.6

- Add duration-bounded local RGB scene sampling with no new mandatory dependency, preserving the compact Node.js + FFmpeg Termux runtime.
- Detect low/harsh light, water, sky, grass/vegetation and textured earth/mountain landscape signals from luminance, color position, saturation and edge density.
- Attach an environment profile to every rendered timeline segment and apply restrained, strength-capped gamma, brightness, color balance, saturation, contrast and detail corrections before the base grade.
- Add `environmentEnhancement` and `environmentStrength` controls plus distinct basic/medium/high sampling and strength budgets.
- Add `SCENE COLOR` to the 18-stage mobile HUD and expose sample counts, per-scene labels/confidence, summary counts and actual environment changes in the verified result.
- Preserve the chronological joint A/V cuts, matched audio crossfades, 720p default, 2K ceiling, BLACKCORE watermark and secrets-safe installer from 3.7.5.
- Add deterministic RGB classification tests and a real FFmpeg three-environment render proving water, vegetation and low-light recognition and filtering.

# 3.7.5

- Replace the default independent visual EDL with a chronological joint picture-and-sound timeline so edits no longer pull unrelated source moments over a continuous song.
- Cut embedded audio at the same source intervals as picture and pair every visual xfade with an equal-duration audio acrossfade; no automatic speed change is introduced.
- Add Auto-Editor-inspired `audio`, `motion`, `audio-or-motion`, `audio-and-motion` and `scene` activity methods. The default removes an interval only when audio and motion are inactive together, protecting dance/action scenes.
- Add local low-motion range detection, intersection logic, beat/uniform fallback cut points for single-shot material and margins around retained content.
- Keep `preserveSourceAudio` as an explicit “do not alter the music” mode and make arbitrary-source `creativeRecut` opt-in instead of default.
- Rename the Termux stages to `A/V SMART CUT` and `AUDIO CUT/MIX`, while retaining `AUDIO LOCK` only for an explicit locked soundtrack.
- Keep the approved studio/cinematic image treatment, BLACKCORE watermark, phone-safe MP4 output, 720p mobile default, 2K ceiling and secrets-preserving installer.
- Add real FFmpeg regressions for joint A/V duration reduction, chronological source order, matched transitions, explicit audio lock, activity intersection and edit-delta verification.

# 3.7.4

- Replace the audio-locked same-order timeline with an independent visual EDL that inserts nearby high-motion highlights and beat-aligned punch-ins while the original soundtrack remains continuous.
- Give every creative insert a controlled transition entrance and natural exit; arbitrary-source picture handles compensate xfade overlap so the final duration still matches the song.
- Add three duration-scaled creative edit budgets: conservative basic, balanced medium and deeper high, without hidden speed ramps or audio changes.
- Add a sampled SSIM `EDIT DELTA` gate that compares the edited moments against the original while excluding the watermark area; a too-similar render is rejected instead of reported as complete.
- Default every video deliverable to phone-safe MP4 while keeping explicit output paths respected; accept common phone/camera inputs including MP4, MOV, MKV, WebM, M4V, AVI, 3GP/3G2, MTS/M2TS and TS.
- Expand the Termux editor HUD to 17 stages with `VISUAL RECUT` and `EDIT DELTA`, and report the exact recut, highlight, punch-in and transition counts that completed.
- Preserve the approved studio/cinematic picture treatment, 720p mobile default, 2K ceiling, local FFmpeg rendering and installer isolation of `config/secrets.json`.
- Add real FFmpeg regressions proving creative edits differ visually, retain source audio duration, pass edit-delta verification and expose the new HUD stages.

# 3.7.3

- Lock the embedded source soundtrack by default during automatic edits: visual scene cuts and transitions no longer cut, crossfade, accelerate, denoise or remaster the song unless the user explicitly asks for audio processing.
- Preserve full video/audio duration across visual transitions by borrowing equal picture handles around scene boundaries instead of shortening the timeline at every xfade.
- Add sparse musical scene planning: BPM/peak proximity, scene changes and low-resolution motion scores rank transition points while active dance/action scenes are protected from synthetic zoom.
- Add requested/estimated funk, pagode, sertanejo and pop rhythm profiles with explicit confidence sources; uncertain audio falls back to neutral pacing instead of pretending the genre is known.
- Add eased soft-dissolve, custom heart and burst transitions plus optional silent visual reverse moments; strong effects are reserved for suitable peaks and remain user-controllable.
- Default automatic mobile renders to 720p HD with a hard 2K ceiling, Lanczos scaling, faster presets and source-aware bitrate bounds for better phone render time and file size.
- Expand the live Termux editor HUD to 16 readable stages, including `SCENE IQ`, `RHYTHM MAP`, `MUSIC ID`, `TRANSITION IN/OUT`, `AUDIO LOCK`, `MOBILE HD` and finalization.
- Keep global settings and `config/secrets.json` outside runtime activation; the installer now states explicitly that existing API keys are preserved.
- Add real FFmpeg regressions for heart/burst transitions, music-safe duration/audio copying, motion parsing, musical scene spacing and the new HUD stages.

# 3.7.2

- Add real `basic`, `medium`, and `high` auto-edit profiles with distinct scene pacing, cuts, transitions, motion, color, audio, encoding and adaptive upscale behavior.
- Map natural “well edited/top/professional” requests to `editLevel=high`, while explicit medium/basic requests remain exact.
- Bundle and automatically apply a polished transparent BLACKCORE video watermark, with custom overlay, placement, size, opacity and disable controls.
- Replace the previous subtle default pass with scene-spaced timeline reconstruction, restrained per-shot zoom/pan, Lanczos scaling, studio/cinematic grades, video/audio denoise and source-rhythm analysis in high mode.
- Cap CRF output with source-aware maxrate/buffer targets so medium edits do not grow only because the source was already efficiently compressed.
- Expand the Termux `EDIT` HUD to 14 numbered stages and persist one readable transcript line per stage while live percentage, speed and ETA remain in the fixed header.
- Raise the video render and untouched legacy wall-clock budget from 30 minutes to four hours without rewriting or removing existing API keys/secrets.
- Add real FFmpeg regressions for all three profiles, bundled watermark rendering, scene-cut transitions, cinematic motion, semantic HUD stages and progress deduplication.

# 3.7.1

- Add a dedicated animated `EDIT` state to the fixed Termux HUD instead of leaving long video jobs on a generic `VIDEO EDITOR · auto edit` line.
- Stream semantic stages from the real video pipeline: loading, black-frame scan, silence scan, scene mapping, cutting, rhythm, mixing, captions, stabilization, rendering and final verification.
- Read FFmpeg's machine progress channel during renders and convert media time into a bounded overall percentage and ETA; updates stay in the fixed header rather than flooding conversation history.
- Preserve stage elapsed time across percentage refreshes, keep the live message composer usable, and retain existing process-tree cancellation behavior.
- Add regressions for split FFmpeg progress chunks, ETA math, progress-event isolation, real rendered-media stages, narrow Termux HUD output and streaming process callbacks.

# 3.7.0

- Turn `video_editor` into a complete natural-language video studio for Termux/Linux: full inspection, scene/silence/black-frame/loudness analysis, audio peak and beat extraction, BPM estimation, structured suggested cuts, and real output validation.
- Add `auto_edit` and `smart_cut` pipelines with silence/dead-gap removal, narrative-order segment selection, target-duration fitting, professional xfade/acrossfade transitions, resolution/FPS normalization and optional music-beat alignment.
- Add `montage` for heterogeneous clips with automatic frame/audio normalization and clean or styled transitions.
- Add voice-aware music ducking, audio denoise, compression, loudness mastering and peak limiting; music stays under speech instead of masking it.
- Add 9:16, 1:1, 16:9 and custom reframing with crop, fit or blurred-background composition; add natural/cinematic/vibrant/warm/cool/mono color grades and two-pass vidstab stabilization when supported by FFmpeg.
- Add free local Whisper/whisper.cpp transcription support, styled caption burn-in, and optional automatic captions after the final cut so timestamps stay aligned.
- Preserve every previous precise edit action while returning an explicit `changes` list based on the render that actually completed.
- Make the final video-edit response concise by contract: only visible/audible changes and the real output path, without internal tool/model/FFmpeg narration.
- Keep zero mandatory npm dependencies and Termux permission/checkpoint/cancellation behavior. Add real FFmpeg regressions for analysis, smart editing, beat detection, ducked music and transition montages.

# 3.6.1

- Detect the latest user-message language and lock the reply to that language. English stays English; Portuguese stays Portuguese. Prompt examples no longer drag the model into Portuguese.
- Google function schemas now always include `properties` on object nodes, fixing a remaining HTTP 400 before tool execution.
- Google native/Gemma requests merge consecutive user turns and parallel `functionResponse` parts into a single turn.
- Portuguese/Unicode Google tool routing: `site`, `animações`, `pesquisa`, `notícias`, `auditoria`, and `jogo` select the right tools. `ui`/`ux` only match as whole words, so `pesquisa` no longer looks like a website task.
- Keep `todo`, `agent_control` and `process_list` in the Google core tool set.
- Four Google keys stay sticky and sequential: the last working key is reused, and a dead key fails over 1→2→3→4 without changing model or dropping the current request context.
- Compaction no longer keeps orphan tool results that would 400 the next Google request.
- `news_research` uses English search hints when the query is English.

# 3.6.0

- Phase 7 Google multi-key pool: support four independent Google AI Studio credentials (`GEMINI_API_KEY` through `_4`) with sticky Google-to-Google failover, per-key/model cooldown, Retry-After handling, and local RPM/TPM/RPD telemetry. The manually selected model remains locked; `google-free-pool` still controls model-level failover and never crosses providers.
- Add `blackcore login google 1..4` / `logout google 1..4`, four-slot diagnostics, multi-key TUI state, and native Gemma 4 key failover. Slot 1 remains backward compatible with existing installations.
- Google Free Pool: add an explicit free-only Google AI Studio mode that rotates only among the curated Gemini/Gemma free-tier candidates when quota/availability errors occur. It never routes to OpenAI or DeepSeek and leaves global automatic routing/fallback disabled.
- Simplify Google AI Studio to the high-value free set: Gemini 3.5 Flash-Lite, Gemini 3.1 Flash-Lite, Gemini 3.6 Flash, Gemini 2.5 Flash, Gemma 4 31B IT, and Gemma 4 26B A4B IT.
- Add native Gemini API support for Gemma 4 function calling, system instructions, image input, usage accounting, `minimal`/`high` thinking, and tool-call context preservation.
- Agent Phase 5: add a persistent dependency-aware task DAG for deep team engineering. After the planner handoff, BLACKCORE records implementation nodes with stable IDs, dependencies, specialist roles, and expected target paths through the new `task_graph` tool.
- Add dependency gating: programmer delegates must reference a READY `nodeId`; downstream nodes cannot start until prerequisites are done or skipped. Cycles, missing dependencies, duplicate IDs, and self-dependencies are rejected.
- Add safe specialist concurrency. Multiple READY programmer nodes with disjoint concrete target scopes can execute concurrently, bounded by `maxParallelAgents` (default 3). Overlapping targets, unknown/wildcard target scopes, package/dependency changes, shell/Git/deploy operations, and dependent nodes stay sequential.
- Add parallel programmer target isolation: concurrent writers are blocked from touching paths outside their declared graph targets and from using broad side-effect tools. Read-only investigator delegates can still run in parallel.
- Persist task-graph progress in the work snapshot and crash-recovery journal. Resumed tasks retain completed/running/pending dependency state instead of rebuilding the plan from scratch.
- Add `/graph` and `/task-graph` inspection shortcuts, `agentTaskGraphMode`, `maxParallelAgents`, and natural `agent_control set_task_graph` control.
- Add Phase 5 regression coverage for DAG validation, cycle detection, ready-node gating, safe parallel batching, target isolation, graph-aware delegation, and concurrency conflicts.
- Agent Phase 4: persist interrupted top-level task state, open checkpoints, team progress, budget usage, pending tool uncertainty and recovery instructions so Android/Termux process death can resume from the narrowest unfinished step.
- Agent Phase 3: add automatic redacted project history outside the user's source tree. BLACKCORE now remembers recent goals, verified outcomes, blockers, repair attempts and changed targets across sessions, and uses relevance ranking to avoid blindly repeating failed approaches.
- Add a shared per-task token/cost budget across the coordinator and every delegated specialist. Defaults cap runaway work at 1.8M cumulative tokens / ~US$2 estimated priced-provider cost, with an 80% interactive warning; `/budget` and natural `agent_control set_budget` can change or disable the limits.
- Strengthen checkpoints to task-level v2 snapshots with before/after hashes and contents. Programmer subagents now contribute to the parent task checkpoint instead of committing their own fragmented rollback points.
- Add explicit redo support after undo. `/undo` restores the complete pre-task state and `/redo` reapplies the same task checkpoint; no automatic rollback is performed.
- Persist last task-budget telemetry and expose automatic project history through `/memory-history`, while keeping secrets redacted and history in BLACKCORE state rather than the generated project folder.
- Engineering-loop upgrade: deep implementation work now enforces a concise todo plan before the first mutation, then follows execute → verify → repair-if-needed → review → acceptance before reporting completion.
- Verification evidence is revision-aware: a green test becomes stale as soon as a later edit succeeds, so BLACKCORE cannot reuse old evidence after changing the code again.
- Add bounded repair cycles (default 3). Failed verification triggers evidence-driven repair prompts instead of accepting a premature final answer or retrying the same failing call indefinitely.
- Add an acceptance gate for deep work that re-checks the user's goal, explicit constraints, done signals and active todo state after verification/review.
- Make agent turn/tool/wall-clock budgets configurable and expose the current engineering policy plus last checkpoint in `agent_control status`.
- Persist the most recent file checkpoint metadata after each changing turn so user-requested rollback remains explicit and traceable.
- Add end-to-end regression coverage for plan gating, failed-test repair, stale verification invalidation, review, acceptance and checkpoint creation.
- Focused model catalog: OpenAI, DeepSeek and Google AI Studio are now the only built-in model providers. New installs default to OpenAI GPT-5.6 Luna.
- Removed WaveSpeed, Cerebras and OrcaRouter model-provider configuration, credentials, natural aliases and picker entries. Legacy settings referencing removed providers are filtered and migrated to the focused OpenAI default.
- Automatic routing now prefers OpenAI Luna/Terra/Sol first while retaining DeepSeek and Gemini as the two alternative families.
- Project-output isolation for Termux: when BLACKCORE is launched from its own extracted/runtime folder, `$HOME`, or shared Downloads and the user asks for a new standalone animation, game, app, site or demo, the turn now receives a dedicated project folder named from the request. On Termux this defaults to `~/storage/downloads/<project-name>` when shared storage is writable, with a private-home fallback.
- Follow-up turns and delegated subagents stay inside the active generated project instead of falling back to the BLACKCORE source tree. The TUI working path and inline shell also follow that active project. Existing user repositories keep their original workspace and are never redirected.
- BLACKCORE no longer creates ZIP/TAR bundles as an unsolicited delivery step. Archive creation is gated on an explicit compact/package/archive request, and directory archives are written beside the source instead of inside themselves.
- Added regression coverage proving generated project files do not include BLACKCORE release ZIPs/runtime files, PLAN/clarification turns do not create folders, explicit archive requests still work, and subagents inherit project isolation.
- Termux keyboard hotfix: keep SGR mouse/touch tracking disabled by default on Android so tapping the fixed composer remains available to Termux for soft-keyboard focus. Gesture navigation is still available explicitly with `BLACKCORE_TERMUX_MOUSE=1 blackcore`; desktop terminals retain their previous pointer default.
- Add regressions for the Termux default, explicit gesture opt-in, desktop compatibility and preview/footer state.
- Professional top-tier TUI animation system: progressive logo reveal, smooth cyber progress bar with stage labels, multi-color spinner cycles, boot status pulse and sparkle lock-in — all Termux-optimized and under ~1.2 s.
- Expanded `motion.js` with wave/orbit/ticks/rain frames, `smoothProgress`, `animateProgress`, `sparkle` and logo sequences; Spinner now supports color cycling.
- Cyber-styled installer banner and README call-out for the new motion layer.
- Hermes-core completeness pass: system prompt strengthened for maximum autonomy, finished creative results, and “brinca / faz algo top” treated as full interactive product requests.
- Expanded `web-game-quality` skill into a mobile-first professional guide for animations, games, particles and touch experiences.
- New `creative-play` skill for open experimental and generative requests.
- README repositioned as complete playground + Hermes-core.

- Add the adaptive BLACKCORE Work Protocol, modeled on the practical Codex loop: understand, inspect, plan when useful, execute, verify, review broad work, and report only real evidence.
- Keep quick questions quick. `adaptive` selects fast, standard or deep work from the request; `/work fast|standard|deep` can override that per future turn.
- Record the active work state in the session: depth, phase, changed targets, verification/review evidence, gate use and final status (`verified`, `unverified`, `read-only`).
- Insert one verification gate when a model tries to finish a changed standard/deep task without successful test, lint, build, runtime or visual evidence.
- Add one review gate for deep work after successful verification; it asks for a real Git diff/status or a reread of changed targets, not a generic self-congratulation pass.
- Treat structured `ok: false` tool results as failures. A verifier which ran but found failing checks no longer paints as complete or passes the work gate.
- Mark projects without detectable verification commands as **unverified** instead of granting an empty success signal.
- Support `AGENTS.override.md` with closest-directory precedence and ship concise project instructions plus code-review rules through project initialization.
- Add HUD states `SCAN`, `PLAN`, `BUILD`, `CHECK`, `REVIEW`, and `REPORT` so the fixed Termux header says what is happening without exposing JSON, commands or credentials.
- Add regression coverage for adaptive depth, one-shot gates, semantic verification failures, review evidence, natural “dê seu melhor” discretion, instruction precedence and the `/work` control.

# 3.5.8

- Re-enable filtered SGR touch input after the 3.5.7 readline isolation fix.
- Let a vertical swipe anywhere in the central canvas navigate retained BLACKCORE output, while rail tap/drag maps directly to a proportional history position.
- Coalesce continuous pointer motion to a bounded 24 ms repaint cadence and flush the final movement on release.
- Consume outside-canvas reports without scrolling, typing or exposing coordinates; preserve `BLACKCORE_TERMUX_MOUSE=0` as a keyboard-only fallback.
- Prevent Termux native scrollback from mixing old primary-screen rows under the fixed composer while the HUD owns touch gestures.
- Add regression coverage for central swipe up/down, rail movement, view-state changes and zero raw-coordinate leakage.

# 3.5.7

- Detach the original readline `onkeypress` listener while the cyber HUD owns stdin, eliminating the hidden second input consumer that printed SGR coordinates and `>` prompts.
- Restore the exact listener after HUD suspend/stop so confirmations and normal readline flows continue working.
- Send mouse-off before entering the alternate screen and keep Termux SGR tracking disabled by default; physical mouse users can opt in with `BLACKCORE_TERMUX_MOUSE=1`.
- Update the HUD footer to advertise stable keyboard navigation instead of inactive gestures.
- Add an end-to-end real-stream regression covering InputController, readline, split SGR reports, screen output, composer state, queue isolation and listener restoration.

# 3.5.6

- Separate raw Termux input from keyboard decoding through an internal filtered stream.
- Buffer split SGR mouse prefixes and consume complete wheel/click/drag reports before their numeric coordinates can become prompt characters.
- Preserve fragmented arrow/control sequences while decoding ordinary UTF-8 text exactly once.
- Clear the fixed composer before painting the single submitted-message transcript echo, eliminating a transient duplicate.
- Add device-derived regressions for split mouse packets, numeric-tail leakage, duplicate typing and submit ordering.

# 3.5.5

- Redesign the fixed Termux workspace from the supplied cyber HUD reference: cyan frame, letter-spaced BLACKCORE identity, compact model strip, technical separator, live phase row and a four-line message panel.
- Frame every central response/code/tool row and add a proportional right-side scroll rail with oldest/latest arrows and a visible thumb.
- Support PageUp/PageDown, line shortcuts, mouse wheel, rail click and SGR drag navigation; mouse escape sequences are consumed and never leak into the prompt.
- Switch automatically between the full five-row/four-row HUD and the compact four-row/three-row layout when Android resize leaves limited height.
- Repaint partial streaming output at a bounded 20 FPS while rendering newline-complete activity immediately.
- Add long-story, rail sizing, mouse/wheel/click/drag, fixed-chrome, resize and preview regressions.
- Publish an evidence-based comparison with current official Codex CLI/security documentation, explicitly retaining cloud handoff, managed marketplace and OS-enforced isolation as non-parity items.

# 3.5.4

- Add `news_research`: multi-query current-news discovery, bounded opening of diverse publisher pages, metadata/article extraction, duplicate-story clustering and independent-domain corroboration counts.
- Add `credibility_check` for public social-profile links, articles and factual claims. It attempts to open the public target, researches identity/corroboration/fact-check evidence, detects commercial or engagement calls to action and returns an evidence contract without judging a person's character.
- Require news answers to deliver the actual story, timing, relevance, confidence and disagreements in stacked narrow-terminal cards; supporting links now follow the explanation instead of replacing it.
- Keep useful prefixes from oversized web pages instead of failing the entire fetch with `response too large`; the tool reports when retrieval was truncated.
- Add real conversation history navigation to the fixed Termux viewport: `PgUp/PgDn`, `Ctrl+↑/↓`, shifted/Alt arrows, `Ctrl+Home` and `Ctrl+End`, with range/unread indicators.
- Wrap long Markdown and news explanations at the visible terminal width instead of cutting their conclusions with an ellipsis.
- Expand the native registry from 67 to 69 tools and add regressions for publisher extraction, public Instagram-profile evidence, story clustering, bounded web retrieval, long-line wrapping and fixed-viewport scrolling.
- Run the official Node suite sequentially for predictable memory/process use on Termux; 218 tests, 254 contextual evals, 38 natural controls and 50 tool-matrix scenarios pass.
- Name the release artifact `BLACKCORE-NATIVE-3.5.4-TERMUX.zip`, matching the documented download command, and keep nested dependencies and prior release files out of the archive.
- Record the optional Expo/React Native fixture's unresolved upstream audit advisories separately from the zero-advisory BLACKCORE core and Studio graphs.

# 3.5.3

- Move the fixed Termux UI into an isolated alternate screen, eliminating header/composer ghosts from normal terminal scrollback.
- Keep a bounded logical transcript and replay its latest rows after keyboard/orientation resize or restoration from permission/model/editor screens.
- Redesign the header around a letter-spaced BLACKCORE wordmark and compact MODEL, THINK/RUN/WAIT/DONE and READY rows.
- Remove the noisy spectrum graph, halve phase repaint frequency and skip identical phase frames.
- Replace raw tool JSON, duplicated commands and large output previews with numbered semantic action/result pairs and concise failure classification.
- Add regressions for alternate-screen entry/exit, resize cleanup, transcript replay, human-readable tool summaries, exit codes, timeout and narrow-width safety.

# 3.5.2

- Add a Termux-safe fixed viewport with a persistent four-row identity/model/live-status header, a persistent three-row message composer and a dedicated middle scroll region for every response, code block and tool event.
- Preserve typed input and selected-model identity across work phases and terminal resizing; suspend/rebuild the viewport around confirmations, full-screen selectors, external editors and clear operations.
- Add exact 54-column and Android resize regression coverage for fixed row boundaries and persistent header content.
- Expand Creative Lab with a layered animated village: day/night interpolation, seven houses, clouds, landscape, trees, lit windows, traveler and fireflies.
- Extend deterministic animation QA to village transitions, 60 FPS health, cube/touch/keyboard motion, particle bursts, code activity, game controls and reduced-motion pause.
- Make `npm test` self-contained in CI/read-only home environments so the auditor's declared test gate is reproducibly green.
- Separate secret-looking values in tests/QA fixtures from candidates outside fixtures while preserving redaction and manual review for both.
- Publish a full 80/100 tree audit, component scorecard and 3.5.2 validation report with physical Termux/GPU limitations stated explicitly.

# 3.5.1

- Terminate complete POSIX process groups on shell timeout or user cancellation, escalate stubborn descendants to `SIGKILL`, and force the execution promise to settle when Android keeps pipe handles open.
- Stop pending sequential tool calls and skip recovery/replanning after cancellation while preserving structurally valid tool-call history.
- Add immediate natural cancellation in the busy Termux input queue and cleanly stop the active spinner before reporting the cancellation.
- Bound Chromium one-shot work to 45 seconds, remove generic double retries, and add a Playwright-free static fallback for open/snapshot/responsive checks.
- Expand regression coverage from 197 to 202 tests, including stubborn descendant processes, queued cancellation, tool-batch cancellation and browser fallback.

# 3.5.0

- Add the native `audit_report` tool and a built-in audit workflow that turns natural project/archive/session audit requests into a polished, downloadable Markdown file.
- Inventory files and ecosystems, redact secret matches, run declared verification and production dependency gates, capture Git/session evidence, score four readiness dimensions, and render referenced P0–P3 findings plus explicit limitations.
- Resolve direct downloads to Termux shared Downloads when available while preserving the normal workspace authorization prompt and a local `reports/` fallback.
- Prevent project-local settings from lowering permissions or injecting providers, MCP servers, hooks, packages, deployment behavior, routing or fallback policy.
- Require exact global MCP trust, minimize inherited stdio environment variables, apply network/redirect/size policy to MCP HTTP, and confirm MCP tools that are not declared read-only.
- Harden recursive forced-removal detection, IPv4-mapped IPv6 private ranges, ANSI-safe Git review parsing, CLI help and diagnostic exit status.
- Expand the suite from 183 to 197 tests and the native registry from 66 to 67 tools.

# 3.4.1

- Replace the duplicated startup splash/control/ready blocks with one compact three-line runtime identity.
- Redesign the message composer as a stable three-line frame: the selected model and reasoning stay in the top border, while readiness/provider/mode stay in the bottom border.
- Remove noisy path, transport, key-source and token-count details from the normal conversation surface; detailed status and usage commands remain available.
- Disable the pinned scroll-region composer on Termux and terminals narrower than 72 columns, preventing old terminal rows from being replayed inside streamed answers.
- Route composer rendering through its configured output stream and add regression coverage for persistent headers, exact 54-column geometry and zero Termux scroll-region writes.

# 3.4.0

- Add a contextual turn-understanding layer that extracts likely goal, targets, explicit constraints, done signals, discretion and material ambiguity without rewriting the user's original message.
- Resolve elliptical follow-ups such as “melhora isso” from recent conversation; withhold mutating tools and ask one concise question only when the missing choice is consequential.
- Add a persistent per-session continuity ledger for current/recent goals, targets, constraints, acceptance signals, unresolved choices and the previous outcome, independent of chat compaction.
- Add evidence-driven recovery state after tool failures: classify the failure, prevent equivalent retries, inject a replan contract and show a compact `replanning` event in the TUI.
- Replace the startup animation with a narrow-safe context-aware core, truthful provider/model/tool state and a polished private first-launch setup panel.
- Add a 254-case contextual/adversarial natural-language eval across explicit tasks, context references, ambiguity, discretion, alternatives, constraints, completion criteria, questions and remote-scope safety.

# 3.3.0

- Fix non-streamed multiline assistant responses being truncated to one terminal row.
- Add structured terminal Markdown for numbered code blocks, light syntax colour, tables, tasks, source links and summary/research headings while preserving 54-column Termux safety.
- Upgrade web discovery with domains, source types, snippets and ranked results; add `web_research` for multi-query source maps and deduplication.
- Expand Supabase from five actions to nineteen: local stack, link, migrations, reset/push, lint/tests, generated types, Functions and secret-file operations with confirmation gates.
- Resolve project-local Supabase CLI installations in both the tool and deploy preflight instead of requiring a global executable.
- Add `examples/blackcore-studio`, an installable offline-first application for code, summaries, research, product scores and optional authenticated Supabase sync with per-user RLS.
- Update the Android fixture to Expo SDK 57 / React 19.2 / React Native 0.86, add lockfiles and pass Expo Doctor 20/20.
- Refresh direct OpenAI Terra and Luna pricing metadata from the official August 2026 API catalog.

# 3.2.0

- Add native Termux/Linux permission and storage diagnostics through `blackcore permissions` and `doctor --permissions`.
- Add optional installer-assisted `termux-setup-storage` flow with clear Android authorization guidance.
- Report shared folders, workspace access, Termux:API capabilities, least-privilege state and honest Android boundaries.
- Detect dependency-free web, Flutter and PHP projects in the project/verification engine.
- Respect uv, Poetry and Pipenv when installing or testing Python projects; add deterministic Flutter APK workflows.
- Upgrade Creative Lab with a touch/mouse/keyboard 3D cube, live code activity stream and measured frame health.
- Add executable animation-runtime, project-detection, ecosystem-command and permission regression suites.
- Keep `version` and shell completion usable when BLACKCORE home is unavailable or read-only.

# 3.1.1

- Display live package and deploy-CLI installation progress instead of hiding long Termux operations.
- Stream each tool start and completion immediately, with compact redacted code/diff previews.
- Add a narrow-terminal confirmation panel and keep the live composer paused while approval is required.
- Add `blackcore doctor --full` dependency groups, installed profile and runtime-size diagnostics.
- Include the official Resend CLI in the full deployment profile.
- Install Supabase through its supported isolated npm project mode and expose a BLACKCORE wrapper instead of using unsupported global npm installation.

# 3.1.0

- Added ten native capability families: code intelligence, document reading/OCR, media, security scanning, API lab, ADB device testing, PostgreSQL, ecosystem workflows, containers and private local knowledge retrieval.
- Added Chromium animation-frame measurements and responsive multi-width audits to persistent browser sessions.
- Expanded GitHub inspection with PR diffs/checks and release listing/viewing.
- Expanded Termux profiles with Poppler, Tesseract, Android platform tools, PostgreSQL, Go, Rust and PHP/Composer while keeping heavy packages optional.
- Added regression coverage for all new tool registrations, local retrieval, secret-value redaction, document inspection and code references.

# 3.0.0

- Added real multimodal image input through `--image`, `-i` and natural `@image` mentions for vision-capable models.
- Preserved user-owned model selection for multimodal work: a non-vision model produces a clear error instead of an automatic model/provider switch.
- Added persistent interactive browser sessions with open, snapshot, click, type, key, console and close actions.
- Added staged AI-guided scanning for site maps, individual pages, repository hotspots and focused file ranges.
- Added structured Markdown, themed standalone HTML and Chromium-backed PDF report generation in the requested language.
- Hardened workspace authorization against symlink escapes by resolving real paths before read/write decisions.
- Added reproducible npm dependencies, five Termux installation profiles, staged activation and a previous-runtime rollback point.
- Added release ZIP/tarball/checksum/SBOM generation, Node 20/22/24 CI, Dependabot and GitHub contribution/security templates.
- Expanded the suite to 144 tests and retained the built-in tool and natural-intent matrices.

# 2.9.2

- Added a dependency-free Creative Lab fixture: responsive local site, animated Canvas 3D cube, heart particles and the Core Catch keyboard/mouse/touch game.
- Added a separate Expo/EAS Android APK source fixture, with a valid APK preview profile and no embedded credentials.
- Added static contract and syntax tests for both fixtures, then exercised the agent's natural site/cube creation flows and the built-in tool matrix.

# 2.9.1

- Restored a Codex/Pi-style natural flow: local coding, game and animation requests no longer expose cloud deployment tools by default.
- Added an intent-aware tool boundary plus executor-level remote-action block. Vercel, Netlify, Supabase, Resend, Expo/EAS, GitHub remote actions and deployment preflight require explicit user deployment intent.
- Reduced the visible slash surface to model choice, PLAN, ACT and quit; normal tasks remain natural conversation.
- Added tests for local animation scope, negated remote intent and a hallucinated blocked Vercel call.

# 2.9.0

- Hardened model ownership end to end. A manual model choice through natural language, the picker, SDK or JSON-RPC now locks the provider/model and turns off future automatic routing and fallback.
- Fallback now needs a live user confirmation at the actual provider failure. An approved replacement is temporary for that one prompt and never overwrites the saved selection.
- Added a one-time migration for older automatic routing/fallback settings so upgrades do not silently reuse a legacy automation policy.
- Added `/review` and colour-limited `/review full` Git review panels with changed-file counts, untracked files and whitespace-error evidence.
- Added safe isolated Git worktree list/create/remove support in both the terminal shortcuts and structured tool API.
- Added regressions for denied fallback, model lock persistence, picker/natural model selection, worktree lifecycle and Git review output.

# 2.8.1

- Reworked the TUI control panel into a safe post-login workspace view: provider transport, model, reasoning, work mode, project and tool count are visible, while API keys remain hidden.
- Added `/status`, a compact API/session dashboard that differentiates a configured key from a missing key without claiming remote authentication was verified.
- Rebuilt the composer footer around readiness, provider/model, reasoning, mode and project name; it no longer wastes the line on a truncated absolute path.
- Optimized the live composer so its animation refreshes only the status row at 8 FPS. Full message-panel redraws happen only on input or layout changes, reducing Termux flicker and terminal I/O.
- Added regression coverage for key redaction, status-panel content, compact project footer and partial live-animation repainting.

# 2.8.0

- Standardized the technical CLI/TUI surface in English while retaining Portuguese/English natural intent recognition.
- Added explicit response-language preference (`auto`, `en`, `pt-BR`) and a hard policy that user input is never auto-translated before reasoning or tool execution.
- Added direct OpenAI Responses API support via `OPENAI_API_KEY` for GPT-5.6 Sol, Terra and Luna.
- Added native `none`, `low`, `medium`, `high`, `xhigh` and `max` reasoning profiles for the direct GPT-5.6 catalog.
- Added streaming Responses text/function-call support with retries, cancellation and multi-turn tool-call history conversion.
- Added rendered `browser audit` checks for title, `lang`, viewport, landmarks, heading, alt and label evidence.
- Added a release-oriented website/browser-game QA prompt and skill, plus regression coverage for language policy, direct OpenAI models/Responses streaming and browser audit output.

# 2.7.2

- Added first-class optional Netlify, Supabase and Resend tools with bounded schemas, cancellation and clear CLI diagnostics.
- Netlify supports status, dry-run build, build, preview and production deployment; preview and production both require confirmation outside `yolo`.
- Supabase supports status, project listing, safe local/linked database lint, Function listing and explicitly confirmed Function deployment.
- Resend supports diagnostics, domains/sent-email listing and explicitly confirmed transactional email sending with 1–50 recipients.
- Added deploy preflight coverage, provider-aware project detection, motion glyphs and system diagnostics for the new integrations.
- Added safe preflight prompts and a GitHub Actions verification workflow for Node 20 and 22.
- Added repository ignore rules for credentials, local deployment state and generated artifacts; version metadata is now centralized to avoid stale UI/MCP labels.

# 2.7.1

- Fixed the legacy `/thinking` shortcut so it updates the active model's persisted reasoning setting and the request body really changes.
- Fixed `/permissions yolo` so all three interactive confirmation categories are disabled consistently.
- Doctor now distinguishes a healthy runtime from a runtime that still needs an API key before it can chat.
- One-shot CLI now executes local slash commands such as `blackcore -p /models` without spending tokens or requiring an API key.
- Re-authorized every HTTP redirect in `web_fetch`, `download` and `http_request`; response parsing is byte-bounded and downloads stream into an atomic temporary file with a timeout.
- Expanded secret redaction for standalone GitHub tokens, bearer tokens and JWT-looking values.
- Global extension files and package extension resources require explicit trust; packages installed through BLACKCORE are trusted by that explicit install action.
- Fixed documentation to use the delivered ZIP name, made Vercel/EAS installation opt-in, and added a manifest refresh script.

# 2.7.0

- Added **MESSAGE · LIVE**: the composer remains visible while the model is thinking and while tools are running; Enter queues follow-up instructions without interrupting the current step.
- Added distinct THINK/TOOLS live animations with elapsed time and queue status.
- Replaced the plain readline input with a dedicated Codex-inspired BLACKCORE composer.
- Added message box, cursor editing, history navigation, slash suggestions and compact model/effort/mode/path footer.
- Changed `/models` and `/model` into a three-stage Provider → Model → Reasoning picker.
- Grouped DeepSeek, Cerebras and WaveSpeed instead of showing one flat model dump.
- Added browser DOM/screenshot verification, SQLite, and public web-search tools.
- Added tool-call resilience: malformed trailing JSON recovery, duplicate-failure blocking, and negative caching for missing optional CLIs.
- Ollama is no longer exposed to the model when the Ollama CLI is absent.
- GitHub auth now has a fast cached path, shorter timeouts, no pager/update prompts, and a compatibility alias when a model mistakenly requests auth through the git tool.
- CLI discovery (`command -v`) is cached and system diagnostics probe tool versions in parallel.
- **Sticky model policy:** selecting a model locks it by default; automatic routing and provider fallback are opt-in. Cross-provider fallback is disabled unless explicitly configured, preventing silent provider/key changes.
- Doctor now reports whether each key comes from the environment or BLACKCORE secrets, without exposing the key.
- Added alternate-screen menus so selection does not pollute conversation history.
- Added 54-column regression coverage for the real composer, provider picker and live work composer.
- Retains the 2.5.1 slash-command crash fix and 2.4.1 hidden-confirmation fix.

# 2.5.1

- Fixed `/models` and other slash commands crashing because the command handler read `ui` from the wrong object.
- Added a command-dispatch error boundary and permanent slash-command regression coverage.

# 2.5.0

- Added WaveSpeed as a first-class provider with one `WAVESPEED_API_KEY`.
- Added curated coding/agent models: GPT-5.6 Luna, GLM 5.2, MiniMax M3, MiniMax M2.7, Qwen3 Coder, Gemini 3.1 Flash Lite.
- Added native reasoning profiles and natural aliases for WaveSpeed models.
- Luna Pro uses WaveSpeed Responses API; standard Luna uses Chat Completions.
- Added WaveSpeed pricing/context metadata to `/model`.
- Added Fusion Motion boot animation while retaining narrow-Termux safety and the 2.4.1 hidden-confirmation fix.
- Added provider-contract, model-selection and motion regression tests.

# 2.4.1

- Fixed apparent freeze during tool confirmations: active animation pauses while BLACKCORE waits for approval and resumes afterwards.
- Safe single-file cleanup in `/tmp` no longer triggers a destructive-command approval. Recursive and workspace deletion remain protected.
- Added regression tests for both cases.

# Changelog

## 2.4.0 — Model & Effort UI
- Added Codex-style two-stage `/model` picker: model first, native reasoning level second.
- Added arrow-key/Enter/Esc TUI selection with a non-TTY numeric fallback.
- Added `/` visual command palette.
- Added per-model reasoning profiles persisted independently.
- DeepSeek V4: Off/High/Max using the native `thinking` and `reasoning_effort` API controls.
- Cerebras GPT OSS 120B: Low/Medium/High using native `reasoning_effort`.
- Cerebras GLM 4.7: Off/On, parsed reasoning, and preserved thinking for agent loops.
- Added Cerebras reasoning adapter and parsing for the `reasoning` response field.
- Added natural aliases including Ultra/xhigh, mapped to the strongest real level available for the current model.
- Added natural reasoning on/off.
- Header now displays active model + reasoning level + `/model to change`.
- Added migration from 2.3 Cerebras provider settings and preservation of the previous active reasoning choice.
- Added provider, picker and per-model reasoning regression tests.

## 2.3.0 — Natural QA Hardened
- Added queued natural follow-up messages while the agent is busy; safety confirmations do not consume queued chat.
- Natural intent now also applies to one-shot CLI tasks (`blackcore -p`).
- Fixed colloquial Portuguese intent parsing, including GLM vs the Portuguese contraction “pro”, PLAN/ACT phrases, max reasoning, session restart and exit.
- Fixed package-manager selection to respect project lockfiles/packageManager and added Bun support.
- Fixed PATH preservation in shell/CLI discovery and Android Gradle wrapper execution.
- Fixed `json_edit` so set/merge can create a new JSON file.
- Hardened background process shutdown to kill the full process group.
- Added permanent tests for DeepSeek V4 reasoning_content replay, MCP stdio, SDK/RPC, Vercel/Expo/EAS, cancellation, input queue and one-shot natural routing.
- Completed full natural E2E QA: self-correcting website build, interactive 3D cube, 45-tool matrix, subagents, sessions and undo.

## 2.3.0 — Natural Agent
- Natural-language-first interaction; slash commands are optional power-user shortcuts.
- Pre-turn conversational control for model switching, PLAN/ACT, reasoning effort, animations, undo, session restart/resume and exit.
- New `agent_control` tool lets the LLM control BLACKCORE settings instead of instructing the user to type commands.
- Auto model routing enabled by default with Portuguese and English task classification.
- System prompt explicitly forbids requiring slash commands for ordinary operation.
- Simplified terminal header and help screen.
- Added regression tests for natural intents and self-control.

## 2.7.0 — Codex-style Composer
- Replaced the plain `you ›` readline prompt with a dedicated full-width TUI composer.
- Added highlighted input bar, cursor editing, history navigation, slash suggestions, and model/path/mode footer.
- `/models` now opens the same interactive model + effort picker as `/model` on TTYs.
- Compact Codex-inspired header while keeping BLACKCORE identity.
- Designed to stay within 54-column Termux terminals.

## 3.6.0 — Google Context Pool Phase 8
- Upgraded Google 4-key failover into a context-preserving execution pool.
- Added least-in-flight key leasing so up to four independent Google agents can work concurrently on safe task-graph nodes.
- Added handoff-safe streaming: abandoned partial output is buffered away when a retryable key/network failure triggers another Google key.
- Cached provider instances across model/tool rounds so the active key and Free Pool model remain sticky until a real failure.
- Added `delegate_ready` to automatically launch the largest safe ready task-graph wave (up to four agents).
- Preserved strict provider/model controls: no automatic cross-provider fallback and no model change for manually selected Google models.

## 3.6.0 — Google Tool Scope Phase 9
- Fixed a Google HTTP 400 failure mode by no longer sending the entire BLACKCORE native tool registry in every Google model request.
- Added task-aware Google tool scoping capped at 20 active function declarations while keeping the complete local registry installed.
- Added Google-specific function-schema normalization for compatibility without weakening BLACKCORE's internal execution validation.
- Improved Google/OpenAI-compatible and native Google HTTP errors so the actual provider message is visible in Termux.
- Preserved the Phase 8 four-key context pool, same-model handoff, and safe four-agent parallel execution.
