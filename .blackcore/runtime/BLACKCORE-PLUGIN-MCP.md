# BLACKCORE Plugin / MCP adapter

BLACKCORE's Termux/Linux application remains available normally. A separate Phase 1 plugin adapter lives at:

```text
plugins/blackcore/
```

Install and test it with:

```bash
cd plugins/blackcore
./setup.sh
./start-http.sh
```

Local MCP endpoint:

```text
http://127.0.0.1:3000/mcp
```

The adapter deliberately exposes a smaller review-facing tool surface: isolated project creation, listing, reading, search, and editing. It does not expose delete, unrestricted shell, deployment, or arbitrary network access in Phase 1.
