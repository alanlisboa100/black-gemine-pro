import {redactSecrets} from "../security/secrets.js";

const oneLine=value=>redactSecrets(String(value||"")).replace(/\s+/g," ").trim().slice(0,320);
function classify(text){
  const t=String(text||"").toLowerCase();
  if(/unavailable|not installed|command not found|enoent|executable/.test(t))return "dependency";
  if(/permission|denied|forbidden|outside.*workspace|blocked/.test(t))return "permission";
  if(/unauthorized|authentication|login|credential|api key|401|403/.test(t))return "authentication";
  if(/timeout|timed out|network|econn|dns|fetch failed|429|rate limit/.test(t))return "network";
  if(/invalid|schema|syntax|parse|argument|validation/.test(t))return "validation";
  if(/test|assert|expected|failed/.test(t))return "verification";
  return "execution";
}

export class RecoveryTracker{
  constructor(){this.failures=[];this.successes=0;this.revision=0;this.signalledRevision=0;}
  observe(results=[]){
    let added=0;
    for(const result of results){
      if(result?.ok){this.successes++;continue;}
      const detail=oneLine(result?.result||"tool failed"),entry={tool:result?.name||"tool",kind:classify(detail),detail};
      const duplicate=this.failures.some(x=>x.tool===entry.tool&&x.detail===entry.detail);
      if(!duplicate){this.failures.push(entry);this.failures=this.failures.slice(-8);added++;}
    }
    if(added)this.revision++;
    return {added,needsReplan:added>0,summary:this.summary()};
  }
  consumeReplan(){if(this.revision===this.signalledRevision)return null;this.signalledRevision=this.revision;return this.summary();}
  summary(){
    const last=this.failures.at(-1);if(!last)return "";
    return `${last.tool} · ${last.kind} · ${last.detail}`;
  }
  render(){
    if(!this.failures.length)return "";
    const grouped=new Map();for(const item of this.failures)grouped.set(item.kind,(grouped.get(item.kind)||0)+1);
    const lines=[
      `Observed failures: ${[...grouped].map(([kind,n])=>`${kind}=${n}`).join(", ")}`,
      ...this.failures.slice(-5).map((x,i)=>`${i+1}. ${x.tool}: ${x.detail}`),
      "Recovery policy: do not repeat an unchanged failing call. Re-read the evidence, state a concrete hypothesis, change tool/arguments/approach, and run the narrowest check that can falsify the hypothesis.",
      "If the blocker is an unavailable dependency, permission, credential, remote account, or platform requirement, stop retrying and report the exact requirement plus the locally validated remainder."
    ];
    return lines.join("\n");
  }
  failureSummaries(){return this.failures.map(x=>`${x.tool}: ${x.detail}`);}
}
