import fs from "node:fs";
import path from "node:path";
import {GLOBAL_THEMES_DIR} from "../utils/paths.js";
const BUILTIN={name:"blackcore",colors:{accent:93,ok:82,warn:220,error:196,dim:244,text:252,assistant:51,user:213,tool:111,border:238}};
export function loadTheme(name="blackcore",cwd=process.cwd()){
  for(const f of [path.join(cwd,".blackcore","themes",`${name}.json`),path.join(GLOBAL_THEMES_DIR,`${name}.json`)])try{return {...BUILTIN,...JSON.parse(fs.readFileSync(f,"utf8"))};}catch{}
  return BUILTIN;
}
export function ansi256(n,s){return `\x1b[38;5;${n}m${s}\x1b[0m`;}
