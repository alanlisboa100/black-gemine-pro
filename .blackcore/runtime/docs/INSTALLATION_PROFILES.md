# Installation profiles

BLACKCORE 3.4 keeps the default installation practical on phones while offering complete development profiles. All profiles install the BLACKCORE runtime, Node.js, Git, ripgrep, fd, curl, jq, SSH, SQLite, the Termux:API command package and archive tools when those packages are available.

| Profile | Adds | Typical use |
| --- | --- | --- |
| `core` | No heavy toolchain | Chat, repositories, JavaScript and general coding |
| `web` | Chromium | Interactive page testing, screenshots and accessibility audits |
| `creator` | Python, C/C++, CMake, FFmpeg, ImageMagick, Poppler and Tesseract | Games, media, OCR, documents, native modules and asset pipelines |
| `android` | Creator profile, Java, Gradle, AAPT, APK signing and ADB | Android/Expo projects and connected-device tests |
| `full` | Web, creator, Android, PostgreSQL, Go, Rust, PHP/Composer and Vercel, Netlify, EAS, Supabase and Resend CLIs | Dedicated development environment |

Run `bash INSTALAR-BLACKCORE.sh --profile <name>`. The installer stages the new runtime, installs its locked JavaScript dependencies, and only then activates it. The previous runtime is retained at `~/.blackcore/runtime.previous` as a rollback point.

Add `--setup-storage` when you want the installer to invoke Android's shared-storage authorization flow. This remains an explicit Android permission: the installer reports whether it is ready and `blackcore permissions` verifies the resulting folders. Executable projects and dependency trees should stay under Termux `$HOME`, not shared Android storage.

Some large Termux packages depend on enabled repositories and device architecture. Every long install now shows its package counter, command output, result and elapsed time. Optional package failures are reported individually; the core runtime remains usable.

Run `blackcore doctor --full` at any time to inspect dependency groups, the saved installation profile and the runtime's on-disk size.

Supabase's official npm distribution does not support global npm installation. The full profile installs it in an isolated BLACKCORE CLI directory and creates the same `supabase` command in the BLACKCORE bin directory.

The core runtime supports Node.js 20+. The currently pinned Netlify CLI 27.1.1 and Resend CLI 2.12.0 require Node.js 22.13+, so the installer skips those two optional CLIs on older Node versions and reports the reason. Vercel 58.9.4, EAS 21.8.0 and Supabase 2.113.0 retain their own upstream engine requirements. `blackcore doctor --full` shows the delivery-CLI Node compatibility separately from core readiness.

The profile controls installed software, not agent intent. Remote tools are still scoped from the user's natural request and require explicit deployment/publish wording.
