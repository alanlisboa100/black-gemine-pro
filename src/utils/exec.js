import {spawn} from "node:child_process";

export function execCapture(command,args=[],opts={}){
  const {cwd=process.cwd(),env=process.env,timeoutMs=60000,input,signal,maxChars=500000,shell=false,killTree=true,onStdout=null,onStderr=null}=opts;
  if(signal?.aborted)return Promise.reject(signal.reason||new Error("command cancelled"));
  return new Promise((resolve,reject)=>{
    const detached=killTree&&process.platform!=="win32";
    const cp=spawn(command,args,{cwd,env,stdio:["pipe","pipe","pipe"],shell,detached});
    let stdout="",stderr="",done=false,timer=null,killTimer=null,settleTimer=null,terminationError=null;
    const finish=(err,code=null)=>{
      if(done)return;done=true;
      if(timer)clearTimeout(timer);if(killTimer)clearTimeout(killTimer);if(settleTimer)clearTimeout(settleTimer);
      signal?.removeEventListener("abort",abort);
      if(err){try{cp.stdin?.destroy();}catch{}try{cp.stdout?.destroy();}catch{}try{cp.stderr?.destroy();}catch{}try{cp.unref?.();}catch{}}
      if(err)reject(err);else resolve({code,stdout,stderr,combined:stdout+(stderr?`\n[stderr]\n${stderr}`:"")});
    };
    const cap=(cur,d)=>{const next=cur+d.toString();return next.length>maxChars?next.slice(-maxChars):next;};
    cp.stdout.on("data",d=>{stdout=cap(stdout,d);try{onStdout?.(d);}catch{}});
    cp.stderr.on("data",d=>{stderr=cap(stderr,d);try{onStderr?.(d);}catch{}});
    cp.on("error",e=>finish(terminationError||e));cp.on("close",code=>finish(terminationError,code));
    const signalProcess=kind=>{
      let sent=false;
      if(detached&&cp.pid){try{process.kill(-cp.pid,kind);sent=true;}catch{}}
      if(!sent){try{cp.kill(kind);sent=true;}catch{}}
      return sent;
    };
    const terminate=reason=>{
      if(done||terminationError)return;
      terminationError=reason instanceof Error?reason:new Error(String(reason||"command cancelled"));
      signalProcess("SIGTERM");
      killTimer=setTimeout(()=>{
        signalProcess("SIGKILL");
        // Some Android shells keep inherited pipe descriptors open even after
        // their wrapper exits. Cancellation must still settle promptly.
        settleTimer=setTimeout(()=>finish(terminationError),350);settleTimer.unref?.();
      },500);killTimer.unref?.();
    };
    const abort=()=>terminate(signal?.reason||new Error("command cancelled"));
    if(signal){if(signal.aborted)abort();else signal.addEventListener("abort",abort,{once:true});}
    if(timeoutMs>0){timer=setTimeout(()=>terminate(new Error(`command timed out after ${timeoutMs}ms`)),timeoutMs);timer.unref?.();}
    if(input!=null)cp.stdin.end(input);else cp.stdin.end();
  });
}
const WHICH_CACHE=new Map();
export function clearWhichCache(){WHICH_CACHE.clear();}
export async function which(name,{ttlMs=30000}={}){
  const n=String(name||"");
  if(!/^[A-Za-z0-9._+:-]+$/.test(n))return null;
  const key=`${process.env.PATH||""}\0${n}`,now=Date.now(),hit=WHICH_CACHE.get(key);
  if(hit&&now-hit.at<(hit.value?ttlMs:Math.min(ttlMs,3000)))return hit.value;
  let value=null;
  try{const r=await execCapture("sh",["-c",`command -v ${n}`],{timeoutMs:2500});value=r.code===0?r.stdout.trim():null;}catch{}
  WHICH_CACHE.set(key,{at:now,value});return value;
}
