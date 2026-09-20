import {runPrompt} from "./loop.js";
import {activeTools} from "./tool-filter.js";
import {makeDelegateTool,makeDelegateReadyTool} from "./subagent.js";
import {CheckpointManager} from "../checkpoint/manager.js";
import {ProcessManager} from "../tools/shell/process-manager.js";
import {ShellSessionManager} from "../tools/shell/persistent.js";
import {SecurityPolicy} from "../security/policy.js";
import {AuditLog} from "../security/audit.js";
import {ApprovalCache} from "../security/approvals.js";
import {SessionState} from "../sessions/state.js";
import {Spinner} from "../tui/spinner.js";
import {ToolOutputStore} from "../tools/output/store.js";
import {toolsForTask} from "./task-scope.js";
import {teamRoleToolBlock} from "./team.js";

export class BlackcoreAgent{
  constructor(opts){
    Object.assign(this,opts);this.depth=opts.depth||0;this.mode=opts.mode||opts.cfg.mode||"ACT";this.provider=opts.provider||opts.cfg.provider;this.model=opts.model||opts.cfg.model;
    this.teamRole=opts.teamRole||null;this.teamToolAllowlist=opts.teamToolAllowlist||null;this.workspaceLocked=!!opts.workspaceLocked;this.graphNodeId=opts.graphNodeId||null;this.graphNodeTargets=opts.graphNodeTargets||null;this.graphNodeStrictTargets=!!opts.graphNodeStrictTargets;
    this.checkpoints=opts.checkpoints||new CheckpointManager(this.cwd);this.outputStore=opts.outputStore||new ToolOutputStore(this.cwd);this.processes=opts.processes||new ProcessManager();this.shellSessions=opts.shellSessions||new ShellSessionManager();this.security=new SecurityPolicy(this.cfg);this.audit=opts.audit||new AuditLog();this.approvals=opts.approvals||new ApprovalCache();this.sessionState=new SessionState(this.session);this.running=false;this.abortController=null;this.lastUsage={};this.lastTaskBudget=this.sessionState.data.lastTaskBudget||null;
    if(!this.registry.get("delegate"))try{this.registry.register(makeDelegateTool(this),{group:"agent"});}catch{}
    if(!this.registry.get("delegate_ready"))try{this.registry.register(makeDelegateReadyTool(this),{group:"agent"});}catch{}
  }
  uiSpinner(text){return new Spinner(text,{enabled:this.cfg.animation});}
  getTools({taskText}={}){
    let tools=activeTools(this.registry,this.cfg,this.mode,this.sessionState.data,{subagent:this.depth>0});
    if(this.teamToolAllowlist)tools=tools.filter(t=>this.teamToolAllowlist.has(t.name));
    return taskText===undefined?tools:toolsForTask(tools,taskText);
  }
  teamToolBlock(name,args={},tool={}){return teamRoleToolBlock(this.teamRole,name,args,tool,{strictTargets:this.graphNodeStrictTargets,allowedTargets:this.graphNodeTargets||[]});}
  setModel(provider,model){this.provider=provider;this.model=model;}
  pinModel(provider,model,{persist=true}={}){
    this.setModel(provider,model);this.cfg.provider=provider;this.cfg.model=model;this.cfg.modelLock=true;this.cfg.autoRoute=false;this.cfg.autoFallback=false;this.routeLockOnce=true;
    if(persist)this.saveConfig?.();
    return {provider,model,modelLock:true,autoRoute:false,autoFallback:false};
  }
  cancel(){if(this.abortController&&!this.abortController.signal.aborted){this.abortController.abort(new Error("cancelled by user"));return true;}return false;}
  async prompt(text,opts={}){return runPrompt(this,text,opts);}
  spawnChild(overrides){return new BlackcoreAgent({...this,...overrides,registry:this.registry.clone(),checkpoints:this.checkpoints,outputStore:this.outputStore,processes:this.processes,shellSessions:this.shellSessions,audit:this.audit,approvals:this.approvals});}
  stats(){return {provider:this.provider,model:this.model,mode:this.mode,session:this.session.info(),lastUsage:this.lastUsage,lastTaskBudget:this.lastTaskBudget,tools:this.getTools().map(t=>t.name),processes:this.processes.list(),depth:this.depth,teamRole:this.teamRole};}
  close(){if(this.depth===0){this.processes.killAll();this.shellSessions.closeAll();}}
}
