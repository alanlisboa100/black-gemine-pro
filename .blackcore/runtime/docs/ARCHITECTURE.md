# Architecture

BLACKCORE is organized around explicit boundaries rather than a monolithic prompt loop.

## Application layer

`src/app.js` owns the interactive lifecycle. It creates a runtime, input controller, session, and `BlackcoreAgent`. Session replacement is explicit so `/new`, `/resume`, `/fork`, and `/clone` do not leak agent state.

`src/runtime.js` assembles long-lived services:
- provider registry;
- tool registry;
- hook bus;
- package manager;
- skills/prompts;
- project/global instructions;
- repository summary;
- extension host;
- MCP manager;
- UI.

## Agent layer

`src/agent/loop.js` implements the autonomous turn loop:
1. record the user message;
2. expand explicit file mentions;
3. check context pressure and compact if needed;
4. construct the system prompt from current mode/tools/context/skills;
5. stream a provider response;
6. persist assistant content, reasoning metadata and tool calls;
7. execute tool calls through `ToolExecutor`;
8. append tool results in protocol order;
9. repeat until a response contains no tool calls.

`TurnBudget` limits runaway loops/tool-call counts/wall time. `AbortController` propagates cancellation through provider HTTP calls and subprocesses.

Read-only tools marked `parallelSafe` may execute in small batches. Mutating tools remain sequential.

## Provider layer

`OpenAIProvider` implements Chat Completions-compatible JSON and SSE streaming. Tool-call deltas are assembled incrementally because function names/JSON arguments can be split across network chunks.

`DeepSeekProvider` adds V4 thinking configuration and normalizes assistant tool-call history to retain `reasoning_content` and non-null assistant content.

Provider types are registered in `ProviderRegistry`; extensions can add additional provider factories.

## Tool layer

Every tool is a plain object created with `defineTool()`:
- name
- description
- JSON-schema-like parameter declaration
- readOnly/parallelSafe/mutates metadata
- async execute(args, context)

`ToolExecutor` is the single execution gateway. It invokes hooks, audit logging, error normalization, secret redaction, and output limits.

## Session layer

Sessions are append-oriented JSONL files. Entries contain stable IDs and `parentId`, forming a tree. The active pointer selects one branch. Jumping to an older entry and continuing creates a new branch while keeping existing history.

Compaction is represented as a dedicated tree entry. It does not delete the original session file history.

## Security layer

Security does not rely only on the prompt:
- critical destructive command patterns are hard-blocked;
- danger/network classifications are evaluated in the harness;
- writes outside the workspace pass through boundary policy;
- sensitive-looking files receive additional deletion protection;
- tool output and audit records are redacted;
- API credentials live outside session prompts.

## Extensibility

Extensions dynamically register:
- tools;
- slash commands;
- lifecycle hooks;
- provider types;
- UI status/notifications.

BLACKCORE packages group extensions, skills, prompts and themes.

MCP servers are bridged into the same ToolRegistry, so the agent sees built-in, extension and MCP tools through one interface.

## Termux constraints

The UI never assumes a fixed terminal width. Interactive Termux uses a three-region terminal viewport. At 42×20 or larger, rows 1–5 are the full cyber HUD and the final four rows are the fixed composer; smaller supported terminals use a compact four-row/three-row layout. The central transcript is rendered inside a fixed frame with a proportional navigation rail. Keyboard, mouse-wheel and SGR rail events change only the retained-history window. Geometry is recalculated from live terminal dimensions and suspended around full-screen menus, confirmations and editors. Rendering still calls visible-width-aware wrapping before line-oriented output. Shell tools use the current shell and do not assume `/usr/bin/bash`.
