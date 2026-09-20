import {estimateMessagesTokens} from "../context/tokens.js";

export function needsCompaction(messages,modelInfo,cfg){
  const context=modelInfo?.context||128000,reserve=cfg.contextReserveTokens||32000,usable=Math.max(16000,context-reserve);
  const estimate=estimateMessagesTokens(messages);return {needed:estimate>usable*(cfg.autoCompactRatio||0.78),estimate,usable,ratio:estimate/usable};
}

export function alignCompactionCut(old=[],keep=[]){
  const nextOld=[...old],nextKeep=[...keep];
  while(nextKeep.length&&nextKeep[0].role==="tool")nextOld.push(nextKeep.shift());
  return {old:nextOld,keep:nextKeep};
}

export async function compactSession({session,provider,systemPrompt,cfg,customPrompt=""}){
  const messages=session.messages({includeCompaction:false}),keepN=cfg.compactionKeepMessages||10;if(messages.length<=keepN+4)return {compacted:false};
  const cut=Math.max(1,messages.length-keepN);
  const aligned=alignCompactionCut(messages.slice(0,cut),messages.slice(cut));
  const old=aligned.old,keep=aligned.keep;
  const instructions=`Summarize the earlier part of this software-engineering session for exact continuation.
Return concise Markdown with these headings: Goal and constraints; Decisions; Files and changes; Evidence; Open items. Omit a heading only when it has no facts.
Preserve exact paths, commands, important outputs, test/build status, errors and root causes, API/provider details, explicit user choices or refusals, granted discretion, the current referent/focus, unresolved risks, and the next concrete action. Mark superseded goals as superseded instead of carrying them forward as active. Distinguish completed work from planned work. Keep source URLs when research influenced a decision.
Be compact, operational and factual. Never invent completion, test evidence or a citation. ${customPrompt}`;
  const resp=await provider.chat({messages:[{role:"system",content:instructions},{role:"user",content:JSON.stringify(old)}],tools:[],stream:false});
  const covered=session.activePath().filter(e=>e.type==="message").map(e=>e.id);session.addCompaction(resp.message?.content||"",covered);
  for(const m of keep){if(m.role==="tool")session.addToolResult(m.tool_call_id||"compact",m.name||"tool",m.content||"");else session.addMessage(m.role,m.content||"",{...(m.tool_calls?{tool_calls:m.tool_calls}:{}),...(m.reasoning_content?{reasoning_content:m.reasoning_content}:{})});}
  return {compacted:true,covered:covered.length,kept:keep.length,summary:resp.message?.content||""};
}
