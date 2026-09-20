import fs from "node:fs/promises";
import {defineTool} from "../registry.js";
import {writable,capture} from "./common.js";

export const editTool=defineTool({
  name:"edit",description:"Replace exact text in a file. Fails on ambiguous matches unless occurrence is specified.",mutates:true,
  parameters:{type:"object",properties:{path:{type:"string"},oldText:{type:"string"},newText:{type:"string"},occurrence:{type:"integer",minimum:1},replaceAll:{type:"boolean"}},required:["path","oldText","newText"],additionalProperties:false},
  async execute(a,ctx){const p=await writable(ctx,a.path);let text=await fs.readFile(p,"utf8"),positions=[],i=0;while((i=text.indexOf(a.oldText,i))>=0){positions.push(i);i+=Math.max(1,a.oldText.length);}
    if(!positions.length)throw new Error("oldText not found");let out=text,count=0;
    if(a.replaceAll){out=text.split(a.oldText).join(a.newText);count=positions.length;}
    else if(a.occurrence){if(a.occurrence>positions.length)throw new Error(`occurrence ${a.occurrence} > matches ${positions.length}`);const pos=positions[a.occurrence-1];out=text.slice(0,pos)+a.newText+text.slice(pos+a.oldText.length);count=1;}
    else {if(positions.length!==1)throw new Error(`oldText occurs ${positions.length} times; add context or occurrence`);out=text.replace(a.oldText,a.newText);count=1;}
    await capture(ctx,p);await fs.writeFile(p,out,"utf8");return `edited ${p} (${count} replacement${count===1?"":"s"})`;
  }
});
