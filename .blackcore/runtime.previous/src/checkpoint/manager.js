import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {CHECKPOINT_DIR,projectStateDir} from "../utils/paths.js";
import {shortId} from "../utils/id.js";

function hash(data){return data==null?null:crypto.createHash("sha256").update(data).digest("hex");}
async function snapshot(p){
  try{const st=await fsp.stat(p);if(st.isFile()){const data=await fsp.readFile(p);return {exists:true,data:data.toString("base64"),mode:st.mode&0o777,bytes:data.length,sha256:hash(data)};}}catch{}
  return {exists:false,data:null,mode:null,bytes:0,sha256:null};
}
function same(a,b){return !!a&&!!b&&a.exists===b.exists&&a.mode===b.mode&&a.sha256===b.sha256;}
function publicCheckpoint(file,obj={}){return {file,id:path.basename(file).replace(/\.undone\.json$|\.json$/,""),label:obj.label||"turn",createdAt:obj.createdAt||null,committedAt:obj.committedAt||null,workspace:obj.workspace||obj.cwd||null,paths:(obj.files||[]).length,undone:file.endsWith(".undone.json")};}
function atomicJson(file,obj){const tmp=`${file}.${process.pid}.tmp`;fs.writeFileSync(tmp,JSON.stringify(obj,null,2)+"\n","utf8");fs.renameSync(tmp,file);}

export class CheckpointManager{
  constructor(cwd){this.cwd=path.resolve(cwd);this.dir=projectStateDir(CHECKPOINT_DIR,cwd);this.pendingFile=path.join(this.dir,".pending.json");this.current=null;}
  begin(label="turn",meta={}){
    if(this.current&&this.current.files?.size)return this.current.id;
    this.current={version:2,id:`${Date.now()}-${shortId()}`,label,workspace:meta.workspace||null,files:new Map(),createdAt:new Date().toISOString(),meta:{...meta}};return this.current.id;
  }
  hasPending(){return fs.existsSync(this.pendingFile);}
  pendingInfo(){
    try{const obj=JSON.parse(fs.readFileSync(this.pendingFile,"utf8"));return {id:obj.id,label:obj.label||"turn",workspace:obj.workspace||null,paths:(obj.files||[]).length,createdAt:obj.createdAt||null,file:this.pendingFile};}catch{return null;}
  }
  persistPending(){
    if(!this.current)return null;const obj={version:2,id:this.current.id,label:this.current.label,workspace:this.current.workspace||this.cwd,createdAt:this.current.createdAt,meta:{...this.current.meta},files:[...this.current.files.entries()].map(([file,value])=>({path:file,before:value.before}))};atomicJson(this.pendingFile,obj);return this.pendingFile;
  }
  resumePending(expectedId=null){
    if(this.current?.files?.size)return this.current.id;
    let obj;try{obj=JSON.parse(fs.readFileSync(this.pendingFile,"utf8"));}catch{return null;}
    if(expectedId&&obj.id!==expectedId)throw new Error(`pending checkpoint mismatch: expected ${expectedId}, found ${obj.id||"unknown"}`);
    this.current={version:2,id:obj.id||`recovered-${Date.now()}-${shortId()}`,label:obj.label||"recovered task",workspace:obj.workspace||this.cwd,files:new Map((obj.files||[]).map(row=>[path.resolve(row.path),{before:row.before}])),createdAt:obj.createdAt||new Date().toISOString(),meta:{...(obj.meta||{}),recovered:true}};return this.current.id;
  }
  async finalizePending(meta={}){if(!this.hasPending())return null;this.resumePending();return await this.commit({...meta,recoveredPending:true});}
  discardPending(){try{fs.unlinkSync(this.pendingFile);return true;}catch{return false;}}
  async capture(file){
    if(!this.current)this.begin("implicit");const p=path.resolve(file);if(this.current.files.has(p))return;
    this.current.files.set(p,{before:await snapshot(p)});this.persistPending();
  }
  async commit(meta={}){
    if(!this.current||!this.current.files.size){this.current=null;this.discardPending();return null;}
    const rows=[];
    for(const [file,value] of this.current.files.entries()){
      const after=await snapshot(file);if(same(value.before,after))continue;rows.push({path:file,before:value.before,after});
    }
    if(!rows.length){this.current=null;this.discardPending();return null;}
    const obj={version:2,id:this.current.id,label:this.current.label,workspace:meta.workspace||this.current.workspace||this.cwd,createdAt:this.current.createdAt,committedAt:new Date().toISOString(),meta:{...this.current.meta,...meta},files:rows};
    const file=path.join(this.dir,`${this.current.id}.json`);await fsp.writeFile(file,JSON.stringify(obj,null,2),"utf8");this.current=null;this.discardPending();return file;
  }
  list({includeUndone=false}={}){
    const rows=fs.readdirSync(this.dir).filter(x=>x.endsWith(".json")&&!x.startsWith(".pending"));return rows.filter(x=>includeUndone||!x.endsWith(".undone.json")).sort().reverse().map(x=>path.join(this.dir,x));
  }
  undoneList(){return fs.readdirSync(this.dir).filter(x=>x.endsWith(".undone.json")).sort().reverse().map(x=>path.join(this.dir,x));}
  async describe(file){const obj=JSON.parse(await fsp.readFile(file,"utf8"));return publicCheckpoint(file,obj);}
  async restore(file,{state="before"}={}){
    const cp=JSON.parse(await fsp.readFile(file,"utf8")),rows=cp.files||[];
    for(const item of [...rows].reverse()){
      const snap=item[state]||(state==="before"&&Object.prototype.hasOwnProperty.call(item,"exists")?{exists:item.exists,data:item.data,mode:item.mode}:null);if(!snap)throw new Error(`checkpoint ${path.basename(file)} has no ${state} snapshot`);
      if(snap.exists){await fsp.mkdir(path.dirname(item.path),{recursive:true});await fsp.writeFile(item.path,Buffer.from(snap.data||"","base64"));if(snap.mode!=null)try{await fsp.chmod(item.path,snap.mode);}catch{}}
      else {try{await fsp.unlink(item.path);}catch{}}
    }
    return `restored ${state} state from checkpoint ${path.basename(file)} (${rows.length} paths)`;
  }
  async undo(){
    const file=this.list()[0];if(!file)throw new Error("no checkpoints");const info=await this.describe(file),r=await this.restore(file,{state:"before"}),undone=file.replace(/\.json$/,".undone.json");await fsp.rename(file,undone);return `${r} · undo ${info.label}`;
  }
  async redo(){
    const file=this.undoneList()[0];if(!file)throw new Error("no undone checkpoints");const info=await this.describe(file),r=await this.restore(file,{state:"after"}),active=file.replace(/\.undone\.json$/,".json");await fsp.rename(file,active);return `${r} · redo ${info.label}`;
  }
}
