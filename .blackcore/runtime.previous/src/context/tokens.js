function textOf(value){
  if(value===null||value===undefined)return "";
  if(typeof value==="string")return value;
  try{return JSON.stringify(value);}catch{return String(value);}
}

// Fast local estimate for budgeting/compaction. It intentionally errs slightly high
// for short messages and structured tool payloads; provider-reported usage remains
// authoritative after a request completes.
export function estimateTextTokens(value){
  const text=textOf(value);if(!text)return 0;
  let ascii=0,wide=0;for(const ch of text){if(ch.codePointAt(0)<=0x7f)ascii++;else wide++;}
  return Math.max(1,Math.ceil(ascii/4+wide/2));
}

export function estimateMessagesTokens(messages=[]){
  let total=2;
  for(const m of Array.isArray(messages)?messages:[]){
    total+=4;
    total+=estimateTextTokens(m?.role||"");
    total+=estimateTextTokens(m?.name||"");
    total+=estimateTextTokens(m?.content||"");
    if(m?.tool_calls)total+=estimateTextTokens(m.tool_calls);
    if(m?.reasoning_content)total+=estimateTextTokens(m.reasoning_content);
  }
  return Math.ceil(total);
}
