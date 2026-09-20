# BLACKCORE Native 3.7.10 validation

Date: 2026-08-22

## Result

- JavaScript syntax: **PASS — 348 files**.
- Full native suite: **PASS — 336/336 tests**.
- Focused photo, outfit and HUD suite: **PASS — 19/19 tests**.
- Failures, cancellations and skips: **0**.

## Strong photo-grade evidence

- Basic, medium and high BLACKCORE profiles have strictly increasing black point, sigmoidal contrast, saturation and detail strength.
- A real ImageMagick render proves the high profile exceeds its 0.025 normalized RMSE visible-change floor and differs more than basic.
- The real render preserves the exact 360×240 source dimensions and creates no crop object.
- Post-render tonal analysis proves increased standard deviation/separation rather than a blanket brightness-only change.
- Post-render texture remains above the 62% safety floor; excessive fine-detail loss rejects and removes the staged output.
- Shadow/highlight clipping risk reduces black/white point pressure automatically.
- `enhanceLight=false` disables black point, white point and sigmoidal contrast; `enhanceColor=false` disables saturation and channel grading.
- Existing original-file protection, photo formats, safe outfit replacement and no-fake output gates continue to pass.
- HUD stages expose `FRAME LOCK`, `BLACK LEVEL`, `CINEMA COLOR` and `DETAIL LOCK`.

## Commands

```bash
bash scripts/check-syntax.sh
node --import ./test/setup.js --test --test-concurrency=1 test/*.test.js
```

The managed environment used the existing test-only offline package-script shim for three tests whose nested `npm` runner would otherwise be classified as network-capable. The shim is outside the release and is not a runtime dependency.

## Honest scope

The stronger grade uses measured whole-frame tone, color and texture signals. It does not claim face recognition or semantic masks for local enhancement. Instead, the controlled curve and global fine-texture gate are designed to avoid destroying visible face, hair and clothing detail. Generative clothing replacement remains a separate optional GPU-backed feature.
