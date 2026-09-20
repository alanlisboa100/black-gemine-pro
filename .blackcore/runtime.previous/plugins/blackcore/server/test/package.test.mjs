import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "../..");
const repoRoot = path.resolve(pluginRoot, "../..");

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

test("plugin manifest points only to existing bundled components", async () => {
  const manifest = await readJson(path.join(pluginRoot, ".codex-plugin/plugin.json"));
  assert.equal(manifest.name, "blackcore");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  for (const key of ["skills", "mcpServers"]) {
    assert.ok(manifest[key]?.startsWith("./"), `${key} must be plugin-relative`);
    await fs.access(path.resolve(pluginRoot, manifest[key]));
  }
  assert.equal(manifest.apps, undefined, "registered ChatGPT app mapping must not be faked before Developer Mode registration");
});

test("bundled MCP config launches the isolated BLACKCORE server over stdio", async () => {
  const mcp = await readJson(path.join(pluginRoot, ".mcp.json"));
  assert.equal(mcp.blackcore.command, "node");
  assert.deepEqual(mcp.blackcore.args, ["./server/index.mjs", "--stdio"]);
});

test("repo marketplace exposes the BLACKCORE local plugin", async () => {
  const marketplace = await readJson(path.join(repoRoot, ".agents/plugins/marketplace.json"));
  const entry = marketplace.plugins.find(p => p.name === "blackcore");
  assert.ok(entry);
  assert.equal(entry.source.path, "./plugins/blackcore");
  await fs.access(path.join(repoRoot, "plugins/blackcore/.codex-plugin/plugin.json"));
});
