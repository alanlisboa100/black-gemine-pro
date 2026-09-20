import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createWorkspaceService, __internal } from "../workspace.mjs";

test("project names are normalized", () => {
  assert.equal(__internal.cleanName(" Animação Neon "), "animacao-neon");
});

test("path traversal is rejected", () => {
  assert.throws(() => __internal.safeRelative("../../segredo"), /traversal/i);
  assert.throws(() => __internal.safeRelative("/etc/passwd"), /absolute/i);
});

test("workspace keeps projects isolated and supports focused edits", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blackcore-plugin-"));
  const svc = createWorkspaceService({ root });
  try {
    const created = await svc.createProject({ name: "App Teste" });
    assert.equal(created.project, "app-teste");
    await svc.writeFile({ project: created.project, file: "src/index.js", content: "const n = 1;\n", overwrite: false });
    const read = await svc.readFile({ project: created.project, file: "src/index.js" });
    assert.match(read.content, /const n = 1/);
    const edit = await svc.replaceText({ project: created.project, file: "src/index.js", oldText: "1", newText: "2" });
    assert.equal(edit.replacements, 1);
    const search = await svc.search({ project: created.project, query: "const n" });
    assert.equal(search.matches.length, 1);
    assert.equal(search.matches[0].path, "src/index.js");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("overwrite is explicit", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blackcore-plugin-"));
  const svc = createWorkspaceService({ root });
  try {
    await svc.createProject({ name: "x" });
    await svc.writeFile({ project: "x", file: "a.txt", content: "one" });
    await assert.rejects(() => svc.writeFile({ project: "x", file: "a.txt", content: "two" }), /overwrite=true/);
    await svc.writeFile({ project: "x", file: "a.txt", content: "two", overwrite: true });
    const read = await svc.readFile({ project: "x", file: "a.txt" });
    assert.equal(read.content, "two");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
