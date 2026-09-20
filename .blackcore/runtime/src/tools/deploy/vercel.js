import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";
export const vercelTool=defineTool({
  name:"vercel",description:"Run Vercel project inspection, build, or deployment with explicit production confirmation.",
  planSafe:a=>["whoami","project"].includes(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["whoami","project","build","deploy","deploy_prod"]},args:{type:"array",items:{type:"string"}}},required:["action"],additionalProperties:false},
  async execute(a,ctx){if(!(await which("vercel")))throw new Error("Vercel CLI not installed. Run: npm i -g vercel");let args=[];switch(a.action){case"whoami":args=["whoami"];break;case"project":args=["project","ls"];break;case"build":args=["build",...(a.args||[])];break;case"deploy":args=["deploy",...(a.args||[])];break;case"deploy_prod":args=["deploy","--prod",...(a.args||[])];break;}
    if(["deploy","deploy_prod"].includes(a.action)&&ctx.cfg.permissionProfile!=="yolo"){const target=a.action==="deploy_prod"?"Vercel production":"a Vercel preview";const ok=await ctx.confirm(`Deploy this project to ${target}?`,false);if(!ok)return"Vercel deployment denied";}
    const r=await execCapture("vercel",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:600000,maxChars:ctx.cfg.maxToolOutputChars});return `exit=${r.code}\n${r.combined}`;
  }
});
