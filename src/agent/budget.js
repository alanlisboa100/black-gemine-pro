import {estimateMessagesTokens} from "../context/tokens.js";
import {addUsage,estimateCost,normalizeUsage} from "../providers/usage.js";

export class TurnBudget{
  constructor({maxTurns=250,maxToolCalls=500,maxWallMs=30*60*1000}={}){this.maxTurns=maxTurns;this.maxToolCalls=maxToolCalls;this.maxWallMs=maxWallMs;this.startedAt=Date.now();this.turns=0;this.toolCalls=0;}
  beforeTurn(){if(++this.turns>this.maxTurns)throw new Error(`agent turn limit reached (${this.maxTurns})`);if(Date.now()-this.startedAt>this.maxWallMs)throw new Error("agent wall-clock budget exceeded");}
  addTools(n){this.toolCalls+=n;if(this.toolCalls>this.maxToolCalls)throw new Error(`agent tool-call limit reached (${this.maxToolCalls})`);}
  stats(){return {turns:this.turns,toolCalls:this.toolCalls,elapsedMs:Date.now()-this.startedAt};}
}

export class TaskBudgetExceededError extends Error{
  constructor(message,snapshot){super(message);this.name="TaskBudgetExceededError";this.code="TASK_BUDGET_EXCEEDED";this.snapshot=snapshot;}
}

function finite(v,fallback=0){const n=Number(v);return Number.isFinite(n)&&n>=0?n:fallback;}
function policyFrom(cfg={}){
  const raw=cfg.agentTaskBudget||cfg||{};
  return {
    enabled:raw.enabled!==false,
    maxInputTokens:finite(raw.maxInputTokens,1_500_000),
    maxOutputTokens:finite(raw.maxOutputTokens,300_000),
    maxTotalTokens:finite(raw.maxTotalTokens,1_800_000),
    maxCostUSD:finite(raw.maxCostUSD,2),
    warnRatio:Math.max(0.1,Math.min(0.99,finite(raw.warnRatio,0.8)||0.8))
  };
}
function ratio(value,max){return max>0?value/max:0;}
function money(v){return Number(v||0).toFixed(v>=1?2:4);}

export class TaskUsageBudget{
  constructor(cfg={},restore=null){this.policy=policyFrom(cfg);this.startedAt=Date.now();this.usage={};this.estimatedCostUSD=0;this.knownCostCalls=0;this.unknownCostCalls=0;this.calls=0;this.warned=false;this.models=new Map();if(restore)this.restore(restore);}
  restore(snapshot={}){const u=normalizeUsage(snapshot.usage||{});this.usage=u;this.estimatedCostUSD=finite(snapshot.estimatedCostUSD,0);this.knownCostCalls=Math.floor(finite(snapshot.knownCostCalls,0));this.unknownCostCalls=Math.floor(finite(snapshot.unknownCostCalls,0));this.calls=Math.floor(finite(snapshot.calls,0));this.warned=!!snapshot.warned;this.models=new Map((snapshot.models||[]).map(row=>[String(row.ref||"model"),{calls:Math.floor(finite(row.calls,0)),usage:normalizeUsage(row.usage||{}),estimatedCostUSD:finite(row.estimatedCostUSD,0)}]));return this;}
  static fromSnapshot(snapshot,cfg={}){return new TaskUsageBudget(cfg,snapshot);}
  enabled(){return this.policy.enabled===true;}
  snapshot(){
    const u=normalizeUsage(this.usage),p=this.policy;
    return {enabled:p.enabled,policy:{...p},usage:{input:u.input,output:u.output,total:u.total,reasoning:u.reasoning,cacheRead:u.cacheRead,cacheWrite:u.cacheWrite},estimatedCostUSD:this.estimatedCostUSD,knownCostCalls:this.knownCostCalls,unknownCostCalls:this.unknownCostCalls,calls:this.calls,warned:this.warned,elapsedMs:Date.now()-this.startedAt,ratios:{input:ratio(u.input,p.maxInputTokens),output:ratio(u.output,p.maxOutputTokens),total:ratio(u.total,p.maxTotalTokens),cost:ratio(this.estimatedCostUSD,p.maxCostUSD)},models:[...this.models.entries()].map(([ref,v])=>({ref,calls:v.calls,usage:normalizeUsage(v.usage),estimatedCostUSD:v.estimatedCostUSD}))};
  }
  render(){
    const s=this.snapshot(),p=s.policy,u=s.usage;if(!s.enabled)return "Task budget: OFF";
    const limits=[];if(p.maxTotalTokens>0)limits.push(`${u.total.toLocaleString()}/${p.maxTotalTokens.toLocaleString()} tokens`);if(p.maxCostUSD>0)limits.push(`~$${money(s.estimatedCostUSD)}/$${money(p.maxCostUSD)}`);return `Task budget: ${limits.join(" · ")||"enabled"}${s.unknownCostCalls?` · ${s.unknownCostCalls} unpriced model call(s)`:""}. Budget is shared by parent and specialist agents.`;
  }
  acknowledgeWarning(){this.warned=true;}
  beforeRequest({messages=[],modelInfo={},ref="model"}={}){
    if(!this.enabled())return {ok:true,warning:false,estimatedInputTokens:0,snapshot:this.snapshot()};
    const estimatedInputTokens=estimateMessagesTokens(messages),s=this.snapshot(),p=s.policy;
    if(p.maxInputTokens>0&&s.usage.input+estimatedInputTokens>p.maxInputTokens)throw new TaskBudgetExceededError(`task input-token budget would be exceeded before the next ${ref} call (${(s.usage.input+estimatedInputTokens).toLocaleString()} > ${p.maxInputTokens.toLocaleString()})`,s);
    if(p.maxTotalTokens>0&&s.usage.total+estimatedInputTokens>p.maxTotalTokens)throw new TaskBudgetExceededError(`task total-token budget would be exceeded before the next ${ref} call (${(s.usage.total+estimatedInputTokens).toLocaleString()} > ${p.maxTotalTokens.toLocaleString()})`,s);
    let projectedCost=s.estimatedCostUSD;if(modelInfo?.pricing){const c=estimateCost({input:estimatedInputTokens,output:0},modelInfo);if(c)projectedCost+=c.total;}
    if(p.maxCostUSD>0&&projectedCost>p.maxCostUSD)throw new TaskBudgetExceededError(`task cost budget would be exceeded by the estimated input for the next ${ref} call (~$${money(projectedCost)} > $${money(p.maxCostUSD)})`,s);
    const warning=!this.warned&&Math.max(ratio(s.usage.input+estimatedInputTokens,p.maxInputTokens),ratio(s.usage.total+estimatedInputTokens,p.maxTotalTokens),ratio(projectedCost,p.maxCostUSD))>=p.warnRatio;
    return {ok:true,warning,estimatedInputTokens,projectedCostUSD:projectedCost,snapshot:s};
  }
  record(usage,modelInfo={},ref="model"){
    const u=normalizeUsage(usage);this.usage=addUsage(this.usage,u);this.calls++;
    const cost=estimateCost(u,modelInfo);if(cost){this.estimatedCostUSD+=cost.total;this.knownCostCalls++;}else this.unknownCostCalls++;
    const row=this.models.get(ref)||{calls:0,usage:{},estimatedCostUSD:0};row.calls++;row.usage=addUsage(row.usage,u);if(cost)row.estimatedCostUSD+=cost.total;this.models.set(ref,row);
    const s=this.snapshot(),p=s.policy;if(!s.enabled)return s;
    const exceeded=[];if(p.maxInputTokens>0&&s.usage.input>p.maxInputTokens)exceeded.push(`input ${s.usage.input.toLocaleString()}/${p.maxInputTokens.toLocaleString()}`);if(p.maxOutputTokens>0&&s.usage.output>p.maxOutputTokens)exceeded.push(`output ${s.usage.output.toLocaleString()}/${p.maxOutputTokens.toLocaleString()}`);if(p.maxTotalTokens>0&&s.usage.total>p.maxTotalTokens)exceeded.push(`total ${s.usage.total.toLocaleString()}/${p.maxTotalTokens.toLocaleString()}`);if(p.maxCostUSD>0&&s.estimatedCostUSD>p.maxCostUSD)exceeded.push(`cost ~$${money(s.estimatedCostUSD)}/$${money(p.maxCostUSD)}`);if(exceeded.length)throw new TaskBudgetExceededError(`BLACKCORE task budget reached: ${exceeded.join(" · ")}. Increase /budget only if you want this task to spend more.`,s);return s;
  }
}

export function parseTaskBudgetValue(current={},value=""){
  const next={...policyFrom({agentTaskBudget:current})};
  if(typeof value==="boolean"){next.enabled=value;return next;}
  const raw=String(value??"").trim().toLowerCase();if(!raw)return next;if(["off","false","disabled","0"].includes(raw)){next.enabled=false;return next;}if(["on","true","enabled","1"].includes(raw)){next.enabled=true;return next;}
  for(const part of raw.split(/[\s,;]+/).filter(Boolean)){
    const [k,v]=part.includes("=")?part.split("=",2):[null,null];if(!k)continue;const n=Number(v);if(!Number.isFinite(n)||n<0)continue;
    if(["cost","usd","maxcost"].includes(k))next.maxCostUSD=n;else if(["tokens","total","maxtokens"].includes(k))next.maxTotalTokens=Math.floor(n);else if(["input","in"].includes(k))next.maxInputTokens=Math.floor(n);else if(["output","out"].includes(k))next.maxOutputTokens=Math.floor(n);else if(["warn","warning"].includes(k))next.warnRatio=Math.max(0.1,Math.min(0.99,n>1?n/100:n));
  }
  next.enabled=true;return next;
}
