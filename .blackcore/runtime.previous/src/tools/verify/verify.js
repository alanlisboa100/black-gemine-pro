import {defineTool} from "../registry.js";
import {verificationPlan} from "./plan.js";
import {execCapture} from "../../utils/exec.js";
import {artifactContract} from "./artifact-contract.js";

export const verifyTool=defineTool({
  name:"verify",description:"Detect the project and run its appropriate lint/typecheck/test/build verification pipeline. Returns structured pass/fail evidence.",mutates:false,
  resultStatus(raw){try{return JSON.parse(String(raw)).ok!==false;}catch{return false;}},
  parameters:{type:"object",properties:{level:{type:"string",enum:["fast","standard","full"]},failFast:{type:"boolean"},timeoutMs:{type:"integer",minimum:1000,maximum:900000}},additionalProperties:false},
  async execute(a,ctx){
    const level=a.level||"standard",artifact=artifactContract(ctx.cwd,{taskText:ctx.work?.text||""}),plan=verificationPlan(ctx.cwd,{level});
    if(!artifact.ok)return JSON.stringify({ok:false,verified:false,level,artifactContract:artifact,message:"deliverable contract failed; create or repair every listed file/security requirement before reporting completion",project:plan.project},null,2);
    if(!plan.commands.length)return JSON.stringify({ok:false,verified:false,skipped:true,level,artifactContract:artifact,message:"no verification commands detected; report this work as unverified or run a specific runtime check",project:plan.project},null,2);
    const rows=[];for(const command of plan.commands){const auth=await ctx.security.authorizeShell(command,ctx);if(!auth.allow){rows.push({command,ok:false,skipped:true,reason:auth.reason});if(a.failFast!==false)break;continue;}const started=Date.now(),r=await execCapture(process.env.SHELL||"sh",["-c",command],{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:a.timeoutMs||600000,maxChars:Math.min(ctx.cfg.maxToolOutputChars,60000)});rows.push({command,ok:r.code===0,exitCode:r.code,durationMs:Date.now()-started,output:r.combined.slice(-30000)});if(r.code!==0&&a.failFast!==false)break;}
    return JSON.stringify({ok:rows.every(x=>x.ok),level,artifactContract:artifact,checks:rows},null,2);
  }
});
