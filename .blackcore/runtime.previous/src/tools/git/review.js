import {execCapture} from "../../utils/exec.js";

async function git(cwd,args,{timeoutMs=30000}={}){
  return execCapture("git",["-c","color.ui=false","-c","color.status=false","-c","color.diff=false","-c","color.branch=false",...args],{cwd,timeoutMs,maxChars:600000});
}
function stripAnsi(value=""){return String(value).replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g,"");}
function numstat(raw=""){
  return stripAnsi(raw).split(/\r?\n/).filter(Boolean).map(line=>{
    const [added,removed,...rest]=line.split("\t");return {path:rest.join("\t"),added:Number(added)||0,removed:Number(removed)||0,binary:added==="-"||removed==="-"};
  });
}
function untracked(status=""){
  return stripAnsi(status).split(/\r?\n/).filter(x=>x.startsWith("?? ")).map(x=>x.slice(3));
}
function diffArgs(scope,hasHead){
  const common=["diff","--no-ext-diff"];
  if(scope==="staged")return [...common,"--cached"];
  if(scope==="working")return common;
  return hasHead?[...common,"HEAD"]:common;
}

export async function inspectGitReview(cwd,{scope="all",maxPatchChars=30000}={}){
  const inside=await git(cwd,["rev-parse","--is-inside-work-tree"],{timeoutMs:10000});
  if(inside.code!==0||inside.stdout.trim()!=="true")return {ok:false,reason:"not a Git repository",scope,files:[],untracked:[],patch:""};
  const [branch,status,head]=await Promise.all([
    git(cwd,["branch","--show-current"],{timeoutMs:10000}),
    git(cwd,["status","--short"],{timeoutMs:10000}),
    git(cwd,["rev-parse","--verify","HEAD"],{timeoutMs:10000})
  ]);
  const hasHead=head.code===0,base=diffArgs(scope,hasHead),[numbers,check,patch]=await Promise.all([
    git(cwd,[...base,"--numstat"]),
    git(cwd,[...base,"--check"]),
    maxPatchChars>0?git(cwd,[...base,"--unified=3"]):Promise.resolve({stdout:""})
  ]);
  const files=numstat(numbers.stdout),added=files.reduce((n,x)=>n+x.added,0),removed=files.reduce((n,x)=>n+x.removed,0);
  const rawPatch=stripAnsi(patch.stdout||""),cleanStatus=stripAnsi(status.stdout),truncated=rawPatch.length>maxPatchChars;
  return {ok:true,scope,branch:stripAnsi(branch.stdout).trim()||"detached HEAD",hasHead,status:cleanStatus,files,untracked:untracked(cleanStatus),added,removed,checkOk:check.code===0,checkOutput:stripAnsi(check.stdout||check.combined||"").trim(),patch:rawPatch.slice(0,maxPatchChars),patchTruncated:truncated};
}
