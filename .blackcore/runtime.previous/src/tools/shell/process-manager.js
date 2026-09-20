import {spawn} from "node:child_process";
import {shortId} from "../../utils/id.js";

function signalItem(item,signal="SIGTERM"){
  if(!item?.running)return false;
  let sent=false;
  // POSIX: each managed process owns a process group so children created by
  // shells/dev servers are terminated together, not only the wrapper shell.
  if(process.platform!=="win32"&&item.detached&&item.pid){
    try{process.kill(-item.pid,signal);sent=true;}catch{}
  }
  if(!sent){try{item.cp.kill(signal);sent=true;}catch{}}
  return sent;
}
function releaseHandles(item){
  try{item.cp.stdout?.destroy();}catch{}
  try{item.cp.stderr?.destroy();}catch{}
  try{item.cp.unref?.();}catch{}
}

export class ProcessManager{
  constructor(){this.items=new Map();}
  start(command,cwd,env=process.env){
    const id=shortId("p_"),detached=process.platform!=="win32";
    const cp=spawn(process.env.SHELL||"sh",["-c",command],{cwd,env,stdio:["ignore","pipe","pipe"],detached});
    const item={id,command,cwd,pid:cp.pid,startedAt:Date.now(),running:true,code:null,signal:null,stdout:"",stderr:"",cp,detached};
    const cap=(k,d)=>{item[k]=(item[k]+d.toString()).slice(-300000);};
    cp.stdout.on("data",d=>cap("stdout",d));cp.stderr.on("data",d=>cap("stderr",d));
    cp.on("close",(code,signal)=>{item.running=false;item.code=code;item.signal=signal;releaseHandles(item);});
    this.items.set(id,item);return id;
  }
  get(id){const x=this.items.get(id);if(!x)throw new Error("process not found");return x;}
  poll(id,tailChars=20000){const x=this.get(id);return {id:x.id,command:x.command,pid:x.pid,running:x.running,code:x.code,signal:x.signal,ageMs:Date.now()-x.startedAt,stdout:x.stdout.slice(-tailChars),stderr:x.stderr.slice(-tailChars)};}
  list(){return [...this.items.values()].map(x=>({id:x.id,command:x.command,pid:x.pid,running:x.running,code:x.code,ageMs:Date.now()-x.startedAt}));}
  kill(id){const x=this.get(id);if(!x.running)return `process ${id} already exited`;signalItem(x,"SIGTERM");releaseHandles(x);const t=setTimeout(()=>{if(x.running){signalItem(x,"SIGKILL");releaseHandles(x);}},1200);t.unref?.();return `termination requested for ${id}`;}
  killAll(){for(const x of this.items.values())if(x.running){signalItem(x,"SIGTERM");releaseHandles(x);const t=setTimeout(()=>{if(x.running){signalItem(x,"SIGKILL");releaseHandles(x);}},1200);t.unref?.();}}
}
