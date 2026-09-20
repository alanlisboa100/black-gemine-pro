import fs from "node:fs";
import path from "node:path";
import {TASK_RECOVERY_DIR,ensureDir} from "../utils/paths.js";
import {shortId} from "../utils/id.js";
import {redactSecrets} from "../security/secrets.js";

const RECOVERABLE=new Set(["running","interrupted","cancelled","failed"]);

function sanitize(value,depth=0){
  if(depth>12)return "[truncated]";
  if(typeof value==="string")return redactSecrets(value).slice(0,12000);
  if(Array.isArray(value))return value.slice(0,80).map(x=>sanitize(x,depth+1));
  if(value&&typeof value==="object"){
    const out={};for(const [k,v] of Object.entries(value).slice(0,120))out[k]=sanitize(v,depth+1);return out;
  }
  return value;
}
function taskFile(id){ensureDir(TASK_RECOVERY_DIR);return path.join(TASK_RECOVERY_DIR,`${id}.json`);}
function atomicWrite(file,obj){ensureDir(path.dirname(file));const tmp=`${file}.${process.pid}.tmp`;fs.writeFileSync(tmp,JSON.stringify(sanitize(obj),null,2)+"\n","utf8");fs.renameSync(tmp,file);}
function readFile(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function matchCwd(task,cwd){const root=path.resolve(cwd);return [task?.sourceCwd,task?.workspace?.root,task?.workspaceRoot].filter(Boolean).some(x=>path.resolve(x)===root);}

export function createRecoveryTask({sourceCwd,sessionFile,originalText,workspace,understanding,work,todos=[],budget=null,checkpointId=null,provider="",model=""}={}){
  const now=new Date().toISOString();const task={version:1,id:`task-${Date.now()}-${shortId()}`,status:"running",pid:process.pid,sourceCwd:path.resolve(sourceCwd||process.cwd()),sessionFile:sessionFile||null,originalText:redactSecrets(String(originalText||"")),workspace:sanitize(workspace||null),understanding:sanitize(understanding||null),work:sanitize(work||null),todos:sanitize(todos||[]),budget:sanitize(budget),checkpointId:checkpointId||null,provider,model,activity:{phase:"starting",pendingTools:[]},resumeCount:0,startedAt:now,updatedAt:now};
  return saveRecoveryTask(task);
}
export function saveRecoveryTask(task,patch={}){
  if(!task?.id)throw new Error("recovery task id required");const next={...task,...sanitize(patch),id:task.id,updatedAt:new Date().toISOString()};atomicWrite(taskFile(task.id),next);Object.assign(task,next);return task;
}
export function loadRecoveryTask(id){return readFile(taskFile(id));}
export function clearRecoveryTask(taskOrId){const id=typeof taskOrId==="string"?taskOrId:taskOrId?.id;if(!id)return false;try{fs.unlinkSync(taskFile(id));return true;}catch{return false;}}
export function listRecoverableTasks(cwd=null){
  ensureDir(TASK_RECOVERY_DIR);const rows=[];for(const name of fs.readdirSync(TASK_RECOVERY_DIR)){if(!name.endsWith(".json"))continue;const task=readFile(path.join(TASK_RECOVERY_DIR,name));if(!task||!RECOVERABLE.has(task.status))continue;if(cwd&&!matchCwd(task,cwd))continue;rows.push(task);}return rows.sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
}
export function findRecoverableTask(cwd){return listRecoverableTasks(cwd)[0]||null;}
export function markRecoveryTask(task,status,patch={}){return saveRecoveryTask(task,{...patch,status,pid:process.pid});}
export function supersedeRecoverableTasks(cwd,{exceptId=null}={}){let count=0;for(const task of listRecoverableTasks(cwd)){if(task.id===exceptId)continue;clearRecoveryTask(task);count++;}return count;}
export function resumeInstruction(task){
  const phase=task?.work?.phase||task?.activity?.phase||"unknown",pending=(task?.activity?.pendingTools||[]).filter(Boolean);const lines=[
    "[BLACKCORE RECOVERY · CONTINUE INTERRUPTED TASK]",
    "Continue the existing task from persisted evidence. Do not restart completed work and do not assume an interrupted tool finished successfully.",
    `Original goal: ${task?.originalText||"continue the interrupted task"}`,
    `Last recorded phase: ${phase}.`,
    `Resume count: ${Number(task?.resumeCount||0)+1}.`
  ];
  if(task?.workspace?.root)lines.push(`Workspace: ${task.workspace.root}`);
  if(task?.checkpointId)lines.push(`Task checkpoint: ${task.checkpointId}. Keep subsequent mutations in this checkpoint until the task finishes.`);
  if(pending.length)lines.push(`Potentially interrupted tools: ${pending.join(", ")}. Inspect their observable effects before retrying them.`);
  if(task?.todos?.length)lines.push(`Persisted todo state: ${task.todos.map(x=>`[${x.status||"pending"}] ${x.text||x.id}`).join(" | ")}`);
  if(task?.work?.graph?.state?.nodes?.length){const nodes=task.work.graph.state.nodes;lines.push(`Persisted task graph: ${nodes.map(x=>`${x.id}=${x.status}`).join(" | ")}. Resume only dependency-ready unfinished nodes; do not rerun completed nodes.`);}
  lines.push("Reconcile the current filesystem with the persisted plan, then continue from the narrowest unfinished step. Re-verify any state whose completion is uncertain.");
  return lines.join("\n");
}
export function renderRecoveryContext(task){
  if(!task)return "";const w=task.work||{},b=task.budget||{},lines=[`Recovery task: ${task.id}`,`Original goal: ${task.originalText||""}`,`Recorded status: ${task.status||"interrupted"}`,`Last phase: ${w.phase||task.activity?.phase||"unknown"}`];
  if(w.mutationRevision!=null)lines.push(`Recorded revision: ${w.mutationRevision}; mutations: ${w.mutations||0}; verification: ${w.verification?.passed?"passed":w.verification?.failed?"failed":"pending"}; review: ${w.review?.passed?"recorded":"pending"}.`);
  if(task.checkpointId)lines.push(`Open checkpoint: ${task.checkpointId}.`);
  if(b.usage)lines.push(`Prior task usage: ${Number(b.usage.total||0).toLocaleString()} tokens; estimated cost $${Number(b.estimatedCostUSD||0).toFixed(4)}.`);
  if(task.activity?.pendingTools?.length)lines.push(`Interrupted/uncertain tools: ${task.activity.pendingTools.join(", ")}. Verify effects before retry.`);
  if(w.graph?.summary)lines.push(`Task graph: ${w.graph.summary.done||0}/${w.graph.summary.total||0} done; ready=${(w.graph.summary.ready||[]).join(", ")||"none"}.`);
  return lines.join("\n");
}
export function repairInterruptedToolCalls(session){
  const entries=session.activePath?.()||[],toolResults=new Set(entries.filter(x=>x.type==="message"&&x.role==="tool"&&x.tool_call_id).map(x=>x.tool_call_id));let repaired=0;
  for(let i=entries.length-1;i>=0;i--){const e=entries[i];if(e.type!=="message"||e.role!=="assistant"||!Array.isArray(e.tool_calls)||!e.tool_calls.length)continue;
    const missing=e.tool_calls.filter(c=>c?.id&&!toolResults.has(c.id));if(!missing.length)break;
    for(const call of missing){const name=call.function?.name||"tool";session.addToolResult(call.id,name,"INTERRUPTED: BLACKCORE was stopped before this tool result was recorded. Completion state is unknown. Inspect the current workspace/state before retrying or claiming success.");repaired++;}
    break;
  }
  return repaired;
}
