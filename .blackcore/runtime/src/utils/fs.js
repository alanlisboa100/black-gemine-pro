import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {loadIgnoreMatcher} from "./ignore.js";

export async function exists(p){try{await fsp.access(p);return true;}catch{return false;}}
export async function readText(p,maxBytes=2_000_000){
  const st=await fsp.stat(p);if(st.size>maxBytes)throw new Error(`file too large (${st.size} bytes)`);
  const b=await fsp.readFile(p);if(b.includes(0))throw new Error("binary file");
  return b.toString("utf8");
}
export async function writeTextAtomic(p,text){
  await fsp.mkdir(path.dirname(p),{recursive:true});
  const tmp=`${p}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(tmp,text,"utf8");await fsp.rename(tmp,p);
}
export function chmod600(p){try{fs.chmodSync(p,0o600);}catch{}}
export async function walk(root,{maxFiles=10000,ignoreDirs=null,includeHidden=true,respectIgnore=true,ignorePatterns=[]}={}){
  root=path.resolve(root);const out=[];const matcher=respectIgnore?loadIgnoreMatcher(root,{extra:ignorePatterns}):null;const dirs=ignoreDirs||new Set();
  async function visit(dir){
    if(out.length>=maxFiles)return;let ents;try{ents=await fsp.readdir(dir,{withFileTypes:true});}catch{return;}
    for(const e of ents){
      if(out.length>=maxFiles)return;if(!includeHidden&&e.name.startsWith("."))continue;
      const p=path.join(dir,e.name);if(e.isDirectory()){if(dirs.has(e.name)||matcher?.ignores(p,{isDir:true}))continue;await visit(p);}else if(e.isFile()&&!matcher?.ignores(p))out.push(p);
    }
  }await visit(root);return out;
}
