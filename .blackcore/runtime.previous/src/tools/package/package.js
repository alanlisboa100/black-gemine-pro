import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";
import {detectNode} from "../../context/project/node.js";

function readPackage(cwd){
  try{return JSON.parse(fs.readFileSync(path.join(cwd,"package.json"),"utf8"));}catch{return {};}
}

async function manager(cwd){
  const detected=detectNode(cwd)?.packageManager || null;
  const declared=String(readPackage(cwd)?.packageManager||"").split("@")[0]||null;
  const preferred=declared || detected;
  if(preferred && ["npm","pnpm","yarn","bun"].includes(preferred) && await which(preferred)) return preferred;
  for(const pm of ["npm","pnpm","yarn","bun"]) if(await which(pm)) return pm;
  throw new Error("npm/pnpm/yarn/bun not installed");
}

function runArgs(pm,script,args=[]){
  if(pm==="npm") return ["run",script,"--",...args];
  if(pm==="yarn") return ["run",script,...args];
  return ["run",script,...args];
}

export const packageTool=defineTool({
  name:"package_manager",description:"Run structured package-manager operations using the manager selected by the project lockfile/packageManager field.",
  parameters:{type:"object",properties:{action:{type:"string",enum:["install","run","test","lint","build","typecheck"]},script:{type:"string"},args:{type:"array",items:{type:"string"}}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    const pm=await manager(ctx.cwd);
    const pkg=readPackage(ctx.cwd);
    let args=[];
    if(a.action==="install") args=["install"];
    else if(a.action==="run"){
      if(!a.script) throw new Error("script required");
      if(!pkg.scripts?.[a.script]) throw new Error(`script not found: ${a.script}`);
      args=runArgs(pm,a.script,a.args||[]);
    } else {
      const script=a.action==="typecheck"?"typecheck":a.action;
      if(!pkg.scripts?.[script]) return `package_manager=${pm}\nscript ${script} not present; skipped`;
      args=runArgs(pm,script,a.args||[]);
    }
    const command=[pm,...args].join(" ");
    const auth=await ctx.security.authorizeShell(command,ctx);
    if(!auth.allow) throw new Error(auth.reason);
    const r=await execCapture(pm,args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:300000,maxChars:ctx.cfg.maxToolOutputChars});
    return `package_manager=${pm}\nexit=${r.code}\n${r.combined}`;
  }
});
