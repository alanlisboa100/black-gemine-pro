#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${BLACKCORE_REMBG_CONTAINER:-blackcore-photo-ai}"
GUEST_REMBG="/opt/blackcore-rembg/bin/rembg"
if [ "${1:-}" = "i" ] && [ "$#" -ge 3 ] && [ -f "$2" ]; then
  source_file="$2"; output_file="$3"; suffix="${source_file##*.}"
  case "${suffix,,}" in jpg|jpeg|png|webp|bmp|tif|tiff|heic|heif|avif) ;; *) suffix="img" ;; esac
  shared_root="${TMPDIR:-${PREFIX:-/data/data/com.termux/files/usr}/tmp}"
  work_dir="$(mktemp -d "$shared_root/blackcore-rembg-XXXXXX")"; guest_dir="/tmp/$(basename "$work_dir")"
  cleanup(){ rm -rf -- "$work_dir"; }
  trap cleanup EXIT INT TERM
  cp -- "$source_file" "$work_dir/input.$suffix"
  proot-distro login "$CONTAINER" --shared-tmp -- "$GUEST_REMBG" i "$guest_dir/input.$suffix" "$guest_dir/output.png"
  cp -- "$work_dir/output.png" "$output_file"
  exit 0
fi
exec proot-distro login "$CONTAINER" -- "$GUEST_REMBG" "$@"
