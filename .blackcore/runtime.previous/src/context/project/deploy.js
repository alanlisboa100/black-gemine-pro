import {exists,readJson,readText} from "./common.js";

export function detectDeploy(cwd) {
  const pkg = readJson(cwd, "package.json") || {};
  const packages = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
  const vercel = exists(cwd, "vercel.json");
  const eas = exists(cwd, "eas.json");
  const appJson = readJson(cwd, "app.json");
  const appConfig = exists(cwd, "app.config.js") || exists(cwd, "app.config.ts");
  const netlify = exists(cwd, "netlify.toml");
  const supabase = exists(cwd, "supabase/config.toml") || !!packages["@supabase/supabase-js"] || !!packages.supabase;
  const resend = exists(cwd, "resend.config.js") || exists(cwd, "resend.config.ts") || !!packages.resend;
  const docker = exists(cwd, "Dockerfile") || exists(cwd, "docker-compose.yml") || exists(cwd, "compose.yml");

  return {
    vercel,
    eas,
    expoConfig: !!appJson || appConfig,
    netlify,
    supabase,
    resend,
    docker,
    easProfiles: Object.keys(readJson(cwd, "eas.json")?.build || {}),
  };
}
