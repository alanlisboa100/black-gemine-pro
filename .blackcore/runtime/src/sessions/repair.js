import fs from "node:fs";
import {readJsonl,rewriteJsonl} from "../utils/jsonl.js";

export function inspectSessionRecords(records=[]){
  const issues=[],ids=new Set();let headerCount=0;
  for(const [i,r] of records.entries()){
    if(r.type==="session_header"){headerCount++;continue;}
    if(!r.id){issues.push({level:"error",index:i,message:"entry missing id"});continue;}
    if(ids.has(r.id))issues.push({level:"error",index:i,id:r.id,message:"duplicate entry id"});ids.add(r.id);
  }
  if(headerCount!==1)issues.push({level:headerCount?"warn":"error",message:`expected one session_header, found ${headerCount}`});
  for(const [i,r] of records.entries())if(r.id&&r.parentId&&!ids.has(r.parentId))issues.push({level:"error",index:i,id:r.id,message:`dangling parent ${r.parentId}`});
  const byId=new Map(records.filter(r=>r.id).map(r=>[r.id,r]));
  for(const r of records.filter(r=>r.id)){
    const seen=new Set();let cur=r;while(cur?.parentId){if(seen.has(cur.id)){issues.push({level:"error",id:r.id,message:"cycle detected"});break;}seen.add(cur.id);cur=byId.get(cur.parentId);if(!cur)break;}
  }
  return {ok:!issues.some(x=>x.level==="error"),issues,entries:ids.size,headers:headerCount};
}
export function inspectSessionFile(file){const records=readJsonl(file);return {...inspectSessionRecords(records),file};}
export function repairSessionFile(file,{backup=true}={}){
  const records=readJsonl(file),head=records.find(r=>r.type==="session_header")||{type:"session_header",version:1,sessionId:`recovered_${Date.now()}`,cwd:process.cwd(),name:"recovered",createdAt:new Date().toISOString()};
  const seen=new Set(),clean=[];
  for(const r of records){if(r.type==="session_header"||!r.id||seen.has(r.id))continue;seen.add(r.id);clean.push({...r});}
  const valid=new Set(clean.map(r=>r.id));for(const r of clean)if(r.parentId&&!valid.has(r.parentId))r.parentId=null;
  head.activeId=valid.has(head.activeId)?head.activeId:clean.at(-1)?.id||null;
  if(backup)fs.copyFileSync(file,file+`.bak-${Date.now()}`);rewriteJsonl(file,[head,...clean]);return inspectSessionFile(file);
}
