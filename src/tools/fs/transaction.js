import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {writable, readable, ensureParent} from "./common.js";

async function snapshot(file) {
  try {
    const st = await fs.stat(file);
    if (!st.isFile()) return {exists: true, nonFile: true};
    return {
      exists: true,
      data: await fs.readFile(file),
      mode: st.mode & 0o777,
    };
  } catch {
    return {exists: false};
  }
}

async function restore(file, snap) {
  if (!snap.exists) {
    try { await fs.unlink(file); } catch {}
    return;
  }
  if (snap.nonFile) return;
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, snap.data);
  if (snap.mode != null) {
    try { await fs.chmod(file, snap.mode); } catch {}
  }
}

function replaceOccurrence(text, oldText, newText, occurrence) {
  const positions = [];
  let cursor = 0;
  while ((cursor = text.indexOf(oldText, cursor)) >= 0) {
    positions.push(cursor);
    cursor += Math.max(1, oldText.length);
  }

  if (!positions.length) throw new Error("edit oldText not found");
  if (!occurrence && positions.length !== 1) {
    throw new Error(`edit is ambiguous: ${positions.length} matches`);
  }

  const index = positions[(occurrence || 1) - 1];
  if (index == null) throw new Error("edit occurrence out of range");

  return text.slice(0, index) + newText + text.slice(index + oldText.length);
}

export const transactionTool = defineTool({
  name: "file_transaction",
  description:
    "Apply a batch of file writes/edits/copies/moves/deletes as a best-effort atomic transaction. Rolls back touched files if an operation fails.",
  mutates: true,
  parameters: {
    type: "object",
    properties: {
      operations: {
        type: "array",
        minItems: 1,
        maxItems: 100,
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["write", "edit", "copy", "move", "delete", "mkdir"],
            },
            path: {type: "string"},
            from: {type: "string"},
            to: {type: "string"},
            content: {type: "string"},
            oldText: {type: "string"},
            newText: {type: "string"},
            occurrence: {type: "integer", minimum: 1},
          },
          required: ["action"],
          additionalProperties: false,
        },
      },
    },
    required: ["operations"],
    additionalProperties: false,
  },

  async execute(args, ctx) {
    const snaps = new Map();
    const touchedOrder = [];

    async function remember(file) {
      if (snaps.has(file)) return;
      snaps.set(file, await snapshot(file));
      touchedOrder.push(file);
      await ctx.checkpoints?.capture(file);
    }

    async function target(p) {
      if (!p) throw new Error("path required");
      return writable(ctx, p);
    }

    try {
      for (const [index, op] of args.operations.entries()) {
        switch (op.action) {
          case "mkdir": {
            const dir = await target(op.path);
            // Directories are not deleted on rollback because they may acquire
            // unrelated content during concurrent user work.
            await fs.mkdir(dir, {recursive: true});
            break;
          }

          case "write": {
            const file = await target(op.path);
            await remember(file);
            await ensureParent(file);
            await fs.writeFile(file, op.content ?? "", "utf8");
            break;
          }

          case "edit": {
            const file = await target(op.path);
            await remember(file);
            const text = await fs.readFile(file, "utf8");
            const next = replaceOccurrence(
              text,
              op.oldText ?? "",
              op.newText ?? "",
              op.occurrence
            );
            await fs.writeFile(file, next, "utf8");
            break;
          }

          case "copy": {
            const from = await readable(ctx, op.from);
            const to = await target(op.to);
            const st = await fs.stat(from);
            if (!st.isFile()) throw new Error("copy source is not a file");
            await remember(to);
            await ensureParent(to);
            await fs.copyFile(from, to);
            break;
          }

          case "move": {
            const from = await target(op.from);
            const to = await target(op.to);
            const st = await fs.stat(from);
            if (!st.isFile()) throw new Error("move source is not a file");
            await remember(from);
            await remember(to);
            await ensureParent(to);
            await fs.rename(from, to);
            break;
          }

          case "delete": {
            const file = await target(op.path);
            const st = await fs.stat(file);
            if (!st.isFile()) throw new Error("delete supports regular files only");
            if (!(await ctx.security.authorizeDelete(file, ctx))) {
              throw new Error("delete denied");
            }
            await remember(file);
            await fs.unlink(file);
            break;
          }

          default:
            throw new Error(`unknown transaction action ${op.action}`);
        }
      }

      return `transaction committed: ${args.operations.length} operations, ${snaps.size} checkpointed files`;
    } catch (error) {
      for (const file of touchedOrder.reverse()) {
        try {
          await restore(file, snaps.get(file));
        } catch {}
      }
      throw new Error(`transaction rolled back: ${error.message}`);
    }
  },
});
