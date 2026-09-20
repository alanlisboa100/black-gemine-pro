# BLACKCORE Native 3.7.16 — Release Validation

Date: 2026-08-24  
Target: Termux/Linux coding agent, explicit index-only sites, complete site/app delivery, continuity, SQL/RLS and media studios

## Verdict

**PASS for every locally executable release gate.** The release now distinguishes an intentional self-contained `index.html` from an incomplete site and refuses to certify a generic application that was delivered as HTML, a generic web package or an implicit PWA.

## Executed gates

| Gate | Result | Evidence |
| --- | ---: | --- |
| JavaScript syntax | PASS | 362 files checked |
| Full Node test suite | PASS | 368 passed, 0 failed |
| New focused regression | PASS | 17 passed: index-only, complete site, app repair and continuity |
| Natural-language evaluations | PASS | 254/254 |
| Bundled plugin syntax | PASS | MCP server and workspace modules parse |
| Bundled plugin tests | PASS | 7 passed, 0 failed |
| npm package dry-run | PASS | `blackcore-native@3.7.16`, 358 packaged files |
| Installer shell syntax | PASS | `INSTALAR-BLACKCORE.sh` parses successfully |

Total deterministic suite tests/evaluations: **629**.

## Delivery rules proved

### Intentional index-only site

- “só com index”, “somente index”, “apenas index.html”, “arquivo único” and `single-file` select the dedicated single-file contract.
- The result must contain a meaningful `index.html`, title, mobile viewport and embedded CSS.
- An animation must include embedded CSS keyframes or JavaScript; a game must include embedded JavaScript.
- Linked local CSS or JavaScript fails because it violates the requested index-only packaging.

### Complete website

- Without an explicit index-only instruction, `index.html` alone fails verification.
- A complete static site requires linked CSS, linked JavaScript, mobile metadata and README.
- Framework projects require an application entry, stylesheet, production build command and a test/check/typecheck/lint command.
- The end-to-end test proves incomplete index → verification failure → repair → successful verification → continuation in the same project.

### Real application

- A generic Android/mobile application cannot pass as `index.html`, a web-only package or an implicit PWA.
- Expo/React Native requires app configuration, unique Android package id, source entry, start command, Android run/build command, test/check command and README.
- Flutter and native Android retain their source, manifest/build and test structure requirements.
- PWA/browser delivery is accepted only when the request explicitly says web app or PWA.
- The new end-to-end test intentionally creates only `index.html`, proves rejection, then repairs the same project into a verified Expo application.

### Natural language and continuity

- Portuguese creation wording includes “quero”, “preciso” and accented “faça”.
- Follow-up work stays in the active project even when the new message contains create/site/app words.
- A separate folder requires an explicit another/new/separate/from-scratch request.
- Live Termux projects default to `~/BLACKCORE-Projects`; Downloads is reserved for imports and exports.

### Existing systems retained

- Supabase SQL migrations, forced owner-scoped RLS and SELECT/INSERT/UPDATE/DELETE policy gates passed.
- Photo, video, outfit, regional selection, audio preservation and real FFmpeg media regressions passed.
- Security, recovery, sessions, task graph, provider routing, plugins and Termux TUI regressions passed.
- Installation continues preserving credentials, configuration and sessions outside the replaced runtime.

## Honest external limits

- No physical Android/Termux device, ADB target, Android SDK, hosted Supabase project, Chromium installation or deployment account was attached.
- `rembg`, GPU outfit inference and remote temporal segmentation were not installed in this runner.
- Their local contracts, routing and failure behavior passed; real-device and hosted-service execution still depends on those external systems.

## Acceptance

BLACKCORE Native 3.7.16 passed all available deterministic release gates with zero failing tests. It now follows the user's requested artifact type instead of treating every site or application as a generic `index.html` project.
