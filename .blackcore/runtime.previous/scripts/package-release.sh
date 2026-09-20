#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
DIST="$ROOT/dist"
NAME="BLACKCORE-NATIVE-$VERSION"
ZIP_NAME="$NAME-TERMUX.zip"
SKIP_SBOM="${BLACKCORE_SKIP_SBOM:-0}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$DIST"
rm -f "$DIST/$NAME.zip" "$DIST/$ZIP_NAME" "$DIST/$NAME.tgz" "$DIST/blackcore-native-$VERSION.tgz" "$DIST/$NAME.sbom.json" "$DIST/SHA256SUMS"
mkdir -p "$STAGE/$NAME"
(
  cd "$ROOT"
  tar --exclude='./.git' --exclude='./.blackcore' --exclude='./node_modules' --exclude='*/node_modules' --exclude='./dist' --exclude='./release' --exclude='./.env' --exclude='./.env.*' --exclude='./*.log' -cf - .
) | (cd "$STAGE/$NAME" && tar -xf -)
(
  cd "$STAGE"
  zip -qr "$DIST/$ZIP_NAME" "$NAME"
  cd "$ROOT"
  npm pack --cache "$DIST/.npm-cache" --pack-destination "$DIST" >/dev/null
)
rm -rf "$DIST/.npm-cache"
if [ "$SKIP_SBOM" = "1" ]; then
  (cd "$DIST" && sha256sum "$ZIP_NAME" "blackcore-native-$VERSION.tgz" > SHA256SUMS)
else
  (cd "$ROOT" && npm sbom --omit=dev --sbom-format cyclonedx > "$DIST/$NAME.sbom.json")
  (cd "$DIST" && sha256sum "$ZIP_NAME" "blackcore-native-$VERSION.tgz" "$NAME.sbom.json" > SHA256SUMS)
fi
echo "$DIST/$ZIP_NAME"
echo "$DIST/blackcore-native-$VERSION.tgz"
[ "$SKIP_SBOM" = "1" ] || echo "$DIST/$NAME.sbom.json"
echo "$DIST/SHA256SUMS"
