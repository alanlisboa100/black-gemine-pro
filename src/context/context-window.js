import {estimateMessagesTokens} from "./tokens.js";

export function trimToolOutputs(messages,{maxToolChars=120000,maxTotalChars=900000}={}){
  const out=messages.map(m=>({...m}));let total=out.reduce((n,m)=>n+String(m.content||"").length,0);
  for(let i=0;i<out.length&&total>maxTotalChars;i++){
    const m=out[i];if(m.role!=="tool")continue;const c=String(m.content||"");if(c.length<=4000)continue;
    const keep=Math.min(maxToolChars,Math.max(4000,c.length-(total-maxTotalChars)));const next=c.length>keep?c.slice(0,keep/2)+"\n...[older tool output elided by BLACKCORE]...\n"+c.slice(-keep/2):c;
    total-=c.length-next.length;m.content=next;
  }return out;
}
export function contextStats(messages,modelInfo,cfg){
  const tokens=estimateMessagesTokens(messages),limit=modelInfo?.context||128000,reserve=cfg.contextReserveTokens||32000;
  return {tokens,limit,reserve,available:Math.max(0,limit-reserve-tokens),ratio:tokens/limit};
}
