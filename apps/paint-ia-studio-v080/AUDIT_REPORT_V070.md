# BLACK PAINT STUDIO — AUDIT & REPAIR REPORT v0.7.0

## Root cause found

The imported Misuki V2 pack existed only under `runtime/saza_import/`. The v0.6.2 runtime never imported that JSON, never used it to plan character geometry, and never used its checkpoints. It was documentation, not executable behavior.

## Critical findings in v0.6.2

1. **Spec was disconnected from the engine.** No production Python file referenced `BLACKCORE_MISUKI_VISUAL_ENGINE_SPEC_V2.json`.
2. **Character rendering was hardcoded and one-pass.** `CharacterBuilder` drew fixed Pillow polygons/lines. A prompt could change only a few heuristic fields, not the real construction procedure.
3. **VisualMemory did not teach character generation.** Its adaptive policy only affects the photo editor. Character generation logged history but did not learn from it.
4. **Critic did not know Misuki.** It measured luminance, contrast, symmetry and edge density. A visibly crude Misuki could receive ~98/100 because identity was not evaluated.
5. **No stage gates.** The engine could continue from a bad head/hair structure straight into detail and export.
6. **The project is not actually controlling Microsoft Paint.** Core generation uses Pillow; the web editor uses HTML Canvas. The word Paint describes the studio/interaction model, not OS-level Paint automation.
7. **The ZIP contains many standalone masterpiece scripts.** They are useful experiments, but they are not the same as the integrated engine path used by `/api/generate`.

## v0.7.0 repair

- Added `MisukiRuntimeSpec` loader so the machine-readable spec is executed by the runtime.
- Added compact permanent memory V3 with corrected behavior.
- Added `MisukiCheckpointBuilder` with P01-P14 stages.
- Added `StageCritic` for structural checkpoint validation.
- Added explicit negative rules for roof hair, comb-line hair, rectangular torso, bar-placeholder outfit and detached horns.
- Added machine-readable `paint_program` with normalized coordinates, tools, widths and validation conditions.
- Added checkpoint snapshots for every stage when `save_stages=true`.
- Separated global technical score from Misuki structural fidelity.
- Structural fidelity is explicitly a geometry proxy and is capped at 90 until a true reference-aware vision model is connected.
- API now returns `fidelity`, `checkpoints`, `telemetry`, `stage_paths`, `paint_program_path` and `paint_program`.
- UI status reports technical score + structural score + checkpoint failures.
- Added regression tests that reject the exact old failure pattern: flat roof hair, too many parallel lines, tiny eyes, detached horns, rectangular torso and horizontal outfit bars.

## Important limitation that remains

v0.7.0 is still a procedural local renderer. It is substantially more controlled and auditable, but it is not a diffusion/vision model and therefore cannot reproduce a detailed anime reference with neural-level visual understanding. The architecture now makes that limitation explicit instead of reporting false confidence.
