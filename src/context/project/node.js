import {depMap,exists,readJson,command} from "./common.js";

export function detectNode(cwd) {
  const pkg = readJson(cwd, "package.json");
  if (!pkg) return null;

  const deps = depMap(pkg);
  const packageManager =
    exists(cwd, "pnpm-lock.yaml") ? "pnpm" :
    exists(cwd, "yarn.lock") ? "yarn" :
    exists(cwd, "bun.lockb") || exists(cwd, "bun.lock") ? "bun" :
    "npm";

  const frameworks = [];
  const add = (name, when) => { if (when) frameworks.push(name); };
  add("nextjs", deps.next);
  add("react", deps.react);
  add("vite", deps.vite);
  add("expo", deps.expo);
  add("react-native", deps["react-native"]);
  add("nestjs", deps["@nestjs/core"]);
  add("express", deps.express);
  add("fastify", deps.fastify);
  add("nuxt", deps.nuxt);
  add("vue", deps.vue);
  add("sveltekit", deps["@sveltejs/kit"]);
  add("svelte", deps.svelte);
  add("astro", deps.astro);
  add("remix", deps["@remix-run/react"]);
  add("electron", deps.electron);

  const scripts = pkg.scripts || {};
  const verification = [];
  for (const name of ["lint", "typecheck", "check", "test", "build"]) {
    if (scripts[name]) verification.push(command(name, packageManager));
  }

  return {
    ecosystem: "node",
    packageManager,
    packageName: pkg.name || null,
    packageVersion: pkg.version || null,
    nodeEngine: pkg.engines?.node || null,
    moduleType: pkg.type || "commonjs/default",
    frameworks,
    scripts,
    verification,
  };
}
