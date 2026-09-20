import {listModels} from "../config/models.js";

function classifyTask(text=""){
  const t=text.toLowerCase();
  if(/\b(architect|architecture|arquitetura|refactor|refator|migration|migracao|security|seguranca|race condition|complex|complexo|hard|dificil|deep analysis|analise profunda|projeto inteiro|reestrutur)\w*/.test(t))return"hard";
  if(/\b(fix|corrig|arrum|build|implement|cria|create|deploy|public|test|teste|debug|expo|vercel|android|apk)\w*/.test(t))return"work";
  return"fast";
}
export function routeModel(cfg,text,{currentProvider,currentModel}={}){
  if(cfg.modelLock!==false)return {provider:currentProvider||cfg.provider,model:currentModel||cfg.model,reason:"model locked"};
  if(!cfg.autoRoute)return {provider:currentProvider||cfg.provider,model:currentModel||cfg.model,reason:"autoRoute disabled"};
  const kind=classifyTask(text),models=listModels(cfg);
  const preferred=kind==="hard"?["gpt-5.6-sol","gpt-5.6-terra","deepseek-v4-pro"]:kind==="work"?["gpt-5.6-luna","gpt-5.6-terra","deepseek-v4-flash"]:["gpt-5.6-luna","gemini-3.5-flash-lite","deepseek-v4-flash"];
  for(const id of preferred){const m=models.find(x=>x.id===id);if(m)return {provider:m.provider,model:m.id,reason:`task=${kind}`};}
  return {provider:currentProvider||cfg.provider,model:currentModel||cfg.model,reason:"fallback"};
}
