# BLACKCORE Native 3.7.15 — Release Validation

Date: 2026-08-24  
Target: Termux/Linux coding agent, complete site/app delivery, continuity, SQL/RLS and media studios

## Verdict

**PASS for the locally executable release gates.** The release no longer accepts an `index.html`-only result for a complete website, keeps follow-up work in the active project, validates installable application structures and blocks incomplete Supabase RLS before completion.

## Executed gates

| Gate | Result | Evidence |
| --- | ---: | --- |
| JavaScript syntax | PASS | 361 files checked |
| Full Node test suite | PASS | 365 passed, 0 failed, 0 skipped |
| Natural-language evaluations | PASS | 254/254 across explicit, contextual, ambiguous, autonomy, alternatives, constraints, acceptance and local/remote scope |
| Bundled plugin syntax | PASS | MCP server and workspace modules parse |
| Bundled plugin tests | PASS | 7 passed, 0 failed |
| npm package dry-run | PASS | `blackcore-native@3.7.15`, 358 packaged files |
| Release archive | PASS | Termux ZIP, npm TGZ, CycloneDX SBOM and SHA-256 list generated |
| Doctor full | PASS for required runtime | Node, Git, npm/npx, FFmpeg, ffprobe and ImageMagick detected with versions; optional missing tools reported honestly |
| Installer command surface | PASS | profiles/help, staged runtime replacement and key-preservation checks |

Total deterministic checks/evaluations recorded above: **626**.

## Product regressions proved

### Complete websites

- An intentionally incomplete `index.html`-only site is rejected by `verify`.
- The agent receives repair evidence, creates linked HTML/CSS/JavaScript plus README, then passes verification.
- Framework projects additionally require application source, stylesheet, production build and a test/lint/typecheck/check command.
- Single-file output remains possible only when the user explicitly requests a single-file demo.

### Continuity and Termux workspace

- A follow-up such as “agora cria uma página” continues in the exact active project even though it contains creation and site words.
- A new folder is created only for an explicit another/new/separate/from-scratch project request.
- Live Termux projects default to `~/BLACKCORE-Projects`; Downloads remains available for imports and exported archives.
- Existing user repositories are never redirected.

### Applications

- Expo/React Native contracts require app configuration, source entry, start and Android run/build commands, and README.
- Flutter contracts require `pubspec.yaml`, `lib/main.dart` and tests.
- Android contracts require Gradle root/module configuration and `AndroidManifest.xml`.
- Installable PWA contracts require the complete web structure, manifest and service worker.

### SQL and RLS

- Supabase work requires `supabase/config.toml` and versioned migration SQL.
- The contract requires table creation, enabled and forced RLS, `auth.uid()` ownership, and SELECT/INSERT/UPDATE/DELETE policies.
- INSERT and UPDATE require `WITH CHECK`.
- Privileged Supabase credential patterns in client/project text fail the contract.
- The included BLACKCORE Studio Supabase fixture passed its RLS and no-privileged-key regression.

### Photo, video and outfit studios

- Regional photo edits passed for window, two eye ellipses and vertical 9:16 selection without outside leakage.
- Regional video passed with a real temporal mask and rejected the no-tracking fallback.
- Photo full/selected edits, visible-delta gates, composition protection and advisor flow passed.
- Video analyze/auto-edit/montage, distinct basic/medium/high profiles, A/V chronology, audio lock, smart cuts, transitions, environment enhancement, stabilization, HUD progress and mobile limits passed with real local FFmpeg media.
- Outfit photo/video backend contracts, temporal jobs, audio preservation, unchanged-output rejection, remote consent and 2K ceiling passed.

### Runtime and recovery

- Task checkpoints, crash recovery, session repair, continuation ledger and project history passed.
- The site end-to-end regression proved failure → repair → verification → follow-up continuation.
- Tests disable npm update/audit/fund network side effects so the suite stays deterministic and offline-safe.

## Secrets and installation

- No production key is bundled in the release archive.
- The installer stages a new runtime separately and preserves `~/.blackcore/config/secrets.json`, settings and sessions outside the replaced runtime directory.
- Tests use an isolated `BLACKCORE_HOME`; no user key or phone configuration was read, modified or removed.

## Honest limits

- The executed runtime was Node.js 24 on Linux. CI remains configured for Node.js 20, 22 and 24, but Node 20/22 binaries were not available in this environment for a second local execution.
- No physical Android/Termux device, ADB target, Gradle Android SDK, Chromium installation, hosted Supabase project or remote deployment account was attached. Their contracts, routing, permission gates and fixtures passed; a real device/cloud release still requires those external systems.
- `rembg`, a GPU outfit backend and remote temporal segmentation were not installed here. Optional-backend availability and failure behavior were tested without claiming that absent models executed.
- API-key provider tests use controlled fixtures; no paid/live model quota was consumed as release evidence.

## Acceptance

The 3.7.15 source and release package satisfy the requested local acceptance gates with zero failing deterministic tests. External-device and hosted-service checks remain explicitly separated instead of being reported as completed.
