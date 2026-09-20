import fs from "node:fs";
import path from "node:path";
import {SESSION_DIR,projectStateDir,ensureHome} from "../utils/paths.js";
import {appendJsonl,readJsonl,rewriteJsonl} from "../utils/jsonl.js";
import {header,entry,usageEntry,compactEntry} from "./format.js";
import {SessionTree} from "./tree.js";
import {shortId} from "../utils/id.js";
import {normalizeUsage,addUsage} from "../providers/usage.js";

function sessionProjectDir(cwd){ensureHome();return projectStateDir(SESSION_DIR,cwd);}
function fileName(){return `${new Date().toISOString().replace(/[:.]/g,"-")}_${shortId()}.jsonl`;}

export class SessionStore{
  constructor(cwd,file=null,{ephemeral=false}={}){
    this.cwd=path.resolve(cwd);this.ephemeral=ephemeral;this.file=file||path.join(sessionProjectDir(this.cwd),fileName());this.records=file&&fs.existsSync(file)?readJsonl(file):[];
    this.header=this.records.find(x=>x.type==="session_header")||header({cwd:this.cwd});if(!this.records.length)this.persist(this.header);
    this.entries=this.records.filter(x=>x.id);this.tree=new SessionTree(this.entries);this.activeId=this.header.activeId||this.entries.at(-1)?.id||null;
  }
  persist(obj){if(this.ephemeral)return;appendJsonl(this.file,obj);}
  rewrite(){if(this.ephemeral)return;const h={...this.header,activeId:this.activeId};rewriteJsonl(this.file,[h,...this.entries]);}
  append(e){this.entries.push(e);this.tree.add(e);this.activeId=e.id;this.header.activeId=this.activeId;this.persist(e);return e;}
  addMessage(role,content,extra={}){return this.append({...entry({type:"message",parentId:this.activeId,role,content}),...extra});}
  addToolResult(toolCallId,name,content){return this.append({...entry({type:"message",parentId:this.activeId,role:"tool",content}),tool_call_id:toolCallId,name});}
  addUsage(usage,provider,model){return this.append(usageEntry(this.activeId,usage,provider,model));}
  addCompaction(summary,coveredEntryIds){return this.append(compactEntry(this.activeId,summary,coveredEntryIds));}
  activePath(){return this.activeId?this.tree.ancestors(this.activeId):[];}
  lastMessage(role=null){const path=this.activePath();for(let i=path.length-1;i>=0;i--){const e=path[i];if(e.type==="message"&&(!role||e.role===role))return e;}return null;}
  messages({includeCompaction=true}={}){
    const pathEntries=this.activePath();
    const covered=new Set();
    for(const e of pathEntries)if(e.type==="compaction")for(const id of e.data?.coveredEntryIds||[])covered.add(id);
    const out=[];
    for(const e of pathEntries){
      if(e.type==="message"&&!covered.has(e.id))out.push({role:e.role,content:e.content,...(e.images?.length?{images:e.images}:{}),...(e.tool_calls?{tool_calls:e.tool_calls}:{}),...(e.tool_call_id?{tool_call_id:e.tool_call_id}:{}),...(e.name?{name:e.name}:{}),...(e.reasoning_content?{reasoning_content:e.reasoning_content}:{})});
      else if(includeCompaction&&e.type==="compaction")out.push({role:"user",content:`[BLACKCORE COMPACTED CONTEXT]\n${e.content}`});
    }
    return out;
  }
  setActive(id){if(!this.tree.get(id))throw new Error("session entry not found");this.activeId=id;this.header.activeId=id;this.rewrite();}
  name(value){this.header.name=value||null;this.rewrite();}
  label(id,value){const e=this.tree.get(id);if(!e)throw new Error("entry not found");e.label=value||null;this.rewrite();}
  cloneTo(newFile=null){
    const target=new SessionStore(this.cwd,newFile,{ephemeral:this.ephemeral});target.header={...target.header,name:this.header.name?`${this.header.name} (clone)`:null};target.entries=this.activePath().map(x=>({...x}));target.tree=new SessionTree(target.entries);target.activeId=this.activeId;target.rewrite();return target;
  }
  forkFrom(id,newFile=null){
    if(!this.tree.get(id))throw new Error("entry not found");const target=new SessionStore(this.cwd,newFile,{ephemeral:this.ephemeral});target.entries=this.tree.ancestors(id).map(x=>({...x}));target.tree=new SessionTree(target.entries);target.activeId=id;target.header.name=this.header.name?`${this.header.name} (fork)`:null;target.rewrite();return target;
  }
  usageEntries(){return this.activePath().filter(e=>e.type==="usage").map(e=>({provider:e.data?.provider||"unknown",model:e.data?.model||"unknown",usage:normalizeUsage(e.data?.usage||{}),raw:e}));}
  usageTotals(){let t={};for(const e of this.usageEntries())t=addUsage(t,e.usage);return t;}
  usageByModel(){const map=new Map();for(const e of this.usageEntries()){const k=`${e.provider}/${e.model}`,prev=map.get(k)||{};map.set(k,addUsage(prev,e.usage));}return [...map].map(([ref,usage])=>({ref,usage}));}
  info(){return {file:this.file,id:this.header.sessionId,name:this.header.name,cwd:this.cwd,activeId:this.activeId,entries:this.entries.length,messages:this.messages().length,usage:this.usageTotals()};}
  static list(cwd){const d=sessionProjectDir(cwd);return fs.readdirSync(d).filter(x=>x.endsWith(".jsonl")).map(x=>path.join(d,x)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);}
  static latest(cwd){return this.list(cwd)[0]||null;}
  static find(cwd,query){const files=this.list(cwd);if(!query)return files[0]||null;const n=Number(query);if(Number.isInteger(n)&&n>=1)return files[n-1]||null;for(const f of files){const rec=readJsonl(f);const h=rec.find(x=>x.type==="session_header");if(h?.sessionId?.startsWith(query)||path.basename(f).includes(query)||h?.name?.toLowerCase().includes(String(query).toLowerCase()))return f;}return null;}
}
