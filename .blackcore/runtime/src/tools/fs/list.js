import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {readable} from "./common.js";

export const listTool=defineTool({
  name:"ls",description:"List directory entries with type and size.",readOnly:true,
  parameters:{type:"object",properties:{path:{type:"string"},all:{type:"boolean"},limit:{type:"integer",minimum:1,maximum:5000}},additionalProperties:false},
  async execute(a,ctx){const p=await readable(ctx,a.path||"."),ents=await fs.readdir(p,{withFileTypes:true}),out=[];for(const e of ents.sort((a,b)=>a.name.localeCompare(b.name))){if(!a.all&&e.name.startsWith("."))continue;let size="";try{if(e.isFile())size=String((await fs.stat(path.join(p,e.name))).size);}catch{}out.push(`${e.isDirectory()?"d":e.isFile()?"f":"?"}\t${size}\t${e.name}`);if(out.length>=(a.limit||1000))break;}return `${p}\n${out.join("\n")}`;}
});
