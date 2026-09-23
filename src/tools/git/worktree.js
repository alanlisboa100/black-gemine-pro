import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {execCapture} from "../../utils/exec.js";
import {writable} from "../fs/common.js";
import {slugify} from "../../utils/text.js";

async function runGit(ctx,args,{timeoutMs=120000}={}){
  const r=await execCapture("git",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs,maxChars:ctx.cfg.maxToolOutputChars});
  if(r.code!==0)throw new Error(r.combined||`git ${args[0]} exited ${r.code}`);
  return r.stdout||r.combined||"";
}
async function repository(ctx){
  const root=(await runGit(ctx,["rev-parse","--show-toplevel"],{timeoutMs:10000})).trim();
  if(!root)throw new Error("Current workspace is not a Git repository");
  return root;
}
function parseWorktreePorcelain(raw=""){
  const items=[],blocks=String(raw).trim().split(/\n\n+/).filter(Boolean);
  for(const block of blocks){
    const item={path:"",head:null,branch:null,detached:false,bare:false,prunable:false};
    for(const line of block.split(/\r?\n/)){
      const [key,...rest]=line.split(" "),value=rest.join(" ");
      if(key==="worktree")item.path=value;
      else if(key==="HEAD")item.head=value;
      else if(key==="branch")item.branch=value.replace(/^refs\/heads\//,"");
      else if(key==="detached")item.detached=true;
      else if(key==="bare")item.bare=true;
      else if(key==="prunable")item.prunable=true;
    }
    if(item.path)items.push(item);
  }
  return items;
}

export async function listWorktrees(ctx){
  await repository(ctx);
  const raw=await runGit(ctx,["worktree","list","--porcelain"],{timeoutMs:20000});
  return parseWorktreePorcelain(raw);
}
export async function createWorktree(ctx,{branch,path:requestedPath,base="HEAD"}={}){
  if(!branch)throw new Error("branch is required");
  if(String(branch).startsWith("-"))throw new Error("branch must not start with '-'");
  await repository(ctx);
  await runGit(ctx,["check-ref-format","--branch",branch],{timeoutMs:10000});
  const fallback=path.resolve(ctx.cwd,"..",`${path.basename(ctx.cwd)}-${slugify(branch)}`);
  const target=await writable(ctx,requestedPath||fallback);
  if(target===path.resolve(ctx.cwd))throw new Error("worktree path must differ from the current workspace");
  try{await fs.lstat(target);throw new Error(`worktree path already exists: ${target}`);}catch(e){if(e?.code!=="ENOENT")throw e;}
  if(ctx.cfg.permissionProfile!=="yolo"){
    const ok=await ctx.confirm(`Create isolated Git worktree?\nbranch: ${branch}\nbase: ${base}\npath: ${target}`,false);
    if(!ok)return {ok:false,reason:"worktree creation denied",path:target,branch};
  }
  await runGit(ctx,["worktree","add","-b",branch,target,base],{timeoutMs:180000});
  return {ok:true,path:target,branch,base};
}
export async function removeWorktree(ctx,{path:requestedPath,force=false}={}){
  if(!requestedPath)throw new Error("path is required");
  await repository(ctx);const target=await writable(ctx,requestedPath);
  if(target===path.resolve(ctx.cwd))throw new Error("refusing to remove the current workspace");
  if(ctx.cfg.permissionProfile!=="yolo"){
    const ok=await ctx.confirm(`Remove Git worktree?\n${target}${force?"\nforce: yes":""}`,false);
    if(!ok)return {ok:false,reason:"worktree removal denied",path:target};
  }
  await runGit(ctx,["worktree","remove",...(force?["--force"]:[]),target],{timeoutMs:180000});
  return {ok:true,path:target,removed:true};
}

export const worktreeTool=defineTool({
  name:"worktree",
  description:"List, create or remove isolated Git worktrees. Creation/removal always request confirmation outside yolo and respect workspace write policy.",
  planSafe:a=>a.action==="list",
  parameters:{type:"object",properties:{action:{type:"string",enum:["list","create","remove"]},branch:{type:"string"},path:{type:"string"},base:{type:"string"},force:{type:"boolean"}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    if(a.action==="list")return JSON.stringify({worktrees:await listWorktrees(ctx)},null,2);
    if(a.action==="create")return JSON.stringify(await createWorktree(ctx,a),null,2);
    return JSON.stringify(await removeWorktree(ctx,a),null,2);
  }
});

export {parseWorktreePorcelain};
