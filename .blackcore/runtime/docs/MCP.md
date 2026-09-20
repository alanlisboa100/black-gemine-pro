# MCP

BLACKCORE contains its own MCP client. Remote MCP tools are adapted into normal BLACKCORE tools and are namespaced as `mcp_<server>_<tool>` to avoid collisions.

## Current protocol behavior

The client prefers MCP **2026-07-28** stateless requests. Every request carries `_meta` with protocol/client capability information; HTTP transport also emits the current MCP protocol/method/name headers. `server/discover`, `tools/list`, and `tools/call` are supported.

For older servers, BLACKCORE can fall back to the legacy **2025-11-25** initialize/initialized lifecycle.

## Configuration

Add servers under `mcp.servers` in the global `~/.blackcore/config/settings.json`. The project-local settings file cannot define MCP servers. Every enabled server also needs an exact name in `trustedMcpServers`.

Stdio example:

```json
{
  "trustedMcpServers": ["example"],
  "mcp": {
    "servers": {
      "example": {
        "transport": "stdio",
        "command": "node",
        "args": ["/path/server.js"],
        "env": {}
      }
    }
  }
}
```

HTTP example:

```json
{
  "trustedMcpServers": ["remote"],
  "mcp": {
    "servers": {
      "remote": {
        "transport": "http",
        "url": "https://example.com/mcp",
        "headers": {}
      }
    }
  }
}
```

For HTTP tool parameters annotated for header projection, BLACKCORE emits `Mcp-Param-*` headers and uses MCP-compatible Base64 sentinel encoding for values that are not safe as raw ASCII header values.

Private/loopback HTTP endpoints are blocked unless that globally trusted server also sets `"allowPrivateNetwork": true`. Response redirects are re-authorized and bodies are size-bounded.

## Security

An MCP server may expose powerful tools. Treat third-party MCP configuration as privileged. Stdio servers inherit only a small OS environment (`PATH`, `HOME`, temporary/locale/terminal variables) plus values explicitly listed in that server's `env`; provider keys are not copied automatically. MCP tools without `annotations.readOnlyHint: true` require an external-write confirmation outside policies that explicitly disable it.

After adding a server, either place its exact name in `trustedMcpServers` yourself or run `/trust mcp <name>`, then restart BLACKCORE.
