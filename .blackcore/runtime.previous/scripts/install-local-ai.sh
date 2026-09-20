#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0
while [ "$#" -gt 0 ]; do case "$1" in --dry-run) DRY_RUN=1;shift;; --help|-h) echo "Usage: bash scripts/install-local-ai.sh [--dry-run]";echo "Installs the optional llama.cpp runtime without touching BLACKCORE keys or model selection.";exit 0;; *) echo "ERROR: unknown option: $1";exit 2;; esac;done
run(){ if [ "$DRY_RUN" = "1" ]; then printf '+ ';printf '%q ' "$@";printf '\n';else "$@";fi; }

if [ "${BLACKCORE_FORCE_TERMUX:-0}" = "1" ] || command -v pkg >/dev/null 2>&1; then
  echo "Installing the optional llama.cpp package for Termux..."
  run pkg install -y llama-cpp || { echo "ERROR: llama-cpp is unavailable in the enabled Termux repositories. Update Termux from F-Droid/GitHub and run pkg update first.";exit 3; }
elif ! command -v llama-server >/dev/null 2>&1 && ! command -v llama >/dev/null 2>&1; then
  if [ "$DRY_RUN" = "1" ]; then echo "+ verify a prebuilt llama.cpp release provides llama-server or llama serve";else echo "ERROR: llama-server/llama is not installed. Install a prebuilt llama.cpp package for this Linux system, then rerun this check.";exit 3;fi
fi
if [ "$DRY_RUN" != "1" ] && ! command -v llama-server >/dev/null 2>&1 && ! command -v llama >/dev/null 2>&1; then echo "ERROR: the package completed but llama-server/llama was not found in PATH.";exit 3;fi

echo "READY: local chat runtime"
echo "Start: bash scripts/local-ai-control.sh start-chat"
echo "For Qwen3-Embedding, set BLACKCORE_EMBEDDING_MODEL to a GGUF file or Hugging Face GGUF repository, then run start-embedding."
echo "No settings, API keys or config/secrets.json files were changed."
