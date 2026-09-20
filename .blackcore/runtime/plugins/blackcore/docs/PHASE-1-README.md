# BLACKCORE Plugin / MCP — Phase 1

This folder is the first plugin-ready adapter for BLACKCORE. It intentionally exposes a small, review-friendly tool surface instead of publishing the complete terminal agent.

## What is implemented

- MCP server factory built on the current official Model Context Protocol TypeScript v2 server packages.
- Streamable HTTP at `/mcp` plus local stdio mode.
- Plugin package manifest at `.codex-plugin/plugin.json`.
- Bundled MCP mapping at `.mcp.json` for local Codex/plugin testing.
- Repo-scoped local marketplace at `../../.agents/plugins/marketplace.json`.
- Bundled `project-builder` skill.
- Isolated per-project workspace with path traversal protection.
- Read tools: status, project listing, file listing, file reads, and project text search.
- Write tools: project creation, complete file writes, and exact text replacement.
- No delete tool, shell, deploy, arbitrary network access, or provider API keys in this Phase 1 public-facing surface.

The two file-editing tools are marked destructive because they can replace user content. That allows compatible hosts to apply appropriate confirmation behavior.

## Set up on Termux/Linux

```bash
cd plugins/blackcore
chmod +x setup.sh start-http.sh
./setup.sh
```

By default, plugin projects are stored in:

```text
~/blackcore-plugin-workspace
```

To use another isolated root:

```bash
export BLACKCORE_PLUGIN_WORKSPACE="$HOME/meus-projetos-blackcore-plugin"
```

## Local HTTP test

```bash
./start-http.sh
```

Endpoint:

```text
http://127.0.0.1:3000/mcp
```

In another terminal, run MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Choose **Streamable HTTP** and connect to `http://127.0.0.1:3000/mcp`.

The server also exposes a local health check:

```bash
curl http://127.0.0.1:3000/health
```

## Local plugin package

The repository contains:

```text
.codex-plugin/plugin.json
.mcp.json
skills/project-builder/SKILL.md
```

and a repo marketplace at:

```text
.agents/plugins/marketplace.json
```

The `.app.json` file is intentionally **not** pre-generated. For a ChatGPT Developer Mode connection, first register the actual MCP server. ChatGPT gives that connection a technical `plugin_asdk_app...` ID; then use OpenAI's plugin-creator workflow to generate the real `.app.json` mapping and add the manifest `apps` field. Do not invent that ID.

## ChatGPT Developer Mode

For development, make `/mcp` reachable through Secure MCP Tunnel or a development HTTPS endpoint, then register it in ChatGPT Developer Mode. A development tunnel is for testing only; public submission requires a stable public HTTPS endpoint.

Do not bind this Phase 1 server directly to the public internet as a multi-user production service. It has no OAuth/resource-server layer yet and its local filesystem is single-user.

## Public submission blockers still remaining

1. Stable public HTTPS hosting for `/mcp`.
2. OAuth 2.1 and server-side authorization for private data/write actions.
3. Authenticated per-user project storage instead of a shared filesystem.
4. Rate limits, abuse controls, production logs/metrics, backups, and secret management.
5. Website, privacy policy, terms of service, and support contact.
6. OpenAI publisher identity/business verification and submission permissions.
7. Developer Mode + MCP Inspector validation against the production endpoint.
8. Direct, indirect, edge-case, invalid-input, authorization, and out-of-scope evals.
9. Billing/licensing backend if BLACKCORE Pro is monetized.

## Suggested product split

- Free: small project/storage quota and core create/read/search/edit workflow.
- Pro: larger quotas plus advanced BLACKCORE workflows and integrations.
- Business: team workspaces, audit logs, policy controls, and private integrations.

Billing and authorization should be enforced by the BLACKCORE backend. Provider keys and access tokens must never be returned in MCP tool output or metadata.
