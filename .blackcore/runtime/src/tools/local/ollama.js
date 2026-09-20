import {defineTool} from "../registry.js";
import {execCapture, which} from "../../utils/exec.js";

async function run(args, ctx, timeoutMs = 300000) {
  if (!(await which("ollama"))) {
    throw new Error(
      "Ollama CLI is not installed. Configure another OpenAI-compatible local server or install Ollama for this platform."
    );
  }

  const r = await execCapture("ollama", args, {
    cwd: ctx.cwd,
    signal: ctx.signal,
    timeoutMs,
    maxChars: ctx.cfg.maxToolOutputChars,
  });

  if (r.code !== 0) {
    throw new Error(r.combined || `ollama exited ${r.code}`);
  }

  return r.combined || "ok";
}

export const ollamaTool = defineTool({
  name: "ollama",
  description:
    "Inspect or manage local Ollama models. Pull/remove actions may consume substantial disk/network resources.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list", "show", "ps", "pull", "remove"],
      },
      model: {type: "string"},
    },
    required: ["action"],
    additionalProperties: false,
  },

  async execute(args, ctx) {
    switch (args.action) {
      case "list":
        return run(["list"], ctx, 30000);

      case "ps":
        return run(["ps"], ctx, 30000);

      case "show":
        if (!args.model) throw new Error("model required");
        return run(["show", args.model], ctx, 30000);

      case "pull":
        if (!args.model) throw new Error("model required");
        if (ctx.cfg.permissionProfile !== "yolo") {
          const ok = await ctx.confirm(
            `Pull local model ${args.model}? This can download many GB.`
          );
          if (!ok) return "model pull denied";
        }
        return run(["pull", args.model], ctx, 3600000);

      case "remove":
        if (!args.model) throw new Error("model required");
        if (ctx.cfg.permissionProfile !== "yolo") {
          const ok = await ctx.confirm(
            `Remove local Ollama model ${args.model}?`
          );
          if (!ok) return "model removal denied";
        }
        return run(["rm", args.model], ctx, 120000);
    }

    throw new Error("unsupported ollama action");
  },
});
