import {exists,readText} from "./common.js";

export function detectAndroid(cwd) {
  const hasRoot = exists(cwd, "gradlew");
  const hasNested = exists(cwd, "android/gradlew");
  if (!hasRoot && !hasNested) return null;

  const base = hasRoot ? "" : "android/";
  const wrapper = hasRoot ? "./gradlew" : "./android/gradlew";
  const build = readText(cwd, `${base}build.gradle`) + "\n" +
                readText(cwd, `${base}build.gradle.kts`) + "\n" +
                readText(cwd, `${base}app/build.gradle`) + "\n" +
                readText(cwd, `${base}app/build.gradle.kts`);

  const kotlin = /kotlin/i.test(build);
  const namespace = (build.match(/namespace\s*[= ]\s*["']([^"']+)/) || [])[1] || null;
  const applicationId = (build.match(/applicationId\s*[= ]\s*["']([^"']+)/) || [])[1] || null;
  const compileSdk = (build.match(/compileSdk(?:Version)?\s*[= ]\s*(\d+)/) || [])[1] || null;

  return {
    ecosystem:"android",
    gradleRoot:base || ".",
    kotlin,
    namespace,
    applicationId,
    compileSdk,
    verification:[
      `${wrapper} tasks`,
      `${wrapper} test`,
      `${wrapper} assembleDebug`,
    ],
  };
}
