# BLACKCORE Native 3.7.11 validation

Date: 2026-08-22

## Result

- JavaScript syntax: **PASS — 350 files**.
- Full native suite: **PASS — 342/342 tests**.
- Failures, cancellations and skips: **0**.
- Focused photo editor and selective-mask paths are included in the full pass.

## Selective-edit evidence

- A real ImageMagick high BLACKCORE render limited by a 50% manual mask passes the inside-change and outside-leakage gate.
- A local mock semantic endpoint receives `scope=detail`, the requested Portuguese `region_prompt` and the white-pixel contract, then returns a real mask used by the final composite.
- A transparent PNG proves local subject selection from meaningful alpha without a remote model; output transparency remains preserved.
- A background-scoped high edit proves that a backend-provided background mask is applied and its real coverage is reported.
- Detail selection without a mask or configured semantic endpoint fails explicitly and produces no fake result.
- The regional gate measures mean delta inside, changed fraction inside and mean delta outside before crop, text or branding can affect the result.
- The photo asset contains `AI PHOTO STUDIO`, while the video editor continues to reference the separate `AI VIDEO STUDIO` watermark.

## Preserved behavior

- Full-frame basic, medium and high grades continue to pass their increasing visible-change thresholds.
- Strong BLACKCORE grading preserves framing unless crop/resize was requested and retains at least the established fine-texture floor.
- JPG/JPEG, PNG, WebP, AVIF, HEIC/HEIF, TIFF, BMP and first-frame GIF input support remains codec-dependent on ImageMagick.
- The original file is never overwritten.
- The Termux installer still stages and activates only `~/.blackcore/runtime`; settings and `~/.blackcore/config/secrets.json` remain outside the replaced directory, with `runtime.previous` retained for rollback.

## Commands

```bash
bash scripts/check-syntax.sh
PATH=/tmp/blackcore-test-bin:$NODE_RUNTIME:/usr/bin:/bin node --import ./test/setup.js --test --test-concurrency=1 test/*.test.js
```

The managed verification environment used the established test-only offline package-script shim for tests whose nested `npm` runner would otherwise be classified as network-capable. It executes only declared local package scripts, lives outside this release and is not a runtime dependency.

## Honest automatic-selection scope

Manual masks always work locally with ImageMagick. Subject/background automation requires meaningful source alpha, an optional installed `rembg` command or a configured segmentation endpoint. Arbitrary named details require a supplied mask or real semantic segmentation backend. The editor reports an error when these are unavailable instead of claiming that a global filter was selective.
