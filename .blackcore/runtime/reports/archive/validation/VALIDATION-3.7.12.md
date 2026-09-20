# Validation — BLACKCORE Native 3.7.12

## Result

- JavaScript syntax: **352 files passed**.
- Full regression suite: **346 passed, 0 failed, 0 skipped**.
- Focused photo/editor/HUD suite: **16 passed**.
- Shell syntax: photo AI installer and both `rembg` wrappers passed `bash -n`.

## New behavior proven

- `photo_editor analyze` returns measured findings, selectable changes and preset/scope readiness.
- Read-only analysis creates no edited output and reports `noChangesApplied=true`.
- Full and manual-mask choices are available without an AI dependency.
- Subject/background and named-detail choices are marked unavailable when their mask backend is absent.
- Existing full, manual mask, alpha subject and semantic detail edits still pass the regional pixel gate.
- Termux installer dry-run uses an isolated Ubuntu PRoot and leaves a fixture `config/secrets.json` byte-for-byte unchanged.
- Grounded SAM 2 installation is rejected inside Termux instead of starting a phone-hostile GPU stack.

## Commands

```bash
bash scripts/check-syntax.sh
node --import ./test/setup.js --test --test-concurrency=1 test/*.test.js
node --test test/photo-advisor.test.js test/photo-editor.test.js test/photo-selection.test.js test/tui-activity.test.js test/tui-media-progress.test.js
bash -n scripts/install-photo-ai.sh scripts/rembg-proot-wrapper.sh scripts/rembg-linux-wrapper.sh
```

The two commands in the normal `npm run verify` contract were executed directly because the isolated release runner blocks package-manager network approval even for a dependency-free local script.
