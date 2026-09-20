---
name: expo-eas
description: Develop, diagnose, build, update, and submit Expo/React Native projects.
---

# Expo + EAS

## Preflight
1. Inspect `package.json`, `app.json` / `app.config.*`, `eas.json`, Android/iOS directories if present.
2. Run `npx expo-doctor`.
3. Check dependency compatibility with the installed Expo SDK.
4. Verify required environment-variable names without exposing values.
5. For native changes, decide whether `expo prebuild` is needed.

## Build
Use the structured `eas` tool for remote build/update/submit. For Android native projects, use `gradle` when a wrapper exists.
Treat build profile, app identifier/package name, credentials, and signing as separate concerns.
Never overwrite signing credentials or publish/submit without user intent.
