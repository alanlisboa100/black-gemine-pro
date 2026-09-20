# BLACKCORE Native 3.1.1 validation

Validated on 2026-08-10 with Node.js 24 on Linux x64. Termux-specific layout and installer behavior are covered by deterministic narrow-terminal and shell-contract tests; an Android device package installation was not performed in this environment.

## Result

- JavaScript syntax: 276 files passed.
- Automated Node suite: 152/152 passed.
- Native tool matrix: 50/50 passed.
- Natural-language corpus: 38/38 passed.
- Natural end-to-end work: site creation/fix/build/server and interactive 3D cube creation/tests passed.
- MCP stdio 2026 protocol: passed.
- Package dry run: 270 files, 202.1 KB compressed, 603.3 KB unpacked before optional Playwright/browser files.
- Release ZIP: 475 entries and about 448 KB on disk; forbidden `.git`, `.env`, `node_modules` and `dist` payloads were absent.
- Extracted-release smoke test: clean npm install, version 3.1.1 and focused installer/progress/TUI tests passed.
- ZIP, TGZ and CycloneDX SBOM SHA-256 verification: passed.
- Production npm audit: 0 known vulnerabilities across 1 optional production dependency.
- Dependency freshness: no outdated npm dependency reported; `playwright-core` resolved to 1.62.1.

## 3.1.1 regression coverage

- Long Termux package commands are no longer redirected to `/dev/null`.
- Dependency/deploy progress includes item counter, start, completion and elapsed time.
- The full profile installs the official `resend-cli` alongside Vercel, Netlify, EAS and Supabase.
- Supabase uses its supported project-scoped npm installation with a BLACKCORE command wrapper instead of the unsupported global npm mode.
- Tool lifecycle callbacks expose real start/completion order while preserving model-history order.
- Parallel tools report a fast completion without waiting for a slower sibling.
- Write/edit/patch/shell previews are compact, secret-redacted and bounded to a 54-column terminal.
- Confirmation panels remain within 54 columns, accept Portuguese `sim`, pause motion and preserve queued natural-language messages.
- `blackcore doctor --full` reports runtime/search/build/media/web/Android/database/language/delivery groups, saved profile and runtime size.

## Delivery integration boundary

Vercel, Netlify, Supabase, Resend, EAS, Gradle, ADB, PostgreSQL and container command contracts passed with isolated deterministic CLI fixtures. No live authenticated deployment, email, production database mutation or remote publish was executed. These actions continue to require explicit user intent and confirmation.
