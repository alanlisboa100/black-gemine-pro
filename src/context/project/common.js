import fs from "node:fs";
import path from "node:path";

export function exists(cwd, name) {
  return fs.existsSync(path.join(cwd, name));
}

export function readJson(cwd, name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, name), "utf8"));
  } catch {
    return null;
  }
}

export function readText(cwd, name, max = 200000) {
  try {
    return fs.readFileSync(path.join(cwd, name), "utf8").slice(0, max);
  } catch {
    return "";
  }
}

export function depMap(pkg) {
  return {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
    ...(pkg?.peerDependencies || {}),
  };
}

export function command(script, pm = "npm") {
  if (pm === "npm") return `npm run ${script}`;
  if (pm === "pnpm") return `pnpm run ${script}`;
  if (pm === "yarn") return `yarn ${script}`;
  return `${pm} run ${script}`;
}
