import {getSecret} from "./loader.js";

export function listModels(cfg){
  const out=[];
  for(const [provider,p] of Object.entries(cfg.providers||{})){
    for(const m of p.models||[])out.push({provider,...m});
  }
  return out;
}
export function findModel(cfg,provider,id){
  const p=cfg.providers?.[provider];if(!p)return null;
  const m=(p.models||[]).find(x=>x.id===id)||{id,label:id,context:128000,tools:true};
  return {provider,providerConfig:p,...m};
}
export function providerAuthCandidates(cfg,provider){
  const p=cfg.providers?.[provider];if(!p)return [];
  const out=[];
  if(p.apiKey)out.push({key:p.apiKey,source:"configuration",env:null,slot:1});
  const envs=Array.isArray(p.apiKeyEnvs)&&p.apiKeyEnvs.length?p.apiKeyEnvs:(p.apiKeyEnv?[p.apiKeyEnv]:[]);
  for(let i=0;i<envs.length;i++){
    const env=envs[i],key=getSecret(env);if(!key)continue;
    out.push({key,source:env,env,slot:i+1});
  }
  const seen=new Set(),unique=out.filter(x=>{if(seen.has(x.key))return false;seen.add(x.key);return true;});
  const max=Number(p.googleKeyPool?.maxKeys||0);return max>0?unique.slice(0,max):unique;
}
export function providerAuth(cfg,provider){
  return providerAuthCandidates(cfg,provider)[0]?.key||null;
}
export function parseModelRef(input,defaultProvider){
  const s=String(input||"");const i=s.indexOf("/");
  return i>0?{provider:s.slice(0,i),model:s.slice(i+1)}:{provider:defaultProvider,model:s};
}
