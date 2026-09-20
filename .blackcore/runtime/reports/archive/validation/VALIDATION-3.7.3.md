# BLACKCORE Native 3.7.3 — validation

## Implemented

- Continuous source-audio lock for automatic edits, with no soundtrack cuts, crossfades, speed changes or mastering by default.
- Duration-preserving visual xfade handles around contiguous scene boundaries.
- Motion-aware scene protection and sparse transition ranking near beat peaks.
- Requested or estimated funk, pagode, sertanejo and pop rhythm profiles, with neutral fallback when confidence is low.
- Eased dissolve, custom heart, burst and optional silent visual reverse effects.
- Fast 720p mobile-HD default and a 2K ceiling.
- Sixteen semantic HUD stages, including scene intelligence, music identity, audio lock and mobile render.
- Installer activation that leaves global settings and API secrets outside the replaced runtime.

## Verification

- JavaScript syntax checks passed.
- Real FFmpeg fixtures passed heart and burst transitions, basic/medium/high auto edits, motion parsing, musical scene selection and music-safe source-audio copying.
- A scene-changing six-second music fixture retained the complete duration and original AAC stream after the medium visual edit.
- Full `npm run verify` remains the packaging gate.
