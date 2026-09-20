# Security

BLACKCORE uses prompt rules and harness enforcement.

## Profiles

`safe`
: Blocks dangerous shell classifications and outside-workspace writes.

`balanced`
: Allows normal work and asks before dangerous commands, sensitive deletes, external writes, production deploys, pushes, and remote release actions.

`yolo`
: Skips most confirmations. Critical destructive command patterns remain hard-blocked.

## Hard blocks

Examples include raw root filesystem deletion, filesystem formatting, direct disk overwrite, shutdown/reboot commands, and destructive ownership/permission operations targeting root.

This classifier is deliberately conservative but cannot prove a command safe. The model must still reason about command intent.

## Workspace boundary

Mutating filesystem tools resolve paths and detect writes outside the initial working directory. This prevents an ordinary tool call from silently modifying arbitrary home/system locations in safe/balanced modes.

## Secrets

Secrets are loaded from environment variables or `~/.blackcore/config/secrets.json`, which BLACKCORE creates with user-only permissions where supported.

Tool outputs and audit data pass through redaction heuristics. Redaction is defense in depth, not permission to dump secret files.

## Extensions and MCP

Extensions run arbitrary JavaScript with OS access. Project extensions require trust. Global extensions require an exact entry in `trustedGlobalExtensions`; packages installed with BLACKCORE are trusted at installation time and can be reviewed or removed later.

Project settings cannot change global permission, provider, MCP, hook, package, deployment, routing or fallback policy. MCP servers require an exact global trust entry. Stdio receives a minimal environment plus explicit server values; HTTP uses the same private-network/redirect boundary; non-read-only tools confirm possible external writes.

## Checkpoints

File mutations capture original file bytes before the first change of a turn. `/undo` restores the most recent committed checkpoint. This is not a replacement for Git.


## Network boundary

`web_fetch`, `download` and `http_request` resolve destinations through BLACKCORE's network policy. The safe profile blocks loopback/private/link-local destinations; balanced mode can ask for explicit approval so local development APIs remain usable. Redirects are followed manually and every destination is re-authorized. Mutating HTTP methods also require confirmation outside `yolo`.

This is an application-layer SSRF guard, not a substitute for network firewall rules. A hostile DNS environment can still require infrastructure-level controls.

## Tool output retention

Large command/tool results are redacted and stored behind a BLACKCORE output handle rather than silently discarded. The model receives only a bounded excerpt plus the handle and can page/search the saved output with `tool_output`.
