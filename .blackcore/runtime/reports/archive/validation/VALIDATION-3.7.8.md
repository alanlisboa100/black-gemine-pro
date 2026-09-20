# BLACKCORE Native 3.7.8 validation

Date: 2026-08-22

## Result

- JavaScript syntax: **PASS — 347 files**.
- Full native test suite: **PASS — 330/330 tests**.
- Outfit-specific suite: **PASS — 10/10 tests**.
- Failures, cancellations and skips: **0**.

## Commands

```bash
bash scripts/check-syntax.sh
node --import ./test/setup.js --test --test-concurrency=1 test/*.test.js
```

The managed verification environment blocked the three test cases that spawn `npm` because it treated the nested package runner as a network-capable process. Those cases and the aggregate suite were rerun with a test-only offline package-script shim. It executes the declared local package script and cannot access the network. This shim is outside the release and is not a runtime dependency.

## Outfit acceptance evidence

- Natural Portuguese wardrobe requests select `outfit_editor`.
- Direct `video/mp4` backend responses and asynchronous job polling both complete.
- The multipart request includes `clothed-only`, temporal consistency and identity/background preservation controls.
- Source audio remains present after the visual generation pass.
- Source scene order, speed and duration remain locked within bounded tolerances.
- Phone output is H.264/AAC MP4, defaults to 720p and is mathematically capped at 2K.
- SSIM rejects a backend that returns the unchanged source.
- Remote upload requires `allowRemote=true` and an additional confirmation outside yolo mode.
- A backend bearer token is never forwarded to a cross-origin signed result URL.
- Nudification and undressing requests are rejected before media processing.
- Failed output is staged separately and cannot erase the previous destination before verification succeeds.

## Honest scope

The release contains a real, tested Termux client and an open backend protocol. It does not bundle diffusion weights or silently download them. The test environment did not contain a CUDA GPU or SwiftTry weights, so model-quality inference against a real person was not claimed. A configured SwiftTry-compatible GPU bridge is required for actual generative outfit replacement; without one the tool fails clearly and does not create a fake edit.
