import {defineTool} from "../registry.js";

export const shellSessionTool = defineTool({
  name: "shell_session",
  description:
    "Open/run/inspect/close a persistent shell session. Useful when commands must share cwd or shell state.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["open", "run", "tail", "list", "close"],
      },
      name: {type: "string"},
      command: {type: "string"},
      timeoutMs: {type: "integer", minimum: 1000, maximum: 600000},
      tailChars: {type: "integer", minimum: 100, maximum: 100000},
    },
    required: ["action"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    if (args.action === "list") {
      return JSON.stringify(ctx.shellSessions.list(), null, 2);
    }

    const name = args.name || "default";

    if (args.action === "open") {
      const shell = ctx.shellSessions.open(name, {cwd: ctx.cwd});
      return JSON.stringify(shell.tail(0), null, 2);
    }

    if (args.action === "close") {
      ctx.shellSessions.close(name);
      return `closed shell session ${name}`;
    }

    const shell = ctx.shellSessions.get(name);

    if (args.action === "tail") {
      return JSON.stringify(shell.tail(args.tailChars || 20000), null, 2);
    }

    if (!args.command) throw new Error("command required");

    const auth = await ctx.security.authorizeShell(args.command, ctx);
    if (!auth.allow) throw new Error(auth.reason);

    const result = await shell.run(args.command, {
      timeoutMs: args.timeoutMs || 60000,
      signal: ctx.signal,
    });

    return `exit=${result.code}\n${result.combined}`;
  },
});
