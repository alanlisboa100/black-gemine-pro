const ROLES={
  planner:{
    mode:"PLAN",maxTurns:12,
    tools:["read","ls","stat","find","grep","repo_map","git","worktree","scan","document_reader","security_scan","code_intel","knowledge_index","project_detect","system_info","env_names","sensitive_path_check","file_hash","todo"],
    label:"PLANNER",
    instruction:"Map the workspace, constraints, risks, dependencies, and acceptance conditions. Produce a concise implementation plan with ordered steps and likely verification. Do not modify project files. Prefer evidence over assumptions."
  },
  programmer:{
    mode:"ACT",maxTurns:20,tools:null,label:"PROGRAMMER",
    instruction:"Implement the assigned slice in the current project. Preserve unrelated work, make the smallest coherent changes, and use the existing engineering loop. Run a focused self-check when practical, but do not claim final acceptance for the parent coordinator."
  },
  tester:{
    mode:"ACT",maxTurns:12,
    tools:["read","ls","stat","find","grep","repo_map","git","scan","document_reader","security_scan","code_intel","project_detect","system_info","env_names","sensitive_path_check","file_hash","verify","deploy_preflight","browser","android_device","process_poll","process_list","bash","shell_session"],
    label:"TESTER",
    instruction:"Independently verify the current workspace revision. Run the narrowest meaningful tests, lint, typecheck, build, runtime, device, or visual checks. Do not edit source/config files or install/remove dependencies. Report exact failing evidence and commands, or exact passing evidence."
  },
  reviewer:{
    mode:"PLAN",maxTurns:12,
    tools:["read","ls","stat","find","grep","repo_map","git","worktree","scan","document_reader","security_scan","code_intel","knowledge_index","project_detect","system_info","env_names","sensitive_path_check","file_hash","browser"],
    label:"REVIEWER",
    instruction:"Review the actual current changes after verification. Inspect diff/status or changed targets, look for regressions, missed requirements, unsafe side effects, unnecessary edits, and weak error handling. Do not modify files. Return concrete findings with paths/evidence; say explicitly when no blocking finding is found."
  },
  investigator:{
    mode:"PLAN",maxTurns:10,
    tools:["read","ls","stat","find","grep","repo_map","git","scan","document_reader","security_scan","code_intel","knowledge_index","project_detect","system_info","env_names","sensitive_path_check","file_hash","web_search","web_research","web_fetch"],
    label:"INVESTIGATOR",
    instruction:"Investigate one focused uncertainty independently. Gather only the evidence needed to unblock the parent coordinator. Do not modify project files."
  }
};

const VERIFY_SHELL=/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|verify|check|lint|typecheck|build)\b|\b(?:npx\s+(?:eslint|tsc|vitest|jest)|pytest\b|python\s+-m\s+pytest\b|cargo\s+test\b|go\s+test\b|gradle\w*\s+(?:test|check|build)\b|mvn\w*\s+(?:test|verify)\b|dotnet\s+(?:test|build)\b|flutter\s+(?:test|analyze|build)\b)/i;
const INSPECT_SHELL=/^\s*(?:pwd|ls(?:\s|$)|find(?:\s|$)|rg(?:\s|$)|grep(?:\s|$)|git\s+(?:status|diff|show|log)(?:\s|$)|cat(?:\s|$)|head(?:\s|$)|tail(?:\s|$)|wc(?:\s|$)|file(?:\s|$)|node\s+--check(?:\s|$)|python\s+-m\s+compileall(?:\s|$))/i;

export const TEAM_ROLES=Object.freeze(Object.keys(ROLES));
export function teamRoleProfile(role="investigator"){
  const key=String(role||"investigator").toLowerCase();return ROLES[key]||ROLES.investigator;
}
export function teamRolePrompt(role,task,{parentGoal="",parentWork=null,graphNode=null,strictTargets=false}={}){
  const profile=teamRoleProfile(role),goal=String(parentGoal||"").trim(),work=parentWork&&typeof parentWork==="object"?parentWork:null;
  const context=[];
  if(goal)context.push(`Parent goal: ${goal}`);
  if(work?.targets?.length)context.push(`Known changed targets: ${work.targets.slice(-12).join(", ")}`);
  if(work?.verification?.failed)context.push("Current parent verification state: failing; use the failure evidence in conversation/context and do not guess.");
  if(graphNode){context.push(`Task graph node: ${graphNode.id}; dependencies already satisfied: ${(graphNode.dependsOn||[]).join(", ")||"none"}.`);if(graphNode.targets?.length)context.push(`Declared targets: ${graphNode.targets.join(", ")}.`);if(strictTargets)context.push("PARALLEL SAFETY: this node is running concurrently. Modify only the declared target paths; do not use shell/package/deploy commands or touch shared files outside them.");}
  return `[BLACKCORE TEAM ROLE · ${profile.label}]\nYou are a specialist subagent inside a coordinated BLACKCORE engineering team. The parent agent is the coordinator and owns the final decision.\n${profile.instruction}\n${context.length?context.join("\n")+"\n":""}Assigned task: ${String(task||"").trim()}\nReturn a concise evidence-backed handoff to the parent. Do not broaden the assignment.`;
}
export function teamRoleMode(role,requested){const p=teamRoleProfile(role);return requested||p.mode;}
export function teamRoleMaxTurns(role,requested,cfg={}){
  const p=teamRoleProfile(role),perRole=cfg?.agentTeamTurns?.[String(role||"").toLowerCase()];
  return Math.max(1,Math.min(30,Number(requested||perRole||p.maxTurns||cfg.subagentMaxTurns||20)||20));
}
export function teamRoleTools(role){const tools=teamRoleProfile(role).tools;return tools?new Set(tools):null;}
function mutationTargets(args={}){const out=[];for(const key of ["path","file","target","output","to","destination","dest"]){const v=args?.[key];if(typeof v==="string"&&v.trim())out.push(v.trim());}return out;}
function allowedTarget(target,allowed=[]){const norm=x=>String(x||"").replace(/\\/g,"/").replace(/^\.\//,"").replace(/\/+$/g,"");const t=norm(target);return allowed.some(a=>{const b=norm(a);return t===b||t.startsWith(b+"/");});}
export function teamRoleToolBlock(role,name,args={},tool={},opts={}){
  const r=String(role||"").toLowerCase();if(!r)return null;
  if(r==="programmer"&&opts.strictTargets){if(name==="bash"||name==="shell_session"||name==="package"||name==="ecosystem"||name==="git"||name==="github"||name==="vercel"||name==="netlify"||name==="supabase"||name==="expo"||name==="eas"||name==="gradle")return "BLOCKED: parallel programmer nodes are target-isolated; shell/package/git/deploy tools are disabled to prevent cross-node side effects.";if(tool.mutates===true){const targets=mutationTargets(args);if(!targets.length)return "BLOCKED: parallel programmer mutation has no concrete path and cannot be proven isolated.";if(targets.some(t=>!allowedTarget(t,opts.allowedTargets||[])))return `BLOCKED: parallel programmer may only modify declared task-graph targets: ${(opts.allowedTargets||[]).join(", ")}.`;}}
  if(r==="planner"||r==="reviewer"||r==="investigator"){
    if(tool.mutates===true)return `BLOCKED: BLACKCORE ${r} is read-only. Return evidence to the parent coordinator instead of changing files.`;
    return null;
  }
  if(r!=="tester")return null;
  if(tool.mutates===true)return "BLOCKED: BLACKCORE tester is verification-only and cannot edit project files. Return the failure evidence to the programmer/coordinator.";
  if(name==="bash"){
    const command=String(args.command||"");if(!VERIFY_SHELL.test(command)&&!INSPECT_SHELL.test(command))return "BLOCKED: BLACKCORE tester may only run inspection or verification commands; source mutation, package installation, deployment, and cleanup commands belong to the programmer/coordinator.";
  }
  if(name==="shell_session"&&String(args.action||"")==="run"){
    const command=String(args.command||"");if(!VERIFY_SHELL.test(command)&&!INSPECT_SHELL.test(command))return "BLOCKED: BLACKCORE tester persistent shell is limited to inspection/verification commands.";
  }
  return null;
}
export function collectDelegateEvidence(child){
  const rows=child?.session?.messages?.()||[],calls=new Map();let verificationAttempts=0,verificationPassed=false,verificationFailed=false,toolFailures=0;
  for(const row of rows){
    if(row?.role!=="assistant")continue;for(const call of row.tool_calls||[]){let args={};try{args=JSON.parse(call?.function?.arguments||"{}");}catch{}calls.set(call.id,{name:call?.function?.name,args});}
  }
  for(const row of rows){
    if(row?.role!=="tool")continue;const content=String(row.content||""),call=calls.get(row.tool_call_id)||{},name=row.name||call.name||"";
    if(/^(?:ERROR|BLOCKED|CANCELLED|UNAVAILABLE):/i.test(content))toolFailures++;
    let isVerification=name==="verify"||name==="deploy_preflight"||name==="security_scan";
    if(name==="bash"&&VERIFY_SHELL.test(String(call.args?.command||"")))isVerification=true;
    if(name==="shell_session"&&String(call.args?.action||"")==="run"&&VERIFY_SHELL.test(String(call.args?.command||"")))isVerification=true;
    if(!isVerification)continue;
    verificationAttempts++;let ok=false;
    if(name==="verify"||name==="deploy_preflight"||name==="security_scan")try{ok=JSON.parse(content)?.ok!==false;}catch{ok=!/\b(?:ok\s*[=:]\s*false|failed|error)\b/i.test(content);}
    else ok=/\bexit=0\b/.test(content);
    if(ok)verificationPassed=true;else verificationFailed=true;
  }
  const work=child?.sessionState?.data?.lastWork||null;
  return {verification:{attempts:verificationAttempts,passed:verificationPassed,failed:verificationFailed&&!verificationPassed},toolFailures,work};
}
