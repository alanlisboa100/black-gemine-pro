# BLACKCORE Native 2.5.0 — Validation Report

Build: WaveSpeed + Fusion Motion

## Final source-tree validation

- JavaScript syntax check: **227 files OK**
- Automated Node test suite: **85/85 PASS**
- Natural-language corpus: **36/36 PASS**
- Tool/integration matrix: **34/34 PASS**
- Natural E2E website flow: **PASS**
  - agent created a multi-file site
  - encountered a deliberately broken build
  - corrected the project through tool calls
  - reran tests/build successfully
  - started and validated a local server
- Natural E2E interactive 3D cube: **PASS**
  - generated project
  - drag/rotation logic validated
  - reset behavior validated
- Subagent + checkpoint/undo + new-session QA: **PASS**
- MCP stdio 2026-07-28 QA: **PASS**
- Clean installer test in isolated HOME/PREFIX: **PASS**
- `blackcore version`: **BLACKCORE Native 2.5.0**
- Doctor: core healthy; absent API credentials reported as warnings, not core failures
- 54-column boot-animation regression: **PASS**
- Tool-confirmation spinner regression from 2.4.1: **PASS**

## WaveSpeed-specific validation

One `WAVESPEED_API_KEY` is shared across the curated WaveSpeed provider.

Curated model IDs:

- `openai/gpt-5.6-luna`
- `z-ai/glm-5.2`
- `minimax/minimax-m3`
- `minimax/minimax-m2.7`
- `qwen/qwen3-coder`
- `google/gemini-3.1-flash-lite`

Validated locally with deterministic mock HTTP endpoints:

- WaveSpeed OpenAI-compatible Chat Completions request/response path
- GLM 5.2 XHigh reasoning request
- MiniMax M3 reasoning Off/On request behavior
- Gemini 3.1 Flash Lite reasoning-level request
- Luna Standard model catalog/config
- Luna Pro Responses API request, reasoning payload and function-call translation
- natural selection of all six WaveSpeed models
- `/model` numeric fallback selecting WaveSpeed Luna + Pro
- per-model native reasoning ceilings / Max/Ultra alias mapping
- WaveSpeed key shown by Doctor and accepted by config/login flow

## What was not claimed as a live test

No real WaveSpeed, DeepSeek or Cerebras user key was available in the build environment, so paid provider calls were **not** made against a user's account. Provider wire contracts were tested against local deterministic HTTP mocks. Likewise, real Vercel and EAS cloud publication requires an authenticated user account; their structured tools and preflight paths were tested with controlled CLI stubs.

## Result

All executable local QA gates for 2.5.0 passed before packaging. The exact final ZIP was then extracted into a fresh directory and revalidated: 85/85 automated tests, 36/36 natural-language corpus, 34/34 tool matrix, website E2E, 3D cube E2E, subagent/undo/session QA, MCP stdio QA, and an isolated clean install all passed. The clean installed runtime contained 292 files.
