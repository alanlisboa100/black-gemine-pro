const DEFINITIONS={
  "deepseek-v4-flash":{
    default:"high",
    levels:[
      {id:"off",label:"Off",description:"Fastest response; thinking disabled.",thinking:false},
      {id:"high",label:"High",description:"Balanced speed and depth (default).",thinking:true,apiEffort:"high"},
      {id:"max",label:"Max",description:"Maximum native reasoning for difficult tasks and agents.",thinking:true,apiEffort:"max"}
    ]
  },
  "deepseek-v4-pro":{
    default:"high",
    levels:[
      {id:"off",label:"Off",description:"Fastest response; thinking disabled.",thinking:false},
      {id:"high",label:"High",description:"Strong reasoning for daily coding (default).",thinking:true,apiEffort:"high"},
      {id:"max",label:"Max",description:"Maximum native reasoning for architecture and complex debugging.",thinking:true,apiEffort:"max"}
    ]
  },
  "gpt-5.6-sol":openAI56Profile("high","Deep reasoning for complex engineering (default)."),
  "gpt-5.6-terra":openAI56Profile("high","Deep reasoning for complex engineering (default)."),
  "gpt-5.6-luna":openAI56Profile("medium","Cost/quality balance for everyday coding (default)."),
  "gemini-3.8-flash":gemini3Profile("high"),
  "gemini-3.7-flash":gemini3Profile("high"),
  "gemini-3.6-flash":gemini3Profile("medium"),
  "gemini-3.5-flash-lite":gemini3Profile("minimal"),
  "gemini-3.1-flash-lite":gemini3Profile("minimal"),
  "gemini-2.5-flash":gemini25Profile({allowNone:true,defaultLevel:"medium"}),
  "gemma-4-31b-it":gemma4Profile("minimal"),
  "gemma-4-26b-a4b-it":gemma4Profile("minimal")
};

function gemini3Profile(defaultLevel="medium"){
  return {default:defaultLevel,levels:[
    {id:"minimal",label:"Minimal",description:"Lowest supported Gemini 3 reasoning effort.",thinking:true,apiEffort:"minimal"},
    {id:"low",label:"Low",description:"Light reasoning for fast everyday work.",thinking:true,apiEffort:"low"},
    {id:"medium",label:"Medium",description:"Balanced Gemini reasoning (default).",thinking:true,apiEffort:"medium"},
    {id:"high",label:"High",description:"Deep Gemini reasoning for coding and agent work.",thinking:true,apiEffort:"high"}
  ]};
}

function gemini25Profile({allowNone=false,defaultLevel="medium"}={}){
  const levels=[];
  if(allowNone)levels.push({id:"none",label:"None",description:"Disable thinking for the fastest response.",thinking:false,apiEffort:"none"});
  levels.push(
    {id:"low",label:"Low",description:"Low Gemini 2.5 thinking budget.",thinking:true,apiEffort:"low"},
    {id:"medium",label:"Medium",description:"Balanced Gemini 2.5 thinking budget.",thinking:true,apiEffort:"medium"},
    {id:"high",label:"High",description:"High Gemini 2.5 thinking budget for hard tasks.",thinking:true,apiEffort:"high"}
  );
  return {default:defaultLevel,levels};
}

function gemma4Profile(defaultLevel="minimal"){
  return {default:defaultLevel,levels:[
    {id:"minimal",label:"Minimal",description:"Gemma 4 thinking minimized for high-volume work.",thinking:true,apiEffort:"minimal"},
    {id:"high",label:"High",description:"Gemma 4 thinking enabled for harder coding and reasoning.",thinking:true,apiEffort:"high"}
  ]};
}

function openAI56Profile(defaultLevel,defaultDescription){
  return {default:defaultLevel,levels:[
    {id:"none",label:"None",description:"Direct response with no reasoning effort.",thinking:false,apiEffort:"none"},
    {id:"low",label:"Low",description:"Fast, lightweight reasoning.",thinking:true,apiEffort:"low"},
    {id:"medium",label:"Medium",description:"Balanced reasoning for everyday coding.",thinking:true,apiEffort:"medium"},
    {id:"high",label:"High",description:defaultDescription,thinking:true,apiEffort:"high"},
    {id:"xhigh",label:"XHigh",description:"Very deep reasoning for difficult investigations.",thinking:true,apiEffort:"xhigh"},
    {id:"max",label:"Max",description:"Maximum available reasoning effort.",thinking:true,apiEffort:"max"}
  ]};
}

export function reasoningProfile(model){return DEFINITIONS[model]||null;}
export function reasoningLevels(model){return reasoningProfile(model)?.levels||[];}
export function modelRef(provider,model){return `${provider}/${model}`;}

export function currentReasoning(cfg,provider,model){
  const profile=reasoningProfile(model);if(!profile)return {id:"default",label:"Default",description:"Provider default configuration.",thinking:cfg.thinking!==false};
  const saved=cfg.modelReasoning?.[modelRef(provider,model)];
  let id=saved;const hasPerModel=cfg.modelReasoning&&Object.keys(cfg.modelReasoning).length>0;
  if(!id&&(!hasPerModel||(provider===cfg.provider&&model===cfg.model))){
    if(model.startsWith("deepseek-v4-"))id=cfg.thinking===false?"off":cfg.reasoningEffort==="max"?"max":"high";
    else if(["gpt-5.6-sol","gpt-5.6-terra","gpt-5.6-luna"].includes(model))id=["none","low","medium","high","xhigh","max"].includes(cfg.reasoningEffort)?cfg.reasoningEffort:profile.default;
    else if(model.startsWith("gemini-3"))id=["minimal","low","medium","high"].includes(cfg.reasoningEffort)?cfg.reasoningEffort:profile.default;
    else if(model.startsWith("gemini-2.5-"))id=["none","low","medium","high"].includes(cfg.reasoningEffort)?cfg.reasoningEffort:profile.default;
    else if(model.startsWith("gemma-4-"))id=["minimal","high"].includes(cfg.reasoningEffort)?cfg.reasoningEffort:profile.default;
  }
  return profile.levels.find(x=>x.id===id)||profile.levels.find(x=>x.id===profile.default)||profile.levels[0];
}

export function setReasoning(cfg,provider,model,levelId){
  const profile=reasoningProfile(model);if(!profile)return null;
  const level=profile.levels.find(x=>x.id===levelId);if(!level)return null;
  cfg.modelReasoning??={};cfg.modelReasoning[modelRef(provider,model)]=level.id;
  if(provider===cfg.provider&&model===cfg.model){cfg.thinking=level.thinking!==false;cfg.reasoningEffort=level.apiEffort||level.id;}
  return level;
}

export function syncReasoningToCurrent(cfg,provider,model){
  const level=currentReasoning(cfg,provider,model);cfg.thinking=level.thinking!==false;cfg.reasoningEffort=level.apiEffort||level.id;return level;
}

export function resolveReasoning(cfg,provider,model,input){
  const profile=reasoningProfile(model);if(!profile)return null;
  const t=String(input||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const direct=profile.levels.find(x=>x.id===t||x.label.toLowerCase()===t);if(direct)return direct;
  if(/^(?:off|none|sem|desliga|desligado|rapido sem pensar)$/.test(t))return profile.levels.find(x=>x.id==="off")||profile.levels.find(x=>x.id==="none")||profile.levels[0];
  if(/^(?:minimal|minimo|minima)$/.test(t))return profile.levels.find(x=>x.id==="minimal")||profile.levels[0];
  if(/^(?:low|baixo|leve|fast)$/.test(t))return profile.levels.find(x=>x.id==="low")||profile.levels.find(x=>x.id==="minimal")||profile.levels.find(x=>x.id==="off")||profile.levels.find(x=>x.id==="none")||profile.levels[0];
  if(/^(?:medium|medio|balanced|balanceado|normal|standard|padrao)$/.test(t))return profile.levels.find(x=>x.id==="medium")||profile.levels.find(x=>x.id==="high")||profile.levels.at(-1);
  if(/^(?:high|alto|forte)$/.test(t))return profile.levels.find(x=>x.id==="high")||profile.levels.at(-1);
  if(/^(?:xhigh|extra high|extra-high)$/.test(t))return profile.levels.find(x=>x.id==="xhigh")||profile.levels.find(x=>x.id==="max")||profile.levels.find(x=>x.id==="high")||profile.levels.at(-1);
  if(/^(?:max|maximo|maxima|ultra)$/.test(t))return profile.levels.find(x=>x.id==="max")||profile.levels.find(x=>x.id==="xhigh")||profile.levels.find(x=>x.id==="high")||profile.levels.at(-1);
  if(/^(?:on|ligado|ativa|ativado)$/.test(t))return profile.levels.find(x=>x.id==="high")||profile.levels.at(-1);
  return null;
}

export function modelReasoningSummary(cfg,provider,model){const x=currentReasoning(cfg,provider,model);return x.label||x.id;}

export function deepSeekReasoningBody(cfg,provider,model){
  const level=currentReasoning(cfg,provider,model);if(level.id==="off")return {thinking:{type:"disabled"}};return {thinking:{type:"enabled"},reasoning_effort:level.apiEffort||"high"};
}

export function openAIReasoningBody(cfg,provider,model){
  const level=currentReasoning(cfg,provider,model);return {reasoning:{effort:level.apiEffort||"medium"}};
}

export function googleReasoningBody(cfg,provider,model){
  const profile=reasoningProfile(model);if(!profile)return {};
  const level=currentReasoning(cfg,provider,model);
  return level.apiEffort?{reasoning_effort:level.apiEffort}:{};
}
