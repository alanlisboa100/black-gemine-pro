import {execCapture} from "../utils/exec.js";
export async function gitSnapshot(cwd){
  const inside=await execCapture("git",["rev-parse","--is-inside-work-tree"],{cwd,timeoutMs:5000}).catch(()=>null);if(!inside||inside.code!==0)return null;
  const head=await execCapture("git",["rev-parse","HEAD"],{cwd,timeoutMs:5000}).catch(()=>null);
  const status=await execCapture("git",["status","--porcelain=v1","-z"],{cwd,timeoutMs:5000}).catch(()=>null);
  return {head:head?.stdout.trim()||null,dirty:!!status?.stdout,porcelain:status?.stdout||""};
}
