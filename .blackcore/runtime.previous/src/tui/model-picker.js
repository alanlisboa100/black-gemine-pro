import {listModels} from "../config/models.js";
import {reasoningLevels,reasoningProfile,currentReasoning,setReasoning,syncReasoningToCurrent} from "../config/reasoning.js";
import {selectMenu} from "./select-menu.js";

const PROVIDERS={
  openai:{label:"OpenAI",icon:"✦",description:"Primary BLACKCORE models · GPT-5.6 Sol, Terra and Luna · official Responses API."},
  deepseek:{label:"DeepSeek",icon:"◆",description:"V4 Flash and V4 Pro · economical alternatives for coding and agents."},
  google:{label:"Google AI Studio",icon:"✧",description:"Curated free models + resilient Google pool · 4-key context handoff + parallel agent leases."},
  local:{label:"Local AI",icon:"◇",description:"llama.cpp on your own device · OpenAI-compatible endpoint · no API key required."}
};

function money(v){return Number.isFinite(v)?`$${v.toFixed(v<0.1?3:2)}`:"?";}
function price(m){if(m.freeTier)return"FREE TIER · quotas apply";const p=m.pricing;if(!p)return"";return `${money(p.input)}/M in · ${money(p.output)}/M out`;}
function contextLabel(n){if(!Number.isFinite(n))return"context ?";if(n>=1_000_000)return`${(n/1_000_000).toFixed(n%1_000_000?1:0)}M ctx`;if(n>=1000)return`${Math.round(n/1000)}K ctx`;return`${n} ctx`;}
function desc(m){
  if(m.id==="deepseek-v4-flash")return"Fast, economical and capable for coding and agent work.";
  if(m.id==="deepseek-v4-pro")return"Architecture, difficult debugging and long agentic work.";
  if(m.provider==="openai"){
    if(m.id==="gpt-5.6-sol")return"Best quality for complex engineering and critical work.";
    if(m.id==="gpt-5.6-terra")return"Balanced quality, latency and cost for production work.";
    if(m.id==="gpt-5.6-luna")return"High-volume coding and agent work at the lowest direct OpenAI cost.";
  }
  if(m.provider==="google"){
    if(m.id==="google-free-pool")return"Trio Supremo FREE Pool: cascata automática de alta performance (Gemini 3.8 Flash → 3.7 Flash → 3.6 Flash) sem interrupção de sessão.";
    if(m.id==="gemini-3.8-flash")return"Latest generation Gemini 3.8 Flash for advanced reasoning, agentic coding and fast execution.";
    if(m.id==="gemini-3.7-flash")return"Latest stable Gemini Flash for complex coding, agentic workflows and multi-step execution.";
    if(m.id==="gemini-3.5-flash-lite")return"Primary high-volume free-tier workhorse for coding, subagents and long sessions.";
    if(m.id==="gemini-3.1-flash-lite")return"Second high-volume Flash-Lite pool member with tools, vision and 1M context.";
    if(m.id==="gemma-4-31b-it")return"Strong open Gemma 4 model for coding/reasoning; native Gemini API, 256K context.";
    if(m.id==="gemma-4-26b-a4b-it")return"Fast MoE Gemma 4 fallback for high-volume work; native Gemini API, 256K context.";
    if(m.id==="gemini-3.6-flash")return"Strongest curated Gemini Flash here for harder coding and agentic work.";
    if(m.id==="gemini-3.6-flash")return"Reliable 1M-context fallback with tools, vision and optional thinking.";
  }
  return m.description||"Model configured in BLACKCORE.";
}
function reasoningSubtitle(m){
  if(m.id.startsWith("deepseek-v4-"))return"DeepSeek V4 · Off, High or Max.";
  if(["gpt-5.6-sol","gpt-5.6-terra","gpt-5.6-luna"].includes(m.id)&&m.provider==="openai")return"Official GPT-5.6 · None, Low, Medium, High, XHigh or Max.";
  if(m.provider==="google"&&m.id.startsWith("gemini-3"))return"Google Gemini 3 · Minimal, Low, Medium or High.";
  if(m.provider==="google"&&m.id.startsWith("gemini-2.5-"))return"Google Gemini 2.5 · None, Low, Medium or High.";
  if(m.provider==="google"&&m.id.startsWith("gemma-4-"))return"Google Gemma 4 · Minimal or High thinking.";
  return"This model uses the provider default configuration.";
}
function providerGroups(cfg){
  const groups=new Map();
  for(const m of listModels(cfg)){if(!groups.has(m.provider))groups.set(m.provider,[]);groups.get(m.provider).push(m);}
  return [...groups.entries()].filter(([,models])=>models.length).map(([id,models])=>({id,models,meta:PROVIDERS[id]||{label:id,icon:"◇",description:"Provider configured in BLACKCORE."}}));
}
function providerSubtitle(id){
  if(id==="deepseek")return"DeepSeek API · choose Flash or Pro.";
  if(id==="openai")return"OPENAI_API_KEY · official Responses API with native reasoning levels.";
  if(id==="google")return"Up to 4 Google AI Studio keys · seamless context handoff · safe parallel workers · per-key cooldown · Free Pool stays inside Google.";
  if(id==="local")return"Local GGUF through llama.cpp · keeps cloud providers and keys unchanged.";
  return"Choose a model.";
}

export async function pickModelAndEffort(app){
  const {runtime,input,agent}=app,{cfg}=runtime,groups=providerGroups(cfg),currentGroup=Math.max(0,groups.findIndex(g=>g.id===agent.provider));
  const providerItems=groups.map(g=>({value:g,label:`${g.meta.icon}  ${g.meta.label}`,badge:g.id===agent.provider?"CURRENT":"",description:`${g.models.length} ${g.models.length===1?"model":"models"} · ${g.meta.description}`}));
  const providerPick=await selectMenu(input,"Choose AI Provider",providerItems,{subtitle:"Choose a provider, then select its model and reasoning level.",selectedIndex:currentGroup,footer:"↑↓ navigate   Enter open   Esc back",accent:"provider"});
  if(!providerPick)return null;
  const group=providerPick.item.value,currentModel=Math.max(0,group.models.findIndex(m=>m.provider===agent.provider&&m.id===agent.model));
  const modelItems=group.models.map(m=>({value:m,label:m.label||m.id,badge:m.provider===agent.provider&&m.id===agent.model?"CURRENT":"",description:[contextLabel(m.context),price(m),desc(m)].filter(Boolean).join(" · ")}));
  const modelPick=await selectMenu(input,`${group.meta.label} Models`,modelItems,{subtitle:providerSubtitle(group.id),selectedIndex:currentModel,footer:"↑↓ navigate   Enter select   Esc back",accent:group.id});
  if(!modelPick)return null;
  const m=modelPick.item.value,levels=reasoningLevels(m.id),cur=currentReasoning(cfg,m.provider,m.id);let chosen=cur;
  if(levels.length){
    const idx=Math.max(0,levels.findIndex(x=>x.id===cur.id)),def=reasoningProfile(m.id)?.default;
    const second=await selectMenu(input,`Reasoning · ${m.label||m.id}`,levels.map(x=>({value:x,label:x.label,badge:[x.id===def?"DEFAULT":"",x.id===cur.id?"CURRENT":""].filter(Boolean).join(" · "),description:x.description})),{subtitle:reasoningSubtitle(m),selectedIndex:idx,footer:"↑↓ navigate   Enter confirm   Esc back",accent:group.id});
    if(!second)return null;chosen=second.item.value;setReasoning(cfg,m.provider,m.id,chosen.id);
  }
  agent.setModel(m.provider,m.id);cfg.provider=m.provider;cfg.model=m.id;cfg.modelLock=true;cfg.autoRoute=false;cfg.autoFallback=false;agent.routeLockOnce=true;syncReasoningToCurrent(cfg,m.provider,m.id);runtime.saveConfig();
  return {provider:group.id,model:m,reasoning:chosen};
}

export function modelPickerPreview(cfg,currentProvider="deepseek"){return providerGroups(cfg).map(g=>({provider:g.id,label:g.meta.label,count:g.models.length,current:g.id===currentProvider,models:g.models.map(m=>m.id)}));}
