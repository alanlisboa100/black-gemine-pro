import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {CACHE_DIR,projectStateDir} from "../utils/paths.js";
import {execCapture,which} from "../utils/exec.js";
import {buildRepoIndex} from "./repo-index.js";

async function fingerprint(root){
  if(await which("git")){const r=await execCapture("git",["status","--porcelain=v1","--untracked-files=normal"],{cwd:root,timeoutMs:12000,maxChars:200000});const h=await execCapture("git",["rev-parse","HEAD"],{cwd:root,timeoutMs:5000,maxChars:1000});if(r.code===0&&h.code===0)return crypto.createHash("sha256").update(h.stdout+"\n"+r.stdout).digest("hex");}
  return null;
}
export async function cachedRepoIndex(root,opts={}){root=path.resolve(root);const dir=projectStateDir(path.join(CACHE_DIR,"repo-index"),root),file=path.join(dir,"index.json"),fp=await fingerprint(root);if(fp){try{const old=JSON.parse(await fs.readFile(file,"utf8"));if(old.fingerprint===fp&&old.index)return old.index;}catch{}}
  const index=await buildRepoIndex(root,opts);try{await fs.writeFile(file,JSON.stringify({version:1,fingerprint:fp,index,createdAt:new Date().toISOString()}),"utf8");}catch{}return index;
}
