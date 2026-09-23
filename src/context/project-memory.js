import fs from "node:fs";
import path from "node:path";
import {redactSecrets} from "../security/secrets.js";
export function loadProjectMemory(cwd,{maxChars=24000}={}){const file=path.join(cwd,".blackcore","memory.json");try{const obj=JSON.parse(fs.readFileSync(file,"utf8"));const text=redactSecrets(JSON.stringify(obj,null,2));return {file,text:text.slice(0,maxChars),truncated:text.length>maxChars};}catch{return {file,text:"",truncated:false};}}
