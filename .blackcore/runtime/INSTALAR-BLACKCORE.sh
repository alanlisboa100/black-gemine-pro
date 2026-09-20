#!/usr/bin/env bash
set -euo pipefail

PROFILE="${BLACKCORE_PROFILE:-core}"
WITH_DEPLOY="${BLACKCORE_INSTALL_DEPLOY_CLIS:-0}"
WITH_LOCAL_AI="${BLACKCORE_INSTALL_LOCAL_AI:-0}"
WITH_BROWSER="${BLACKCORE_INSTALL_BROWSER:-0}"
SETUP_STORAGE="${BLACKCORE_SETUP_STORAGE:-0}"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="${2:-}"; shift 2 ;;
    --with-deploy) WITH_DEPLOY=1; shift ;;
    --with-local-ai) WITH_LOCAL_AI=1; shift ;;
    --with-browser) WITH_BROWSER=1; shift ;;
    --setup-storage) SETUP_STORAGE=1; shift ;;
    --help|-h)
      echo "Usage: bash INSTALAR-BLACKCORE.sh [--profile core|web|creator|android|full] [--with-deploy] [--with-local-ai] [--with-browser] [--setup-storage]"
      echo "  core     BLACKCORE, Git and fast search tools (default)"
      echo "  web      core + Chromium interactive browser"
      echo "  creator  core + Python/C/C++, FFmpeg and ImageMagick"
      echo "  android  creator + Java and Gradle toolchain"
      echo "  full     web + creator + android + deploy CLIs"
      echo "  --setup-storage  request Android shared-storage access when it is missing"
      echo "  --with-local-ai  install optional llama.cpp; keys and selected cloud model remain unchanged"
      echo "  --with-browser   install Chromium automation; logged-in profiles stay private under BLACKCORE home"
      exit 0 ;;
    *) echo "ERROR: unknown option: $1"; exit 2 ;;
  esac
done
case "$PROFILE" in core|web|creator|android|full) ;; *) echo "ERROR: invalid profile: $PROFILE"; exit 2 ;; esac
[ "$PROFILE" = "full" ] && WITH_DEPLOY=1

echo
echo -e "\033[38;5;51m  ╔════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[38;5;51m  ║\033[1;38;5;255m  ◆ BLACKCORE NATIVE 3.8.1\033[0m\033[38;5;51m                         ║\033[0m"
echo -e "\033[38;5;51m  ║\033[38;5;244m  PHOTO + VIDEO + OUTFIT STUDIO // VERIFIED\033[0m\033[38;5;51m          ║\033[0m"
echo -e "\033[38;5;51m  ║\033[38;5;213m  profile: $PROFILE\033[0m\033[38;5;51m                                  ║\033[0m"
echo -e "\033[38;5;51m  ╚════════════════════════════════════════════════════╝\033[0m"
echo

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRITICAL_RUNTIME_FILES=("src/security/secrets.js" "src/context/tokens.js" "src/tui/secret-input.js")
for rel in "${CRITICAL_RUNTIME_FILES[@]}"; do
  [ -f "$SRC/$rel" ] || { echo "ERROR: incomplete BLACKCORE archive; missing $rel"; exit 1; }
done
BC_HOME="${BLACKCORE_HOME:-$HOME/.blackcore}"
RUNTIME="$BC_HOME/runtime"
PREVIOUS="$BC_HOME/runtime.previous"
STAGE="$BC_HOME/.runtime-stage-$$"
BIN_DIR="${PREFIX:-$HOME/.local}/bin"

install_optional_pkg(){
  local item="$1" index="$2" total="$3" started="$SECONDS"
  echo
  echo "  [dependency $index/$total] Installing $item..."
  if pkg install -y "$item"; then
    echo "  [dependency $index/$total] READY: $item ($((SECONDS-started))s)"
  else
    echo "  WARN: optional package '$item' was not available; BLACKCORE will keep working without its related tools."
  fi
}

if command -v pkg >/dev/null 2>&1; then
  echo "[1/8] Installing Termux profile: $PROFILE"
  pkg update -y || true
  pkg install -y nodejs-lts git ripgrep fd curl wget jq openssh unzip zip || \
  pkg install -y nodejs git ripgrep fd curl wget jq openssh unzip zip
  OPTIONAL_PACKAGES=(gh sqlite termux-api)
  if [ "$WITH_LOCAL_AI" = "1" ]; then OPTIONAL_PACKAGES+=(llama-cpp); fi
  if [ "$PROFILE" = "creator" ] || [ "$PROFILE" = "android" ] || [ "$PROFILE" = "full" ]; then
    OPTIONAL_PACKAGES+=(python make clang cmake pkg-config ffmpeg imagemagick poppler tesseract)
  fi
  if [ "$PROFILE" = "android" ] || [ "$PROFILE" = "full" ]; then
    OPTIONAL_PACKAGES+=(openjdk-21 gradle aapt apksigner android-tools)
  fi
  if [ "$PROFILE" = "web" ] || [ "$PROFILE" = "full" ] || [ "$WITH_BROWSER" = "1" ]; then
    OPTIONAL_PACKAGES+=(x11-repo chromium termux-x11-nightly)
  fi
  if [ "$PROFILE" = "full" ]; then
    OPTIONAL_PACKAGES+=(postgresql golang rust php composer)
  fi
  PACKAGE_TOTAL="${#OPTIONAL_PACKAGES[@]}"
  PACKAGE_INDEX=0
  for item in "${OPTIONAL_PACKAGES[@]}"; do PACKAGE_INDEX=$((PACKAGE_INDEX+1)); install_optional_pkg "$item" "$PACKAGE_INDEX" "$PACKAGE_TOTAL"; done
  echo
  echo "  Checking Android shared storage..."
  if [ -r "$HOME/storage/shared" ] && [ -w "$HOME/storage/shared" ]; then
    echo "  READY: shared storage read/write · $HOME/storage/shared"
  elif [ "$SETUP_STORAGE" = "1" ] && command -v termux-setup-storage >/dev/null 2>&1; then
    echo "  ACTION: Android will ask for Files and media access. Allow it to use Downloads and shared folders."
    termux-setup-storage || echo "  WARN: storage authorization was not completed; run termux-setup-storage later."
    if [ -r "$HOME/storage/shared" ] && [ -w "$HOME/storage/shared" ]; then echo "  READY: shared storage read/write"
    else echo "  WAITING: Android storage permission may require restarting Termux, then run: blackcore permissions"; fi
  else
    echo "  OPTIONAL: shared storage is not ready. Run: termux-setup-storage"
    echo "  Then verify it with: blackcore permissions"
  fi
else
  echo "[1/8] Linux/macOS detected; system packages must already provide Node.js and Git."
fi

echo "[2/8] Checking runtime requirements..."
for command_name in node npm git; do command -v "$command_name" >/dev/null 2>&1 || { echo "ERROR: '$command_name' is required."; exit 1; }; done
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then echo "ERROR: Node.js >=20 required; found $(node -v)"; exit 1; fi

echo "[3/8] Staging BLACKCORE safely..."
mkdir -p "$BC_HOME"
echo "  Existing settings and API keys stay protected in $BC_HOME/config."
rm -rf "$STAGE"
mkdir -p "$STAGE"
trap 'rm -rf "$STAGE"' EXIT
(
  cd "$SRC"
  tar --exclude='./.git' --exclude='./node_modules' --exclude='./BLACKCORE-OFFLINE-*' -cf - .
) | (cd "$STAGE" && tar -xf -)

echo "[4/8] Installing JavaScript runtime dependencies..."
(
  cd "$STAGE"
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm --cache "$BC_HOME/cache/npm" install --omit=dev --no-audit --no-fund
)

echo "[5/8] Activating runtime with rollback point..."
rm -rf "$PREVIOUS"
[ ! -d "$RUNTIME" ] || mv "$RUNTIME" "$PREVIOUS"
if ! mv "$STAGE" "$RUNTIME"; then
  [ ! -d "$PREVIOUS" ] || mv "$PREVIOUS" "$RUNTIME"
  echo "ERROR: activation failed; previous runtime restored."
  exit 1
fi
trap - EXIT
chmod +x "$RUNTIME/bin/blackcore.js" "$RUNTIME/scripts/"*.sh 2>/dev/null || true
printf '%s\n' "$PROFILE" > "$BC_HOME/install-profile"

echo "[6/8] Installing built-in resources and commands..."
mkdir -p "$BC_HOME/skills" "$BC_HOME/prompts" "$BC_HOME/themes" "$BC_HOME/extensions" "$BC_HOME/config" "$BC_HOME/logs" "$BIN_DIR"
cp -R "$RUNTIME/skills/." "$BC_HOME/skills/" 2>/dev/null || true
cp -R "$RUNTIME/prompts/." "$BC_HOME/prompts/" 2>/dev/null || true
cp -R "$RUNTIME/themes/." "$BC_HOME/themes/" 2>/dev/null || true
[ -f "$BC_HOME/AGENTS.md" ] || cp "$RUNTIME/templates/AGENTS.md" "$BC_HOME/AGENTS.md"
[ -f "$BC_HOME/BLACKCORE.md" ] || cp "$RUNTIME/templates/BLACKCORE.md" "$BC_HOME/BLACKCORE.md"
for command_name in blackcore blackcore-config blackcore-doctor blackcore-source blackcore-uninstall blackcore-local-ai; do
  case "$command_name" in
    blackcore) target='exec node "'"$RUNTIME"'/bin/blackcore.js" "$@"' ;;
    blackcore-config) target='exec "'"$BIN_DIR"'/blackcore" config "$@"' ;;
    blackcore-doctor) target='exec "'"$BIN_DIR"'/blackcore" doctor "$@"' ;;
    blackcore-source) target='cd "'"$RUNTIME"'" && exec "${SHELL:-bash}"' ;;
    blackcore-uninstall) target='exec bash "'"$RUNTIME"'/scripts/uninstall.sh" "$@"' ;;
    blackcore-local-ai) target='exec bash "'"$RUNTIME"'/scripts/local-ai-control.sh" "$@"' ;;
  esac
  printf '#!/usr/bin/env bash\n%s\n' "$target" > "$BIN_DIR/$command_name"
  chmod +x "$BIN_DIR/$command_name"
done

if [[ "$BIN_DIR" == "$HOME/.local/bin" ]] && [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do [ ! -f "$rc" ] || grep -q 'HOME/.local/bin' "$rc" || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$rc"; done
fi

echo "[7/8] Optional deployment CLIs..."
if [ "$WITH_DEPLOY" = "1" ]; then
  DEPLOY_PACKAGES=(vercel@58.9.4 netlify-cli@27.1.1 eas-cli@21.8.0 supabase@2.113.0 resend-cli@2.12.0)
  DEPLOY_INDEX=0
  for item in "${DEPLOY_PACKAGES[@]}"; do
    package_name="${item%%@*}"
    DEPLOY_INDEX=$((DEPLOY_INDEX+1)); DEPLOY_STARTED="$SECONDS"
    echo "  [deploy $DEPLOY_INDEX/${#DEPLOY_PACKAGES[@]}] Installing $item..."
    if { [ "$package_name" = "netlify-cli" ] || [ "$package_name" = "resend-cli" ]; } && ! node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit(major>22||major===22&&minor>=13?0:1)'; then
      echo "  WARN: $package_name requires Node.js >=22.13; skipped on $(node --version)."
      deploy_ok=0
    elif [ "$package_name" = "supabase" ]; then
      # Supabase explicitly does not support a global npm installation. Keep
      # its official npm package isolated and expose a stable BLACKCORE wrapper.
      mkdir -p "$BC_HOME/cli/supabase"
      if npm --cache "$BC_HOME/cache/npm" --prefix "$BC_HOME/cli/supabase" install "$item" --no-save --no-audit --no-fund; then
        printf '#!/usr/bin/env bash\nexec "%s" "$@"\n' "$BC_HOME/cli/supabase/node_modules/.bin/supabase" > "$BIN_DIR/supabase"
        chmod +x "$BIN_DIR/supabase"
        deploy_ok=1
      else deploy_ok=0; fi
    elif npm --cache "$BC_HOME/cache/npm" install -g "$item" --no-audit --no-fund; then deploy_ok=1
    else deploy_ok=0; fi
    if [ "$deploy_ok" = "1" ]; then
      echo "  [deploy $DEPLOY_INDEX/${#DEPLOY_PACKAGES[@]}] READY: $item ($((SECONDS-DEPLOY_STARTED))s)"
    else
      echo "  WARN: optional CLI '$item' failed or was incompatible; BLACKCORE remains usable."
    fi
  done
else
  echo "  skipped; use --with-deploy or --profile full when deployment tooling is desired"
fi

echo "[8/8] Verifying installation..."
"$BIN_DIR/blackcore" version
"$BIN_DIR/blackcore" doctor --full || true
if command -v du >/dev/null 2>&1; then echo "  installed runtime size: $(du -sh "$RUNTIME" 2>/dev/null | awk '{print $1}')"; fi

echo
echo "======================================================"
echo " BLACKCORE 3.8.0 INSTALLED // $PROFILE"
echo "======================================================"
echo " Start: blackcore"
echo " Vision: blackcore --image screenshot.png -p \"review this UI\""
echo " Photo:  blackcore --image photo.jpg -p \"melhora essa foto de forma natural\""
echo " Outfit: configure BLACKCORE_OUTFIT_ENDPOINT, then ask to replace clothing using a garment image"
echo " Rollback copy: $PREVIOUS"
echo " Keys preserved: $BC_HOME/config/secrets.json"
echo " Local AI: blackcore-local-ai status"
echo " Browser: ask BLACKCORE to list browser profiles or open a visible login"
echo " Logged-in browser data stays private: $BC_HOME/browser/profiles"
echo
