import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";
import {readable,writable,capture} from "../fs/common.js";
import {writeTextAtomic} from "../../utils/fs.js";

const READ_ACTIONS=new Set(["status","projects","db_lint","migration_list","functions_list","secrets_list"]);
const REMOTE_WRITES=new Set(["db_push","functions_deploy","secrets_set","secrets_unset"]);
function projectRef(value,required=false){
  if(value==null||value===""){if(required)throw new Error("projectRef required");return null;}
  const ref=String(value);if(!/^[a-z0-9-]{3,80}$/i.test(ref))throw new Error("invalid Supabase project ref");return ref;
}
function safeName(value,label="name"){
  const name=String(value||"");if(!/^[a-zA-Z0-9_-]{1,80}$/.test(name))throw new Error(`${label} must use letters, numbers, _ or -`);return name;
}
function secretNames(values=[]){
  if(!Array.isArray(values)||!values.length)throw new Error("names required");return values.map(value=>{const name=String(value||"");if(!/^[A-Z][A-Z0-9_]{1,79}$/.test(name))throw new Error("secret names must use uppercase letters, numbers and _");return name;});
}
export async function resolveSupabaseCli(cwd=process.cwd()){
  const global=await which("supabase");if(global)return {command:"supabase",prefix:[],source:"global"};
  const local=path.join(cwd,"node_modules",".bin","supabase");if(fs.existsSync(local))return {command:local,prefix:[],source:"project"};
  throw new Error("Supabase CLI not installed. Recommended: npm install supabase --save-dev, then run it from this project.");
}
function withRef(args,ref){return ref?[...args,"--project-ref",ref]:args;}
function scopeFlag(scope="local"){return scope==="linked"?"--linked":"--local";}

export const supabaseTool=defineTool({
  name:"supabase",description:"Build and operate Supabase projects through the official CLI: local stack, linking, migrations, lint/tests, generated types, Edge Functions and secret-name management. Remote writes and destructive resets require confirmation.",
  planSafe:a=>READ_ACTIONS.has(a.action)||(a.action==="db_push"&&a.dryRun===true),
  parameters:{type:"object",properties:{
    action:{type:"string",enum:["status","projects","init","start","stop","link","db_lint","db_reset","db_push","migration_new","migration_list","test_db","gen_types","functions_new","functions_list","functions_deploy","secrets_list","secrets_set","secrets_unset"]},
    scope:{type:"string",enum:["local","linked"]},projectRef:{type:"string",minLength:3,maxLength:80},functionName:{type:"string",minLength:1,maxLength:80},migrationName:{type:"string",minLength:1,maxLength:80},
    language:{type:"string",enum:["typescript","go","swift","python"]},schema:{type:"array",items:{type:"string",pattern:"^[a-zA-Z_][a-zA-Z0-9_]*$"},maxItems:20},output:{type:"string",maxLength:1000},envFile:{type:"string",maxLength:1000},names:{type:"array",items:{type:"string"},minItems:1,maxItems:50},
    dryRun:{type:"boolean"},includeAll:{type:"boolean"},verifyJwt:{type:"boolean"},useApi:{type:"boolean"}
  },required:["action"],additionalProperties:false},
  async execute(a,ctx){
    const cli=await resolveSupabaseCli(ctx.cwd),ref=projectRef(a.projectRef),scope=scopeFlag(a.scope),language=a.language||"typescript";let args=[],generatedOutput=false;
    switch(a.action){
      case"status":args=["status"];break;
      case"projects":args=["projects","list"];break;
      case"init":args=["init"];break;
      case"start":args=["start"];break;
      case"stop":args=["stop"];break;
      case"link":args=["link","--project-ref",projectRef(a.projectRef,true)];break;
      case"db_lint":args=["db","lint",scope];break;
      case"db_reset":args=["db","reset",scope];break;
      case"db_push":args=["db","push",...(a.dryRun?["--dry-run"]:[]),...(a.includeAll?["--include-all"]:[])];break;
      case"migration_new":args=["migration","new",safeName(a.migrationName,"migrationName")];break;
      case"migration_list":args=["migration","list",scope];break;
      case"test_db":args=["test","db",scope];break;
      case"gen_types":args=["gen","types","--lang",language,scope,...(a.schema?.length?["--schema",a.schema.join(",")]:[])];generatedOutput=!!a.output;break;
      case"functions_new":args=["functions","new",safeName(a.functionName,"functionName")];break;
      case"functions_list":args=withRef(["functions","list"],ref);break;
      case"functions_deploy":args=withRef(["functions","deploy",safeName(a.functionName,"functionName"),...(a.verifyJwt===false?["--no-verify-jwt"]:[]),...(a.useApi?["--use-api"]:[])],ref);break;
      case"secrets_list":args=withRef(["secrets","list"],ref);break;
      case"secrets_set":{if(!a.envFile)throw new Error("envFile required; secret values are never accepted as tool arguments");const envFile=await readable(ctx,a.envFile);args=withRef(["secrets","set","--env-file",envFile],ref);break;}
      case"secrets_unset":args=withRef(["secrets","unset",...secretNames(a.names)],ref);break;
    }
    if(a.action==="db_reset"&&ctx.cfg.permissionProfile!=="yolo"){
      const ok=await ctx.confirm(`Reset the ${a.scope==="linked"?"linked":"local"} Supabase database and reapply migrations?`,false);if(!ok)return"Supabase database reset denied";
    }
    if(REMOTE_WRITES.has(a.action)&&!a.dryRun&&ctx.cfg.permissionProfile!=="yolo"){
      const detail=a.action==="functions_deploy"?`Edge Function ${a.functionName}${a.verifyJwt===false?" with JWT verification disabled":""}`:a.action.replaceAll("_"," ");
      const ok=await ctx.confirm(`Run Supabase remote write: ${detail}${ref?` on ${ref}`:" on the linked project"}?`,false);if(!ok)return a.action==="functions_deploy"?"Supabase function deployment denied":`Supabase ${a.action.replaceAll("_"," ")} denied`;
    }
    const timeout=["start","db_reset","db_push","test_db","functions_deploy"].includes(a.action)?900000:180000,r=await execCapture(cli.command,[...cli.prefix,...args],{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:timeout,maxChars:ctx.cfg.maxToolOutputChars});
    if(generatedOutput){if(r.code!==0)return`exit=${r.code}\n${r.combined}`;const output=await writable(ctx,a.output);await capture(ctx,output);await writeTextAtomic(output,r.stdout);return JSON.stringify({ok:true,action:a.action,language,path:output,bytes:Buffer.byteLength(r.stdout),cli:cli.source},null,2);}
    return `exit=${r.code}\n${r.combined}`;
  }
});
