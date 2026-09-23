import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";
import {isSensitivePath} from "../../security/secrets.js";

function parseEnvNames(text) {
  const names = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ")
      ? line.slice(7).trim()
      : line;
    const m = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) names.push(m[1]);
  }
  return [...new Set(names)].sort();
}

function candidateFiles(cwd) {
  const out = [];
  for (const name of [
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
    ".env.example",
    ".env.sample",
  ]) {
    const file = path.join(cwd, name);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) out.push(file);
  }
  return out;
}

export const envNamesTool = defineTool({
  name: "env_names",
  description:
    "List environment-variable names used by local .env files without exposing their values.",
  readOnly: true,
  parallelSafe: true,
  parameters: {
    type: "object",
    properties: {
      includeProcessEnv: {type: "boolean"},
    },
    additionalProperties: false,
  },

  async execute(args, ctx) {
    const result = {};

    for (const file of candidateFiles(ctx.cwd)) {
      const text = fs.readFileSync(file, "utf8");
      result[path.basename(file)] = parseEnvNames(text);
    }

    if (args.includeProcessEnv) {
      result.process = Object.keys(process.env)
        .filter(name => !/KEY|TOKEN|SECRET|PASSWORD|COOKIE|CREDENTIAL/i.test(name))
        .sort();
    }

    return JSON.stringify(result, null, 2);
  },
});

export const sensitiveFileCheckTool = defineTool({
  name: "sensitive_path_check",
  description:
    "Check whether a path looks credential-sensitive without reading its contents.",
  readOnly: true,
  parallelSafe: true,
  parameters: {
    type: "object",
    properties: {
      path: {type: "string"},
    },
    required: ["path"],
    additionalProperties: false,
  },

  async execute(args, ctx) {
    const file = path.resolve(ctx.cwd, args.path);
    return JSON.stringify({
      path: file,
      sensitive: isSensitivePath(file),
      exists: fs.existsSync(file),
    }, null, 2);
  },
});
