import {RecoveryTracker} from "./recovery.js";
import {WorkProtocol} from "./work-protocol.js";

export class TurnContext{
  constructor(agent,signal){
    this.agent=agent;this.signal=signal;this.cwd=agent.cwd;this.cfg=agent.cfg;this.session=agent.session;this.state=agent.sessionState.data;this.checkpoints=agent.checkpoints;this.outputStore=agent.outputStore;this.processes=agent.processes;this.shellSessions=agent.shellSessions;this.security=agent.security;this.audit=agent.audit;
    this.unavailableTools=new Map();this.failedToolCalls=new Map();this.recovery=new RecoveryTracker();this.understanding=null;this.work=null;
  }
  beginWork(text,{resumeSnapshot=null}={}){if((this.agent.depth||0)===0){if(resumeSnapshot?.graph?.state?.nodes)this.state.taskGraph=resumeSnapshot.graph.state;else if(!resumeSnapshot)this.state.taskGraph=null;}this.work=new WorkProtocol({text,understanding:this.understanding,cfg:this.cfg,mode:this.agent.mode,agentDepth:this.agent.depth||0,teamRole:this.agent.teamRole||null,resumeSnapshot});this.state.lastWork=this.work.snapshot();this.saveState();return this.work;}
  recordWork(calls,results){if(!this.work)return null;this.work.observeBatch(calls,results,this.agent.registry);if(this.state.taskGraph?.nodes)this.work.syncTaskGraph(this.state.taskGraph);const state=this.work.snapshot();this.state.lastWork=state;this.saveState();return state;}
  finishWork(){if(!this.work)return null;this.work.phase="report";const state=this.work.snapshot();this.state.lastWork=state;this.saveState();return state;}
  async confirm(q,def=false){
    if(!this.agent.input)return false;
    const resume=this.agent.ui?.suspendMotion?.()||(()=>{});
    try{return await this.agent.input.confirm(q,def);}finally{resume();}
  }
  saveState(){this.agent.sessionState.save();}
}
