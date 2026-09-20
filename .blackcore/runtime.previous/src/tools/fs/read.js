import fs from "node:fs/promises";
import {defineTool} from "../registry.js";
import {readable,lineSlice} from "./common.js";

export const readTool=defineTool({
  name:"read",description:"Read a text file with line numbers. Use offset/limit for focused inspection.",readOnly:true,
  parameters:{type:"object",properties:{path:{type:"string"},offset:{type:"integer",minimum:1},limit:{type:"integer",minimum:1,maximum:5000}},required:["path"],additionalProperties:false},
  async execute(a,ctx){
    const p=await readable(ctx,a.path),st=await fs.stat(p);if(!st.isFile())throw new Error("not a file");
    if(st.size>ctx.cfg.maxReadChars*8)throw new Error(`file too large for read (${st.size} bytes); use grep/bash ranges`);
    const b=await fs.readFile(p);if(b.includes(0))throw new Error("binary file");const s=lineSlice(b.toString("utf8"),a.offset||1,a.limit||1200);
    let out=s.text;if(out.length>ctx.cfg.maxReadChars)out=out.slice(0,ctx.cfg.maxReadChars)+"\n...[truncated]";
    return `${p}\nlines ${s.start}-${s.end} of ${s.total}\n${out}`;
  }
});
