import {redactSecrets} from "../security/secrets.js";

const clip=(value,max=600)=>redactSecrets(String(value||"").replace(/\s+/g," ").trim()).slice(0,max);
function addUnique(list,value,max){const text=clip(value);if(!text)return list||[];const out=(list||[]).filter(x=>x!==text);out.push(text);return out.slice(-max);}
function base(state){return state.continuity&&typeof state.continuity==="object"?state.continuity:{currentGoal:"",recentGoals:[],constraints:[],acceptance:[],targets:[],unresolved:[],lastOutcome:null,turns:0};}

export function beginContinuityTurn(state,brief){
  const ledger=base(state);ledger.turns=(ledger.turns||0)+1;
  if(brief?.goal){ledger.currentGoal=clip(brief.goal,420);ledger.recentGoals=addUnique(ledger.recentGoals,brief.goal,6);}
  for(const item of brief?.constraints||[])ledger.constraints=addUnique(ledger.constraints,item,10);
  for(const item of brief?.acceptance||[])ledger.acceptance=addUnique(ledger.acceptance,item,8);
  for(const item of brief?.targets||[])ledger.targets=addUnique(ledger.targets,item,12);
  ledger.unresolved=(brief?.ambiguities||[]).map(x=>clip(x,180)).slice(0,6);
  ledger.awaitingClarification=!!brief?.clarification?.required;
  ledger.updatedAt=new Date().toISOString();state.continuity=ledger;return ledger;
}

export function finishContinuityTurn(state,{status="completed",response="",failures=[]}={}){
  const ledger=base(state);ledger.lastOutcome={status,summary:clip(response,700),failures:(failures||[]).map(x=>clip(x,260)).slice(-6),at:new Date().toISOString()};
  if(status!=="awaiting_clarification"){ledger.awaitingClarification=false;if(status==="completed")ledger.unresolved=[];}
  state.continuity=ledger;return ledger;
}

export function renderContinuity(ledger){
  if(!ledger?.turns)return "";
  const lines=[];
  if(ledger.currentGoal)lines.push(`Current goal: ${ledger.currentGoal}`);
  if(ledger.targets?.length)lines.push(`Active targets: ${ledger.targets.slice(-8).join(", ")}`);
  if(ledger.constraints?.length)lines.push(`Durable user constraints: ${ledger.constraints.slice(-6).join(" | ")}`);
  if(ledger.acceptance?.length)lines.push(`Known done conditions: ${ledger.acceptance.slice(-5).join(" | ")}`);
  if(ledger.recentGoals?.length>1)lines.push(`Recent goal trail: ${ledger.recentGoals.slice(-4).join(" → ")}`);
  if(ledger.unresolved?.length)lines.push(`Still unresolved: ${ledger.unresolved.join("; ")}`);
  if(ledger.lastOutcome?.summary)lines.push(`Previous turn (${ledger.lastOutcome.status}): ${ledger.lastOutcome.summary}`);
  return lines.join("\n");
}
