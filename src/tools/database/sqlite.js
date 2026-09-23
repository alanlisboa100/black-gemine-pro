import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";
import {readable,writable,capture} from "../fs/common.js";

function readOnlySql(sql=""){return /^\s*(select|pragma|with|explain)\b/i.test(sql);}
async function dbPath(a,ctx,write=false){return write?await writable(ctx,a.path):await readable(ctx,a.path);}
async function runSqlite(db,args,ctx,timeoutMs=120000){if(!(await which("sqlite3")))throw new Error("sqlite3 CLI is not installed. On Termux install package 'sqlite'.");const r=await execCapture("sqlite3",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs,maxChars:ctx.cfg.maxToolOutputChars});if(r.code!==0)throw new Error(r.combined||`sqlite3 exited ${r.code}`);return r.stdout||r.combined||"";}
export const sqliteTool=defineTool({
  name:"sqlite",description:"Inspect or query SQLite databases with structured actions. Read actions are safe; exec requires write authorization and checkpoint capture.",planSafe:a=>["tables","schema","query"].includes(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["tables","schema","query","exec"]},path:{type:"string"},sql:{type:"string"},table:{type:"string"}},required:["action","path"],additionalProperties:false},
  async execute(a,ctx){
    if(a.action==="tables"){const db=await dbPath(a,ctx);return runSqlite(db,["-json",db,"SELECT name,type FROM sqlite_master WHERE type IN ('table','view') ORDER BY type,name;"],ctx);}
    if(a.action==="schema"){const db=await dbPath(a,ctx);const sql=a.table?`SELECT sql FROM sqlite_master WHERE name='${String(a.table).replace(/'/g,"''")}';`:`SELECT name,type,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name;`;return runSqlite(db,["-json",db,sql],ctx);}
    if(!a.sql)throw new Error("sql required");
    if(a.action==="query"&&!readOnlySql(a.sql))throw new Error("query action accepts SELECT/PRAGMA/WITH/EXPLAIN only; use exec for mutations");
    if(a.action==="query"){const db=await dbPath(a,ctx);return runSqlite(db,["-json",db,a.sql],ctx);}
    const db=await dbPath(a,ctx,true);if(ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Execute mutating SQLite statement on ${a.path}?`);if(!ok)return"SQLite mutation denied";}await capture(ctx,db);return runSqlite(db,[db,a.sql],ctx);
  }
});
