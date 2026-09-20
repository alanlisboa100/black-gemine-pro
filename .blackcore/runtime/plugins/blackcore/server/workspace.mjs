import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".jsonc", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
  ".html", ".css", ".scss", ".less", ".xml", ".yaml", ".yml", ".toml", ".ini", ".env",
  ".py", ".rb", ".php", ".go", ".rs", ".java", ".kt", ".kts", ".swift", ".dart", ".sh",
  ".bash", ".zsh", ".sql", ".graphql", ".gql", ".vue", ".svelte"
]);

const DEFAULT_IGNORES = new Set(["node_modules", ".git", ".next", "dist", "build", ".expo", ".gradle", "vendor"]);

function cleanName(value) {
  const s = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!s || s === "." || s === "..") throw new Error("Invalid project name");
  return s.slice(0, 80);
}

function rootFromEnv() {
  const configured = process.env.BLACKCORE_PLUGIN_WORKSPACE?.trim();
  return path.resolve(configured || path.join(os.homedir(), "blackcore-plugin-workspace"));
}

function ensureInside(root, candidate) {
  const rel = path.relative(root, candidate);
  if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) return candidate;
  throw new Error("Path escapes the BLACKCORE plugin workspace");
}

function safeRelative(input = ".") {
  const raw = String(input ?? ".").replace(/\\/g, "/");
  if (raw.includes("\0")) throw new Error("NUL byte is not allowed in paths");
  if (path.posix.isAbsolute(raw) || /^[A-Za-z]:\//.test(raw)) throw new Error("Absolute paths are not allowed");
  const normalized = path.posix.normalize(raw || ".");
  if (normalized === ".." || normalized.startsWith("../")) throw new Error("Parent traversal is not allowed");
  return normalized === "." ? "." : normalized.replace(/^\.\//, "");
}

function isProbablyText(file) {
  const base = path.basename(file);
  if (["Dockerfile", "Makefile", "Procfile", "LICENSE", "README"].includes(base)) return true;
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) || !path.extname(file);
}

async function exists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function statSafe(target) {
  try { return await fs.stat(target); } catch { return null; }
}

async function walkFiles(dir, { maxFiles = 2000, maxDepth = 8 } = {}) {
  const out = [];
  async function walk(cur, depth) {
    if (out.length >= maxFiles || depth > maxDepth) return;
    const entries = await fs.readdir(cur, { withFileTypes: true }).catch(() => []);
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (out.length >= maxFiles) break;
      if (DEFAULT_IGNORES.has(entry.name)) continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else if (entry.isFile()) out.push(full);
    }
  }
  await walk(dir, 0);
  return out;
}

export function createWorkspaceService({ root = rootFromEnv() } = {}) {
  root = path.resolve(root);

  async function init() {
    await fs.mkdir(root, { recursive: true });
    return root;
  }

  async function projectDir(project) {
    await init();
    const slug = cleanName(project);
    const target = ensureInside(root, path.resolve(root, slug));
    const st = await statSafe(target);
    if (!st?.isDirectory()) throw new Error(`Project not found: ${slug}`);
    return { slug, target };
  }

  async function resolveProjectPath(project, relativePath = ".") {
    const { slug, target } = await projectDir(project);
    const rel = safeRelative(relativePath);
    const resolved = ensureInside(target, path.resolve(target, rel));
    return { slug, projectRoot: target, rel, resolved };
  }

  return {
    get root() { return root; },

    async status() {
      await init();
      const projects = (await fs.readdir(root, { withFileTypes: true })).filter(e => e.isDirectory()).length;
      return { ok: true, workspace: root, projects, isolation: "per-project", destructiveTools: false };
    },

    async listProjects() {
      await init();
      const entries = await fs.readdir(root, { withFileTypes: true });
      const projects = [];
      for (const entry of entries.filter(e => e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))) {
        const full = path.join(root, entry.name);
        const st = await fs.stat(full);
        projects.push({ name: entry.name, modifiedAt: st.mtime.toISOString() });
      }
      return { projects };
    },

    async createProject({ name }) {
      await init();
      const project = cleanName(name);
      const target = ensureInside(root, path.resolve(root, project));
      const created = !(await exists(target));
      await fs.mkdir(target, { recursive: true });
      return { project, created };
    },

    async listFiles({ project, directory = ".", maxEntries = 300 }) {
      const { projectRoot, rel, resolved } = await resolveProjectPath(project, directory);
      const st = await statSafe(resolved);
      if (!st?.isDirectory()) throw new Error(`Directory not found: ${rel}`);
      const files = await walkFiles(resolved, { maxFiles: Math.min(Math.max(Number(maxEntries) || 300, 1), 1000), maxDepth: 6 });
      const entries = [];
      for (const file of files) {
        const fst = await fs.stat(file);
        entries.push({ path: path.relative(projectRoot, file).split(path.sep).join("/"), size: fst.size });
      }
      return { project: cleanName(project), directory: rel, entries, truncated: entries.length >= maxEntries };
    },

    async readFile({ project, file, startLine = 1, maxLines = 400 }) {
      const { rel, resolved } = await resolveProjectPath(project, file);
      const st = await statSafe(resolved);
      if (!st?.isFile()) throw new Error(`File not found: ${rel}`);
      if (st.size > 1_000_000) throw new Error("File is larger than 1 MB; narrow the task or use a smaller source file");
      const buf = await fs.readFile(resolved);
      if (buf.includes(0)) throw new Error("Binary files are not returned as text");
      const lines = buf.toString("utf8").split(/\r?\n/);
      const start = Math.max(1, Number(startLine) || 1);
      const count = Math.min(Math.max(Number(maxLines) || 400, 1), 1000);
      const selected = lines.slice(start - 1, start - 1 + count);
      return {
        project: cleanName(project),
        path: rel,
        startLine: start,
        endLine: start + selected.length - 1,
        totalLines: lines.length,
        content: selected.join("\n"),
        truncated: start - 1 + selected.length < lines.length
      };
    },

    async search({ project, query, maxResults = 50 }) {
      const { target: projectRoot, slug } = await projectDir(project);
      const q = String(query ?? "");
      if (!q.trim()) throw new Error("Search query cannot be empty");
      const limit = Math.min(Math.max(Number(maxResults) || 50, 1), 200);
      const files = await walkFiles(projectRoot, { maxFiles: 2500, maxDepth: 8 });
      const matches = [];
      for (const file of files) {
        if (matches.length >= limit) break;
        if (!isProbablyText(file)) continue;
        const st = await fs.stat(file).catch(() => null);
        if (!st || st.size > 512_000) continue;
        const text = await fs.readFile(file, "utf8").catch(() => null);
        if (text == null) continue;
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length && matches.length < limit; i++) {
          const idx = lines[i].toLowerCase().indexOf(q.toLowerCase());
          if (idx < 0) continue;
          matches.push({
            path: path.relative(projectRoot, file).split(path.sep).join("/"),
            line: i + 1,
            preview: lines[i].slice(Math.max(0, idx - 80), idx + q.length + 120)
          });
        }
      }
      return { project: slug, query: q, matches, truncated: matches.length >= limit };
    },

    async writeFile({ project, file, content, overwrite = false }) {
      const { rel, resolved } = await resolveProjectPath(project, file);
      if (rel === ".") throw new Error("A file path is required");
      const current = await statSafe(resolved);
      if (current?.isDirectory()) throw new Error("Target path is a directory");
      if (current && !overwrite) throw new Error("File already exists; set overwrite=true only when replacing the complete file is intended");
      const text = String(content ?? "");
      if (Buffer.byteLength(text, "utf8") > 1_000_000) throw new Error("Write exceeds the 1 MB per-file safety limit");
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, text, "utf8");
      return { project: cleanName(project), path: rel, bytes: Buffer.byteLength(text, "utf8"), created: !current };
    },

    async replaceText({ project, file, oldText, newText, replaceAll = false }) {
      const { rel, resolved } = await resolveProjectPath(project, file);
      const st = await statSafe(resolved);
      if (!st?.isFile()) throw new Error(`File not found: ${rel}`);
      if (st.size > 1_000_000) throw new Error("File is larger than 1 MB");
      const before = await fs.readFile(resolved, "utf8");
      const needle = String(oldText ?? "");
      if (!needle) throw new Error("oldText cannot be empty");
      const occurrences = before.split(needle).length - 1;
      if (occurrences === 0) throw new Error("oldText was not found; read the file again before editing");
      if (!replaceAll && occurrences > 1) throw new Error(`oldText occurs ${occurrences} times; provide a more specific match or set replaceAll=true`);
      const replacement = String(newText ?? "");
      const after = replaceAll ? before.split(needle).join(replacement) : before.replace(needle, replacement);
      await fs.writeFile(resolved, after, "utf8");
      return { project: cleanName(project), path: rel, replacements: replaceAll ? occurrences : 1 };
    }
  };
}

export const __internal = { cleanName, safeRelative, ensureInside };
