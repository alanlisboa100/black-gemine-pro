# BLACKCORE Native 3.7.9 validation

Date: 2026-08-22

## Result

- JavaScript syntax: **PASS — 348 files**.
- Full native test suite: **PASS — 334/334 tests**.
- Focused photo/video outfit and photo-editor suite: **PASS — 18/18 tests**.
- Failures, cancellations and skips: **0**.

## Commands

```bash
bash scripts/check-syntax.sh
node --import ./test/setup.js --test --test-concurrency=1 test/*.test.js
```

The managed verification environment blocked three test cases that spawn `npm` because it classified the nested package runner as network-capable. Those cases and the aggregate suite used the same test-only offline package-script shim as the prior release. The shim executes only declared local package scripts, lives outside the release and is not a runtime dependency.

## Photo outfit acceptance evidence

- Natural Portuguese wardrobe requests select both `photo_editor` and `outfit_editor` inside the bounded provider tool set.
- `photo_editor change_outfit` delegates to the same verified `change_outfit_photo` pipeline rather than ordinary enhancement.
- Direct image responses and asynchronous `image_url` job polling both complete.
- Multipart requests carry person/garment images, optional mask support, composition/identity/background locks and `clothed-only` safety.
- Output preserves the source width, height and aspect ratio, with professional JPG, PNG and WebP export.
- Normalized pixel comparison proves a material visual change and rejects unchanged or merely recompressed output.
- Failed output is staged separately and removed; the source and any previous destination remain protected until verification passes.
- Remote upload requires explicit opt-in; credentials come from named secrets and are never written into the media or report.
- Undressing, nudification and nude-generation requests are rejected before media processing.

## Video outfit regression evidence

- Existing temporal video wardrobe generation, source-audio restoration, duration lock, H.264/AAC export, 720p default and 2K ceiling still pass.
- SSIM continues to reject unchanged video output.
- Cross-origin signed result downloads still receive no backend bearer token.

## Honest scope

The release contains a real, tested Termux client, still-image/video quality gates and an open backend protocol. It does not bundle diffusion weights or silently download them. The verification environment had no CUDA GPU or virtual try-on model weights, so real-person model aesthetics are not claimed. Tests used deterministic local image/video backend fixtures to prove transport, routing, preservation, output and rejection behavior. Actual generative clothing replacement requires a configured compatible GPU bridge; without one BLACKCORE fails clearly and creates no fake edit.
