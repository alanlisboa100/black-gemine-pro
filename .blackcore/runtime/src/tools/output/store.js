import fs from "node:fs";
import path from "node:path";
import {CACHE_DIR,projectStateDir} from "../../utils/paths.js";
import {shortId} from "../../utils/id.js";
import {redactSecrets} from "../../security/secrets.js";

export class ToolOutputStore{
  constructor(cwd){this.dir=projectStateDir(path.join(CACHE_DIR,"tool-output"),cwd);this.meta=new Map();}
  put(text,{tool="unknown",maxAgeMs=24*60*60*1000}={}){const id=`out_${shortId()}`,file=path.join(this.dir,`${id}.txt`),safe=redactSecrets(String(text));fs.writeFileSync(file,safe,"utf8");const m={id,file,tool,chars:safe.length,createdAt:Date.now(),expiresAt:Date.now()+maxAgeMs};this.meta.set(id,m);return m;}
  resolve(id){const m=this.meta.get(id),file=m?.file||path.join(this.dir,`${id}.txt`);if(!/^out_[A-Za-z0-9_-]+$/.test(id)||!fs.existsSync(file))throw new Error(`tool output handle not found: ${id}`);return {file,meta:m||{id,file,chars:fs.statSync(file).size}};}
  read(id,{offset=0,limit=30000}={}){const {file,meta}=this.resolve(id),text=fs.readFileSync(file,"utf8"),start=Math.max(0,offset),end=Math.min(text.length,start+limit);return {id,offset:start,nextOffset:end<text.length?end:null,totalChars:text.length,text:text.slice(start,end),tool:meta.tool};}
  search(id,query,{regex=false,caseSensitive=false,maxResults=100}={}){const {file}=this.resolve(id),text=fs.readFileSync(file,"utf8"),lines=text.split(/\r?\n/),out=[];let re;if(regex)re=new RegExp(query,caseSensitive?"":"i");const q=caseSensitive?query:query.toLowerCase();for(let i=0;i<lines.length;i++){const line=lines[i],hit=regex?re.test(line):(caseSensitive?line:line.toLowerCase()).includes(q);if(hit){out.push(`${i+1}: ${line}`);if(out.length>=maxResults)break;}}return out.join("\n");}
  cleanup(now=Date.now()){let n=0;for(const f of fs.readdirSync(this.dir)){if(!f.endsWith(".txt"))continue;const p=path.join(this.dir,f);try{const st=fs.statSync(p);if(now-st.mtimeMs>24*60*60*1000){fs.unlinkSync(p);n++;}}catch{}}return n;}
}
