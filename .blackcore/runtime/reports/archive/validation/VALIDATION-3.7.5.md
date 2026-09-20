# BLACKCORE Native 3.7.5 validation

## Goal

Replace the confusing independent picture recut with a real chronological edit where picture and embedded audio are cut together, while retaining the approved visual quality and an explicit “do not alter the music” mode.

## Implemented evidence

- `preserveSourceAudio` is no longer enabled implicitly. Normal `auto_edit` trims picture/audio from identical source intervals and pairs every `xfade` with an equal-duration `acrossfade`.
- The default `audio-or-motion` activity rule removes only simultaneous silence and low motion, protecting speech, dance and action. Explicit `audio`, `motion`, `audio-and-motion` and `scene` rules are schema validated.
- Low-motion ranges, range intersection, content-scene cuts, beat/peak fallback points and cut padding are deterministic local analysis steps.
- Default segments stay in increasing source-time order. Arbitrary-source `creativeRecut` requires an explicit request and is never the normal path.
- `EDIT DELTA` verifies actual joint edit boundaries. Explicit audio-lock mode receives a structural chronological-transition check instead of a false SSIM failure against a deliberately unchanged soundtrack timeline.
- Result JSON records activity method, detected silence, low-motion and inactive ranges, source order, transitions, actual duration reduction and visual verification.
- The user-facing change report names only effects and processing that actually ran, including transition kinds, punch-ins, motion passes, picture/audio cuts and speed preservation.
- The Termux HUD exposes `A/V SMART CUT` and `AUDIO CUT/MIX`; `AUDIO LOCK` appears only for an explicit locked soundtrack.
- The installer still swaps only `$BLACKCORE_HOME/runtime` and keeps `$BLACKCORE_HOME/config/secrets.json` outside the replacement path.

## Checks completed

- Repository syntax: 339 JavaScript files passed `node --check` through `scripts/check-syntax.sh`.
- Focused CLI, schema, natural intent, installer, security, tool-status, narrow-TUI, work-protocol and video suites: 43 passed, 0 failed.
- Repeated real FFmpeg video editor/HUD suite after the final reporting change: 18 passed, 0 failed.
- Real joint-edit fixture: chronological source order, nonzero timeline reduction, embedded AAC audio, matched picture/audio transitions, no creative source replacement, no speed change and successful edit-delta verification.
- Real explicit audio-lock fixture: full six-second duration, chronological scenes, continuous AAC soundtrack and no creative source replacement.
- CLI reports `BLACKCORE Native 3.7.5`; installer help completed successfully.

The aggregate `npm run verify` wrapper and the all-test wildcard command were blocked before execution by the work environment's network/approval transport classification. The underlying syntax command and task-relevant suites above were run directly; this document does not claim the blocked aggregate wrapper completed.
