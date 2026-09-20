# BLACKCORE Creative Lab

This is a zero-dependency local validation fixture. It contains six practical checks:

- A responsive, accessible single-page site.
- A layered day/night village with houses, smoke, clouds, fireflies and a traveler.
- A Canvas perspective-projected 3D cube controlled by animation, touch, mouse or keyboard.
- A light heart-particle animation with a burst control.
- A compact live code/tool activity stream with measured frame health.
- **Core Catch**, playable with Arrow keys/WASD, touch dragging, or the on-screen controls.

Run it from this folder with any static file server. For example, on Termux:

```bash
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`. The lab deliberately avoids package installs, cloud deployment, and remote services. It honours the operating system's reduced-motion preference and has an explicit pause button.
