# BLACKCORE Native 3.7.0 — Video Studio Validation

Date: 2026-08-21

## Result

The 3.7 video-studio implementation is verified on Node.js 24.19.0 with FFmpeg/ffprobe 6.1.1. Every new video regression and every directly affected integration suite passed.

## Executed evidence

- JavaScript syntax: 337 files checked successfully.
- Video studio: 7/7 tests passed with real generated media.
- Directly affected integration suites: 44/44 tests passed across video editing, built-in capabilities, natural intent, Google tool scoping, Termux permissions, instruction precedence, schema validation, tool-executor resilience, installer behavior, archive handling, CLI help/version and provider streaming.
- Release metadata: package, lockfile, runtime version, installer and `VERSION` agree on 3.7.0.
- Patch hygiene: `git diff --no-index --check` reported no whitespace errors.

## Real video paths exercised

- inspection, trim and multi-segment timeline;
- quick analysis with scenes, silence and loudness;
- automatic edit with color and audio mastering;
- heterogeneous two-clip dissolve montage;
- synthetic 120 BPM detection and music-synced edit with voice ducking;
- actual silence removal from a speech-gap fixture;
- vertical blurred-background reframing;
- styled subtitle burn-in;
- two-pass vidstab stabilization.

## Full-suite limitation

`npm run verify` completed the complete syntax stage, then the host sandbox disconnected when the pre-existing `agent-engineering-loop.test.js` launched a nested verification command inside its temporary fixture. Running that file alone produced the same host-level disconnect before a test result. It was not counted as passed. The test does not touch the video editor. All other claims above are limited to commands that returned an explicit zero exit code.

## Device limitations

No physical Android/Termux render or long-form 4K thermal/memory test was available in this environment. Local Whisper captioning was integration-reviewed but not executed because no Whisper executable/model was installed. The runtime checks the backend and model and fails honestly instead of silently downloading or claiming captions.
