import fs from "node:fs/promises";
import path from "node:path";
import {walk} from "../utils/fs.js";
import {readText} from "../utils/fs.js";
import {isImagePath} from "./images.js";

const RE=/(^|\s)@((?:\.{0,2}\/)?[A-Za-z0-9_.@/\\-]+)/g;
export function parseFileMentions(text){
  const out=[];for(const m of String(text).matchAll(RE)){const v=m[2];if(v&&v.length>1)out.push(v);}return [...new Set(out)];
}
export async function fuzzyFiles(cwd,query,max=30){
  const files=await walk(cwd,{maxFiles:8000}),q=String(query||"").toLowerCase();
  const score=(rel)=>{
    const s=rel.toLowerCase();if(s===q)return 1000;if(s.endsWith("/"+q)||path.basename(s)===q)return 700;if(s.includes(q))return 300-q.length;
    let j=0;for(const ch of s)if(ch===q[j])j++;return j===q.length?100-rel.length:0;
  };
  return files.map(f=>({file:f,rel:path.relative(cwd,f)})).map(x=>({...x,score:score(x.rel)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,max);
}
export async function expandMentions(cwd,text,{maxEach=50000,maxTotal=180000}={}){
  const mentions=parseFileMentions(text),parts=[],images=[];let total=0;
  for(const raw of mentions){
    const p=path.resolve(cwd,raw);let st;try{st=await fs.stat(p);}catch{continue;}if(!st.isFile())continue;
    if(isImagePath(p)){images.push(raw);continue;}
    let body;try{body=await readText(p,maxEach);}catch{continue;}const room=maxTotal-total;if(room<=0)break;body=body.slice(0,room);total+=body.length;parts.push(`[ATTACHED FILE ${path.relative(cwd,p)}]\n${body}`);
  }
  return {mentions,images,context:parts.join("\n\n")};
}
