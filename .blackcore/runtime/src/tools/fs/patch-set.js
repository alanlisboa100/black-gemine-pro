import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {writable,capture,ensureParent} from "./common.js";
import {applyUnifiedPatch} from "./patch.js";

function cleanName(s){s=s.trim().split(/\s+/)[0];if(s==="/dev/null")return null;return s.replace(/^[ab]\//,"");}
export function parsePatchSet(text){
  const lines=String(text).replace(/\r\n/g,"\n").split("\n"),files=[];let i=0;
  while(i<lines.length){
    while(i<lines.length&&!lines[i].startsWith("--- "))i++;if(i>=lines.length)break;const oldPath=cleanName(lines[i].slice(4));i++;if(i>=lines.length||!lines[i].startsWith("+++ "))throw new Error("malformed patch set: missing +++ line");const newPath=cleanName(lines[i].slice(4));i++;const patch=[`--- ${oldPath?`a/${oldPath}`:"/dev/null"}`,`+++ ${newPath?`b/${newPath}`:"/dev/null"}`];while(i<lines.length&&!lines[i].startsWith("--- "))patch.push(lines[i++]);if(!oldPath&&!newPath)throw new Error("invalid /dev/null -> /dev/null patch");files.push({oldPath,newPath,path:newPath||oldPath,create:!oldPath,delete:!newPath,patch:patch.join("\n")});
  }
  if(!files.length)throw new Error("no file patches found");return files;
}
export const patchSetTool=defineTool({
  name:"patch_set",description:"Apply a multi-file unified diff atomically, including file creation/deletion. Rolls back on failure.",mutates:true,
  parameters:{type:"object",properties:{patch:{type:"string"}},required:["patch"],additionalProperties:false},
  async execute(a,ctx){const specs=parsePatchSet(a.patch),plans=[];
    for(const spec of specs){const dest=await writable(ctx,spec.path);let original="",exists=true;try{original=await fs.readFile(dest,"utf8");}catch(e){if(e.code==="ENOENT"){exists=false;original="";}else throw e;}if(spec.create&&exists)throw new Error(`create patch target already exists: ${spec.path}`);if(!spec.create&&!exists)throw new Error(`patch target does not exist: ${spec.path}`);const next=spec.delete?null:applyUnifiedPatch(original,spec.patch);plans.push({...spec,dest,exists,original,next});}
    for(const p of plans)await capture(ctx,p.dest);const written=[];
    try{for(const p of plans){if(p.delete){await fs.unlink(p.dest);written.push(p);continue;}await ensureParent(p.dest);const tmp=`${p.dest}.blackcore-${process.pid}-${Date.now()}.tmp`;await fs.writeFile(tmp,p.next,"utf8");await fs.rename(tmp,p.dest);written.push(p);}}catch(e){for(const p of written.reverse()){try{if(p.exists){await ensureParent(p.dest);await fs.writeFile(p.dest,p.original,"utf8");}else await fs.unlink(p.dest);}catch{}}throw e;}
    return plans.map(p=>`${p.create?"created":p.delete?"deleted":"patched"} ${path.relative(ctx.cwd,p.dest)||p.dest}`).join("\n");}
});
