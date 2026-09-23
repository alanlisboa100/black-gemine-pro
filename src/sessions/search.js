import fs from "node:fs";
import {SessionStore} from "./store.js";
import {readJsonl} from "../utils/jsonl.js";
export function searchSessions(cwd,query,max=50){
  const q=String(query||"").toLowerCase(),out=[];
  for(const file of SessionStore.list(cwd)){
    const rec=readJsonl(file),h=rec.find(x=>x.type==="session_header");let score=0,preview="";
    if(h?.name?.toLowerCase().includes(q)){score+=10;preview=h.name;}
    for(const e of rec){const s=String(e.content||"");if(s.toLowerCase().includes(q)){score++;if(!preview)preview=s.replace(/\s+/g," ").slice(0,120);}}
    if(score)out.push({file,id:h?.sessionId,name:h?.name,score,preview,mtime:fs.statSync(file).mtimeMs});
  }return out.sort((a,b)=>b.score-a.score||b.mtime-a.mtime).slice(0,max);
}
