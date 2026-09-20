# BLACKCORE 3.8.0 — Termux package repair

The original `BLACKCORE-ATUALIZADO.zip` declared three runtime modules in `MANIFEST.txt` but omitted them from the archive:

- `src/security/secrets.js`
- `src/context/tokens.js`
- `src/tui/secret-input.js`

This repaired package restores those modules and adds an installer preflight check so an incomplete archive fails before replacing the active runtime.
