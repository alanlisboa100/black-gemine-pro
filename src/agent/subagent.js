import {SessionStore} from "../sessions/store.js";
import {loadInstructions} from "../context/instructions.js";
import {TEAM_ROLES,collectDelegateEvidence,teamRoleMaxTurns,teamRoleMode,teamRolePrompt,teamRoleTools} from "./team.js";
import {graphNode,graphNodeReady,markGraphNode,parallelCandidate,graphNodesConflict,readyGraphNodes,graphTargetsConflict} from "./task-graph.js";

function delegateData({role,mode,task,result,child,started,nodeId=null,taskGraph=null,ok=true,error=null}){
  const evidence=child?collectDelegateEvidence(child):{verification:{attempts:0,passed:false,failed:false},toolFailures:0,work:null},work=evidence.work||null;
  return {
    kind:"blackcore_delegate_result",role,mode,nodeId,task:String(task||"").slice(0,1000),ok,durationMs:Date.now()-started,
    result:String(result||""),...(error?{error:String(error?.message||error).slice(0,1200)}:{}),usage:child?.lastUsage||{},
    work:work?{depth:work.depth,status:work.status,mutations:work.mutations||0,mutationRevision:work.mutationRevision||0,verification:work.verification||{},review:work.review||{},targets:work.targets||[]}:null,
    evidence:{verification:evidence.verification,toolFailures:evidence.toolFailures},taskGraph
  };
}
function delegatePayload(args){return JSON.stringify(delegateData(args),null,2);}
function delegateSpec(parent,a,ctx,node=null,strictTargets=false){
  const role=String(a.role||node?.role||"investigator").toLowerCase(),profileTools=teamRoleTools(role),mode=teamRoleMode(role,a.mode),cwd=ctx?.cwd||parent.sessionState?.data?.activeProject?.root||parent.cwd;
  return {role,profileTools,mode,cwd,strictTargets};
}
async function runDelegateChild(parent,a,ctx,{node=null,strictTargets=false,taskGraph=null}={}){
  const {role,profileTools,mode,cwd}=delegateSpec(parent,a,ctx,node,strictTargets),s=new SessionStore(cwd,null,{ephemeral:true}),started=Date.now(),parentWork=ctx?.work?.snapshot?.()||parent.sessionState?.data?.lastWork||null;
  const child=parent.spawnChild({session:s,cwd,instructions:loadInstructions(cwd),repoSummary:"",mode,provider:a.provider||parent.provider,model:a.model||parent.model,depth:parent.depth+1,teamRole:role,teamToolAllowlist:profileTools,workspaceLocked:true,graphNodeId:a.nodeId||node?.id||null,graphNodeTargets:node?.targets||null,graphNodeStrictTargets:strictTargets});
  try{
    const task=a.task||node?.text||"",prompt=teamRolePrompt(role,task,{parentGoal:ctx?.work?.text||"",parentWork,graphNode:node,strictTargets});
    const result=await child.prompt(prompt,{quiet:true,maxTurns:teamRoleMaxTurns(role,a.maxTurns,parent.cfg)});
    return delegateData({role,mode,task,result,child,started,nodeId:a.nodeId||node?.id||null,taskGraph});
  }catch(e){return delegateData({role,mode,task:a.task||node?.text||"",result:"",child,started,nodeId:a.nodeId||node?.id||null,taskGraph,ok:false,error:e});}
  finally{child.close();}
}
export function selectDelegateWave(graph,{nodeIds=null,maxAgents=4}={}){
  const requested=Array.isArray(nodeIds)&&nodeIds.length?new Set(nodeIds.map(String)):null,ready=readyGraphNodes(graph).filter(n=>!requested||requested.has(n.id)),selected=[];
  for(const node of ready){
    if(selected.length>=Math.max(1,Number(maxAgents)||4))break;
    if(!parallelCandidate(graph,node.id))continue;
    if(selected.some(other=>graphTargetsConflict(node,other)))continue;
    selected.push(node);
  }
  return selected;
}

export function makeDelegateTool(parent){
  return {
    name:"delegate",description:"Run one focused BLACKCORE specialist subagent with an isolated context window. Google multi-key handoff preserves the same conversation if a credential becomes unavailable. In task-graph mode pass nodeId for one focused node; use delegate_ready when multiple independent nodes are ready.",readOnly:false,
    parallelSafe:(a,ctx)=>{const role=String(a?.role||"investigator").toLowerCase();if(role==="investigator")return true;if(role!=="programmer"||!a?.nodeId)return false;return parallelCandidate(ctx?.state?.taskGraph,a.nodeId);},
    parallelConflict:(a,b,ctx)=>{const ar=String(a?.role||"investigator").toLowerCase(),br=String(b?.role||"investigator").toLowerCase();if(ar==="investigator"&&br==="investigator")return false;if(ar==="programmer"&&br==="programmer"&&a?.nodeId&&b?.nodeId)return graphNodesConflict(ctx?.state?.taskGraph,a.nodeId,b.nodeId);return true;},
    parameters:{type:"object",properties:{task:{type:"string"},role:{type:"string",enum:TEAM_ROLES},nodeId:{type:"string"},mode:{type:"string",enum:["PLAN","ACT"]},provider:{type:"string"},model:{type:"string"},maxTurns:{type:"integer",minimum:1,maximum:30}},required:["task"],additionalProperties:false},
    async execute(a,ctx){
      if(parent.depth>=2)throw new Error("subagent nesting depth limit reached");
      const role=String(a.role||"investigator").toLowerCase();let node=null,graph=ctx?.state?.taskGraph||null,strictTargets=false;
      if(a.nodeId){node=graphNode(graph,a.nodeId);if(!node)throw new Error(`task graph node not found: ${a.nodeId}`);if(!graphNodeReady(graph,a.nodeId))throw new Error(`task graph node ${a.nodeId} is not ready`);if(role!==node.role&&!(node.role==="programmer"&&role==="programmer"))throw new Error(`task graph node ${a.nodeId} expects role ${node.role}, not ${role}`);strictTargets=role==="programmer"&&parallelCandidate(graph,a.nodeId);graph=markGraphNode(graph,a.nodeId,"running","delegated to specialist");ctx.state.taskGraph=graph;ctx.saveState?.();}
      const data=await runDelegateChild(parent,a,ctx,{node,strictTargets,taskGraph:null});
      if(a.nodeId){graph=markGraphNode(ctx.state.taskGraph,a.nodeId,data.ok?"done":"pending",data.ok?String(data.result||"").slice(0,1000):`attempt interrupted: ${String(data.error||"unknown error").slice(0,600)}`);ctx.state.taskGraph=graph;ctx.saveState?.();}
      data.taskGraph=ctx?.state?.taskGraph||null;
      if(!a.role&&data.ok)return data.result;
      return JSON.stringify(data,null,2);
    }
  };
}

export function makeDelegateReadyTool(parent){
  return {
    name:"delegate_ready",description:"Automatically run the largest safe wave of dependency-ready task-graph nodes in parallel, up to maxParallelAgents. It assigns each ready node to its specialist, keeps target-conflicting writers sequential, and lets the Google credential pool spread concurrent model work across separate available key slots.",readOnly:false,parallelSafe:false,
    parameters:{type:"object",properties:{nodeIds:{type:"array",items:{type:"string"}},maxAgents:{type:"integer",minimum:1,maximum:4},provider:{type:"string"},model:{type:"string"},maxTurns:{type:"integer",minimum:1,maximum:30}},additionalProperties:false},
    async execute(a,ctx){
      if(parent.depth>=2)throw new Error("subagent nesting depth limit reached");
      let graph=ctx?.state?.taskGraph||null;if(!graph?.nodes?.length)throw new Error("task graph is required before delegate_ready");
      const limit=Math.min(4,Math.max(1,Number(a.maxAgents||parent.cfg.maxParallelAgents||4))),selected=selectDelegateWave(graph,{nodeIds:a.nodeIds,maxAgents:limit});
      if(!selected.length)throw new Error("no dependency-ready non-conflicting task-graph nodes are available for a parallel wave");
      const meta=selected.map(node=>({node,strictTargets:node.role==="programmer"&&parallelCandidate(graph,node.id)}));
      for(const {node} of meta)graph=markGraphNode(graph,node.id,"running",`parallel wave (${selected.length} nodes)`);
      ctx.state.taskGraph=graph;ctx.saveState?.();
      const results=await Promise.all(meta.map(({node,strictTargets})=>runDelegateChild(parent,{...a,task:node.text,role:node.role,nodeId:node.id},ctx,{node,strictTargets,taskGraph:null})));
      graph=ctx.state.taskGraph;
      for(const data of results)graph=markGraphNode(graph,data.nodeId,data.ok?"done":"pending",data.ok?String(data.result||"").slice(0,1000):`attempt interrupted: ${String(data.error||"unknown error").slice(0,600)}`);
      ctx.state.taskGraph=graph;ctx.saveState?.();
      for(const data of results)data.taskGraph=graph;
      return JSON.stringify({kind:"blackcore_delegate_batch",ok:results.every(x=>x.ok),parallel:results.length,maxAgents:limit,results,taskGraph:graph},null,2);
    }
  };
}
