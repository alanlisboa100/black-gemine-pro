# BLACKCORE NATIVE 3.7.19 — Validation

Validation date: 2026-08-24

## Result

All release gates passed.

| Gate | Result |
| --- | ---: |
| JavaScript syntax | 368/368 files |
| Node functional/integration tests | 387/387 tests |
| Natural-language evaluation | 500/500 cases |
| Bundled plugin tests | 7/7 tests |
| Focused authenticated-browser regression | 17/17 tests |

## Authenticated browser evidence

- Named Chromium profiles resolve only beneath BLACKCORE's private browser directory and reject path traversal.
- A persistent profile retains browser state after the active session closes and reopens.
- Profile listings return names and activity metadata only; no cookies, tokens, history or credential storage is exposed.
- Password, passcode, OTP, MFA and security-answer inputs are rejected by the AI browser channel.
- OAuth codes, access/refresh/ID tokens and session parameters are redacted from returned URLs.
- Consequential controls such as publish, send, purchase, delete, upload and account changes require confirmation in balanced mode.
- The browser can navigate, type ordinary text, click, upload approved workspace files, select options, check controls, inspect pages and retain a logged-in session.
- Visible login is available only through a display such as Termux:X11; the user enters private credentials directly in Chromium.
- Project-local settings cannot disable the global authenticated-action confirmation policy.
- Portuguese and English requests for a browser or logged-in account retain the browser tool within the Google 20-tool limit.
- The installer exposes `--with-browser`, attempts Chromium/Termux:X11 installation and preserves the existing BLACKCORE config and API keys.

## Boundaries

BLACKCORE does not copy the logged-in profile from the Android Chrome application. Android sandboxing protects that profile. BLACKCORE creates a separate private Chromium profile, where the user signs in once through the visible browser window.

The release archive is checked for compressed-data integrity and inspected to ensure that `.env`, `secrets.json`, `settings.json` and browser profile data are not bundled.
