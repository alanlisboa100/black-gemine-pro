---
name: web-game-quality
description: Build, repair and verify production-ready websites, interactive apps, browser games, animations and generative visuals that work excellently on desktop and mobile (including Termux-tested phone browsers).
---

# Web, Animation & Game Quality (Hermes-level)

Treat every user-visible project as a finished product the user can open on a phone and enjoy immediately.

## Before changing code

1. Use `project_detect`, `repo_map` and focused reads to identify the stack, runtime, controls, assets, routes and tests.
2. Read the existing package scripts/config instead of inventing commands.
3. Record an explicit short test plan before broad UI/game/animation work.
4. Prefer the lightest stack that still delivers the requested quality (vanilla HTML/CSS/JS for many demos; Three.js / canvas / SVG only when needed).

## Implementation bar – Professional & Mobile-first

- Keep desktop and narrow mobile layouts fully usable (test ~360–430 px width).
- Use semantic landmarks, one meaningful `h1`, `html[lang]`, title and responsive viewport metadata (`width=device-width, initial-scale=1, viewport-fit=cover`).
- Give controls accessible names; support keyboard focus as well as pointer/touch.
- Prefer `pointer` events + `touch-action: none` (or `manipulation`) for drag/gesture controls; always reset pointer state on `pointercancel` / `lostpointercapture`.
- For pure visual / generative work (particles, cubes, villages, waves, cyber effects): keep the main loop at ~60 FPS target, throttle or simplify on low-power devices, avoid layout thrashing.
- Separate pure game/animation rules and state transitions from DOM/canvas rendering so logic can receive deterministic tests.
- Keep assets sized intentionally. Never ship debug consoles, placeholder errors or broken links in a path the user will open.
- Single-file or few-file demos are preferred for “brincar / cria algo top” requests unless the project already has a multi-file architecture.
- Dark / cyber aesthetic is welcome when it matches BLACKCORE or the user’s request; always keep contrast readable.

## Animation & Generative specifics

- Prefer `requestAnimationFrame`. Measure real frame timing with the browser `animation` action when available.
- For particles / many objects: use object pools, avoid creating garbage every frame, prefer typed arrays or simple reuse when performance matters.
- Support both touch and mouse with the same handlers.
- Provide a clear “how to play / how to interact” hint on first load (can be subtle).
- On mobile, avoid heavy blur filters or massive shadow stacks unless they are essential and performant.
- When the user asks for “animação top de linha profissional”, aim for smooth easing, layered motion, and a polished feel rather than raw demos.

## Verification ladder (mandatory for interactive work)

1. Run syntax/lint/typecheck and focused unit tests (especially pure state/rules).
2. Run the production build when a bundler exists.
3. Start a local server with `process_start`; confirm readiness with `port_check`.
4. Use `browser audit` at desktop (~1280) and mobile (~360–390) widths. Fix title/lang/viewport/heading/landmark/alt/label findings that are relevant.
5. Capture a screenshot or use `browser animation` / `responsive` when visual or timing evidence is needed. If no Chromium-compatible browser is installed, say so precisely; do not pretend a DOM/build test proved visual behavior.
6. For interaction-heavy games and drag controls, add or run state/input tests. Do not label pointer/touch behavior as verified only because static HTML exists.
7. Confirm the page remains usable after a soft reload and after rotating orientation (when practical).

## Handoff

State exactly which commands passed, what browser evidence exists, the local URL the user can open, and any external requirement (credentials, deploy target, domains, analytics) that remains. Remote publication is always a separate authorized action.

When the user asked to “brincar” or for something playful, end with a short, inviting description of what they can do with the result right now.
