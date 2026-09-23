import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";

const READ_ACTIONS=new Set(["status","build_dry"]);

export const netlifyTool=defineTool({
  name:"netlify",description:"Inspect, dry-run build, build, or deploy a Netlify project. Every remote deploy requires confirmation outside yolo mode.",
  planSafe:a=>READ_ACTIONS.has(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["status","build_dry","build","deploy","deploy_prod"]},args:{type:"array",items:{type:"string"},maxItems:20}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    if(!(await which("netlify")))throw new Error("Netlify CLI not installed. Run: npm i -g netlify-cli");
    let args=[];
    switch(a.action){
      case"status":args=["status"];break;
      case"build_dry":args=["build","--dry",...(a.args||[])];break;
      case"build":args=["build",...(a.args||[])];break;
      case"deploy":args=["deploy",...(a.args||[])];break;
      case"deploy_prod":args=["deploy","--prod",...(a.args||[])];break;
    }
    if(["deploy","deploy_prod"].includes(a.action)&&ctx.cfg.permissionProfile!=="yolo"){
      const target=a.action==="deploy_prod"?"Netlify production":"a Netlify preview";
      const ok=await ctx.confirm(`Deploy this project to ${target}?`,false);
      if(!ok)return"Netlify deployment denied";
    }
    const r=await execCapture("netlify",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:600000,maxChars:ctx.cfg.maxToolOutputChars});
    return `exit=${r.code}\n${r.combined}`;
  }
});
