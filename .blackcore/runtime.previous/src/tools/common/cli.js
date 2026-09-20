import {execCapture,which} from "../../utils/exec.js";
import fs from "node:fs/promises";
import path from "node:path";

function displayArg(value){const s=String(value);return /^[A-Za-z0-9_./:@%+=,-]+$/.test(s)?s:JSON.stringify(s);}
export function displayCommand(command,args=[]){return [command,...args].map(displayArg).join(" ");}
export async function available(names){const out={};for(const name of names)out[name]=await which(name);return out;}
export async function runCli(ctx,command,args=[],{timeoutMs=180000,env=process.env,allowFailure=false,input=null,maxChars=null,onStdout=null,onStderr=null}={}){
  let executable;
  if(String(command).includes("/")){
    executable=path.resolve(ctx.cwd,command);
    try{await fs.access(executable,fs.constants.X_OK);}catch{throw new Error(`${command} is not installed or executable`);}
  }else executable=await which(command);
  if(!executable)throw new Error(`${command} is not installed`);
  const shown=displayCommand(command,args),auth=await ctx.security.authorizeShell(shown,ctx);if(!auth.allow)throw new Error(auth.reason);
  const result=await execCapture(executable,args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs,env,input,maxChars:maxChars||ctx.cfg.maxToolOutputChars,onStdout,onStderr});
  if(result.code!==0&&!allowFailure)throw new Error(result.combined||`${command} exited ${result.code}`);
  return {command:shown,exitCode:result.code,stdout:result.stdout,stderr:result.stderr,output:result.combined};
}
