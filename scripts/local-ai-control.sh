#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
shift || true
BC_HOME="${BLACKCORE_HOME:-$HOME/.blackcore}"
STATE="$BC_HOME/local-ai"
mkdir -p "$STATE"
SERVER="${BLACKCORE_LLAMA_SERVER:-}"
SERVER_MODE="server"
if [ -z "$SERVER" ]; then SERVER="$(command -v llama-server 2>/dev/null || true)"; fi
if [ -z "$SERVER" ]; then SERVER="$(command -v llama 2>/dev/null || true)";SERVER_MODE="multi"; fi

pid_file(){ printf '%s/%s.pid\n' "$STATE" "$1"; }
log_file(){ printf '%s/%s.log\n' "$STATE" "$1"; }
alive(){ local file; file="$(pid_file "$1")"; [ -f "$file" ] && kill -0 "$(tr -cd '0-9' < "$file")" 2>/dev/null; }
model_args(){ if [ -f "$1" ]; then printf '%s\n' "-m" "$1"; else printf '%s\n' "-hf" "$1"; fi; }

start_server(){
  local role="$1" port="$2" model="$3" alias="$4"; shift 4
  [ -n "$SERVER" ] || { echo "ERROR: llama-server not found. Run: bash scripts/install-local-ai.sh"; exit 3; }
  [ -n "$model" ] || { echo "ERROR: no $role model configured."; exit 3; }
  if alive "$role"; then echo "READY: $role already running · pid $(cat "$(pid_file "$role")") · port $port"; return; fi
  mapfile -t source_args < <(model_args "$model")
  local prefix=();if [ "$SERVER_MODE" = "multi" ]; then prefix=(serve);fi
  nohup "$SERVER" "${prefix[@]}" "${source_args[@]}" --alias "$alias" --host 127.0.0.1 --port "$port" "$@" > "$(log_file "$role")" 2>&1 &
  printf '%s\n' "$!" > "$(pid_file "$role")"
  echo "STARTING: $role · pid $! · http://127.0.0.1:$port · log $(log_file "$role")"
}

stop_server(){
  local role="$1" file; file="$(pid_file "$role")";if ! alive "$role"; then rm -f "$file"; echo "STOPPED: $role was not running"; return; fi
  local pid; pid="$(tr -cd '0-9' < "$file")";kill "$pid";rm -f "$file";echo "STOPPED: $role · pid $pid"
}

case "$ACTION" in
  start-chat)
    start_server chat "${BLACKCORE_LLAMA_PORT:-8080}" "${BLACKCORE_LLAMA_MODEL:-ggml-org/Qwen3.5-0.8B-GGUF}" blackcore-local -c "${BLACKCORE_LLAMA_CONTEXT:-8192}" "$@" ;;
  start-embedding)
    start_server embedding "${BLACKCORE_EMBEDDING_PORT:-8081}" "${BLACKCORE_EMBEDDING_MODEL:-}" Qwen3-Embedding-0.6B --embedding --pooling last -c "${BLACKCORE_EMBEDDING_CONTEXT:-4096}" "$@" ;;
  stop-chat) stop_server chat ;;
  stop-embedding) stop_server embedding ;;
  status)
    for role in chat embedding; do if alive "$role"; then echo "READY: $role · pid $(cat "$(pid_file "$role")") · log $(log_file "$role")"; else echo "OFFLINE: $role"; fi; done ;;
  *) echo "Usage: blackcore-local-ai start-chat|start-embedding|stop-chat|stop-embedding|status"; exit 2 ;;
esac
