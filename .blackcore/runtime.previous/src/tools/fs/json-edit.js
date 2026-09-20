import fs from "node:fs/promises";
import {defineTool} from "../registry.js";
import {writable, capture} from "./common.js";

function segments(path) {
  if (Array.isArray(path)) return path;
  const out = [];
  const re = /(?:^|\.)([^.[\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(String(path)))) {
    out.push(m[1] ?? Number(m[2]));
  }
  return out;
}

function getParent(root, parts, create) {
  if (!parts.length) return {parent: null, key: null};
  let cur = root;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];

    if (cur[key] == null) {
      if (!create) return {parent: null, key: null};
      cur[key] = typeof nextKey === "number" ? [] : {};
    }

    if (typeof cur[key] !== "object" || cur[key] === null) {
      if (!create) return {parent: null, key: null};
      cur[key] = typeof nextKey === "number" ? [] : {};
    }

    cur = cur[key];
  }

  return {parent: cur, key: parts.at(-1)};
}

function deepMerge(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return b;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return b;

  const out = {...a};
  for (const [key, value] of Object.entries(b)) {
    out[key] = key in out ? deepMerge(out[key], value) : value;
  }
  return out;
}

export const jsonEditTool = defineTool({
  name: "json_edit",
  description:
    "Safely set/delete/merge a path in a JSON file while preserving valid formatted JSON.",
  mutates: true,
  parameters: {
    type: "object",
    properties: {
      path: {type: "string"},
      action: {type: "string", enum: ["set", "delete", "merge"]},
      jsonPath: {type: "string"},
      value: {},
      indent: {type: "integer", minimum: 0, maximum: 8},
    },
    required: ["path", "action"],
    additionalProperties: false,
  },

  async execute(args, ctx) {
    const file = await writable(ctx, args.path);
    let text = null;
    try {
      text = await fs.readFile(file, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      if (args.action === "delete") throw new Error("JSON file not found");
    }
    let data;

    if (text == null) {
      data = {};
    } else {
      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error(`invalid JSON before edit: ${error.message}`);
      }
    }

    const parts = segments(args.jsonPath || "");

    if (!parts.length) {
      if (args.action === "delete") {
        throw new Error("refusing to delete JSON root");
      }
      data = args.action === "merge"
        ? deepMerge(data, args.value)
        : args.value;
    } else {
      const {parent, key} = getParent(data, parts, args.action !== "delete");
      if (!parent) throw new Error("jsonPath not found");

      if (args.action === "set") {
        parent[key] = args.value;
      } else if (args.action === "delete") {
        if (Array.isArray(parent) && typeof key === "number") {
          if (key < 0 || key >= parent.length) throw new Error("array index not found");
          parent.splice(key, 1);
        } else {
          if (!(key in parent)) throw new Error("jsonPath not found");
          delete parent[key];
        }
      } else if (args.action === "merge") {
        parent[key] = deepMerge(parent[key], args.value);
      }
    }

    const out = JSON.stringify(data, null, args.indent ?? 2) + "\n";
    // Parse again as a guard against accidental serialization surprises.
    JSON.parse(out);

    await capture(ctx, file);
    await fs.writeFile(file, out, "utf8");

    return `updated JSON ${file} (${args.action} ${args.jsonPath || "$"})`;
  },
});
