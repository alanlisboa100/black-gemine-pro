import fs from "node:fs/promises";
import {defineTool} from "../registry.js";
import {writable,capture} from "./common.js";

function parseHunkHeader(line){const m=line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);return m?{oldStart:+m[1],oldCount:+(m[2]||1),newStart:+m[3],newCount:+(m[4]||1)}:null;}
export function applyUnifiedPatch(original,patch){
  const src=original===""?[]:original.split("\n"),pl=patch.replace(/\r\n/g,"\n").split("\n"),out=[];let srcPos=0,i=0,hunks=0;
  while(i<pl.length){
    if(pl[i].startsWith("--- ")||pl[i].startsWith("+++ ")){i++;continue;}
    const h=parseHunkHeader(pl[i]);if(!h){i++;continue;}hunks++;
    const target=Math.max(0,h.oldStart-1);while(srcPos<target)out.push(src[srcPos++]);i++;
    while(i<pl.length&&!pl[i].startsWith("@@ ")){
      const l=pl[i];if(l.startsWith("\\ No newline")){i++;continue;}
      const mark=l[0],body=l.slice(1);
      if(mark===" "){if(src[srcPos]!==body)throw new Error(`patch context mismatch at source line ${srcPos+1}`);out.push(src[srcPos++]);}
      else if(mark==="-"){if(src[srcPos]!==body)throw new Error(`patch removal mismatch at source line ${srcPos+1}`);srcPos++;}
      else if(mark==="+")out.push(body);
      else if(l===""){}
      else break;i++;
    }
  }
  while(srcPos<src.length)out.push(src[srcPos++]);if(!hunks)throw new Error("no unified diff hunks found");return out.join("\n");
}
export const patchTool=defineTool({
  name:"patch",description:"Apply a unified diff to one file atomically.",mutates:true,
  parameters:{type:"object",properties:{path:{type:"string"},patch:{type:"string"}},required:["path","patch"],additionalProperties:false},
  async execute(a,ctx){const p=await writable(ctx,a.path);const original=await fs.readFile(p,"utf8");const next=applyUnifiedPatch(original,a.patch);await capture(ctx,p);await fs.writeFile(p,next,"utf8");return `patched ${p} (${Buffer.byteLength(original)} -> ${Buffer.byteLength(next)} bytes)`;}
});
