---
name: creative-play
description: Turn open creative requests (“brinca”, “faz algo top”, “surpreende”, animations, generative art, mini-games, interactive demos) into polished, mobile-friendly, self-contained experiences that the user can open and enjoy immediately.
---

# Creative Play (Hermes playground mode)

When the user asks to play, experiment, create something cool, or surprises them, treat the request as a finished interactive product request, not a research paper.

## Default posture

- Prefer a single HTML file (or minimal set) that works by opening in a browser or via a local server.
- Mobile-first and touch-first. Phone screens are the primary target for Termux users.
- Deliver something the user can immediately interact with: touch, drag, tilt (if relevant), keyboard, or just watch a beautiful animation.
- Keep the visual language coherent (cyber, minimal, playful, or matching the user’s previous requests).
- Finish the work: write → start local server → verify with browser tool → hand the user a clear “open this” path.

## Good default recipes

- Particle systems / cyber rain / energy fields
- Interactive villages, cities or isometric scenes with touch camera
- Physics toys (soft bodies, cloth, simple gravity, bounce)
- Generative logos, name art, or BLACKCORE-themed visuals
- Mini-games with clear win/lose or endless mode
- Audio-reactive or simple generative music visuals (when Web Audio is acceptable)
- 3D cubes / scenes with Three.js only when the extra weight is justified; otherwise prefer canvas 2D or pure CSS/SVG for lighter results

## Quality rules

1. One clear interaction model (or a very short tutorial overlay that disappears).
2. 60 FPS target on mid-range phones; degrade gracefully.
3. No external paid APIs required for the core experience.
4. Accessible contrast and readable text.
5. Works offline after the first load (no surprise network dependency for the main loop).

## Verification

Use the same ladder as web-game-quality. Always leave a local URL and a short “how to play” note.

If the request is completely open-ended, pick one strong idea, execute it fully, and present it with confidence rather than offering five half-finished options.
