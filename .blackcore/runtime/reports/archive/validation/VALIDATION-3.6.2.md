# BLACKCORE Native 3.6.2 validation

Feature: local structured video editing for Termux/Android via `video_editor`.

Final source-tree gates before packaging:
- JavaScript syntax: 336 files OK
- General tests: 294/294 passed
- Natural-language eval: 254/254 passed
- Plugin/MCP tests: 7/7 passed
- Plugin syntax checks: passed
- Real FFmpeg integration test: inspect + trim + timeline edit passed

The real Google API is not exercised by this validation because user API keys are intentionally not bundled in the release.
