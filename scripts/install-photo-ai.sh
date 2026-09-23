#!/usr/bin/env bash
set -euo pipefail

MODE="rembg"
DRY_RUN=0
FORCE_TERMUX="${BLACKCORE_FORCE_TERMUX:-0}"
REMBG_MODEL="${BLACKCORE_REMBG_MODEL:-u2netp}"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:-}"; shift 2 ;;
    --model) REMBG_MODEL="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h)
      echo "Usage: bash scripts/install-photo-ai.sh --mode rembg|mobile-sam|grounded-sam2 [--model MODEL] [--dry-run]"
      echo "  rembg         subject/background masks; Termux uses an isolated Ubuntu PRoot"
      echo "  --model       rembg model (default: u2netp; can also be set with BLACKCORE_REMBG_MODEL)"
      echo "  grounded-sam2 text-prompt segmentation for a separate NVIDIA GPU Linux host"
      echo "  mobile-sam    lightweight point/box mask refinement on a separate Python host"
      exit 0 ;;
    *) echo "ERROR: unknown option: $1"; exit 2 ;;
  esac
done
case "$MODE" in rembg|mobile-sam|grounded-sam2) ;; *) echo "ERROR: invalid mode: $MODE"; exit 2 ;; esac
if ! [[ "$REMBG_MODEL" =~ ^[A-Za-z0-9_-]{2,80}$ ]]; then echo "ERROR: invalid rembg model: $REMBG_MODEL"; exit 2; fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BC_HOME="${BLACKCORE_HOME:-$HOME/.blackcore}"
BIN_DIR="${PREFIX:-$HOME/.local}/bin"
REMBG_VERSION="${BLACKCORE_REMBG_VERSION:-2.0.81}"
IS_TERMUX=0
if [ "$FORCE_TERMUX" = "1" ] || { [ -n "${PREFIX:-}" ] && [[ "${PREFIX:-}" == *com.termux* ]]; }; then IS_TERMUX=1; fi

run(){
  if [ "$DRY_RUN" = "1" ]; then printf '+ '; printf '%q ' "$@"; printf '\n'; else "$@"; fi
}

persist_rembg_model(){
  local file="$BC_HOME/photo-ai/rembg-model"
  run mkdir -p "$(dirname "$file")"
  if [ "$DRY_RUN" = "1" ]; then echo "+ write $file"; else printf '%s\n' "$REMBG_MODEL" > "$file"; fi
}

install_rembg_termux(){
  local container="blackcore-photo-ai"
  echo "Installing rembg $REMBG_VERSION in an isolated Ubuntu PRoot (model on first use: $REMBG_MODEL)..."
  run pkg install -y proot-distro
  if [ "$DRY_RUN" = "1" ] || ! proot-distro login "$container" -- /bin/true >/dev/null 2>&1; then run proot-distro install ubuntu:24.04 --name "$container"; fi
  run proot-distro login "$container" -- bash -lc "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-venv python3-pip libglib2.0-0 libgl1 libgomp1 && python3 -m venv /opt/blackcore-rembg && /opt/blackcore-rembg/bin/python -m pip install --upgrade pip && /opt/blackcore-rembg/bin/python -m pip install 'rembg[cpu,cli]==$REMBG_VERSION'"
  run mkdir -p "$BIN_DIR"
  run install -m 755 "$ROOT/scripts/rembg-proot-wrapper.sh" "$BIN_DIR/rembg"
  persist_rembg_model
  echo "READY: rembg wrapper -> $BIN_DIR/rembg"
  echo "The first real mask can download the selected free model into the isolated environment."
}

install_rembg_linux(){
  local venv="$BC_HOME/photo-ai/rembg-venv"
  echo "Installing rembg $REMBG_VERSION in a private Python environment (model on first use: $REMBG_MODEL)..."
  run mkdir -p "$BC_HOME/photo-ai" "$BIN_DIR"
  run python3 -m venv "$venv"
  run "$venv/bin/python" -m pip install --upgrade pip
  run "$venv/bin/python" -m pip install "rembg[cpu,cli]==$REMBG_VERSION"
  run install -m 755 "$ROOT/scripts/rembg-linux-wrapper.sh" "$BIN_DIR/rembg"
  persist_rembg_model
  echo "READY: rembg wrapper -> $BIN_DIR/rembg"
}

install_grounded_sam2(){
  if [ "$IS_TERMUX" = "1" ]; then
    echo "ERROR: Grounded SAM 2 is not a phone-safe Termux install. It requires PyTorch and is designed for a separate GPU Linux host."
    echo "Use rembg on the phone, or install this mode on an NVIDIA Linux computer and expose the documented mask endpoint."
    exit 3
  fi
  if [ "$DRY_RUN" != "1" ] && ! command -v nvidia-smi >/dev/null 2>&1; then echo "ERROR: NVIDIA GPU tooling was not detected; refusing a multi-gigabyte Grounded SAM 2 installation."; exit 3; fi
  local base="$BC_HOME/photo-ai" repo="$BC_HOME/photo-ai/Grounded-SAM-2" venv="$BC_HOME/photo-ai/grounded-sam2-venv"
  echo "Installing official Grounded SAM 2 on the GPU host..."
  run mkdir -p "$base"
  if [ "$DRY_RUN" = "1" ] || [ ! -d "$repo/.git" ]; then run git clone https://github.com/IDEA-Research/Grounded-SAM-2.git "$repo"; else echo "Reusing existing checkout: $repo"; fi
  run python3 -m venv "$venv"
  run "$venv/bin/python" -m pip install --upgrade pip
  run "$venv/bin/python" -m pip install torch torchvision torchaudio
  run env BLACKCORE_GSAM_REPO="$repo" BLACKCORE_GSAM_VENV="$venv" bash -c 'cd "$BLACKCORE_GSAM_REPO" && "$BLACKCORE_GSAM_VENV/bin/python" -m pip install -e . && "$BLACKCORE_GSAM_VENV/bin/python" -m pip install --no-build-isolation -e grounding_dino && bash checkpoints/download_ckpts.sh && bash gdino_checkpoints/download_ckpts.sh'
  echo "MODEL READY: $repo"
  echo "NEXT: expose POST /v1/photo/mask using docs/PHOTO-SEGMENTATION-PROTOCOL.md, then configure BLACKCORE_PHOTO_SEGMENT_ENDPOINT."
}

install_mobile_sam(){
  if [ "$IS_TERMUX" = "1" ]; then
    echo "ERROR: the official MobileSAM Python stack still requires PyTorch/TorchVision and is not installed directly in Termux by this safe installer."
    echo "Use manual masks/rembg on the phone, or run MobileSAM/ONNX on a separate host through BLACKCORE_PHOTO_SEGMENT_ENDPOINT."
    exit 3
  fi
  local base="$BC_HOME/photo-ai" venv="$BC_HOME/photo-ai/mobile-sam-venv"
  echo "Installing the official Apache-2.0 MobileSAM package in a private environment..."
  run mkdir -p "$base"
  run python3 -m venv "$venv"
  run "$venv/bin/python" -m pip install --upgrade pip
  run "$venv/bin/python" -m pip install torch torchvision "git+https://github.com/ChaoningZhang/MobileSAM.git"
  echo "MODEL CODE READY: $venv"
  echo "NEXT: add the official mobile_sam.pt checkpoint, expose the mask protocol, and configure BLACKCORE_PHOTO_SEGMENT_ENDPOINT."
  echo "MobileSAM refines point/box selections; a text detector is still required to ground a phrase such as 'window' automatically."
}

if [ "$MODE" = "rembg" ]; then
  if [ "$IS_TERMUX" = "1" ]; then install_rembg_termux; else install_rembg_linux; fi
elif [ "$MODE" = "mobile-sam" ]; then install_mobile_sam
else install_grounded_sam2; fi

echo "BLACKCORE_REMBG_MODEL=$REMBG_MODEL"
echo "Existing BLACKCORE settings and config/secrets.json were not modified."
