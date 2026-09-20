import { createServer as createHttpServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from "@modelcontextprotocol/node";
import * as z from "zod/v4";
import { createWorkspaceService } from "./workspace.mjs";

const VERSION = "0.1.0";
const NAME = "blackcore-projects";

function result(data, message) {
  return {
    structuredContent: data,
    content: [{ type: "text", text: message ?? JSON.stringify(data) }]
  };
}

function errorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, content: [{ type: "text", text: message }] };
}

function wrap(handler) {
  return async (args) => {
    try { return await handler(args); }
    catch (error) { return errorResult(error); }
  };
}

export function buildServer() {
  const workspace = createWorkspaceService();
  const server = new McpServer(
    { name: NAME, version: VERSION },
    {
      instructions:
        "BLACKCORE exposes isolated project workspaces. Inspect before editing. Create or select one project, keep all paths inside it, prefer precise replace_project_text edits, and never claim shell/deploy capabilities that are not exposed by these tools."
    }
  );

  server.registerTool(
    "blackcore_status",
    {
      title: "Check BLACKCORE status",
      description: "Check whether the BLACKCORE project workspace is available and how many isolated projects it contains.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        ok: z.boolean(), workspace: z.string(), projects: z.number(), isolation: z.string(), destructiveTools: z.boolean()
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    wrap(async () => {
      const data = await workspace.status();
      return result(data, `BLACKCORE is ready with ${data.projects} project(s).`);
    })
  );

  server.registerTool(
    "list_projects",
    {
      title: "List BLACKCORE projects",
      description: "List the isolated projects already stored in BLACKCORE.",
      inputSchema: z.object({}),
      outputSchema: z.object({ projects: z.array(z.object({ name: z.string(), modifiedAt: z.string() })) }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    wrap(async () => {
      const data = await workspace.listProjects();
      return result(data, `Found ${data.projects.length} BLACKCORE project(s).`);
    })
  );

  server.registerTool(
    "create_project",
    {
      title: "Create a BLACKCORE project",
      description: "Create an isolated project folder for a new app, site, animation, script, or other user-requested project. Use a short descriptive name derived from the user's request.",
      inputSchema: z.object({ name: z.string().min(1).max(100) }),
      outputSchema: z.object({ project: z.string(), created: z.boolean() }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    },
    wrap(async (args) => {
      const data = await workspace.createProject(args);
      return result(data, `${data.created ? "Created" : "Using existing"} project ${data.project}.`);
    })
  );

  server.registerTool(
    "list_project_files",
    {
      title: "List project files",
      description: "List files inside one BLACKCORE project. Use this before editing an existing project.",
      inputSchema: z.object({
        project: z.string().min(1),
        directory: z.string().default("."),
        maxEntries: z.number().int().min(1).max(1000).default(300)
      }),
      outputSchema: z.object({
        project: z.string(), directory: z.string(),
        entries: z.array(z.object({ path: z.string(), size: z.number() })), truncated: z.boolean()
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    wrap(async (args) => {
      const data = await workspace.listFiles(args);
      return result(data, `Found ${data.entries.length} file(s) in ${data.project}.`);
    })
  );

  server.registerTool(
    "read_project_file",
    {
      title: "Read a project file",
      description: "Read a text file from an isolated BLACKCORE project. Use line windows for large files.",
      inputSchema: z.object({
        project: z.string().min(1), file: z.string().min(1),
        startLine: z.number().int().min(1).default(1), maxLines: z.number().int().min(1).max(1000).default(400)
      }),
      outputSchema: z.object({
        project: z.string(), path: z.string(), startLine: z.number(), endLine: z.number(), totalLines: z.number(), content: z.string(), truncated: z.boolean()
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    wrap(async (args) => {
      const data = await workspace.readFile(args);
      return result(data, data.content || "(empty file)");
    })
  );

  server.registerTool(
    "search_project",
    {
      title: "Search a project",
      description: "Search text across files in one BLACKCORE project and return matching file paths and line previews.",
      inputSchema: z.object({
        project: z.string().min(1), query: z.string().min(1), maxResults: z.number().int().min(1).max(200).default(50)
      }),
      outputSchema: z.object({
        project: z.string(), query: z.string(),
        matches: z.array(z.object({ path: z.string(), line: z.number(), preview: z.string() })), truncated: z.boolean()
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    },
    wrap(async (args) => {
      const data = await workspace.search(args);
      return result(data, `Found ${data.matches.length} match(es) for ${JSON.stringify(data.query)}.`);
    })
  );

  server.registerTool(
    "write_project_file",
    {
      title: "Write a project file",
      description: "Create a new text file or deliberately replace a complete file inside one BLACKCORE project. For existing files, prefer replace_project_text when a precise edit is possible.",
      inputSchema: z.object({
        project: z.string().min(1), file: z.string().min(1), content: z.string(), overwrite: z.boolean().default(false)
      }),
      outputSchema: z.object({ project: z.string(), path: z.string(), bytes: z.number(), created: z.boolean() }),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    wrap(async (args) => {
      const data = await workspace.writeFile(args);
      return result(data, `${data.created ? "Created" : "Updated"} ${data.path} (${data.bytes} bytes).`);
    })
  );

  server.registerTool(
    "replace_project_text",
    {
      title: "Edit project text",
      description: "Replace an exact text fragment in an existing project file. This is the preferred tool for focused edits because it refuses ambiguous matches by default.",
      inputSchema: z.object({
        project: z.string().min(1), file: z.string().min(1), oldText: z.string().min(1), newText: z.string(), replaceAll: z.boolean().default(false)
      }),
      outputSchema: z.object({ project: z.string(), path: z.string(), replacements: z.number() }),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
    },
    wrap(async (args) => {
      const data = await workspace.replaceText(args);
      return result(data, `Updated ${data.path}; ${data.replacements} replacement(s).`);
    })
  );

  return server;
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const portArg = argv.find(a => a.startsWith("--port="));
  const hostArg = argv.find(a => a.startsWith("--host="));
  return {
    stdio: args.has("--stdio"),
    port: Number(portArg?.split("=")[1] || process.env.PORT || 3000),
    host: hostArg?.split("=")[1] || process.env.HOST || "127.0.0.1"
  };
}

async function main() {
  const { stdio, port, host } = parseArgs(process.argv);
  if (stdio) {
    void serveStdio(buildServer);
    console.error(`[BLACKCORE MCP] stdio ready (${NAME} ${VERSION})`);
    return;
  }

  const handler = createMcpHandler(buildServer);
  const nodeHandler = toNodeHandler(handler);
  const localOnly = host === "127.0.0.1" || host === "localhost" || host === "::1";
  const validateHost = localOnly ? localhostHostValidation() : null;
  const validateOrigin = localOnly ? localhostOriginValidation() : null;

  const http = createHttpServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, name: NAME, version: VERSION }));
      return;
    }
    if (req.url !== "/mcp") {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    if (validateHost && !validateHost(req, res)) return;
    if (validateOrigin && !validateOrigin(req, res)) return;
    void nodeHandler(req, res);
  });

  http.listen(port, host, () => {
    console.error(`[BLACKCORE MCP] http://${host}:${port}/mcp`);
    if (!localOnly) console.error("[BLACKCORE MCP] WARNING: public binding has no OAuth yet; use only behind an authenticated reverse proxy during phase 1.");
  });

  const shutdown = async () => {
    await handler.close().catch(() => {});
    http.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error("[BLACKCORE MCP] fatal:", error?.stack || error);
    process.exit(1);
  });
}
