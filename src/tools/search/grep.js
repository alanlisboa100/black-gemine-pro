import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {walk} from "../../utils/fs.js";
import {which,execCapture} from "../../utils/exec.js";
import {readable} from "../fs/common.js";

export const grepTool=defineTool({
  name:"grep",description:"Search text recursively with file and line numbers. Uses ripgrep when available.",readOnly:true,
  parameters:{type:"object",properties:{query:{type:"string"},path:{type:"string"},regex:{type:"boolean"},caseSensitive:{type:"boolean"},glob:{type:"string"},maxResults:{type:"integer",minimum:1,maximum:5000}},required:["query"],additionalProperties:false},
  async execute(a,ctx){const root=await readable(ctx,a.path||"."),max=a.maxResults||1200;
    if(await which("rg")){const args=["-n","--hidden","--glob","!.git/**","--glob","!node_modules/**","--max-count",String(max)];if(!a.regex)args.push("-F");if(!a.caseSensitive)args.push("-i");if(a.glob)args.push("--glob",a.glob);args.push(a.query,root);const r=await execCapture("rg",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:30000});return r.code<=1?r.stdout:r.combined;}
    const files=await walk(root,{maxFiles:10000}),out=[];let re=null;if(a.regex)re=new RegExp(a.query,a.caseSensitive?"":"i");
    for(const file of files){let text;try{text=await fs.readFile(file,"utf8");}catch{continue;}for(const [i,line] of text.split(/\r?\n/).entries()){const hit=re?re.test(line):(a.caseSensitive?line.includes(a.query):line.toLowerCase().includes(a.query.toLowerCase()));if(hit){out.push(`${path.relative(ctx.cwd,file)}:${i+1}:${line}`);if(out.length>=max)return out.join("\n");}}}
    return out.join("\n");
  }
});
