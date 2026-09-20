import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {AGENT_MEMORY_DIR,projectStateDir} from "../utils/paths.js";
import {redactSecrets} from "../security/secrets.js";
import {normalizeUsage} from "../providers/usage.js";

const VERSION=2;
const MAX_TASKS=200;
const MAX_PATTERNS=32;

function memoryFile(cwd){return path.join(projectStateDir(AGENT_MEMORY_DIR,cwd),"memory.json");}
function indexFile(cwd){return path.join(projectStateDir(AGENT_MEMORY_DIR,cwd),"memory.sqlite");}
function clean(value,max=800){return redactSecrets(String(value??"").replace(/\s+/g," ").trim()).slice(0,max);}
function words(value){return new Set(clean(value,4000).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").match(/[a-z0-9_.-]{3,}/g)||[]);}
function score(query,row){
  if(!query)return 0;const q=words(query),r=words(`${row.goal||""} ${(row.targets||[]).join(" ")} ${(row.failures||[]).join(" ")} ${row.outcome||""}`);let n=0;for(const w of q)if(r.has(w))n++;return n;
}
function empty(cwd){return {version:VERSION,project:path.resolve(cwd),updatedAt:null,tasks:[],patterns:[]};}
function read(cwd){const file=memoryFile(cwd);try{const obj=JSON.parse(fs.readFileSync(file,"utf8"));return {file,data:{...empty(cwd),...obj,version:VERSION,tasks:Array.isArray(obj.tasks)?obj.tasks:[],patterns:Array.isArray(obj.patterns)?obj.patterns:[]}};}catch{return {file,data:empty(cwd)};}}
function write(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.${process.pid}.tmp`;fs.writeFileSync(tmp,JSON.stringify(data,null,2)+"\n","utf8");fs.renameSync(tmp,file);}

function sqlText(value){return `'${String(value??"").replaceAll("'","''")}'`;}
function sqlite(db,sql){
  const result=spawnSync("sqlite3",["-batch",db,sql],{encoding:"utf8",timeout:4000,maxBuffer:2_000_000,windowsHide:true});if(result.error||result.status!==0)return null;return String(result.stdout||"");
}
function rowText(row){return clean(`${row.goal||""} ${(row.targets||[]).join(" ")} ${(row.constraints||[]).join(" ")} ${(row.acceptance||[]).join(" ")} ${(row.failures||[]).join(" ")} ${row.outcome||""}`,6000);}
function syncIndex(cwd,data){
  const db=indexFile(cwd),stamp=String(data.updatedAt||"");
  const existing=sqlite(db,"CREATE TABLE IF NOT EXISTS memory_meta(key TEXT PRIMARY KEY,value TEXT); CREATE VIRTUAL TABLE IF NOT EXISTS turns_fts USING fts5(id UNINDEXED, at UNINDEXED, content, tokenize='unicode61 remove_diacritics 2'); SELECT value FROM memory_meta WHERE key='updatedAt';");if(existing===null)return {available:false,backend:"json",file:db};
  if(existing.trim()===stamp)return {available:true,backend:"sqlite-fts5",file:db};
  const inserts=data.tasks.map(row=>`INSERT INTO turns_fts(id,at,content) VALUES(${sqlText(row.id)},${sqlText(row.at)},${sqlText(rowText(row))});`).join(" "),sql=`BEGIN; DELETE FROM turns_fts; ${inserts} INSERT INTO memory_meta(key,value) VALUES('updatedAt',${sqlText(stamp)}) ON CONFLICT(key) DO UPDATE SET value=excluded.value; COMMIT;`;
  return sqlite(db,sql)===null?{available:false,backend:"json",file:db}:{available:true,backend:"sqlite-fts5",file:db};
}
function ftsIds(cwd,query,limit=40){
  const tokens=[...words(query)].filter(token=>/^[a-z0-9_-]+$/.test(token)).slice(0,18);if(!tokens.length)return [];
  const match=tokens.map(token=>`"${token.replaceAll('"','""')}"`).join(" OR "),out=sqlite(indexFile(cwd),`SELECT id FROM turns_fts WHERE turns_fts MATCH ${sqlText(match)} ORDER BY bm25(turns_fts) LIMIT ${Math.max(1,Math.min(100,Number(limit)||40))};`);return out===null?[]:out.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}
function patternScore(query,row){return score(query,{goal:row.goal,targets:row.targets,failures:[],outcome:row.lastOutcome});}
function learnPattern(data,row){
  if(row.verified!==true||!row.goal||!row.targets.length)return;
  const ranked=data.patterns.map(item=>({item,score:patternScore(row.goal,item)})).sort((a,b)=>b.score-a.score),match=ranked[0]?.score>=Math.max(2,Math.ceil(words(row.goal).size*0.34))?ranked[0].item:null;
  if(match){match.uses=Number(match.uses||1)+1;match.verifiedUses=Number(match.verifiedUses||1)+1;match.lastSeen=row.at;match.lastOutcome=row.outcome;match.targets=[...new Set([...(match.targets||[]),...row.targets])].slice(0,20);match.recommended=match.verifiedUses>=2;return;}
  data.patterns.push({id:`pattern-${row.id}`,goal:row.goal,targets:row.targets,constraints:row.constraints,acceptance:row.acceptance,lastOutcome:row.outcome,uses:1,verifiedUses:1,recommended:false,firstSeen:row.at,lastSeen:row.at});data.patterns=data.patterns.slice(-MAX_PATTERNS);
}

export function loadAgentMemory(cwd,{query="",maxChars=14000,maxTasks=10}={}){
  const {file,data}=read(cwd),rows=[...data.tasks],index=syncIndex(cwd,data),ftsRank=ftsIds(cwd,query),ftsScore=new Map(ftsRank.map((id,rank)=>[id,Math.max(1,ftsRank.length-rank)]));
  const ranked=rows.map((row,index)=>({row,index,score:score(query,row)+(ftsScore.get(row.id)||0)*2})).sort((a,b)=>b.score-a.score||b.index-a.index);
  const picked=[],seen=new Set();
  for(const item of ranked){if(picked.length>=maxTasks)break;const key=item.row.id||`${item.row.at}:${item.index}`;if(seen.has(key))continue;seen.add(key);picked.push(item.row);}
  picked.sort((a,b)=>String(a.at||"").localeCompare(String(b.at||"")));
  const lines=[];
  for(const row of picked){
    const bits=[`${row.status||"unknown"}`,row.workStatus?`work=${row.workStatus}`:"",row.verified===true?"verified":row.verified===false?"unverified":"",row.estimatedCostUSD!=null?`~$${Number(row.estimatedCostUSD).toFixed(4)}`:""] .filter(Boolean).join(" · ");
    lines.push(`- ${row.at||"unknown"} · ${bits}\n  goal: ${clean(row.goal,420)}${row.targets?.length?`\n  targets: ${row.targets.slice(0,10).join(", ")}`:""}${row.failures?.length?`\n  blockers: ${row.failures.slice(0,4).map(x=>clean(x,240)).join(" | ")}`:""}${row.outcome?`\n  outcome: ${clean(row.outcome,520)}`:""}`);
  }
  const patterns=data.patterns.map(row=>({row,score:patternScore(query,row)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||Number(b.row.verifiedUses)-Number(a.row.verifiedUses)).slice(0,3);
  if(patterns.length){lines.push("PROVEN WORKFLOW PATTERNS");for(const {row} of patterns)lines.push(`- ${row.recommended?"recommended":"learned"} · ${row.verifiedUses} verified use${row.verifiedUses===1?"":"s"}\n  goal: ${clean(row.goal,360)}${row.targets?.length?`\n  targets: ${row.targets.slice(0,10).join(", ")}`:""}${row.lastOutcome?`\n  last outcome: ${clean(row.lastOutcome,420)}`:""}`);}
  let text=lines.join("\n");if(text.length>maxChars)text=text.slice(-maxChars);
  return {file,text,data,count:data.tasks.length,selected:picked.length,patterns:patterns.length,index,truncated:lines.join("\n").length>maxChars};
}

export function recordAgentTurn(cwd,{goal="",status="completed",response="",work=null,failures=[],usage={},budget=null,provider="",model="",understanding=null,checkpoint=null}={}){
  const {file,data}=read(cwd),u=normalizeUsage(usage),now=new Date().toISOString(),targets=(work?.targets||[]).map(x=>clean(x,260)).filter(Boolean).slice(0,20);
  const row={
    id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    at:now,
    goal:clean(goal,650),status:clean(status,80),provider:clean(provider,80),model:clean(model,120),
    workStatus:clean(work?.status||"",80),depth:clean(work?.depth||"",40),targets,
    verified:Number(work?.mutations||0)>0?work?.verification?.passed===true:null,reviewed:Number(work?.mutations||0)>0?work?.review?.passed===true:null,
    repairCycles:Number(work?.repair?.cycles||0),
    constraints:(understanding?.constraints||[]).map(x=>clean(x,260)).filter(Boolean).slice(0,8),
    acceptance:(understanding?.acceptance||[]).map(x=>clean(x,260)).filter(Boolean).slice(0,8),
    failures:(failures||[]).map(x=>clean(typeof x==="string"?x:(x?.summary||x?.message||JSON.stringify(x)),360)).filter(Boolean).slice(0,6),
    outcome:clean(response,900),
    usage:{input:u.input,output:u.output,total:u.total,reasoning:u.reasoning,cacheRead:u.cacheRead},
    estimatedCostUSD:budget?.estimatedCostUSD==null?null:Number(budget.estimatedCostUSD),
    checkpoint:checkpoint?.id||checkpoint?.file||checkpoint||null
  };
  // Avoid filling memory with repeated identical no-op/status turns.
  const last=data.tasks.at(-1);if(last&&last.goal===row.goal&&last.status===row.status&&last.outcome===row.outcome&&row.targets.length===0){last.at=row.at;last.usage=row.usage;last.estimatedCostUSD=row.estimatedCostUSD;data.updatedAt=now;write(file,data);syncIndex(cwd,data);return {file,row:last,count:data.tasks.length,deduped:true};}
  data.tasks.push(row);data.tasks=data.tasks.slice(-MAX_TASKS);learnPattern(data,row);data.updatedAt=now;write(file,data);const index=syncIndex(cwd,data);return {file,row,count:data.tasks.length,patterns:data.patterns.length,index,deduped:false};
}

export function clearAgentMemory(cwd){let removed=false;for(const file of [memoryFile(cwd),indexFile(cwd),`${indexFile(cwd)}-wal`,`${indexFile(cwd)}-shm`])try{fs.unlinkSync(file);removed=true;}catch(e){if(e?.code!=="ENOENT")throw e;}return removed;}
export function agentMemoryPath(cwd){return memoryFile(cwd);}
export function agentMemoryCapabilities(cwd){const {data}=read(cwd);return syncIndex(cwd,data);}
