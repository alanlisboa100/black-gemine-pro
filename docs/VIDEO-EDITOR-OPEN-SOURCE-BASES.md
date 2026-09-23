# Open-source bases studied for BLACKCORE 3.7.5

No external desktop editor or Python runtime is bundled. BLACKCORE keeps its zero-mandatory-npm-dependency Node.js + local FFmpeg architecture and adapts the useful editing methods below for Termux.

## Auto-Editor

- Source: https://github.com/WyattBlue/auto-editor
- License: Unlicense/public domain.
- Applied ideas: activity-based automatic editing, audio/motion modes, boolean combinations and margin around retained material.
- BLACKCORE implementation: local silence and motion maps become deterministic ranges. `audio-or-motion` keeps content when either signal remains active and removes only their joint inactivity.

## PySceneDetect

- Source: https://github.com/Breakthrough/PySceneDetect
- License: BSD-3-Clause.
- Applied ideas: content-change scene boundaries, threshold control and scene-oriented splitting.
- BLACKCORE implementation: FFmpeg's content scene score supplies chronological cut candidates without requiring Python or OpenCV on the phone.

## Editly

- Source: https://github.com/mifi/editly
- License: MIT.
- Applied ideas: a declarative non-linear timeline, per-cut transitions, source audio, music mixing and automatic crossfades.
- BLACKCORE implementation: a native FFmpeg filter graph trims picture/audio from identical intervals and pairs `xfade` with `acrossfade`.

## BeatNet (evaluated, not bundled)

- Source: https://github.com/mjhydri/BeatNet
- License: CC BY 4.0.
- Beat/downbeat inference is useful, but its Python, Librosa, Madmom and PyTorch stack is too heavy to make mandatory in a small Termux runtime. BLACKCORE keeps its local energy/peak/BPM detector and can use the free Google model pool already configured in the agent for higher-level creative decisions.

## Integration rule

The sources above informed behavior and architecture; BLACKCORE did not copy their desktop interfaces. Rendering remains local and auditable through FFmpeg. The default preserves chronological story order, applies joint picture/sound cuts, protects active scenes and reports only the changes that the completed output actually contains.
