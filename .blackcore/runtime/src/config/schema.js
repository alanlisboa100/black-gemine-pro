const TYPES={string:v=>typeof v==="string",boolean:v=>typeof v==="boolean",number:v=>typeof v==="number"&&Number.isFinite(v),object:v=>v&&typeof v==="object"&&!Array.isArray(v),array:Array.isArray};

function issue(path,message){return {path:path.join("."),message};}
export function validateConfig(cfg){
  const issues=[];
  if(!TYPES.object(cfg))return {ok:false,issues:[issue([],"config must be an object")]};
  for(const [k,t] of [["provider","string"],["model","string"],["mode","string"],["permissionProfile","string"]]){
    if(!TYPES[t](cfg[k]))issues.push(issue([k],`must be ${t}`));
  }
  if(!["PLAN","ACT"].includes(cfg.mode))issues.push(issue(["mode"],"must be PLAN or ACT"));
  if(!["safe","balanced","yolo"].includes(cfg.permissionProfile))issues.push(issue(["permissionProfile"],"must be safe, balanced, or yolo"));
  if(cfg.workStyle!=null&&!["adaptive","fast","standard","deep"].includes(cfg.workStyle))issues.push(issue(["workStyle"],"must be adaptive, fast, standard, or deep"));
  if(cfg.uiLanguage!=null&&!['en'].includes(cfg.uiLanguage))issues.push(issue(["uiLanguage"],"must be en"));
  if(cfg.responseLanguage!=null&&!['auto','en','pt-BR'].includes(cfg.responseLanguage))issues.push(issue(["responseLanguage"],"must be auto, en, or pt-BR"));
  if(cfg.translateUserInput!=null&&!TYPES.boolean(cfg.translateUserInput))issues.push(issue(["translateUserInput"],"must be boolean"));
  if(cfg.agentRepairCycles!=null&&(!Number.isInteger(cfg.agentRepairCycles)||cfg.agentRepairCycles<0||cfg.agentRepairCycles>6))issues.push(issue(["agentRepairCycles"],"must be an integer from 0 to 6"));
  if(cfg.agentTeamMode!=null&&!['off','deep'].includes(cfg.agentTeamMode))issues.push(issue(["agentTeamMode"],"must be off or deep"));
  if(cfg.agentTaskGraphMode!=null&&!['off','adaptive'].includes(cfg.agentTaskGraphMode))issues.push(issue(["agentTaskGraphMode"],"must be off or adaptive"));
  if(cfg.maxParallelAgents!=null&&(!Number.isInteger(cfg.maxParallelAgents)||cfg.maxParallelAgents<1||cfg.maxParallelAgents>6))issues.push(issue(["maxParallelAgents"],"must be an integer from 1 to 6"));
  if(cfg.agentTeamTurns!=null&&!TYPES.object(cfg.agentTeamTurns))issues.push(issue(["agentTeamTurns"],"must be object"));
  if(cfg.agentTaskBudget!=null){
    if(!TYPES.object(cfg.agentTaskBudget))issues.push(issue(["agentTaskBudget"],"must be object"));
    else {
      if(cfg.agentTaskBudget.enabled!=null&&!TYPES.boolean(cfg.agentTaskBudget.enabled))issues.push(issue(["agentTaskBudget","enabled"],"must be boolean"));
      for(const key of ["maxInputTokens","maxOutputTokens","maxTotalTokens","maxCostUSD","warnRatio"])if(cfg.agentTaskBudget[key]!=null&&(!TYPES.number(cfg.agentTaskBudget[key])||cfg.agentTaskBudget[key]<0))issues.push(issue(["agentTaskBudget",key],"must be a non-negative number"));
      if(cfg.agentTaskBudget.warnRatio!=null&&(cfg.agentTaskBudget.warnRatio<0.1||cfg.agentTaskBudget.warnRatio>=1))issues.push(issue(["agentTaskBudget","warnRatio"],"must be >= 0.1 and < 1"));
    }
  }
  if(cfg.maxAgentToolCalls!=null&&(!Number.isInteger(cfg.maxAgentToolCalls)||cfg.maxAgentToolCalls<1))issues.push(issue(["maxAgentToolCalls"],"must be a positive integer"));
  if(cfg.maxAgentWallMs!=null&&(!Number.isInteger(cfg.maxAgentWallMs)||cfg.maxAgentWallMs<1000))issues.push(issue(["maxAgentWallMs"],"must be an integer >= 1000"));
  if(cfg.semanticRouting!=null){
    if(!TYPES.object(cfg.semanticRouting))issues.push(issue(["semanticRouting"],"must be object"));
    else {
      if(cfg.semanticRouting.enabled!=null&&!TYPES.boolean(cfg.semanticRouting.enabled))issues.push(issue(["semanticRouting","enabled"],"must be boolean"));
      if(cfg.semanticRouting.minScore!=null&&(!TYPES.number(cfg.semanticRouting.minScore)||cfg.semanticRouting.minScore<0||cfg.semanticRouting.minScore>1))issues.push(issue(["semanticRouting","minScore"],"must be between 0 and 1"));
      const embedding=cfg.semanticRouting.embedding;if(embedding!=null&&!TYPES.object(embedding))issues.push(issue(["semanticRouting","embedding"],"must be object"));
      else if(embedding){if(embedding.enabled!=null&&!TYPES.boolean(embedding.enabled))issues.push(issue(["semanticRouting","embedding","enabled"],"must be boolean"));if(embedding.baseUrl!=null&&!TYPES.string(embedding.baseUrl))issues.push(issue(["semanticRouting","embedding","baseUrl"],"must be string"));}
    }
  }
  if(cfg.browser!=null){
    if(!TYPES.object(cfg.browser))issues.push(issue(["browser"],"must be object"));
    else {
      for(const key of ["persistentProfiles","allowHeadedLogin","requireAuthenticatedActionConfirmation"])if(cfg.browser[key]!=null&&!TYPES.boolean(cfg.browser[key]))issues.push(issue(["browser",key],"must be boolean"));
      if(cfg.browser.defaultProfile!=null&&(!TYPES.string(cfg.browser.defaultProfile)||!(/^[a-z0-9][a-z0-9_-]{0,63}$/).test(cfg.browser.defaultProfile)))issues.push(issue(["browser","defaultProfile"],"must be a safe lowercase profile name"));
    }
  }
  if(cfg.providers&&!TYPES.object(cfg.providers))issues.push(issue(["providers"],"must be object"));
  if(TYPES.object(cfg.providers)){
    for(const [name,p] of Object.entries(cfg.providers)){
      if(!TYPES.object(p)){issues.push(issue(["providers",name],"must be object"));continue;}
      if(!TYPES.string(p.baseUrl))issues.push(issue(["providers",name,"baseUrl"],"must be string"));
      if(p.apiKeyOptional!=null&&!TYPES.boolean(p.apiKeyOptional))issues.push(issue(["providers",name,"apiKeyOptional"],"must be boolean"));
      if(p.models!=null&&!Array.isArray(p.models))issues.push(issue(["providers",name,"models"],"must be array"));
    }
  }
  return {ok:issues.length===0,issues};
}
