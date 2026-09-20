import {redactSecrets} from "../security/secrets.js";
import {normalizeTaskGraph,taskGraphSummary,graphNode,graphNodeReady,taskGraphPrompt} from "./task-graph.js";

const DEPTHS=new Set(["fast","standard","deep"]);
const CHANGE=/\b(?:cria|crie|criar|faz|faca|fazer|implementa|implemente|corrige|corrija|arruma|resolve|melhora|altera|muda|edita|refatora|otimiza|instala|gera|monta|desenvolve|aplica|apply|build|create|make|implement|fix|change|edit|refactor|improve|install|generate|develop)\w*/i;
const NO_CHANGE=/\b(?:s[oó]\s+analisa|apenas\s+analisa|n[aã]o\s+(?:mude|altere|edite)|sem\s+(?:mudar|alterar|editar)|read.only|do\s+not\s+(?:change|edit)|only\s+(?:review|analyze))\b/i;
const DEEP=/\b(?:arquitetura|auditoria\s+completa|completo|tudo|todas?\s+as\s+partes|n[aã]o\s+deixe\s+passar|seguran[cç]a|migra[cç][aã]o|release|produ[cç][aã]o|depend[eê]ncias?|redesenha|id[eê]ntic[oa]|codex|architecture|full\s+audit|complete|everything|security|migration|production|dependencies|redesign)\b/i;
const VERIFY_COMMAND=/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|verify|check|lint|typecheck|build)\b|\b(?:pytest|cargo\s+test|go\s+test|gradle\w*\s+(?:test|check|build)|mvn\w*\s+(?:test|verify)|dotnet\s+(?:test|build)|flutter\s+(?:test|analyze|build))\b/i;
const SHELL_MUTATION=/\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|remove|update)\b|\b(?:mkdir|touch|cp|mv|rm|sed\s+-i|git\s+(?:add|commit|checkout|switch|merge|rebase|push)|gradle\w*\s+init)\b|(?:^|[^>])>{1,2}(?!=)/i;
const REVIEW_GIT=new Set(["diff","show","status"]);
const ARTIFACT_EVIDENCE=new Set(["audit_report"]);
const TEAM_ROLES=new Set(["planner","programmer","tester","reviewer","investigator"]);

function normalize(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function argsOf(call){try{return JSON.parse(call?.function?.arguments||"{}");}catch{return {};}}
function dataOf(value){try{return JSON.parse(String(value||""));}catch{return null;}}
function clean(value,max=180){return redactSecrets(String(value||"").replace(/\s+/g," ").trim()).slice(0,max);}
function targetOf(args={}){return args.path||args.file||args.target||args.output||args.to||args.pathspec||"";}

export function classifyWorkDepth(text="",understanding=null,configured="adaptive"){
  const choice=String(configured||"adaptive").toLowerCase();if(DEPTHS.has(choice))return choice;
  const source=normalize(text);if(DEEP.test(source)||understanding?.risk)return "deep";
  if(CHANGE.test(source)&&!NO_CHANGE.test(source))return "standard";
  return "fast";
}

export function classifyToolKind(name,args={},tool={}){
  const action=String(args.action||"").toLowerCase(),command=String(args.command||args.script||"");
  if((name==="todo"||name==="task_graph")&&["replace","add","update"].includes(action))return "plan";
  if(name==="verify"||name==="deploy_preflight"||name==="security_scan")return "verify";
  if(name==="bash"||name==="shell_session"){
    if(VERIFY_COMMAND.test(command))return "verify";
    if(SHELL_MUTATION.test(command))return "execute";
    return "inspect";
  }
  if(name==="git"&&REVIEW_GIT.has(action))return "review";
  if(name==="browser"&&["audit","responsive","animation","snapshot","screenshot"].includes(action))return "verify";
  if(tool.mutates===true)return "execute";
  if(tool.readOnly===true)return "inspect";
  if(name==="read"||name==="grep"||name==="find"||name==="repo_map"||name==="scan"||name==="stat"||name==="ls")return "inspect";
  return "operate";
}

function successful(result,name){
  if(!result?.ok)return false;const data=dataOf(result.result);
  if(name==="verify"||name==="deploy_preflight"||name==="security_scan")return data?.ok!==false;
  return true;
}
function isDelegateResult(data){return data?.kind==="blackcore_delegate_result"&&TEAM_ROLES.has(String(data.role||""));}

export class WorkProtocol{
  constructor({text="",understanding=null,cfg={},mode="ACT",agentDepth=0,teamRole=null,resumeSnapshot=null}={}){
    this.text=String(text);this.understanding=understanding||{};this.depth=classifyWorkDepth(text,understanding,cfg.workStyle);this.mode=mode;this.phase="understand";this.startedAt=Date.now();
    this.agentDepth=Number(agentDepth)||0;this.teamRole=teamRole||null;
    this.expectedChanges=mode==="ACT"&&CHANGE.test(normalize(text))&&!NO_CHANGE.test(normalize(text));
    this.inspections=0;this.plans=0;this.mutations=0;this.mutationRevision=0;this.verifications=[];this.reviews=[];this.targets=new Set();
    this.maxRepairCycles=Math.max(0,Math.min(6,Number(cfg.agentRepairCycles??3)||0));this.repairCycles=0;
    this.gateAttempts={verify:0,repair:0,review:0,acceptance:0,teamTest:0,teamReview:0,graphNext:0};this.events=[];
    const teamSetting=String(cfg.agentTeamMode||"off").toLowerCase();
    const graphSetting=String(cfg.agentTaskGraphMode||"off").toLowerCase();
    this.team={enabled:this.agentDepth===0&&this.depth==="deep"&&this.expectedChanges&&teamSetting!=="off",mode:teamSetting,plannerRuns:0,programmerRuns:0,testerRuns:0,reviewerRuns:0,investigatorRuns:0,testedRevision:-1,reviewedRevision:-1,lastRole:null,handoffs:[]};
    this.graph={enabled:this.agentDepth===0&&this.depth==="deep"&&this.expectedChanges&&graphSetting!=="off",mode:graphSetting,state:null,updates:0};
    this.doneSignals=[...(understanding?.acceptance||[])].map(x=>clean(x,300)).filter(Boolean).slice(0,8);
    this.constraints=[...(understanding?.constraints||[])].map(x=>clean(x,300)).filter(Boolean).slice(0,10);
    if(resumeSnapshot)this.restore(resumeSnapshot);
  }
  restore(s={}){
    if(!s||typeof s!=="object")return this;
    if(DEPTHS.has(s.depth))this.depth=s.depth;if(s.phase)this.phase=s.phase;if(s.startedAt)this.startedAt=s.startedAt;
    if(typeof s.expectedChanges==="boolean")this.expectedChanges=s.expectedChanges;
    this.inspections=Math.max(0,Number(s.inspections||0));this.plans=Math.max(0,Number(s.planning?.events??s.plans??0));this.mutations=Math.max(0,Number(s.mutations||0));this.mutationRevision=Math.max(0,Number(s.mutationRevision||0));
    this.repairCycles=Math.max(0,Number(s.repair?.cycles||0));this.maxRepairCycles=Math.max(this.repairCycles,Math.max(0,Math.min(6,Number(s.repair?.maxCycles??this.maxRepairCycles)||0)));
    this.gateAttempts={...this.gateAttempts,...(s.gates||{})};this.targets=new Set((s.targets||[]).map(x=>clean(x,300)).filter(Boolean));
    const evidence=s.evidence||{};this.verifications=(evidence.verification||[]).map(x=>({...x,detail:clean(x.detail,700)})).slice(-30);this.reviews=(evidence.review||[]).map(x=>({...x,detail:clean(x.detail,700)})).slice(-30);
    if(!this.verifications.length&&s.verification?.attempts&&s.mutationRevision>0)this.verifications.push({tool:"recovered-verification",ok:!!s.verification.passed,detail:s.verification.failed?"persisted failed verification":"persisted verification evidence",revision:this.mutationRevision,at:Date.now()});
    if(!this.reviews.length&&s.review?.attempts&&s.review?.passed&&s.mutationRevision>0)this.reviews.push({tool:"recovered-review",ok:true,detail:"persisted review evidence",revision:this.mutationRevision,at:Date.now()});
    if(s.team&&typeof s.team==="object")this.team={...this.team,...s.team,handoffs:Array.isArray(s.team.handoffs)?s.team.handoffs.slice(-20):[]};
    if(s.graph&&typeof s.graph==="object")this.graph={...this.graph,...s.graph,state:s.graph.state?.nodes?normalizeTaskGraph(s.graph.state):null};
    this.events=Array.isArray(s.events)?s.events.slice(-50):this.events;return this;
  }
  guardToolCall(name,args={},tool={}){
    const kind=classifyToolKind(name,args,tool);
    if(this.mode!=="ACT"||this.depth!=="deep"||!this.expectedChanges)return null;
    if(name==="delegate_ready"&&this.graph.enabled){
      if(this.team.enabled&&this.team.plannerRuns<1)return "BLOCKED: run the independent planner handoff before launching an automatic task-graph wave.";
      if(!this.graph.state?.nodes?.length)return "BLOCKED: task-graph mode requires a dependency graph before delegate_ready. Build it after the planner handoff.";
    }
    if(name==="delegate"&&String(args.role||"")==="programmer"&&this.graph.enabled){
      if(!this.graph.state?.nodes?.length)return "BLOCKED: task-graph mode requires a dependency graph before programmer delegation. After the planner handoff, use task_graph action=replace with focused nodes, dependencies, roles, and expected target paths.";
      if(!args.nodeId)return "BLOCKED: programmer delegation in task-graph mode requires nodeId so BLACKCORE can enforce dependencies and safe parallel work.";
      const node=graphNode(this.graph.state,args.nodeId);if(!node)return `BLOCKED: task graph node not found: ${args.nodeId}.`;
      if(!graphNodeReady(this.graph.state,args.nodeId))return `BLOCKED: task graph node ${args.nodeId} is not ready; finish its dependencies before delegating it.`;
    }
    if(kind!=="execute")return null;
    if(this.team.enabled&&this.team.plannerRuns<1)return "BLOCKED: deep team engineering requires an independent planner handoff before the first mutation. Use delegate with role=planner to inspect the project and return a concise plan, then continue implementation. The parent remains coordinator.";
    if(this.graph.enabled&&!this.graph.state?.nodes?.length)return "BLOCKED: deep task-graph engineering requires a dependency graph before the first mutation. Use task_graph after the planner handoff to record work units and dependencies.";
    if(this.team.enabled&&this.team.programmerRuns<1)return "BLOCKED: deep team engineering delegates the first implementation pass to the programmer specialist. Use delegate with role=programmer and a ready task-graph nodeId. The parent may coordinate repairs after that handoff.";
    if(this.plans>0)return null;
    return "BLOCKED: deep engineering work needs a concise task plan before the first mutation. Use the todo/task_graph tools or a successful planner delegate to record the implementation steps, then continue. This is a planning gate, not a request to stop at a plan.";
  }
  observeDelegate(data,resultOk=true){
    if(!isDelegateResult(data))return false;
    const role=String(data.role),ok=resultOk&&data.ok!==false,work=data.work||{},evidence=data.evidence||{},before=this.mutationRevision;
    this.team.lastRole=role;if(ok)this.team[`${role}Runs`]=(this.team[`${role}Runs`]||0)+1;
    this.team.handoffs.push({role,nodeId:data.nodeId||null,ok,durationMs:data.durationMs||0,summary:clean(data.result,420),revision:before,at:Date.now()});this.team.handoffs=this.team.handoffs.slice(-20);
    if(data.taskGraph?.nodes){this.graph.state=normalizeTaskGraph(data.taskGraph);this.graph.updates++;}
    if(role==="planner"&&ok){this.plans++;this.phase="plan";}
    if(role==="programmer"&&ok){
      const count=Math.max(0,Number(work.mutations)||0);if(count>0){this.mutations+=count;this.mutationRevision++;for(const t of work.targets||[])if(t)this.targets.add(clean(t,300));this.gateAttempts.verify=0;this.gateAttempts.review=0;this.gateAttempts.acceptance=0;this.gateAttempts.teamTest=0;this.gateAttempts.teamReview=0;this.team.testedRevision=-1;this.team.reviewedRevision=-1;}
      this.phase="execute";
    }
    if(role==="tester"){
      const v=evidence.verification||{};if(v.attempts>0){this.verifications.push({tool:"delegate/tester",ok:!!v.passed,detail:clean(data.result,600),revision:this.mutationRevision,at:Date.now()});if(v.passed)this.team.testedRevision=this.mutationRevision;}
      this.phase="verify";
    }
    if(role==="reviewer"&&ok){this.reviews.push({tool:"delegate/reviewer",ok:true,detail:clean(data.result,700),revision:this.mutationRevision,at:Date.now()});this.team.reviewedRevision=this.mutationRevision;this.phase="review";}
    this.events.push({phase:"team",tool:"delegate",role,ok,revision:this.mutationRevision});this.events=this.events.slice(-50);return true;
  }
  observeBatch(calls=[],results=[],registry){
    for(let index=0;index<calls.length;index++){
      const call=calls[index],result=results[index]||{},name=call?.function?.name||result.name||"tool",args=argsOf(call),tool=registry?.get?.(name)||{},kind=classifyToolKind(name,args,tool),ok=successful(result,name),target=clean(targetOf(args),300),parsed=dataOf(result.result);
      if(name==="delegate"&&this.observeDelegate(parsed,result?.ok!==false))continue;
      if(name==="delegate_ready"&&parsed?.kind==="blackcore_delegate_batch"){if(parsed.taskGraph?.nodes){this.graph.state=normalizeTaskGraph(parsed.taskGraph);this.graph.updates++;}for(const row of parsed.results||[])this.observeDelegate(row,row?.ok!==false);continue;}
      if(name==="task_graph"&&ok&&parsed?.kind?.startsWith?.("blackcore_task_graph")&&parsed.graph?.nodes){this.graph.state=normalizeTaskGraph(parsed.graph);this.graph.updates++;this.plans++;this.phase="plan";this.events.push({phase:"graph",tool:name,ok:true,nodes:this.graph.state.nodes.length,revision:this.mutationRevision});continue;}
      if(kind==="inspect"&&ok)this.inspections++;
      if(kind==="plan"&&ok){this.plans++;this.phase="plan";}
      if(kind==="execute"&&ok){
        this.mutations++;this.mutationRevision++;if(target)this.targets.add(target);
        this.gateAttempts.verify=0;this.gateAttempts.review=0;this.gateAttempts.acceptance=0;this.gateAttempts.teamTest=0;this.gateAttempts.teamReview=0;this.team.testedRevision=-1;this.team.reviewedRevision=-1;
        if(ARTIFACT_EVIDENCE.has(name)){this.verifications.push({tool:name,ok:true,detail:"artifact generated with built-in evidence",revision:this.mutationRevision});this.reviews.push({tool:name,ok:true,detail:"structured report completed",revision:this.mutationRevision});}
      }
      if(kind==="verify")this.verifications.push({tool:name,ok,detail:clean(result.result),revision:this.mutationRevision,at:Date.now()});
      if(kind==="review"||(name==="read"&&target&&this.targets.has(target)))this.reviews.push({tool:name,ok,detail:target||clean(result.result),revision:this.mutationRevision,at:Date.now()});
      this.phase=kind==="operate"?this.phase:kind;this.events.push({phase:kind,tool:name,ok,target,revision:this.mutationRevision});this.events=this.events.slice(-50);
    }
    return this.snapshot();
  }
  syncTaskGraph(graph){if(graph?.nodes){this.graph.state=normalizeTaskGraph(graph);this.graph.updates++;}return this.graph.state;}
  currentVerifications(){return this.verifications.filter(x=>x.revision===this.mutationRevision);}
  currentReviews(){return this.reviews.filter(x=>x.revision===this.mutationRevision);}
  verificationPassed(){return this.mutationRevision>0&&this.currentVerifications().some(x=>x.ok);}
  verificationFailed(){const rows=this.currentVerifications();return rows.length>0&&!rows.some(x=>x.ok)&&rows.some(x=>!x.ok);}
  reviewPassed(){return this.mutationRevision>0&&this.currentReviews().some(x=>x.ok);}
  teamTestCurrent(){return !this.team.enabled||this.team.testedRevision===this.mutationRevision;}
  teamReviewCurrent(){return !this.team.enabled||this.team.reviewedRevision===this.mutationRevision;}
  graphSummary(){return this.graph.state?taskGraphSummary(this.graph.state):null;}
  graphRunnable(){return (this.graphSummary()?.ready||[]).length>0;}
  graphIncomplete(){const s=this.graphSummary();return !!s&&(s.pending>0||s.running>0);}
  nextGate({clarification=false}={}){
    if(clarification||this.mode!=="ACT"||this.depth==="fast"||this.mutations===0)return null;
    if(this.graph.enabled&&this.graphIncomplete()&&this.graphRunnable())return "graph-next";
    if(this.team.enabled&&!this.teamTestCurrent()&&!this.verificationFailed()&&this.gateAttempts.teamTest<1)return "team-test";
    if(!this.verificationPassed()){
      if(this.verificationFailed()&&this.repairCycles<this.maxRepairCycles)return "repair";
      if(!this.verificationFailed()&&this.gateAttempts.verify<1)return "verify";
      return null;
    }
    if(this.team.enabled&&!this.teamTestCurrent()&&this.gateAttempts.teamTest<1)return "team-test";
    if(this.depth==="deep"&&this.team.enabled&&!this.teamReviewCurrent()&&this.gateAttempts.teamReview<1)return "team-review";
    if(this.depth==="deep"&&!this.reviewPassed()&&this.gateAttempts.review<1)return "review";
    if(this.depth==="deep"&&this.reviewPassed()&&this.gateAttempts.acceptance<1)return "acceptance";
    return null;
  }
  requestGate(gate){
    if(gate==="team-test")this.gateAttempts.teamTest++;
    else if(gate==="team-review")this.gateAttempts.teamReview++;
    else if(gate==="graph-next")this.gateAttempts.graphNext++;
    else if(gate in this.gateAttempts)this.gateAttempts[gate]++;
    if(gate==="repair")this.repairCycles++;
    this.phase=gate;return this.gatePrompt(gate);
  }
  gatePrompt(gate){
    if(gate==="graph-next"){const s=this.graphSummary();return `[BLACKCORE TASK GRAPH · NEXT READY WORK]
The dependency graph still has unfinished runnable work. Ready nodes: ${(s?.ready||[]).join(", ")||"none"}. Use task_graph list/ready if needed. If two or more independent ready nodes exist, call delegate_ready once so BLACKCORE automatically launches the largest safe wave (up to maxParallelAgents) and spreads concurrent Google work across available key slots. Use single delegate only when one node is ready or when work must remain sequential. Do not start waiting nodes or overlapping writers.`;}
    if(gate==="team-test")return `[BLACKCORE TEAM GATE · TESTER]\nThe current revision needs an independent specialist verification handoff. Use delegate with role=tester and ask it to run the narrowest meaningful tests/lint/typecheck/build/runtime or visual checks against the current workspace. The tester must not edit source files. If it fails, use the exact evidence for repair; if it passes, continue to review.`;
    if(gate==="team-review")return `[BLACKCORE TEAM GATE · REVIEWER]\nIndependent verification is current. Use delegate with role=reviewer to inspect the actual current diff/changed targets for regressions, missed requirements, unsafe side effects, and unrelated edits. The reviewer is read-only. If it finds a real issue, fix it and verify again; otherwise continue to acceptance.`;
    if(gate==="verify")return `[BLACKCORE WORK GATE · VERIFY]\nFiles or project state changed, but there is no successful verification for the latest change revision. Run the narrowest meaningful test, lint, typecheck, build, runtime check, or visual check now. If verification cannot run, inspect the blocker once and report the exact unverified limitation instead of claiming success.`;
    if(gate==="repair")return `[BLACKCORE WORK GATE · REPAIR ${this.repairCycles+1}/${this.maxRepairCycles}]\nVerification failed for the latest change revision. Do not repeat the same failing call unchanged. Read the failure evidence, form a concrete hypothesis, make the smallest corrective change (prefer a focused programmer delegate for deep team work), and re-run independent verification. Stop retrying when the blocker is external or when the repair budget is exhausted; report the exact limitation instead of hiding it.`;
    if(gate==="review")return `[BLACKCORE WORK GATE · REVIEW]\nVerification passed for the latest revision. Before finishing this deep task, review the actual changes for regressions, missed requirements, unsafe side effects, and unrelated edits. Prefer a Git diff/status when available; otherwise re-read the changed targets. Fix real findings, then re-verify because any new edit invalidates the previous verification evidence.`;
    const done=this.doneSignals.length?`\nExplicit done signals: ${this.doneSignals.join(" | ")}`:"";
    const constraints=this.constraints.length?`\nExplicit constraints: ${this.constraints.join(" | ")}`:"";
    return `[BLACKCORE WORK GATE · ACCEPTANCE]\nVerification and review are current. Compare the implemented result against the user's actual goal, active todo list, constraints, and done conditions. Finish or mark blocked any remaining task item. If you edit anything, run verification and review again. Only then provide the final report.${done}${constraints}`;
  }
  completionStatus(){
    if(this.mutations===0)return "read-only";
    if(this.graph.enabled&&this.graphIncomplete()&&this.graphRunnable())return "graph-work-pending";
    if(this.team.enabled&&!this.teamTestCurrent())return "team-test-pending";
    if(!this.verificationPassed())return this.verificationFailed()?"verification-failed":"unverified";
    if(this.depth==="deep"&&this.team.enabled&&!this.teamReviewCurrent())return "team-review-pending";
    if(this.depth==="deep"&&!this.reviewPassed())return "verification-only";
    if(this.depth==="deep"&&this.gateAttempts.acceptance<1)return "acceptance-pending";
    return "verified";
  }
  render(){
    const path=this.depth==="fast"?"understand → answer":this.depth==="standard"?"understand → inspect → execute → verify → repair-if-needed → report":"understand → inspect → plan → execute → verify → repair-if-needed → review → acceptance → report";
    const lines=[`Profile: ${this.depth.toUpperCase()} (${String(this.mode).toUpperCase()})`,`Required path: ${path}`];
    if(this.depth!=="fast")lines.push("Do not stop at a plan when the user requested implementation. Keep tool output focused and preserve unrelated work.");
    if(this.depth==="deep")lines.push("A concise plan is required before the first mutation. Review the real changes after successful verification and run an acceptance pass before the final answer.");
    if(this.team.enabled)lines.push("TEAM MODE: the parent is coordinator. Before the first mutation obtain a planner handoff with delegate(role=planner); prefer delegate(role=programmer) for implementation; every changed revision needs an independent delegate(role=tester) verification and delegate(role=reviewer) review before acceptance. Specialists share the same workspace but have isolated context windows and role-scoped tools.");
    if(this.graph.enabled)lines.push("TASK GRAPH MODE: after the planner handoff, use task_graph to encode implementation nodes, dependencies, specialist roles, and expected target paths. Delegate only READY nodes. When multiple independent ready nodes exist, prefer delegate_ready: BLACKCORE automatically launches the largest non-conflicting wave up to the configured agent limit (4 by default). Dependent or overlapping nodes must wait.");
    if(this.teamRole)lines.push(`Specialist role: ${this.teamRole}. Stay inside the assigned role and hand evidence back to the parent.`);
    lines.push(`Repair budget: ${this.maxRepairCycles} cycle${this.maxRepairCycles===1?"":"s"}. A successful verification only counts for the latest mutation revision.`);
    lines.push("A final answer must distinguish completed, verified, blocked, and unverified work. Never infer success from a tool call alone.");
    if(this.doneSignals.length)lines.push(`Explicit done signals: ${this.doneSignals.join(" | ")}`);
    if(this.constraints.length)lines.push(`Explicit constraints: ${this.constraints.join(" | ")}`);
    if(this.mutations||this.verifications.length||this.reviews.length)lines.push(`Evidence so far: revision=${this.mutationRevision}; mutations=${this.mutations}; current verification=${this.verificationPassed()?"passed":this.verificationFailed()?"failed":"missing"}; current review=${this.reviewPassed()?"recorded":"missing"}; repair=${this.repairCycles}/${this.maxRepairCycles}.`);
    if(this.team.enabled)lines.push(`Team so far: planner=${this.team.plannerRuns}; programmer=${this.team.programmerRuns}; tester=${this.team.testerRuns}${this.teamTestCurrent()?" (current)":""}; reviewer=${this.team.reviewerRuns}${this.teamReviewCurrent()?" (current)":""}.`);
    if(this.graph.enabled&&this.graph.state?.nodes?.length)lines.push(taskGraphPrompt(this.graph.state));
    if(this.targets.size)lines.push(`Changed targets observed: ${[...this.targets].slice(-12).join(", ")}`);
    return lines.join("\n");
  }
  snapshot(){return {depth:this.depth,phase:this.phase,status:this.completionStatus(),expectedChanges:this.expectedChanges,inspections:this.inspections,planning:{events:this.plans,required:this.depth==="deep"&&this.expectedChanges},mutations:this.mutations,mutationRevision:this.mutationRevision,verification:{attempts:this.verifications.length,currentAttempts:this.currentVerifications().length,passed:this.verificationPassed(),failed:this.verificationFailed()},repair:{cycles:this.repairCycles,maxCycles:this.maxRepairCycles},review:{attempts:this.reviews.length,currentAttempts:this.currentReviews().length,passed:this.reviewPassed()},acceptance:{attempts:this.gateAttempts.acceptance,doneSignals:this.doneSignals.length},gates:{...this.gateAttempts},team:{...this.team,handoffs:[...this.team.handoffs]},graph:{...this.graph,state:this.graph.state?normalizeTaskGraph(this.graph.state):null,summary:this.graph.state?taskGraphSummary(this.graph.state):null},targets:[...this.targets].slice(0,30),evidence:{verification:this.verifications.slice(-20),review:this.reviews.slice(-20)},events:this.events.slice(-30),startedAt:this.startedAt,updatedAt:Date.now()};}
}
