import fs from "node:fs";
import path from "node:path";
import {GLOBAL_SKILLS_DIR} from "../utils/paths.js";
import {parseFrontmatter} from "./parser.js";

function scan(base){
  const out=[];if(!fs.existsSync(base))return out;
  for(const e of fs.readdirSync(base,{withFileTypes:true})){
    const p=path.join(base,e.name);if(e.isDirectory()){const f=path.join(p,"SKILL.md");if(fs.existsSync(f))out.push(f);}
    else if(e.isFile()&&e.name.endsWith(".md"))out.push(p);
  }return out;
}
export class SkillStore{
  constructor(cwd,packageDirs=[]){this.cwd=cwd;this.packageDirs=packageDirs;this.items=new Map();this.reload();}
  reload(){this.items.clear();const files=[...scan(GLOBAL_SKILLS_DIR),...scan(path.join(this.cwd,".blackcore","skills")),...this.packageDirs.flatMap(scan)];
    for(const file of files){try{const {meta,body}=parseFrontmatter(fs.readFileSync(file,"utf8"),file),name=meta.name||path.basename(path.dirname(file))||path.basename(file,".md");this.items.set(name,{name,description:meta.description||body.split(/\r?\n/).find(Boolean)?.replace(/^#+\s*/,"").slice(0,140)||"",file,body,meta});}catch{}}
    return this;
  }
  list(){return [...this.items.values()].sort((a,b)=>a.name.localeCompare(b.name));}
  get(name){return this.items.get(name)||null;}
  prompt(names=[]){return names.map(n=>this.get(n)).filter(Boolean).map(s=>`## Skill: ${s.name}\n${s.body}`).join("\n\n");}
}
