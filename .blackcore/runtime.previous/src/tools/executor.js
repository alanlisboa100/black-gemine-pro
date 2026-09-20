import {redactSecrets} from "../security/secrets.js";
import {assertSchema} from "../schema/validator.js";
import {blockedByTaskScope,taskScopeBlockMessage} from "../agent/task-scope.js";

function extractJson(raw){
  const s=String(raw||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  try{return JSON.parse(s||"{}");}catch(first){
    const start=[...s].findIndex(ch=>ch==="{"||ch==="[");if(start<0)throw first;
    let depth=0,inString=false,escape=false;
    for(let i=start;i<s.length;i++){
      const ch=s[i];
      if(inString){if(escape){escape=false;continue;}if(ch==="\\"){escape=true;continue;}if(ch==='"')inString=false;continue;}
      if(ch==='"'){inString=true;continue;}
      if(ch==="{"||ch==="[")depth++;
      else if(ch==="}"||ch==="]"){depth--;if(depth===0)return JSON.parse(s.slice(start,i+1));}
    }
    throw first;
  }
}
function parseArgs(call){try{return extractJson(call.function?.arguments||"{}");}catch(e){throw new Error(`Invalid JSON arguments for ${call.function?.name}: ${e.message}`);}}
function bounded(v,max,ctx,tool){const s=redactSecrets(typeof v==="string"?v:JSON.stringify(v,null,2));if(s.length<=max)return s;const stored=ctx.outputStore?.put(s,{tool});const half=Math.floor((max-220)/2),handle=stored?`Full output saved as ${stored.id} (${stored.chars} chars). Use tool_output to read/search it.\n`:"";return `${handle}${s.slice(0,half)}\n...[tool output truncated by BLACKCORE]...\n${s.slice(-half)}`;}
function signature(name,args){let j;try{j=JSON.stringify(args);}catch{j=String(args);}return `${name}:${j}`;}
function unavailableError(msg=""){return /(not installed|command not found|\bENOENT\b|executable not found|is not available)/i.test(String(msg));}
function cancelled(call,name,signal){return {name,callId:call.id,result:`CANCELLED: ${signal?.reason?.message||"cancelled by user"}`,ok:false,cancelled:true};}
function dynamicParallelSafe(tool,args,ctx){try{return typeof tool?.parallelSafe==="function"?!!tool.parallelSafe(args,ctx):!!tool?.parallelSafe;}catch{return false;}}
function parallelConflict(aTool,aArgs,bTool,bArgs,ctx){try{if(typeof aTool?.parallelConflict==="function"&&aTool.parallelConflict(aArgs,bArgs,ctx))return true;if(typeof bTool?.parallelConflict==="function"&&bTool.parallelConflict(bArgs,aArgs,ctx))return true;}catch{return true;}return false;}
export class ToolExecutor{
  constructor({registry,cfg,hooks,audit}){Object.assign(this,{registry,cfg,hooks,audit});}
  async one(call,ctx){
    const name=call.function?.name,tool=this.registry.get(name);if(!tool)return {name,callId:call.id,result:`ERROR: unknown tool ${name}`,ok:false};
    if(ctx.signal?.aborted)return cancelled(call,name,ctx.signal);
    if(ctx.unavailableTools?.has(name))return {name,callId:call.id,result:`UNAVAILABLE: ${name} already failed as unavailable this turn: ${ctx.unavailableTools.get(name)}. Do not retry it; choose another tool or explain the missing dependency.`,ok:false};
    let args;try{args=parseArgs(call);if(blockedByTaskScope(name,args,ctx.taskScope))return {name,callId:call.id,result:taskScopeBlockMessage(name,args,ctx.taskScope),ok:false};assertSchema(tool.parameters||{type:"object"},args,`tool ${name} arguments`);}catch(e){return {name,callId:call.id,result:`ERROR: ${e.message}`,ok:false};}
    if(ctx.understanding?.clarification?.required&&!tool.readOnly)return {name,callId:call.id,result:`BLOCKED: ${name} would mutate state while the request still has a material ambiguity: ${ctx.understanding.clarification.reason}. Inspect read-only context or ask one concise clarification first.`,ok:false};
    const teamBlock=ctx.agent?.teamToolBlock?.(name,args,tool);if(teamBlock)return {name,callId:call.id,result:teamBlock,ok:false};
    const workBlock=ctx.work?.guardToolCall?.(name,args,tool);if(workBlock)return {name,callId:call.id,result:workBlock,ok:false};
    const sig=signature(name,args),prior=ctx.failedToolCalls?.get(sig)||0;
    if(prior>=2)return {name,callId:call.id,result:`BLOCKED: identical failing call ${name} has already failed ${prior} times this turn. Diagnose the failure or use a different approach.`,ok:false};
    if(ctx.agent?.mode==="PLAN"&&!tool.readOnly){const allowed=typeof tool.planSafe==="function"?!!tool.planSafe(args):false;if(!allowed)return {name,callId:call.id,result:`BLOCKED: ${name} action is not read-only in PLAN mode. Switch to ACT only when the user authorizes changes.`,ok:false};}
    try{
      const pre=await this.hooks?.emitCancelable("tool:before",{name,args,tool,ctx});if(pre?.cancel)return {name,callId:call.id,result:`BLOCKED: ${pre.reason||"extension cancelled"}`,ok:false};
      this.audit?.record("tool_call",{name,args});const started=Date.now();const raw=await tool.execute(args,ctx);const result=bounded(raw??"",this.cfg.maxToolOutputChars||120000,ctx,name),durationMs=Date.now()-started;
      let ok=true;if(typeof tool.resultStatus==="function")try{ok=tool.resultStatus(raw,args)!==false;}catch{ok=false;}
      if(!ok)this.audit?.record("tool_result_failure",{name,args});await this.hooks?.emit("tool:after",{name,args,result,ok,durationMs,ctx});return {name,callId:call.id,result,ok,durationMs};
    }catch(e){
      if(ctx.signal?.aborted)return cancelled(call,name,ctx.signal);
      const result=`ERROR: ${e.message||String(e)}`;ctx.failedToolCalls?.set(sig,prior+1);if(unavailableError(result))ctx.unavailableTools?.set(name,String(e.message||e).slice(0,300));this.audit?.record("tool_error",{name,args,error:result});await this.hooks?.emit("tool:error",{name,args,error:e,ctx});return {name,callId:call.id,result,ok:false};
    }
  }
  async many(calls,ctx,lifecycle={}){
    const run=async(call,index)=>{
      const name=call.function?.name||"tool";let args={};
      try{args=parseArgs(call);}catch{}
      try{await lifecycle.onStart?.({call,index,name,args});}catch{}
      const runCtx=Object.create(ctx);runCtx.reportProgress=update=>{try{lifecycle.onProgress?.({call,index,name,args,progress:update});}catch{}try{ctx.reportProgress?.(update);}catch{}};
      const result=await this.one(call,runCtx);
      try{await lifecycle.onFinish?.({...result,call,index,args});}catch{}
      return result;
    };
    const out=[];let i=0;
    while(i<calls.length){
      const call=calls[i],tool=this.registry.get(call.function?.name);let args={};try{args=parseArgs(call);}catch{}
      if(dynamicParallelSafe(tool,args,ctx)){
        const batch=[],agentBatch=call.function?.name==="delegate",limit=agentBatch?(this.cfg.maxParallelAgents||4):(this.cfg.maxParallelReadTools||4);
        while(i<calls.length&&batch.length<limit){const c=calls[i],t=this.registry.get(c.function?.name);let a={};try{a=parseArgs(c);}catch{break;}if(!dynamicParallelSafe(t,a,ctx))break;if(batch.some(x=>parallelConflict(t,a,x.tool,x.args,ctx)))break;batch.push({call:c,index:i,tool:t,args:a});i++;}
        out.push(...await Promise.all(batch.map(x=>run(x.call,x.index))));
      }else {out.push(await run(call,i));i++;}
    }
    return out;
  }
}
export {extractJson as parseToolArguments};
