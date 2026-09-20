# Termux

## Recommended source

Use a current Termux build and repositories. BLACKCORE itself requires Node.js 20+.

## Storage

Run `termux-setup-storage` once. If `~/storage` already exists, you do not need to rebuild it simply to install BLACKCORE.

The Android permission dialog is authoritative: BLACKCORE and Node.js cannot grant Files and media, camera, location or notification permission silently. Use `blackcore permissions` to inspect the current state. Keep executable repositories and `node_modules` under Termux `$HOME`; use shared storage for importing and exporting files.

Downloads is normally:

```bash
cd ~/storage/downloads
```

For new standalone creative/app projects launched while BLACKCORE is sitting in its own release directory, `$HOME`, or the shared Downloads directory, BLACKCORE uses `~/BLACKCORE-Projects/<project-name>` instead of writing into the BLACKCORE package. This keeps executable sources and dependency trees on Termux-private storage; shared Downloads remains the import/export location. Follow-up messages continue in the active project unless the user explicitly requests another/separate/from-scratch project. Set `BLACKCORE_PROJECTS_DIR` only when an intentional custom live-project root is required. Existing repositories are never redirected. Archive files are created only when the user explicitly asks for ZIP/TAR packaging.

## Install

```bash
unzip -o BLACKCORE-NATIVE-3.6.0-TERMUX.zip
cd BLACKCORE-NATIVE-3.6.0
bash INSTALAR-BLACKCORE.sh --profile core --setup-storage
blackcore permissions
blackcore doctor --full
```

The `core` profile installs:
- Node.js
- Git
- ripgrep
- fd
- curl/wget
- jq
- OpenSSH
- unzip/zip
- GitHub CLI (`gh`) when available
- Termux:API command package (the matching Android app is still required for device APIs)

Larger profiles are explicit:

```bash
bash INSTALAR-BLACKCORE.sh --profile web
bash INSTALAR-BLACKCORE.sh --profile creator
bash INSTALAR-BLACKCORE.sh --profile android
bash INSTALAR-BLACKCORE.sh --profile full
```

`web` adds Chromium; `creator` adds Python, C/C++, FFmpeg and ImageMagick; `android` adds Java/Gradle tools; `full` combines everything and deploy CLIs. See [installation profiles](INSTALLATION_PROFILES.md).

OpenAI's direct Sol, Terra and Luna catalog is optional too. Configure it with `blackcore login openai` or set `OPENAI_API_KEY`; the key is not stored in a project repository.

Google AI Studio is also optional. Use `blackcore login google 1` through `blackcore login google 8` to save up to eight independent key slots (`GEMINI_API_KEY` ... `GEMINI_API_KEY_8`). Google requests can fail over between configured slots while the selected model remains locked; quotas still apply.

## Device APIs

Battery, camera, location, notifications, opening files and sharing require the Termux:API Android app and the `termux-api` package. Install the app from the same source/signing family as Termux. Individual Android permissions are requested when the related feature is used. Root is not required or assumed.

## Cyber HUD, fixed viewport and narrow terminals

On normal phone dimensions (at least 42 columns and 20 rows), BLACKCORE pins a five-row cyan HUD at the top and a four-row message panel at the bottom. Every response, code block and tool event is wrapped and repainted only inside the framed middle canvas. When the Android keyboard leaves less space, BLACKCORE automatically falls back to a compact four-row header and three-row composer; the fixed regions remain separate.

Since 3.5.3 the workspace runs in an isolated terminal screen. Dimension changes clear stale geometry and replay a bounded recent transcript, preventing previous header/composer frames from becoming conversation lines. Permission prompts and full-screen selectors temporarily leave the isolated workspace and restore it with the recent middle output when they finish.

### History keys on a phone

The fixed viewport accepts `PgUp`/`PgDn` for a page, `Ctrl+Up`/`Ctrl+Down` for a line, and `Ctrl+Home`/`Ctrl+End` for oldest/latest retained output. Shift or Alt plus the arrow keys are line-navigation alternatives. The right frame contains a proportional `▲`/`█`/`▼` position rail. On Termux/Android, SGR pointer tracking is disabled by default so a tap remains available to Termux for soft-keyboard focus. Set `BLACKCORE_TERMUX_MOUSE=1 blackcore` to opt into the 3.5.8 central-swipe and rail tap/drag navigation. Pointer reports are still filtered if they arrive unexpectedly.

Since 3.6, the same fixed HUD also presents the current work phase as `SCAN`, `PLAN`, `BUILD`, `CHECK`, `REVIEW` or `REPORT`. These labels are compact state, not raw model reasoning. `/work` shows the recorded evidence for the last turn, and `/work deep` requests the full inspect → plan → execute → verify → review path for future complex work.

If the Android keyboard does not expose those keys, edit `~/.termux/termux.properties` without removing your existing settings and add:

```properties
extra-keys = [['ESC','CTRL','ALT','TAB','LEFT','DOWN','UP','RIGHT'],['HOME','PGUP','PGDN','END','BKSP','DEL','-','ENTER']]
```

Then run `termux-reload-settings`. The header shows the visible line range and the number of new lines received while you are reading older output.

The header shows the visible range and number of new lines while you review older content. The composer remains usable throughout. New output does not force the view back to the bottom while you are reading above; sending a new message returns to live output deliberately.

On every HUD start, BLACKCORE first sends the terminal's mouse-off sequence to clear stale tracking and enters the isolated screen. On Termux the filtered SGR pointer mode is enabled only when `BLACKCORE_TERMUX_MOUSE=1` is set; this preserves normal Android tap-to-focus behavior by default. The normal readline key handler stays detached while the HUD owns input, preventing coordinates and repeated `>` prompts. When pointer mode is enabled, movement is coalesced to one repaint per 24 ms. Partial model streaming remains capped at 20 repaints per second, while newline-complete tool events appear immediately.

Normal tool activity is intentionally summarized instead of dumping JSON arguments or large command results. The agent still receives the complete tool result; only the phone-facing presentation is reduced to numbered action/result pairs.

`Ctrl+L` rebuilds the fixed viewport. `/clear` clears only the conversation surface and restores both fixed panels. Full-screen model menus and external editors temporarily suspend the viewport and reconstruct it when they close. Custom extensions should still avoid cursor-positioning or clearing the whole terminal directly.

While a turn is running, `Ctrl+C` or a line containing `/cancel`, `cancelar`, `cancela`, `pare`, `parar` or `stop` terminates active process trees and leaves normal follow-up messages queued. Cancellation should settle in about one second; commands still have their own bounded timeout as a second line of defence.

## proot

BLACKCORE runs natively in Termux. If a project needs a proot distribution, invoke it deliberately from shell tools. Do not assume guest paths such as `/usr/bin/bash` exist on the Termux host.
