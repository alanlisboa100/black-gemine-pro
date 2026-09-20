# Security policy

## Reporting a vulnerability

Do not publish secrets, exploit details or working attacks in a public issue. Use GitHub's private vulnerability reporting for this repository. Include the affected version, environment, reproduction steps and impact.

## Supported versions

Security fixes target the latest stable release. Users should upgrade before reporting a problem already fixed on `main`.

## Security model

BLACKCORE uses workspace boundaries, real-path/symlink validation, sensitive-file detection, command classification, scoped tools, explicit confirmation for external mutations and secret redaction. API keys belong in environment variables or BLACKCORE's private secrets file, never in a repository.

Project-local settings cannot lower the global permission profile or define providers, MCP servers, hooks, packages, deploy policy, routing or fallback. MCP servers load only after an exact global `trustedMcpServers` entry; stdio receives a minimal inherited environment, HTTP follows BLACKCORE's network/redirect policy, and tools not annotated read-only require external-write confirmation.

Persistent browser profiles are stored with private directory permissions under BLACKCORE home and remain separate from Android Chrome. Browser output never contains cookies, tokens, browser storage or credential databases. Password, MFA and security-answer fields cannot be filled through the AI tool channel; the user enters them only in a visible login window. Balanced mode confirms access to a logged-in profile and consequential account actions, while safe mode blocks profile use.

BLACKCORE is not an operating-system sandbox. A trusted tool, extension or approved shell command can execute with the permissions of the current OS user. Use the `safe` permission profile for untrusted repositories and inspect third-party extensions before trusting them. See [docs/SECURITY.md](docs/SECURITY.md) for details.
