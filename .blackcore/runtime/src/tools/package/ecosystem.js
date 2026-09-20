import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {runCli} from "../common/cli.js";

async function exists(root,file){return fs.access(path.join(root,file)).then(()=>true).catch(()=>false);}
export async function ecosystemCommand(ctx,a){
  const root=ctx.cwd,ecosystem=a.ecosystem;
  if(ecosystem==="node"){
    const manager=await exists(root,"pnpm-lock.yaml")?"pnpm":await exists(root,"yarn.lock")?"yarn":await exists(root,"bun.lockb")||await exists(root,"bun.lock")?"bun":"npm";
    if(a.action==="install")return [manager,manager==="npm"?["install"]:["install"]];
    return [manager,manager==="npm"?["run",a.action]:[a.action]];
  }
  if(ecosystem==="python"){
    if(await exists(root,"uv.lock"))return a.action==="install"?["uv",["sync"]]:a.action==="test"?["uv",["run","pytest"]]:a.action==="lint"?["uv",["run","ruff","check","."]]:["uv",["build"]];
    if(await exists(root,"poetry.lock"))return a.action==="install"?["poetry",["install"]]:a.action==="build"?["poetry",["build"]]:["poetry",["run",a.action==="test"?"pytest":"ruff",...(a.action==="lint"?["check","."]:[])]];
    if(await exists(root,"Pipfile"))return a.action==="install"?["pipenv",["install","--dev"]]:["pipenv",["run",a.action==="test"?"pytest":a.action==="lint"?"ruff":"python",...(a.action==="lint"?["check","."]:a.action==="build"?["-m","build"]:[])]];
    return a.action==="install"?["python",["-m","pip","install","-r",a.file||"requirements.txt"]]:a.action==="test"?["python",["-m","pytest"]]:a.action==="lint"?["python",["-m","ruff","check","."]]:["python",["-m","build"]];
  }
  if(ecosystem==="rust")return ["cargo",[a.action==="install"?"fetch":a.action==="lint"?"clippy":a.action]];
  if(ecosystem==="go")return ["go",a.action==="install"?["mod","download"]:a.action==="lint"?["vet","./..."]:[a.action,"./..."]];
  if(ecosystem==="flutter")return ["flutter",a.action==="install"?["pub","get"]:a.action==="lint"?["analyze"]:a.action==="build"?["build","apk","--debug"]:["test"]];
  if(ecosystem==="php")return ["composer",a.action==="install"?["install"]:a.action==="test"?["test"]:[a.action]];
  throw new Error(`unsupported ecosystem: ${ecosystem}`);
}
export const ecosystemTool=defineTool({
  name:"ecosystem",description:"Run standard install, test, lint and build workflows for Node.js, Python, Rust, Go, Flutter and PHP projects without guessing shell syntax.",parallelSafe:false,planSafe:a=>["test","lint"].includes(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["install","test","lint","build"]},ecosystem:{type:"string",enum:["node","python","rust","go","flutter","php"]},file:{type:"string",maxLength:500},args:{type:"array",items:{type:"string"},maxItems:40}},required:["action","ecosystem"],additionalProperties:false},
  async execute(a,ctx){if(a.action==="install"&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Install ${a.ecosystem} project dependencies?`,false);if(!ok)return"dependency installation denied";}const [command,args]=await ecosystemCommand(ctx,a);const result=await runCli(ctx,command,[...args,...(a.args||[])],{timeoutMs:900000});return result.output;}
});
