# BLACKCORE 3.7.14 validation

## Acceptance target

A localized light/color/detail request must never become a whole-frame photo or video filter. Window and eye adjustments need real selections; video selections need temporal tracking.

## Verified behavior

- `diminui a luz da janela` is detected as `window/detail`.
- `brilho somente nos olhos` is detected as `eyes/detail`.
- an explicit whole-photo/whole-video request remains global.
- a localized photo call with `editScope=full` is rejected before rendering.
- a selective photo mutation without the original request or explicit scope is rejected.
- normalized rectangle/polygon masks and eye ellipses create partial masks.
- real ImageMagick window and two-eye renders pass inside-change and outside-leakage gates.
- a localized video call routed to `auto_edit`/`color_grade` is rejected.
- `regional_edit` without a temporal mask/backend is rejected before output creation.
- a real FFmpeg temporal-mask render passes duration, coverage and no-global-fallback checks.
- video audio/timeline are preserved during the regional pass.
- read-only photo/video analysis remains allowed for localized questions.
- Google-compatible nested tool schemas, natural-language policy and installer checks pass.

## Executed gates on the final revision

- `bash scripts/check-syntax.sh` — **PASS**, 357 JavaScript files.
- regional/photo render suite — **PASS**, 12 tests.
- video editor/advisor/progress suite — **PASS**, 24 tests.
- config/schema/natural-policy/tool-registration suite — **PASS**, 18 tests.
- installer/photo-advisor suite plus `bash -n` — **PASS**, 6 tests.
- `npm run verify` — syntax completed; the complete serial suite reached the pre-existing deep engineering-loop test and the external sandbox approval channel disconnected before its nested verification command could run. This was an execution-environment interruption, not a failing assertion. The changed media, schema, policy, config and installer paths were covered by the focused green suites above.

## Secret preservation

`INSTALAR-BLACKCORE.sh` stages and swaps only `~/.blackcore/runtime`. It does not remove or overwrite `~/.blackcore/config`; the final installer output explicitly reports `Keys preserved: ~/.blackcore/config/secrets.json`.
