#!/usr/bin/env bash
set -euo pipefail

MODEL="tiny"
DRY_RUN=0
while [ "$#" -gt 0 ]; do case "$1" in --model) MODEL="${2:-}";shift 2;; --dry-run) DRY_RUN=1;shift;; --help|-h) echo "Usage: bash scripts/install-video-ai.sh [--model tiny|base] [--dry-run]";echo "Builds official whisper.cpp and downloads the chosen free local speech model.";exit 0;; *) echo "ERROR: unknown option: $1";exit 2;; esac;done
case "$MODEL" in tiny|tiny.en|base|base.en|small|small.en) ;; *) echo "ERROR: unsupported model: $MODEL";exit 2;; esac
run(){ if [ "$DRY_RUN" = "1" ]; then printf '+ ';printf '%q ' "$@";printf '\n';else "$@";fi; }

BC_HOME="${BLACKCORE_HOME:-$HOME/.blackcore}"
ROOT="$BC_HOME/video-ai/whisper.cpp"
BIN_DIR="${PREFIX:-$HOME/.local}/bin"
if command -v pkg >/dev/null 2>&1; then run pkg install -y git cmake make clang ffmpeg curl;fi
run mkdir -p "$BC_HOME/video-ai" "$BIN_DIR"
if [ "$DRY_RUN" = "1" ] || [ ! -d "$ROOT/.git" ]; then run git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$ROOT";else run git -C "$ROOT" pull --ff-only;fi
run cmake -S "$ROOT" -B "$ROOT/build" -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_EXAMPLES=ON
run cmake --build "$ROOT/build" --config Release -j "${BLACKCORE_BUILD_JOBS:-2}"
run bash "$ROOT/models/download-ggml-model.sh" "$MODEL"
run install -m 755 "$ROOT/build/bin/whisper-cli" "$BIN_DIR/whisper-cli"
if [ "$DRY_RUN" = "1" ]; then run ln -sfn "$ROOT/models/ggml-$MODEL.bin" "$BC_HOME/video-ai/whisper-model.bin";else ln -sfn "$ROOT/models/ggml-$MODEL.bin" "$BC_HOME/video-ai/whisper-model.bin";fi
echo "READY: whisper.cpp · model $MODEL · $BC_HOME/video-ai/whisper-model.bin"
echo "BLACKCORE will discover this model automatically. Existing settings and API keys were not modified."
