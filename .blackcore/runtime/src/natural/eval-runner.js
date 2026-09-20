import {analyzeTaskUnderstanding} from "./understanding.js";
import {createTaskScope} from "../agent/task-scope.js";

export function evaluateNaturalCases(cases=[]){
  const results=[];
  for(const item of cases){
    const brief=analyzeTaskUnderstanding(item.input,{messages:item.messages||[]}),scope=createTaskScope(item.input),errors=[],e=item.expect||{};
    if(e.clarify!=null&&brief.clarification.required!==e.clarify)errors.push(`clarify=${brief.clarification.required}`);
    if(e.autonomy!=null&&brief.autonomy!==e.autonomy)errors.push(`autonomy=${brief.autonomy}`);
    if(e.risk!=null&&brief.risk!==e.risk)errors.push(`risk=${brief.risk}`);
    if(e.usedHistory!=null&&brief.continuity.usedHistory!==e.usedHistory)errors.push(`usedHistory=${brief.continuity.usedHistory}`);
    if(e.minConfidence!=null&&brief.confidence<e.minConfidence)errors.push(`confidence=${brief.confidence.toFixed(2)}`);
    if(e.maxConfidence!=null&&brief.confidence>e.maxConfidence)errors.push(`confidence=${brief.confidence.toFixed(2)}`);
    if(e.minConstraints!=null&&brief.constraints.length<e.minConstraints)errors.push(`constraints=${brief.constraints.length}`);
    if(e.minAcceptance!=null&&brief.acceptance.length<e.minAcceptance)errors.push(`acceptance=${brief.acceptance.length}`);
    if(e.ambiguity&&!brief.ambiguities.some(x=>x.includes(e.ambiguity)))errors.push(`ambiguity=${brief.ambiguities.join("|")}`);
    if(e.goalIncludes&&!String(brief.goal||"").toLowerCase().includes(String(e.goalIncludes).toLowerCase()))errors.push(`goal=${brief.goal}`);
    if(e.targetIncludes&&!brief.targets.some(x=>String(x).toLowerCase().includes(String(e.targetIncludes).toLowerCase())))errors.push(`targets=${brief.targets.join("|")}`);
    if(e.remoteAllowed!=null&&scope.remoteAllowed!==e.remoteAllowed)errors.push(`remoteAllowed=${scope.remoteAllowed}`);
    if(e.archiveAllowed!=null&&scope.archiveAllowed!==e.archiveAllowed)errors.push(`archiveAllowed=${scope.archiveAllowed}`);
    results.push({id:item.id,category:item.category,input:item.input,ok:errors.length===0,errors,brief,scope});
  }
  const categories={};for(const result of results){const row=categories[result.category]||{passed:0,total:0};row.total++;if(result.ok)row.passed++;categories[result.category]=row;}
  const passed=results.filter(x=>x.ok).length;return {passed,total:results.length,failed:results.length-passed,categories,results};
}
