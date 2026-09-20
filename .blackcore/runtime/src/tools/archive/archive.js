import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";
import {writable,readable,capture} from "../fs/common.js";

function within(root,p){const rel=path.relative(root,p);return rel===""||(!rel.startsWith("..")&&!path.isAbsolute(rel));}
function safeMembers(text){for(const raw of String(text).split(/\r?\n/)){const n=raw.trim();if(!n)continue;const normalized=n.replace(/\\/g,"/");if(normalized.startsWith("/")||normalized.split("/").includes(".."))throw new Error(`archive contains unsafe path: ${n}`);}}
async function validateArchive(action,src,ctx){let cmd,args;if(action==="unzip"){cmd="unzip";args=["-Z1",src];}else{cmd="tar";args=["-tzf",src];}const r=await execCapture(cmd,args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:60000,maxChars:500000});if(r.code!==0)throw new Error(r.combined||"cannot list archive");safeMembers(r.stdout||r.combined);}
function defaultArchiveDestination(action,src,ctx){
  const st=fs.statSync(src),ext=action==="zip"?".zip":".tar.gz",name=`${path.basename(src)}${ext}`;
  // A directory archive must live outside that directory. Otherwise tools such
  // as `zip -r` can package their own output or accidentally bundle unrelated
  // workspace contents while the archive is growing.
  return st.isDirectory()?path.join(path.dirname(src),name):path.resolve(ctx.cwd,name);
}
function assertArchiveDestinationOutsideSource(src,dest){
  const st=fs.statSync(src);if(st.isDirectory()&&within(src,dest))throw new Error(`archive destination must be outside source directory: ${dest}`);
}
export const archiveTool=defineTool({
  name:"archive",description:"Create, list, or extract ZIP/TAR archives within the workspace. Archive creation is only for explicit user packaging requests.",mutates:true,
  parameters:{type:"object",properties:{action:{type:"string",enum:["zip","unzip","list_zip","tar_gz","untar_gz"]},source:{type:"string"},destination:{type:"string"}},required:["action","source"],additionalProperties:false},
  async execute(a,ctx){const action=a.action,src=await readable(ctx,a.source);let dest=a.destination?path.resolve(ctx.cwd,a.destination):null;
    if(action==="zip"||action==="tar_gz"){
      if(action==="zip"&&!(await which("zip")))throw new Error("zip not installed");
      dest=dest||defaultArchiveDestination(action,src,ctx);assertArchiveDestinationOutsideSource(src,dest);dest=await writable(ctx,dest);await capture(ctx,dest);
      let cmd,args,cwd=path.dirname(src);
      if(action==="zip"){cmd="zip";args=["-r",dest,path.basename(src)];}
      else {cmd="tar";args=["-czf",dest,"--",path.basename(src)];}
      const r=await execCapture(cmd,args,{cwd,signal:ctx.signal,timeoutMs:300000,maxChars:ctx.cfg.maxToolOutputChars});if(r.code!==0)throw new Error(r.combined||`${cmd} exited ${r.code}`);return `${action} ok -> ${dest}\n${r.combined}`;
    }
    if(dest&&!within(ctx.cwd,dest))dest=await writable(ctx,a.destination);
    let cmd,args,cwd=ctx.cwd;
    if(action==="list_zip"){if(!(await which("unzip")))throw new Error("unzip not installed");cmd="unzip";args=["-l",src];}
    else if(action==="unzip"){if(!(await which("unzip")))throw new Error("unzip not installed");await validateArchive("unzip",src,ctx);dest=dest||path.resolve(ctx.cwd,path.basename(src,".zip"));dest=await writable(ctx,path.relative(ctx.cwd,dest));fs.mkdirSync(dest,{recursive:true});cmd="unzip";args=["-o",src,"-d",dest];}
    else {await validateArchive("untar_gz",src,ctx);dest=dest||path.resolve(ctx.cwd,path.basename(src).replace(/\.tar\.gz$|\.tgz$/,""));dest=await writable(ctx,path.relative(ctx.cwd,dest));fs.mkdirSync(dest,{recursive:true});cmd="tar";args=["-xzf",src,"-C",dest];}
    const r=await execCapture(cmd,args,{cwd,signal:ctx.signal,timeoutMs:300000,maxChars:ctx.cfg.maxToolOutputChars});if(r.code!==0)throw new Error(r.combined||`${cmd} exited ${r.code}`);return `${action} ok${dest?` -> ${dest}`:""}\n${r.combined}`;
  }
});
