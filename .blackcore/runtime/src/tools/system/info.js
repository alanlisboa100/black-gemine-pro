import os from "node:os";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";
import {which, execCapture} from "../../utils/exec.js";
import {inspectPermissions} from "../../platform/permissions.js";

async function version(command, args = ["--version"]) {
  if (!(await which(command))) return null;
  try {
    const r = await execCapture(command, args, {timeoutMs: 5000});
    return (r.stdout || r.stderr).trim().split(/\r?\n/)[0] || null;
  } catch {
    return null;
  }
}

function termuxInfo() {
  const prefix = process.env.PREFIX || "";
  const home = process.env.HOME || os.homedir();
  const isTermux =
    prefix.includes("com.termux") ||
    home.includes("com.termux") ||
    !!process.env.TERMUX_VERSION;

  return {
    isTermux,
    prefix: prefix || null,
    termuxVersion: process.env.TERMUX_VERSION || null,
    sharedStorage:
      fs.existsSync(path.join(home, "storage")) ?
        path.join(home, "storage") :
        null,
  };
}

export const systemInfoTool = defineTool({
  name: "system_info",
  description:
    "Inspect OS, architecture, runtime and common development-tool versions.",
  readOnly: true,
  parallelSafe: true,
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },

  async execute() {
    const specs=[
      ["git", ["--version"]], ["node", ["--version"]], ["npm", ["--version"]], ["pnpm", ["--version"]],
      ["python", ["--version"]], ["java", ["-version"]], ["gradle", ["--version"]], ["vercel", ["--version"]],
      ["netlify", ["--version"]], ["supabase", ["--version"]], ["resend", ["--version"]], ["eas", ["--version"]], ["gh", ["--version"]], ["rg", ["--version"]], ["fd", ["--version"]],
      ["sqlite3", ["--version"]], ["chromium", ["--version"]], ["chromium-browser", ["--version"]],
      ["psql", ["--version"]], ["adb", ["version"]], ["ffmpeg", ["-version"]], ["magick", ["--version"]],
      ["tesseract", ["--version"]], ["pdftotext", ["-v"]], ["docker", ["--version"]], ["podman", ["--version"]],
      ["go", ["version"]], ["cargo", ["--version"]], ["php", ["--version"]], ["composer", ["--version"]],
    ];
    const pairs=await Promise.all(specs.map(async([name,args])=>[name,await version(name,args)]));
    const tools=Object.fromEntries(pairs);

    const permissions=await inspectPermissions({cwd:process.cwd()});
    return JSON.stringify({
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      kernel: os.release(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      memoryBytes: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      shell: process.env.SHELL || null,
      term: process.env.TERM || null,
      cwd: process.cwd(),
      termux: termuxInfo(),
      permissions,
      tools,
    }, null, 2);
  },
});
