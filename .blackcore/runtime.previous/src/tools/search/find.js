import path from "node:path";
import {defineTool} from "../registry.js";
import {walk} from "../../utils/fs.js";
import {which,execCapture} from "../../utils/exec.js";
import {readable} from "../fs/common.js";

export const findTool=defineTool({
  name:"find",description:"Find files by fuzzy/literal name. Uses fd when available, built-in walker otherwise.",readOnly:true,
  parameters:{type:"object",properties:{query:{type:"string"},path:{type:"string"},glob:{type:"string"},maxResults:{type:"integer",minimum:1,maximum:5000}},required:["query"],additionalProperties:false},
  async execute(a,ctx){const root=await readable(ctx,a.path||"."),max=a.maxResults||500;
    if(await which("fd")){const args=["--hidden","--exclude",".git","--exclude","node_modules","--max-results",String(max),a.query,root];const r=await execCapture("fd",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:30000});if(r.code<=1)return r.stdout;}
    const q=a.query.toLowerCase(),files=await walk(root,{maxFiles:15000});return files.filter(f=>path.basename(f).toLowerCase().includes(q)||path.relative(root,f).toLowerCase().includes(q)).slice(0,max).map(f=>path.relative(ctx.cwd,f)).join("\n");
  }
});
