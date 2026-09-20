import fs from "node:fs";
import {TurnBudget,TaskUsageBudget} from "./budget.js";
import {TurnContext} from "./turn.js";
import {ToolExecutor} from "../tools/executor.js";
import {buildSystemPrompt} from "../context/system-prompt.js";
import {trimToolOutputs} from "../context/context-window.js";
import {needsCompaction,compactSession} from "../sessions/compaction.js";
import {expandMentions} from "../context/file-mentions.js";
import {FallbackProvider} from "../providers/fallback.js";
import {routeModel} from "../providers/router.js";
import {loadProjectMemory} from "../context/project-memory.js";
import {loadAgentMemory,recordAgentTurn} from "../context/agent-memory.js";
import {currentReasoning} from "../config/reasoning.js";
import {createTaskScope} from "./task-scope.js";
import {inspectImageInputs,materializeMessageImages} from "../context/images.js";
import {analyzeTaskUnderstanding,renderTaskUnderstanding} from "../natural/understanding.js";
import {routeTaskSemantics} from "../natural/semantic-router.js";
import {beginContinuityTurn,finishContinuityTurn,renderContinuity} from "../context/continuity.js";
import {resolveTurnWorkspace} from "./project-workspace.js";
import {loadInstructions} from "../context/instructions.js";
import {findModel} from "../config/models.js";
import {createRecoveryTask,saveRecoveryTask,clearRecoveryTask,supersedeRecoverableTasks,resumeInstruction,renderRecoveryContext} from "./task-recovery.js";
import {toolsForProviderRequest} from "./provider-tool-scope.js";
import {resolveReplyLanguage} from "../context/reply-language.js";

function assistantExtra(m){
  return {...(m.tool_calls?.length?{tool_calls:m.tool_calls}:{}),...(m.reasoning_content?{reasoning_content:m.reasoning_content}:{})};
}
export async function runPrompt(agent,text,{quiet=false,maxTurns,images=[],resumeTask=null}={}){
  if(agent.running)throw new Error("BLACKCORE agent is already running");
  agent.running=true;agent.abortController=new AbortController();agent.approvals.resetTurn();const signal=agent.abortController.signal;
  if(!quiet)agent.ui.turnStart?.();let visualDone=false;
  const taskText=String(resumeTask?.originalText||text||"");
  const ownsTaskBudget=agent.depth===0;if(ownsTaskBudget||!agent.taskUsageBudget)agent.taskUsageBudget=resumeTask?.budget?TaskUsageBudget.fromSnapshot(resumeTask.budget,agent.cfg):new TaskUsageBudget(agent.cfg);
  let turnOutcome={goal:taskText,status:"started",response:"",work:null,failures:[],provider:agent.provider,model:agent.model,understanding:null},checkpointInfo=null,recoveryTask=resumeTask||null;
  const budget=new TurnBudget({maxTurns:maxTurns||agent.cfg.maxAgentTurns,maxToolCalls:agent.cfg.maxAgentToolCalls||250,maxWallMs:agent.cfg.maxAgentWallMs||30*60*1000});const ctx=new TurnContext(agent,signal);ctx.taskScope=createTaskScope(taskText);
  const semantic=resumeTask?.understanding?.semantic||await routeTaskSemantics(taskText,agent.cfg,{signal});ctx.understanding=resumeTask?.understanding||analyzeTaskUnderstanding(taskText,{messages:agent.session.messages(),semantic});turnOutcome.understanding=ctx.understanding;
  const persistedWorkspace=resumeTask?.workspace?.root&&fs.existsSync(resumeTask.workspace.root)?{...resumeTask.workspace,created:false,continued:true,recovered:true}:null;
  ctx.projectWorkspace=persistedWorkspace||resolveTurnWorkspace({cwd:agent.cwd,text:taskText,state:ctx.state,understanding:ctx.understanding,allowCreate:agent.mode!=="PLAN"&&!agent.workspaceLocked});ctx.cwd=ctx.projectWorkspace.root;
  ctx.beginWork(taskText,{resumeSnapshot:resumeTask?.work||null});beginContinuityTurn(agent.sessionState.data,ctx.understanding);ctx.saveState();
  if(ctx.projectWorkspace.created&&!quiet)agent.ui.notify?.(`project folder · ${ctx.projectWorkspace.root}`,"ok");
  const persistRecovery=(patch={})=>{
    if(agent.depth!==0||!recoveryTask)return recoveryTask;
    try{return saveRecoveryTask(recoveryTask,{workspace:ctx.projectWorkspace,understanding:ctx.understanding,work:ctx.work?.snapshot?.()||null,todos:agent.sessionState.data.todos||[],budget:agent.taskUsageBudget?.snapshot?.()||null,provider:agent.lastProvider||agent.provider,model:agent.lastModel||agent.model,...patch});}catch{return recoveryTask;}
  };
  try{
    const before=await agent.hooks.emitCancelable("prompt:before",{agent,text:taskText});if(before?.cancel){turnOutcome.status="cancelled";turnOutcome.response=before.response||"";return before.response||"";}
    if(agent.depth===0){
      if(resumeTask){
        const restored=agent.checkpoints.resumePending(resumeTask.checkpointId||null);const checkpointId=restored||agent.checkpoints.begin(taskText.slice(0,100),{workspace:ctx.cwd,recovered:true});
        recoveryTask={...resumeTask,status:"running",pid:process.pid,resumeCount:Number(resumeTask.resumeCount||0)+1,checkpointId};persistRecovery({status:"running",checkpointId,activity:{phase:"resuming",pendingTools:[]}});
      }else{
        if(agent.checkpoints.hasPending())await agent.checkpoints.finalizePending({status:"interrupted-superseded",workspace:agent.cwd});
        supersedeRecoverableTasks(agent.cwd);
        const checkpointId=agent.checkpoints.begin(taskText.slice(0,100),{workspace:ctx.cwd});
        recoveryTask=createRecoveryTask({sourceCwd:agent.cwd,sessionFile:agent.session.file,originalText:taskText,workspace:ctx.projectWorkspace,understanding:ctx.understanding,work:ctx.work?.snapshot?.(),todos:agent.sessionState.data.todos||[],budget:agent.taskUsageBudget?.snapshot?.(),checkpointId,provider:agent.provider,model:agent.model});
      }
    }
    const mentions=await expandMentions(agent.cwd,taskText),imageRefs=await inspectImageInputs(agent.cwd,[...mentions.images,...images],agent.cfg);
    if(resumeTask)agent.session.addMessage("user",resumeInstruction(recoveryTask),{synthetic:true,recovery:true});
    else agent.session.addMessage("user",text,imageRefs.length?{images:imageRefs}:{});
    if(mentions.context&&!resumeTask)agent.session.addMessage("user",mentions.context,{synthetic:true});
    persistRecovery({activity:{phase:"routing",pendingTools:[]}});
    const routed=agent.routeLockOnce?{provider:agent.provider,model:agent.model,reason:"explicit user model selection"}:routeModel(agent.cfg,taskText,{currentProvider:agent.provider,currentModel:agent.model});agent.routeLockOnce=false;
    const provider=new FallbackProvider(agent.providers,agent.cfg,routed.provider,routed.model,{
      requestFallback:async({from,to,error})=>{
        if(quiet)return false;
        const reason=String(error?.message||error||"provider failure").replace(/\s+/g," ").slice(0,160);
        const approved=await ctx.confirm(`Selected model ${from.provider}/${from.model} failed: ${reason}\nTry configured fallback ${to.provider}/${to.model} for this turn only? Your selected model will remain locked for the next turn.`,false);
        if(!approved)agent.ui.notify(`fallback denied · staying with selected ${agent.provider}/${agent.model}`,"warn");
        return approved;
      },
      onSwitch:(ref,err)=>{if(!quiet)agent.ui.notify(`temporary fallback → ${ref.provider}/${ref.model}; selected ${agent.provider}/${agent.model} stays locked${err?` · ${String(err.message||err).slice(0,120)}`:""}`,"warn");}
    });
    const modelInfo=provider.modelInfo?.()||{context:128000};
    let initialMessages=agent.session.messages();const compact=needsCompaction(initialMessages,modelInfo,agent.cfg);
    if(compact.needed){if(!quiet)agent.ui.notify(`context ${Math.round(compact.ratio*100)}% · compacting`,"warn");await compactSession({session:agent.session,provider,systemPrompt:"",cfg:agent.cfg});}
    const executor=new ToolExecutor({registry:agent.registry,cfg:agent.cfg,hooks:agent.hooks,audit:agent.audit});let final="";
    while(true){
      budget.beforeTurn();if(signal.aborted)throw signal.reason||new Error("cancelled");
      let tools=agent.getTools({taskText});if(ctx.understanding.clarification.required)tools=tools.filter(tool=>tool.readOnly);tools=toolsForProviderRequest(tools,{provider:provider.activeRef().provider,taskText,cfg:agent.cfg});
      const memory=loadProjectMemory(ctx.cwd),agentMemory=loadAgentMemory(ctx.cwd,{query:taskText}),activeRef=provider.activeRef(),turnInstructions=ctx.projectWorkspace?.isolated?loadInstructions(ctx.cwd).text:agent.instructions.text;const replyLanguage=resolveReplyLanguage(agent.cfg.responseLanguage,taskText);const system=buildSystemPrompt({mode:agent.mode,cwd:ctx.cwd,provider:activeRef.provider,model:activeRef.model,responseLanguage:agent.cfg.responseLanguage,replyLanguage,latestUserText:taskText,tools,instructions:turnInstructions,skillsText:agent.skills.prompt(agent.sessionState.data.activeSkills),memoryText:memory.text,agentMemoryText:agentMemory.text,budgetText:agent.taskUsageBudget?.render?.()||"",todos:agent.sessionState.data.todos||[],repoSummary:ctx.projectWorkspace?.isolated?"":agent.repoSummary,projectWorkspace:ctx.projectWorkspace,taskBrief:renderTaskUnderstanding(ctx.understanding),continuityText:renderContinuity(agent.sessionState.data.continuity),recoveryText:ctx.recovery.render(),resumeText:resumeTask?renderRecoveryContext(recoveryTask):"",workProtocolText:ctx.work?.render()});
      let messages=trimToolOutputs(agent.session.messages(),{maxToolChars:agent.cfg.maxToolOutputChars,maxTotalChars:900000});messages=await materializeMessageImages(messages,modelInfo,agent.cfg);
      const currentRef=provider.activeRef();const reasoning=currentReasoning(agent.cfg,currentRef.provider,currentRef.model);const spinner=!quiet?(agent.ui.modelSpinner?.(currentRef.model,{effort:reasoning.label})||agent.uiSpinner(`${currentRef.model} · reasoning`)):null;spinner?.start();let streamed=false;
      const requestMessages=[{role:"system",content:system},...messages],budgetModel=provider.modelInfo?.()||modelInfo,budgetRef=`${currentRef.provider}/${currentRef.model}`,preflight=agent.taskUsageBudget?.beforeRequest?.({messages:requestMessages,modelInfo:budgetModel,ref:budgetRef});
      if(preflight?.warning&&agent.depth===0&&!quiet){const p=agent.taskUsageBudget.policy,ok=await ctx.confirm(`This task is nearing its safety budget (${Math.round(p.warnRatio*100)}% threshold). Current estimate: ${agent.taskUsageBudget.render()}\nContinue within the existing hard limits?`,true);if(!ok)throw new Error("task stopped at the configured cost/token warning threshold");agent.taskUsageBudget.acknowledgeWarning();}
      persistRecovery({activity:{phase:"model",pendingTools:[]}});
      if(signal.aborted)throw signal.reason||new Error("cancelled");
      let resp;try{
        resp=await provider.chat({messages:requestMessages,tools,signal,stream:agent.cfg.stream,
          onText:quiet?undefined:(chunk=>{if(!streamed){spinner?.stop();streamed=true;}agent.ui.stream(chunk);}),
          onReasoning:quiet?undefined:(chunk=>{agent.hooks.emit("model:reasoning",{agent,chunk}).catch(()=>{});})
        });
      }finally{spinner?.stop();}
      if(streamed&&!quiet)agent.ui.streamEnd();const m=resp.message||{role:"assistant",content:""};agent.lastUsage=resp.usage||{};agent.lastProvider=resp.provider||provider.activeRef().provider;agent.lastModel=resp.model||provider.activeRef().model;agent.session.addMessage("assistant",m.content??"",assistantExtra(m));if(resp.usage&&Object.keys(resp.usage).length)agent.session.addUsage(resp.usage,agent.lastProvider,agent.lastModel);
      if(resp.usage&&Object.keys(resp.usage).length){const priced=findModel(agent.cfg,agent.lastProvider,agent.lastModel)||provider.modelInfo?.()||{};agent.taskUsageBudget?.record?.(resp.usage,priced,`${agent.lastProvider}/${agent.lastModel}`);}
      persistRecovery({activity:{phase:"model-complete",pendingTools:[]}});
      await agent.hooks.emit("model:response",{agent,message:m,usage:resp.usage||{}});
      if(m.content){final+=m.content;if(!quiet&&!streamed)agent.ui.assistant(m.content);}
      const calls=m.tool_calls||[];if(!calls.length){
        const gate=ctx.work?.nextGate({clarification:ctx.understanding.clarification.required,todos:agent.sessionState.data.todos||[]});
        if(gate){const gatePrompt=ctx.work.requestGate(gate);agent.sessionState.data.lastWork=ctx.work.snapshot();ctx.saveState();persistRecovery({activity:{phase:`gate:${gate}`,pendingTools:[]}});agent.session.addMessage("user",gatePrompt,{synthetic:true});final="";if(!quiet)agent.ui.workPhase?.(gate,gate==="verify"?"evidence required":"final change review");continue;}
        const status=ctx.understanding.clarification.required?"awaiting_clarification":"completed";const work=ctx.finishWork(),failures=ctx.recovery.failureSummaries();finishContinuityTurn(agent.sessionState.data,{status,response:final,failures});ctx.saveState();turnOutcome={...turnOutcome,status,response:final,work,failures,provider:agent.lastProvider||agent.provider,model:agent.lastModel||agent.model};persistRecovery({activity:{phase:"finishing",pendingTools:[]}});if(!quiet){agent.ui.turnDone?.({usage:agent.lastUsage,tools:budget.toolCalls||0,work});visualDone=true;}return final;
      }budget.addTools(calls.length);
      const pendingTools=calls.map(c=>c.function?.name||"tool");persistRecovery({activity:{phase:"tools",pendingTools,pendingCallIds:calls.map(c=>c.id).filter(Boolean)}});
      const toolSpinner=!quiet?agent.ui.toolBatchSpinner?.(calls):null;toolSpinner?.start();
      let results;try{
        results=await executor.many(calls,ctx,quiet?{}:{
          onStart:({name,args,index})=>agent.ui.toolStart?.(name,args,{index,total:calls.length}),
          onProgress:({name,progress,index})=>agent.ui.toolProgress?.(name,progress,{index,total:calls.length}),
          onFinish:r=>agent.ui.toolResult(r.name,r.result,r.ok,r.durationMs)
        });
      }finally{toolSpinner?.stop();}
      for(const r of results)agent.session.addToolResult(r.callId||`call_${Date.now()}`,r.name,r.result);
      const work=ctx.recordWork(calls,results);persistRecovery({activity:{phase:"tools-complete",pendingTools:[],pendingCallIds:[]}});if(!quiet&&work)agent.ui.workPhase?.(work.phase,`${work.mutations} change${work.mutations===1?"":"s"} · verification ${work.verification.passed?"passed":work.verification.attempts?"failed":"pending"}`);
      if(signal.aborted)throw signal.reason||new Error("cancelled");
      const recovery=ctx.recovery.observe(results);if(recovery.needsReplan){const signalText=ctx.recovery.consumeReplan();if(signalText&&!quiet)agent.ui.recovery?.(signalText);}ctx.saveState();persistRecovery({failures:ctx.recovery.failureSummaries()});
    }
  }catch(e){
    const failures=ctx.recovery.failureSummaries(),status=signal.aborted?"cancelled":"failed",response=e?.message||String(e);finishContinuityTurn(agent.sessionState.data,{status,response,failures});ctx.saveState();turnOutcome={...turnOutcome,status,response,work:ctx.work?.snapshot?.()||null,failures,provider:agent.lastProvider||agent.provider,model:agent.lastModel||agent.model};persistRecovery({status,activity:{phase:status,pendingTools:recoveryTask?.activity?.pendingTools||[]},lastError:response,failures});
    if(!quiet&&!visualDone){agent.ui.turnDone?.({usage:agent.lastUsage,tools:budget.toolCalls||0,cancelled:signal.aborted});visualDone=true;}
    throw e;
  }finally{
    if(agent.depth===0){
      const terminal=turnOutcome.status==="completed"||turnOutcome.status==="awaiting_clarification";
      if(terminal){
        try{const checkpoint=await agent.checkpoints.commit({workspace:ctx.cwd,status:turnOutcome.status,recovered:!!resumeTask});if(checkpoint){checkpointInfo=await agent.checkpoints.describe(checkpoint);agent.sessionState.data.lastCheckpoint={...checkpointInfo};}}catch{}
      }
      try{const snap=agent.taskUsageBudget?.snapshot?.()||null;agent.lastTaskBudget=snap;agent.sessionState.data.lastTaskBudget=snap;recordAgentTurn(ctx.cwd,{...turnOutcome,usage:snap?.usage||agent.lastUsage,budget:snap,checkpoint:checkpointInfo||agent.checkpoints.pendingInfo?.()||null});agent.sessionState.data.lastProjectMemoryAt=new Date().toISOString();agent.sessionState.save();}catch{}
      if(terminal&&recoveryTask)clearRecoveryTask(recoveryTask);else if(recoveryTask)persistRecovery({status:turnOutcome.status==="started"?"interrupted":turnOutcome.status,activity:{phase:turnOutcome.status==="started"?"interrupted":turnOutcome.status,pendingTools:recoveryTask?.activity?.pendingTools||[]}});
    }
    agent.running=false;agent.abortController=null;if(agent.depth===0)agent.taskUsageBudget=null;await agent.hooks.emit("prompt:after",{agent}).catch(()=>{});
  }
}
