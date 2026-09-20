import fs from "node:fs";
import {SessionStore} from "./store.js";
export function importSession(cwd,file){
  const text=fs.readFileSync(file,"utf8"),target=new SessionStore(cwd);let obj=null;
  try{obj=JSON.parse(text);}catch{}
  if(obj?.entries){target.entries=obj.entries;target.activeId=obj.session?.activeId||obj.entries.at(-1)?.id||null;target.header.name=obj.session?.name||null;target.tree=new (target.tree.constructor)(target.entries);target.rewrite();return target;}
  throw new Error("Unsupported session import format");
}
