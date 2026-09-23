import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";

function file(ctx){const d=path.join(ctx.cwd,".blackcore");fs.mkdirSync(d,{recursive:true});return path.join(d,"memory.json");}
function load(ctx){try{return JSON.parse(fs.readFileSync(file(ctx),"utf8"));}catch{return{};}}
export const memoryTool=defineTool({
  name:"memory",description:"Store or retrieve durable non-secret project facts in .blackcore/memory.json.",readOnly:false,
  parameters:{type:"object",properties:{action:{type:"string",enum:["get","set","delete","list"]},key:{type:"string"},value:{type:["string","number","boolean","object","array"]}},required:["action"],additionalProperties:false},
  async execute(a,ctx){const f=file(ctx),m=load(ctx);if(a.action==="list")return JSON.stringify(m,null,2);if(a.action==="get")return JSON.stringify(m[a.key]??null,null,2);if(!a.key)throw new Error("key required");if(a.action==="set")m[a.key]=a.value;if(a.action==="delete")delete m[a.key];await ctx.checkpoints?.capture(f);fs.writeFileSync(f,JSON.stringify(m,null,2)+"\n","utf8");return JSON.stringify(m[a.key]??null);}
});
