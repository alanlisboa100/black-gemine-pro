import fs from "node:fs";
import path from "node:path";
import {GLOBAL_PROMPTS_DIR} from "../utils/paths.js";
function scan(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith(".md")).map(e=>path.join(dir,e.name));}
export class PromptStore{
  constructor(cwd,packageDirs=[]){this.cwd=cwd;this.packageDirs=packageDirs;this.items=new Map();this.reload();}
  reload(){this.items.clear();for(const f of [...scan(GLOBAL_PROMPTS_DIR),...scan(path.join(this.cwd,".blackcore","prompts")),...this.packageDirs.flatMap(scan)]){try{this.items.set(path.basename(f,".md"),{name:path.basename(f,".md"),file:f,body:fs.readFileSync(f,"utf8")});}catch{}}return this;}
  list(){return [...this.items.values()];}get(name){return this.items.get(name)||null;}
  render(name,args=[]){const p=this.get(name);if(!p)throw new Error("prompt not found");let s=p.body;args.forEach((v,i)=>s=s.replaceAll(`$${i+1}`,v));return s;}
}
