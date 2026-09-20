# BLACKCORE NATIVE 3.7.18 — Validation

Validation date: 2026-08-24

## Result

All release gates passed.

| Gate | Result |
| --- | ---: |
| JavaScript syntax | 367/367 files |
| Node functional/integration tests | 382/382 tests |
| Natural-language evaluation | 500/500 cases |
| Bundled plugin tests | 7/7 tests |
| Focused new-feature regression suite | 20/20 tests |

## Verified release behavior

- Complete websites are required to contain the requested project structure; an index-only artifact is accepted only when the user explicitly asks for a single-file/index site.
- Mobile/application requests cannot pass by returning a website index; app configuration, source, scripts and documentation are required.
- Project continuation reuses the active isolated project and does not silently start a replacement project.
- Supabase work is checked for complete SQL and owner-scoped CRUD RLS.
- The optional llama.cpp provider works through a local OpenAI-compatible endpoint without an API key and without changing an existing cloud provider selection.
- Hybrid semantic routing distinguishes complete sites, index-only sites, full apps, continuation, analysis-only work, selected photo/video regions and audio-preserving video edits.
- Project memory uses SQLite FTS5 when available, keeps the redacted JSON fallback and promotes only repeated verified outcomes to advisory workflow patterns.
- Photo regional edits require a real mask and are checked for outside-selection leakage; unavailable semantic segmentation fails honestly instead of applying a global filter.
- Video regional edits require temporal tracking, embedded-audio locks preserve continuous music, and real FFmpeg tests verify cuts, transitions, profiles and scene-aware enhancement.
- Optional MobileSAM, whisper.cpp and llama.cpp installers are isolated. Termux-unsafe heavyweight installs are refused with an explicit remote-endpoint alternative.
- Cancellation interrupts an in-flight provider request and leaves the agent reusable.
- Installer dry-runs proved that existing `config/secrets.json` and `config/settings.json` files remain byte-for-byte unchanged.

## Commands executed

```sh
npm run test:syntax
npm test
node qa-natural-evals.mjs
node --check ./plugins/blackcore/server/index.mjs
node --check ./plugins/blackcore/server/workspace.mjs
node --test ./plugins/blackcore/server/test/*.test.mjs
```

The release archive is additionally checked with `unzip -t`, secret/config path inspection and SHA-256 verification.
