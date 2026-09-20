# BLACKCORE Native 3.7.2 — validation

## Implemented

- `auto_edit.editLevel`: `basic`, `medium`, `high`.
- Natural professional requests are routed to `high` by the system contract.
- Source-aware scene spacing and real xfade/acrossfade transitions.
- Per-shot restrained zoom/pan, Lanczos scaling, adaptive high-profile 1080p upscale.
- Studio/cinematic color pipelines, picture denoise, audio denoise/dynamics/loudness control.
- Bundled transparent BLACKCORE signature watermark, on by default for automatic edits.
- Four-hour FFmpeg and legacy default task window for long Termux renders.
- Fourteen numbered HUD stages with stable live progress, speed/ETA and deduplicated stage history.

## Verification

- JavaScript syntax checks passed.
- Real FFmpeg fixtures passed inspection, trim, timeline, analysis, basic/medium/high auto-edit, watermark, scene transitions, smart cut, blur reframe, captions, montage, beat detection and stabilization.
- Fixed Termux viewport, live stage progress, progress-event isolation and stage-history tests passed.
- Full `npm run verify` is the packaging gate.
