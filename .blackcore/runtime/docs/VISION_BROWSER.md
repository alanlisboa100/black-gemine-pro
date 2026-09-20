# Vision and interactive browser

## Image input

Attach up to five PNG, JPEG, WebP or GIF files from the active workspace:

```bash
blackcore -i mobile.png -i desktop.png -p "Compare these layouts and fix the responsive CSS"
```

In an interactive session, mention an image naturally: `Review @screenshot.png and fix the spacing.` BLACKCORE stores only path, MIME type and byte size in its session. A data URL is generated in memory immediately before the provider request.

The selected model must declare vision support. BLACKCORE never changes provider/model to handle an image automatically.

Default limits are five files, 20 MB per file and 50 MB total. Files outside the workspace and paths escaping through symbolic links are rejected.

## Browser sessions

The browser tool has two layers:

- Portable one-shot actions: `detect`, `dump_dom`, `audit`, `screenshot`.
- Persistent Playwright actions: `profiles`, `login`, `open`, `navigate`, `snapshot`, `click`, `type`, `upload`, `select`, `check`, `key`, `console`, `close`.

Persistent interactive actions require `playwright-core` and an installed Chromium-compatible browser. `--profile web` or `--profile full` attempts to install the browser on Termux. Without Playwright, BLACKCORE retains bounded one-shot `open`, `snapshot`, `responsive`, `audit`, `dump_dom` and `screenshot`; it explicitly declines click/type/key/frame-timing claims. The session ID allows several isolated pages in the same BLACKCORE process. Console messages and page errors are bounded and available through the `console` action when interactive support exists.

Browser navigation uses the same network policy as web tools. Localhost/private targets are blocked in safe mode and confirmation-gated in balanced mode.

## Private logged-in profiles

BLACKCORE can keep a dedicated Chromium profile between runs. Ask it naturally to open a site with a named persistent profile, for example `trabalho`. Cookies remain inside Chromium under `~/.blackcore/browser/profiles`; tool results never include cookies, tokens, browser storage or saved credentials. Profile names are identifiers, not filesystem paths.

This is intentionally separate from the Android Chrome application. Android application sandboxing prevents Termux from safely copying another app's private cookies. Log in once through BLACKCORE's visible private Chromium window instead.

Install the Termux browser components with:

```bash
bash INSTALAR-BLACKCORE.sh --profile creator --with-browser
```

Visible login additionally needs the Termux:X11 Android application and an active display. A typical session is:

```bash
termux-x11 :1 &
export DISPLAY=:1
blackcore
```

Then ask: `abre o login do site no perfil trabalho`. Enter passwords, MFA codes and security answers only inside the visible Chromium window. BLACKCORE rejects attempts to type those values through its AI tool channel.

In the default balanced permission profile, opening a persistent profile requires approval. Controls that look like send, publish, buy, pay, delete, upload, save or account-changing actions ask again immediately before the click or Enter key. Safe mode blocks logged-in profiles; yolo mode follows its existing reduced-confirmation contract.
