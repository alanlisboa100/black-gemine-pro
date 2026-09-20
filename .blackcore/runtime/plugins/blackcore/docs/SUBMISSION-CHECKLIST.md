# BLACKCORE public plugin submission checklist

## Implemented in Phase 1
- [x] Stable plugin/server name and version in source.
- [x] `.codex-plugin/plugin.json` scaffold.
- [x] `.mcp.json` bundled local MCP mapping.
- [x] Repo-scoped local marketplace for authoring/testing.
- [x] Focused MCP tools with explicit schemas.
- [x] Safety annotations on every tool.
- [x] File-editing tools marked destructive.
- [x] Isolated project paths; absolute paths and `../` escape are rejected.
- [x] No delete, shell, deploy, or arbitrary-network tool on the review-facing surface.
- [x] Local stdio and Streamable HTTP development modes.
- [x] Unit tests for isolation, editing, manifest wiring, and marketplace wiring.
- [x] No fake `.app.json` connection ID committed.

## Before public review
- [ ] Deploy `/mcp` to a stable public HTTPS domain.
- [ ] Add OAuth 2.1 and enforce authorization server-side on every private/write request.
- [ ] Replace shared local storage with authenticated per-user/project storage.
- [ ] Add rate limiting and abuse protection.
- [ ] Add production logging/metrics without credentials or sensitive tool contents.
- [ ] Add backups/rollback strategy for user projects.
- [ ] Publish website, privacy policy, terms of service, and support contact.
- [ ] Verify the publishing identity/business in OpenAI Platform.
- [ ] Ensure the submitting organization role has Apps Management / `api.apps.write`.
- [ ] Register the production MCP server in ChatGPT Developer Mode.
- [ ] Generate the real `.app.json` mapping from the registered `plugin_asdk_app...` ID if using that compatibility path.
- [ ] Run MCP Inspector against production and call every tool with valid and invalid inputs.
- [ ] Build direct, indirect, edge-case, authorization, and out-of-scope evaluation prompts.
- [ ] Scan tools in the plugin submission portal and review discovered metadata.
- [ ] Add final listing assets/screenshots and real publisher URLs.
- [ ] Submit only when the endpoint can stay available through review and domain verification.
