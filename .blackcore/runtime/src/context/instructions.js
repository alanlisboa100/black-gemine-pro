import fs from "node:fs";
import path from "node:path";
import {BC_HOME} from "../utils/paths.js";

function lineage(cwd){
  const out=[];let cur=path.resolve(cwd),prev="";
  while(cur!==prev){out.push(cur);prev=cur;cur=path.dirname(cur);}
  return out.reverse();
}
export function discoverInstructionFiles(cwd){
  const found=[],addDirectory=dir=>{
    const blackcore=path.join(dir,"BLACKCORE.md");if(fs.existsSync(blackcore))found.push(blackcore);
    const override=path.join(dir,"AGENTS.override.md"),agents=path.join(dir,"AGENTS.md");
    if(fs.existsSync(override))found.push(override);else if(fs.existsSync(agents))found.push(agents);
  };
  addDirectory(BC_HOME);for(const dir of lineage(cwd))addDirectory(dir);
  return [...new Set(found)];
}
export function loadInstructions(cwd,{maxChars=240000}={}){
  const files=discoverInstructionFiles(cwd),parts=[];let used=0;
  for(const file of files){let text;try{text=fs.readFileSync(file,"utf8");}catch{continue;}if(!text.trim())continue;
    const room=maxChars-used;if(room<=0)break;text=text.slice(0,room);used+=text.length;parts.push(`## ${file}\n${text}`);
  }return {files,text:parts.join("\n\n")};
}
