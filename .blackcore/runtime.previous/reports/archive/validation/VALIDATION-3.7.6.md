# BLACKCORE Native 3.7.6 validation

## Goal

Add natural environment-aware light, color and detail enhancement without adding a heavy phone dependency or weakening the chronological joint A/V editing fixed in 3.7.5.

## Implemented evidence

- RGB frames are sampled at 96×54 through local FFmpeg. Sample rate and maximum sample count are bounded per basic/medium/high profile and video duration.
- Deterministic metrics cover mean light, dark/highlight ratios, saturation, blue/green position, earth tones and edge density.
- Recognized tags are low-light, harsh-light, water, sky, grass, vegetation and mountain landscape. Every rendered segment receives the profile belonging to its source-time range.
- Filters are capped by `environmentStrength`: water/sky receive restrained blue and saturation; grass/vegetation receive restrained green; mountain landscape receives microcontrast/detail; low/harsh light receives gentle brightness/gamma control.
- The environment filter runs before the established natural/studio/cinematic grade and can be disabled with `environmentEnhancement: false`.
- Result JSON records samples, strength, summary, per-scene tag/confidence and only reports categories that actually received treatment.
- The Termux HUD shows `SCENE COLOR` and 18 numbered steps.
- Installer activation still replaces only `$BLACKCORE_HOME/runtime`; `$BLACKCORE_HOME/config/secrets.json` remains outside the replacement path.

## Checks completed

- Deterministic RGB unit fixture recognized water, sky, grass, textured mountain and low-light frames and generated restrained filters.
- Real FFmpeg 15-second fixture recognized and enhanced water, vegetation and low-light scenes and produced a valid MP4.
- Full `npm run verify`: 340 JavaScript files passed syntax validation; 315 tests passed, 0 failed.
- Video editor and progress suites inside the full run: 20 passed, 0 failed.
