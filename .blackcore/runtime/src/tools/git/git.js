import {defineTool} from "../registry.js";
import {execCapture} from "../../utils/exec.js";
import {githubAuthStatus,githubAuthLogin} from "./github.js";

const READ=new Set(["status","diff","log","show","branch","remote","auth_status"]);
export const gitTool=defineTool({
  name:"git",description:"Structured Git operations with safe argument construction.",readOnly:false,planSafe:a=>READ.has(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["status","diff","log","show","branch","remote","auth_status","auth_login_web","add","commit","checkout_new_branch","push"]},pathspec:{type:"string"},ref:{type:"string"},message:{type:"string"},branch:{type:"string"},remote:{type:"string"},staged:{type:"boolean"}},required:["action"],additionalProperties:false},
  async execute(a,ctx){if(a.action==="auth_status")return githubAuthStatus(ctx);if(a.action==="auth_login_web")return githubAuthLogin(ctx);let args=[],mutating=!READ.has(a.action);switch(a.action){
    case"status":args=["status","--short","--branch"];break;case"diff":args=["diff",...(a.staged?["--cached"]:[]),...(a.pathspec?["--",a.pathspec]:[])];break;
    case"log":args=["log","--oneline","--decorate","-n","30",...(a.ref?[a.ref]:[])];break;case"show":args=["show","--stat","--oneline",a.ref||"HEAD"];break;case"branch":args=["branch","--show-current"];break;case"remote":args=["remote","-v"];break;
    case"add":if(!a.pathspec)throw new Error("pathspec required");args=["add","--",a.pathspec];break;case"commit":if(!a.message)throw new Error("message required");args=["commit","-m",a.message];break;
    case"checkout_new_branch":if(!a.branch)throw new Error("branch required");args=["checkout","-b",a.branch];break;
    case"push":args=["push",a.remote||"origin",...(a.branch?[a.branch]:[])];break;
  }
  if(mutating&&ctx.cfg.permissionProfile==="safe"&&["push"].includes(a.action))throw new Error("git push blocked in safe profile");
  if(a.action==="push"&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Push Git changes to ${a.remote||"origin"}?`);if(!ok)return"push denied";}
  const r=await execCapture("git",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:120000,maxChars:ctx.cfg.maxToolOutputChars});if(r.code!==0)throw new Error(r.combined||`git exited ${r.code}`);return r.combined||"ok";
  }
});
