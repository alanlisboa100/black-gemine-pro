import {defineTool} from "../registry.js";
import {execCapture, which} from "../../utils/exec.js";

function jsonArgs(fields) {
  return ["--json", fields.join(",")];
}
function repoArgs(args){return args.repo?["--repo",args.repo]:[];}

function ghEnv(){return {...process.env,GH_PROMPT_DISABLED:"1",GH_PAGER:"cat",GH_NO_UPDATE_NOTIFIER:"1",GIT_TERMINAL_PROMPT:"0"};}
let authCache={at:0,value:null};

async function runGh(args, ctx, timeoutMs = 30000) {
  if (!(await which("gh"))) throw new Error("GitHub CLI (gh) is not installed");
  const result = await execCapture("gh", args, {
    cwd: ctx.cwd, signal: ctx.signal, timeoutMs, maxChars: ctx.cfg.maxToolOutputChars, env: ghEnv(),
  });
  if (result.code !== 0) throw new Error(result.combined || `gh exited ${result.code}`);
  return result.combined || "ok";
}

export async function githubAuthStatus(ctx,{force=false}={}){
  const now=Date.now();
  if(!force&&authCache.value&&now-authCache.at<20000)return authCache.value;
  const value=await runGh(["auth","status","--hostname","github.com"],ctx,15000);
  authCache={at:now,value};return value;
}

export async function githubAuthLogin(ctx){
  authCache={at:0,value:null};
  if (!(await which("gh"))) throw new Error("GitHub CLI (gh) is not installed");
  if (ctx.cfg.permissionProfile === "safe") {
    const ok = await ctx.confirm("Start GitHub web/device authentication?", false);
    if (!ok) return "GitHub login denied";
  }
  const id = ctx.processes.start("GH_PROMPT_DISABLED=1 GH_PAGER=cat GH_NO_UPDATE_NOTIFIER=1 gh auth login --hostname github.com --git-protocol https --web", ctx.cwd);
  return `GitHub authentication started as background process ${id}. Poll it with process_poll to read the device URL/code and completion status. Do not start another login while this process is running.`;
}

export const githubTool = defineTool({
  name: "github",
  description:
    "Structured GitHub CLI operations for repository, issues, pull requests and Actions.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "auth_status",
          "auth_login_web",
          "auth_logout",
          "repo_view",
          "repo_clone",
          "repo_create",
          "issue_list",
          "issue_view",
          "issue_create",
          "pr_list",
          "pr_view",
          "pr_diff",
          "pr_create",
          "release_list",
          "release_view",
          "workflow_list",
          "run_list",
          "run_view",
          "checks",
          "workflow_run"
        ],
      },
      number: {type: "integer", minimum: 1},
      title: {type: "string"},
      body: {type: "string"},
      description: {type: "string"},
      base: {type: "string"},
      head: {type: "string"},
      workflow: {type: "string"},
      ref: {type: "string"},
      repo: {type: "string"},
      directory: {type: "string"},
      visibility: {type: "string", enum: ["public", "private", "internal"]},
      limit: {type: "integer", minimum: 1, maximum: 100},
    },
    required: ["action"],
    additionalProperties: false,
  },

  async execute(args, ctx) {
    switch (args.action) {
      case "auth_status":
        return githubAuthStatus(ctx);

      case "auth_login_web":
        return githubAuthLogin(ctx);

      case "auth_logout": {
        const ok = await ctx.confirm("Log out of GitHub CLI on this device?", false);
        if (!ok) return "GitHub logout denied";
        authCache={at:0,value:null};
        return runGh(["auth", "logout", "--hostname", "github.com"], ctx,15000);
      }

      case "repo_view":
        return runGh([
          "repo",
          "view",
          ...jsonArgs([
            "name",
            "owner",
            "description",
            "defaultBranchRef",
            "url",
            "isPrivate",
          ]),
          ...repoArgs(args),
        ], ctx, 20000);

      case "repo_clone": {
        if (!args.repo) throw new Error("repo required (owner/name or GitHub URL)");
        const cmd = ["repo", "clone", args.repo];
        if (args.directory) cmd.push(args.directory);
        return runGh(cmd, ctx, 300000);
      }

      case "repo_create": {
        if (!args.repo) throw new Error("repo required");
        const ok = await ctx.confirm(`Create GitHub repository ${args.repo}?`, false);
        if (!ok) return "repository creation denied";
        const cmd = ["repo", "create", args.repo, `--${args.visibility || "private"}`];
        if (args.description) cmd.push("--description", args.description);
        return runGh(cmd, ctx);
      }

      case "issue_list":
        return runGh([
          "issue",
          "list",
          "--limit",
          String(args.limit || 30),
          ...jsonArgs([
            "number",
            "title",
            "state",
            "author",
            "labels",
            "updatedAt",
            "url",
          ]),
          ...repoArgs(args),
        ], ctx);

      case "issue_view":
        if (!args.number) throw new Error("number required");
        return runGh([
          "issue",
          "view",
          String(args.number),
          ...jsonArgs([
            "number",
            "title",
            "body",
            "state",
            "author",
            "labels",
            "comments",
            "url",
          ]),
          ...repoArgs(args),
        ], ctx);

      case "issue_create": {
        if (!args.title) throw new Error("title required");
        if (ctx.cfg.permissionProfile !== "yolo") {
          const ok = await ctx.confirm(
            `Create GitHub issue "${args.title}"?`
          );
          if (!ok) return "issue creation denied";
        }
        const cmd = ["issue", "create", "--title", args.title];
        if (args.body) cmd.push("--body", args.body);
        cmd.push(...repoArgs(args));
        return runGh(cmd, ctx);
      }

      case "pr_list":
        return runGh([
          "pr",
          "list",
          "--limit",
          String(args.limit || 30),
          ...jsonArgs([
            "number",
            "title",
            "state",
            "author",
            "headRefName",
            "baseRefName",
            "isDraft",
            "updatedAt",
            "url",
          ]),
          ...repoArgs(args),
        ], ctx);

      case "pr_view":
        if (!args.number) throw new Error("number required");
        return runGh([
          "pr",
          "view",
          String(args.number),
          ...jsonArgs([
            "number",
            "title",
            "body",
            "state",
            "author",
            "headRefName",
            "baseRefName",
            "mergeable",
            "statusCheckRollup",
            "url",
          ]),
          ...repoArgs(args),
        ], ctx);

      case "pr_diff":
        if (!args.number) throw new Error("number required");
        return runGh(["pr","diff",String(args.number),...repoArgs(args)],ctx,60000);

      case "pr_create": {
        if (!args.title) throw new Error("title required");
        if (ctx.cfg.permissionProfile !== "yolo") {
          const ok = await ctx.confirm(
            `Create GitHub pull request "${args.title}"?`
          );
          if (!ok) return "pull request creation denied";
        }
        const cmd = ["pr", "create", "--title", args.title];
        if (args.body) cmd.push("--body", args.body);
        if (args.base) cmd.push("--base", args.base);
        if (args.head) cmd.push("--head", args.head);
        cmd.push(...repoArgs(args));
        return runGh(cmd, ctx);
      }

      case "release_list":
        return runGh(["release","list","--limit",String(args.limit||30),...repoArgs(args)],ctx);

      case "release_view":
        return runGh(["release","view",...(args.ref?[args.ref]:[]),"--json","tagName,name,isDraft,isPrerelease,publishedAt,url,assets",...repoArgs(args)],ctx);

      case "workflow_list":
        return runGh([
          "workflow",
          "list",
          "--limit",
          String(args.limit || 50),
          "--json",
          "id,name,state,path",
          ...repoArgs(args),
        ], ctx);

      case "run_list":
        return runGh([
          "run",
          "list",
          "--limit",
          String(args.limit || 30),
          "--json",
          "databaseId,name,displayTitle,status,conclusion,event,headBranch,createdAt,url",
          ...repoArgs(args),
        ], ctx);

      case "run_view":
        if (!args.number) throw new Error("number required");
        return runGh([
          "run",
          "view",
          String(args.number),
          "--json",
          "databaseId,name,displayTitle,status,conclusion,jobs,url",
          ...repoArgs(args),
        ], ctx);

      case "checks":
        return runGh(["pr","checks",...(args.number?[String(args.number)]:[]),"--json","name,state,startedAt,completedAt,link,bucket",...repoArgs(args)],ctx);

      case "workflow_run": {
        if (!args.workflow) throw new Error("workflow required");
        if (ctx.cfg.permissionProfile !== "yolo") {
          const ok = await ctx.confirm(
            `Trigger GitHub Actions workflow ${args.workflow}?`
          );
          if (!ok) return "workflow dispatch denied";
        }
        const cmd = ["workflow", "run", args.workflow];
        if (args.ref) cmd.push("--ref", args.ref);
        cmd.push(...repoArgs(args));
        return runGh(cmd, ctx);
      }
    }

    throw new Error(`unsupported GitHub action: ${args.action}`);
  },
});
