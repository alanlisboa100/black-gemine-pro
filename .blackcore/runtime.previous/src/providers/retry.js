export function sleep(ms,signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(signal.reason||new Error("aborted"));
    const t=setTimeout(resolve,ms);signal?.addEventListener("abort",()=>{clearTimeout(t);reject(signal.reason||new Error("aborted"));},{once:true});
  });
}
export function retryable(status){return status===408||status===409||status===429||status>=500;}
export function backoff(attempt,cfg){
  const base=cfg?.baseDelayMs??800,max=cfg?.maxDelayMs??10000;
  const jitter=0.8+Math.random()*0.4;return Math.min(max,base*2**Math.max(0,attempt-1))*jitter;
}
