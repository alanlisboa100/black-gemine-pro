import {providerAuthCandidates} from "../config/models.js";

const states=new WeakMap();
const metas=new WeakMap();

function rootState(cfg){
  let state=states.get(cfg);if(!state){state=new Map();states.set(cfg,state);}return state;
}
function metaOf(cfg){
  let meta=metas.get(cfg);
  if(!meta){
    const saved=Number(cfg.providers?.google?.googleKeyPool?.lastSuccessSlot||0);
    meta={lastSuccessSlot:Number.isInteger(saved)&&saved>=1&&saved<=4?saved:0};
    metas.set(cfg,meta);
  }
  return meta;
}
function dayStart(now){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now));}
function stateFor(cfg,id){
  const root=rootState(cfg);let state=root.get(id);
  if(!state){state={cooldownUntil:0,minuteStart:Date.now(),minuteRequests:0,minuteTokens:0,dayStart:dayStart(Date.now()),dayRequests:0,totalRequests:0,totalTokens:0,lastStatus:0,lastError:"",inFlight:0,totalLeases:0,lastLeaseAt:0};root.set(id,state);}return state;
}
function roll(state,now){
  if(now-state.minuteStart>=60000){state.minuteStart=now;state.minuteRequests=0;state.minuteTokens=0;}
  const ds=dayStart(now);if(state.dayStart!==ds){state.dayStart=ds;state.dayRequests=0;}
}
function identity(entry){return entry.env||`config:${entry.slot||1}`;}
function scopeId(entry,model){return `${identity(entry)}::${model||"*"}`;}
function globalId(entry){return `${identity(entry)}::*`;}
function delayFor(cfg,status,retryAfterMs=0){
  if(Number(retryAfterMs)>0)return Number(retryAfterMs);
  const c=cfg.providers?.google?.googleKeyPool?.cooldownMs||{};
  if(status===401||status===403)return Number(c.auth||600000);
  if(status===429)return Number(c.quota||60000);
  if(status===408||status===409||status===425||status>=500)return Number(c.server||15000);
  return 0;
}
function loadOf(cfg,entry,model,now=Date.now()){
  const global=stateFor(cfg,globalId(entry)),scoped=stateFor(cfg,scopeId(entry,model));roll(global,now);roll(scoped,now);
  return {global,scoped,inFlight:Math.max(global.inFlight||0,scoped.inFlight||0),available:global.cooldownUntil<=now&&scoped.cooldownUntil<=now};
}
function slotDistance(slot,preferred,max=4){
  const s=Number(slot)||1,p=Number(preferred)||1;
  return (s-p+max)%max;
}
export function googleKeyPreferredSlot(cfg,fallback=1){
  return metaOf(cfg).lastSuccessSlot||fallback||1;
}
export function googleKeyMayFailover(error){
  const message=String(error?.message||error||""),status=Number(error?.status||message.match(/HTTP\s+(\d{3})/)?.[1]||0);
  if(status)return status===401||status===403||status===408||status===409||status===425||status===429||status>=500;
  if(/cancelled by user|aborted by user/i.test(message))return false;
  return /timeout|timed out|fetch failed|network|socket|terminated|connection|econn|enotfound|eai_again|und_err/i.test(message);
}
export function googleKeyEntries(cfg,provider="google",model=""){
  const now=Date.now();return providerAuthCandidates(cfg,provider).filter(entry=>loadOf(cfg,entry,model,now).available);
}
export function googleKeyAcquire(cfg,provider="google",model="",{preferredSlot=1,excludeSlots=[]}={}){
  const now=Date.now(),excluded=new Set((excludeSlots||[]).map(Number));
  const sticky=googleKeyPreferredSlot(cfg,preferredSlot);
  const rows=providerAuthCandidates(cfg,provider).filter(entry=>!excluded.has(Number(entry.slot))).map(entry=>({entry,...loadOf(cfg,entry,model,now)})).filter(x=>x.available);
  rows.sort((a,b)=>a.inFlight-b.inFlight||slotDistance(a.entry.slot,sticky)-slotDistance(b.entry.slot,sticky)||a.entry.slot-b.entry.slot);
  const chosen=rows[0];if(!chosen)return null;
  chosen.global.inFlight=(chosen.global.inFlight||0)+1;chosen.scoped.inFlight=(chosen.scoped.inFlight||0)+1;chosen.global.totalLeases=(chosen.global.totalLeases||0)+1;chosen.scoped.totalLeases=(chosen.scoped.totalLeases||0)+1;chosen.global.lastLeaseAt=chosen.scoped.lastLeaseAt=now;
  let released=false;
  return {entry:chosen.entry,release(){if(released)return;released=true;chosen.global.inFlight=Math.max(0,(chosen.global.inFlight||0)-1);chosen.scoped.inFlight=Math.max(0,(chosen.scoped.inFlight||0)-1);}};
}
export function googleKeyFailure(cfg,entry,model,error){
  const status=Number(error?.status||String(error?.message||"").match(/HTTP\s+(\d{3})/)?.[1]||0),now=Date.now(),global=status===401,state=stateFor(cfg,global?globalId(entry):scopeId(entry,model));roll(state,now);
  const delay=delayFor(cfg,status,error?.retryAfterMs);if(delay>0)state.cooldownUntil=Math.max(state.cooldownUntil,now+delay);
  state.lastStatus=status;state.lastError=String(error?.message||error||"").slice(0,240);
}
export function googleKeySuccess(cfg,entry,model,usage={}){
  const now=Date.now(),state=stateFor(cfg,scopeId(entry,model));roll(state,now);
  const tokens=Number(usage.total_tokens||usage.totalTokenCount||0)||Number(usage.prompt_tokens||0)+Number(usage.completion_tokens||0);
  state.minuteRequests++;state.minuteTokens+=tokens;state.dayRequests++;state.totalRequests++;state.totalTokens+=tokens;state.lastStatus=200;state.lastError="";
  const meta=metaOf(cfg);meta.lastSuccessSlot=Number(entry.slot)||1;
  if(cfg.providers?.google?.googleKeyPool)cfg.providers.google.googleKeyPool.lastSuccessSlot=meta.lastSuccessSlot;
}
export function googleKeyStats(cfg,provider="google"){
  const now=Date.now();return providerAuthCandidates(cfg,provider).map(entry=>{
    const id=identity(entry),global=stateFor(cfg,globalId(entry));roll(global,now);
    const scoped=[];for(const [key,state] of rootState(cfg)){if(!key.startsWith(id+"::")||key.endsWith("::*"))continue;roll(state,now);scoped.push(state);}
    return {slot:entry.slot,env:entry.env,configured:true,cooling:global.cooldownUntil>now||scoped.some(s=>s.cooldownUntil>now),cooldownUntil:Math.max(global.cooldownUntil,...scoped.map(s=>s.cooldownUntil),0),inFlight:Math.max(global.inFlight||0,...scoped.map(s=>s.inFlight||0),0),leases:Math.max(global.totalLeases||0,...scoped.map(s=>s.totalLeases||0),0),rpm:scoped.reduce((n,s)=>n+s.minuteRequests,0),tpm:scoped.reduce((n,s)=>n+s.minuteTokens,0),rpd:scoped.reduce((n,s)=>n+s.dayRequests,0),totalRequests:scoped.reduce((n,s)=>n+s.totalRequests,0),totalTokens:scoped.reduce((n,s)=>n+s.totalTokens,0)};
  });
}
