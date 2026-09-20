import path from "node:path";
import fs from "node:fs/promises";
import {isInside} from "../utils/paths.js";
import {isSensitivePath} from "./secrets.js";

export function scopePath(cwd,input="."){const target=path.resolve(cwd,input);return {target,inside:isInside(cwd,target)};}
async function existingAncestor(target){let cur=target;while(true){try{return {path:cur,real:await fs.realpath(cur)};}catch{const parent=path.dirname(cur);if(parent===cur)throw new Error(`Unable to resolve path: ${target}`);cur=parent;}}}
async function realScope(cwd,target){
  const root=await fs.realpath(path.resolve(cwd)).catch(()=>path.resolve(cwd)),ancestor=await existingAncestor(target),suffix=path.relative(ancestor.path,target),realTarget=path.resolve(ancestor.real,suffix);
  return {root,target:realTarget,inside:isInside(root,realTarget)};
}
export async function assertReadable(ctx,input){
  const lexical=scopePath(ctx.cwd,input),s=await realScope(ctx.cwd,lexical.target),sensitive=isSensitivePath(s.target);
  if(ctx.cfg.permissionProfile==="yolo")return s.target;
  if(sensitive){if(ctx.cfg.permissionProfile==="safe")throw new Error(`Sensitive file read blocked by safe profile: ${s.target}`);if(ctx.agent?.approvals?.get("read-sensitive",s.target))return s.target;const ok=await ctx.confirm(`Read sensitive-looking file? Its content may be sent to the active model.\n${s.target}`,false);if(!ok)throw new Error("sensitive read denied");ctx.agent?.approvals?.grant("read-sensitive",s.target,"turn");}
  if(s.inside)return s.target;
  if(ctx.cfg.permissionProfile==="safe")throw new Error(`Read outside workspace blocked: ${s.target}`);
  if(ctx.cfg.confirmExternalReads!==false&&!ctx.agent?.approvals?.get("read-external",s.target)){const ok=await ctx.confirm(`Read outside workspace? Content may be sent to the active model.\n${s.target}`,false);if(!ok)throw new Error("external read denied");ctx.agent?.approvals?.grant("read-external",s.target,"turn");}
  return s.target;
}
export async function assertWritable(ctx,input){
  const lexical=scopePath(ctx.cwd,input),s=await realScope(ctx.cwd,lexical.target);if(s.inside)return s.target;
  if(ctx.cfg.permissionProfile==="yolo")return s.target;
  if(ctx.cfg.permissionProfile==="safe")throw new Error(`Write outside workspace blocked: ${s.target}`);
  if(ctx.cfg.confirmExternalWrites&&!ctx.agent?.approvals?.get("write-external",s.target)){const ok=await ctx.confirm(`Write outside workspace?\n${s.target}`);if(!ok)throw new Error("external write denied");ctx.agent?.approvals?.grant("write-external",s.target,"turn");}
  return s.target;
}
