import fs from "node:fs";
import path from "node:path";
export function appendJsonl(file,obj){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.appendFileSync(file,JSON.stringify(obj)+"\n","utf8");
}
export function readJsonl(file){
  if(!fs.existsSync(file))return[];
  const out=[];for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
    if(!line.trim())continue;try{out.push(JSON.parse(line));}catch{}
  }return out;
}
export function rewriteJsonl(file,items){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,items.map(x=>JSON.stringify(x)).join("\n")+(items.length?"\n":""),"utf8");
}
