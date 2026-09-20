# BLACKCORE Native 3.7.4 validation

## Goal

Prevent `auto_edit` from returning the original visual sequence with only color treatment and a watermark while retaining the approved picture quality and the complete source soundtrack.

## Implemented evidence

- Automatic audio-locked edits now build an independent visual EDL with duration-scaled highlight recuts and punch-ins.
- Highlight sources are selected from nearby detected shots using motion, proximity, freshness and alternating direction signals.
- Transition entrances/exits receive arbitrary-source picture handles, so xfade overlap does not shorten the soundtrack.
- No automatic speed ramp was added. Reverse remains opt-in and visual-only.
- `EDIT DELTA` samples the planned edit moments, excludes the lower watermark region and calculates SSIM against the original. A score at or above `0.985` rejects and removes the output instead of reporting success.
- The result JSON records exact creative edit and transition plans plus the visual-verification measurement.
- The Termux HUD now presents 17 stages, including `VISUAL RECUT` and `EDIT DELTA`.
- Default video output names use MP4 for phone compatibility; explicit output paths remain respected. Common phone/camera inputs include MP4, MOV, MKV, WebM, M4V, AVI, 3GP/3G2, MTS/M2TS and TS.
- The installer still swaps only `$BLACKCORE_HOME/runtime` and leaves `$BLACKCORE_HOME/config/secrets.json` outside the replacement path.

## Checks completed

- Parallel syntax validation: 339 JavaScript files passed `node --check`.
- Real FFmpeg video editor/progress tests: 16 passed, 0 failed.
- CLI, schema, natural intent, Termux installer, security, tool-status, TUI and work-protocol integration tests: 24 passed, 0 failed.
- The real six-second music/scene fixture kept full duration and AAC audio, created a shifted highlight recut, and passed the SSIM edit-delta threshold.

The repository-wide sequential `npm run verify` command was started, but the execution channel disconnected while its slow syntax phase was still running. The changed areas were therefore rechecked through the focused suites above plus the parallel repository syntax pass; this document does not claim that the interrupted aggregate command completed.
