# BLACKCORE Creative Lab Mobile

This is a compact Expo source project prepared to generate an Android APK. It mirrors the local web fixture with a rotating core, heart burst, and a tap game.

It is source-ready, but an APK was **not** generated in this workspace: Android SDK, Gradle, `adb`, and `javac` are unavailable here. That is an environment limitation, not a claim of a completed build.

To build it in an Android/Expo-capable environment:

```bash
npm install
npx eas login
npx eas build --platform android --profile preview
```

The `preview` profile in `eas.json` requests an installable APK. Before a production release, replace `io.blackcore.creativelab` in `app.json` with a package identifier owned by you.
