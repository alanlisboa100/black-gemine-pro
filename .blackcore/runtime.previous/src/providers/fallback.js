import {parseModelRef} from "../config/models.js";

function uniqueCandidates(primary,cfg){
  const raw=[`${primary.provider}/${primary.model}`,...(cfg.fallbackModels||[])];
  const seen=new Set(),out=[];
  for(const ref of raw){
    const x=parseModelRef(ref,primary.provider);const key=`${x.provider}/${x.model}`;
    if(!x.model||seen.has(key))continue;
    if(x.provider!==primary.provider&&cfg.crossProviderFallback!==true)continue;
    seen.add(key);out.push(x);
  }
  return out;
}
function errorStatus(e){return Number(e?.status||String(e?.message||"").match(/HTTP\s+(\d{3})/)?.[1]||0);}
function mayFallback(e){
  const status=errorStatus(e);if(!status)return true;
  return status===401||status===403||status===408||status===409||status===425||status===429||status>=500;
}
function abortable(promise,signal){
  if(!signal)return promise;if(signal.aborted)return Promise.reject(signal.reason||new Error("aborted"));
  return new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason||new Error("aborted"));signal.addEventListener("abort",abort,{once:true});Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener("abort",abort));});
}
export class FallbackProvider{
  constructor(registry,cfg,provider,model,{onSwitch=null,requestFallback=null}={}){
    this.registry=registry;this.cfg=cfg;this.primary={provider,model};this.candidates=uniqueCandidates(this.primary,cfg);this.activeIndex=0;this.onSwitch=onSwitch;this.requestFallback=requestFallback;this.instances=new Map();
  }
  activeRef(){return this.candidates[this.activeIndex]||this.primary;}
  delegate(ref=this.activeRef()){const key=`${ref.provider}/${ref.model}`;if(!this.instances.has(key))this.instances.set(key,this.registry.create(ref.provider,ref.model));return this.instances.get(key);}
  modelInfo(){return this.delegate().modelInfo?.()||{context:128000};}
  normalizeMessages(provider,messages){if(typeof provider.normalizeHistory==="function")return provider.normalizeHistory(messages);return provider.constructor?.normalizeHistory?provider.constructor.normalizeHistory(messages):messages;}
  async chat(opts){
    let last;
    for(let i=this.activeIndex;i<this.candidates.length;i++){
      const ref=this.candidates[i],p=this.delegate(ref);
      try{
        const normalized=this.normalizeMessages(p,opts.messages),pending=p.chat({...opts,messages:normalized}),r=await abortable(pending,opts.signal);
        if(i!==this.activeIndex){this.activeIndex=i;this.onSwitch?.(ref,last);}
        return {...r,provider:r.provider||ref.provider,model:r.model||ref.model};
      }catch(e){
        last=e;if(opts.signal?.aborted)throw opts.signal.reason||e;
        if(!this.cfg.autoFallback||!mayFallback(e)||i===this.candidates.length-1)throw e;
        const next=this.candidates[i+1];
        // A fallback can use a different account, cost tier or model. It is
        // always a live user decision; an enabled fallback list only means the
        // candidate may be offered after the selected model has really failed.
        const approved=await this.requestFallback?.({from:ref,to:next,error:e});
        if(!approved){
          const denied=new Error(`Fallback from ${ref.provider}/${ref.model} to ${next.provider}/${next.model} was not approved. The selected model remains unchanged.`);
          denied.code="FALLBACK_NOT_APPROVED";denied.cause=e;throw denied;
        }
      }
    }
    throw last||new Error("all providers failed");
  }
}
