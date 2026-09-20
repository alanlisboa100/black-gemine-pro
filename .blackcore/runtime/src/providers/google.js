import {OpenAIProvider} from "./openai.js";
import {googleReasoningBody} from "../config/reasoning.js";
import {findModel,providerAuthCandidates} from "../config/models.js";
import {chatGemmaNative} from "./google-native.js";
import {googleKeyAcquire,googleKeyFailure,googleKeyMayFailover,googleKeyPreferredSlot,googleKeySuccess} from "./google-keys.js";

const POOL_ID="google-free-pool";
const DEFAULT_POOL=["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash","gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemma-4-31b-it","gemma-4-26b-a4b-it","gemini-3.6-flash"];
function isGemma(model=""){return String(model).startsWith("gemma-4-");}
function errorStatus(e){return Number(e?.status||String(e?.message||"").match(/HTTP\s+(\d{3})/)?.[1]||0);}
function poolMayAdvance(e){const status=errorStatus(e);return googleKeyMayFailover(e)||status===404;}
function poolList(cfg,provider){
  const pcfg=cfg.providers?.[provider]||{},configured=new Set((pcfg.models||[]).map(x=>x.id));
  return (pcfg.freePoolModels||DEFAULT_POOL).filter(id=>id!==POOL_ID&&configured.has(id));
}
function cfgWithKey(cfg,provider,key){
  return {...cfg,providers:{...(cfg.providers||{}),[provider]:{...(cfg.providers?.[provider]||{}),apiKey:key}}};
}
export class GoogleProvider extends OpenAIProvider{
  constructor(cfg,provider,model){
    super(cfg,provider,model);
    this.poolIndex=0;this.poolActiveModel=null;
    this.activeKeySlot=googleKeyPreferredSlot(cfg,1);
    this.poolActiveKeySlot=this.activeKeySlot;
  }
  modelInfo(){if(this.model===POOL_ID&&this.poolActiveModel)return findModel(this.cfg,this.provider,this.poolActiveModel);return super.modelInfo();}
  async directChatOnKey(model,opts,cfg,entry){
    const keyed=cfgWithKey(cfg,this.provider,entry.key);
    if(isGemma(model))return chatGemmaNative(keyed,this.provider,model,opts);
    const p=new OpenAIProvider(keyed,this.provider,model),extraBody={...(opts.extraBody||{}),...googleReasoningBody(keyed,this.provider,model)};
    return p.chat({...opts,extraBody});
  }
  attemptOptions(opts,multiKey){
    if(!multiKey||!opts.stream||this.cfg.providers?.google?.googleKeyPool?.handoffSafeStreaming===false)return {opts,emitted(){return false;}};
    let visible=false;
    return {
      opts:{...opts,onText:chunk=>{visible=true;opts.onText?.(chunk);},onReasoning:chunk=>{visible=true;opts.onReasoning?.(chunk);}},
      emitted(){return visible;}
    };
  }
  async keyedChat(model,opts,cfg=this.cfg){
    const candidates=providerAuthCandidates(this.cfg,this.provider);if(!candidates.length)throw new Error(`Missing API key for ${this.provider}`);
    const tried=[],multiKey=candidates.length>1;let last;
    for(let attempt=0;attempt<candidates.length;attempt++){
      const lease=googleKeyAcquire(this.cfg,this.provider,model,{preferredSlot:this.activeKeySlot,excludeSlots:tried});
      if(!lease)break;const entry=lease.entry;tried.push(entry.slot);const buffered=this.attemptOptions(opts,multiKey);
      try{
        const out=await this.directChatOnKey(model,buffered.opts,cfg,entry);googleKeySuccess(this.cfg,entry,model,out.usage||{});this.activeKeySlot=entry.slot;this.poolActiveKeySlot=entry.slot;
        return {...out,googleKeySlot:entry.slot,googleKeyEnv:entry.env||null,googleKeyHandoffCount:Math.max(0,tried.length-1)};
      }catch(e){
        last=e;if(!googleKeyMayFailover(e))throw e;googleKeyFailure(this.cfg,entry,model,e);
        // Once any streamed text became visible, replaying the request on a new
        // credential would duplicate/corrupt the answer. Fail over only while
        // the attempt is still silent (the common quota/auth/server-error case).
        if(buffered.emitted())throw e;
      }finally{lease.release();}
    }
    if(last)throw last;const e=new Error(`Google key pool cooling down for ${model}; no configured key is currently available`);e.status=429;throw e;
  }
  async directChat(model,opts,cfg=this.cfg){return this.keyedChat(model,opts,cfg);}
  async freePoolChat(opts){
    const pool=poolList(this.cfg,this.provider);if(!pool.length)throw new Error("Google Free Pool has no configured free-tier models");let last;
    for(let i=this.poolIndex;i<pool.length;i++){
      const model=pool[i],fastCfg={...this.cfg,retry:{...(this.cfg.retry||{}),maxAttempts:1}};
      try{
        const out=await this.keyedChat(model,opts,fastCfg);this.poolIndex=i;this.poolActiveModel=model;
        return {...out,provider:this.provider,model,pool:true,poolSelected:model,poolKeySlot:out.googleKeySlot};
      }catch(e){last=e;if(!poolMayAdvance(e)||i===pool.length-1)throw e;this.poolIndex=i+1;this.poolActiveModel=pool[i+1]||null;}
    }
    throw last||new Error("Google Free Pool exhausted");
  }
  async chat(opts){
    if(this.model===POOL_ID)return this.freePoolChat(opts);
    const fastCfg={...this.cfg,retry:{...(this.cfg.retry||{}),maxAttempts:1}};
    return this.keyedChat(this.model,opts,fastCfg);
  }
}
export {POOL_ID as GOOGLE_FREE_POOL_ID,DEFAULT_POOL as GOOGLE_FREE_POOL_MODELS};
