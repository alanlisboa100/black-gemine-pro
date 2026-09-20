---
name: android-native
description: Diagnose and build Gradle/Android projects, including Expo prebuild outputs and APK/AAB workflows.
---

# Android Native

Inspect Gradle wrapper, settings, app module, Android plugin/Kotlin versions, compile/target SDK, Java requirement, signing configuration names, and manifest.

Use the project Gradle wrapper, not a random global Gradle.
Common checks:
- `./gradlew tasks`
- `./gradlew assembleDebug`
- project-specific tests/lint
- `./gradlew bundleRelease` only when release configuration is intended.

Never print keystore passwords or private signing material.
