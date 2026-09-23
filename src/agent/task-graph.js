import path from "node:path";
import {redactSecrets} from "../security/secrets.js";

export const GRAPH_ROLES=Object.freeze(["programmer","investigator","tester","reviewer"]);
export const GRAPH_STATUSES=Object.freeze(["pending","running","done","blocked","skipped"]);
const FINAL=new Set(["done","skipped"]);

function clean(value,max=500){return redactSecrets(String(value??"").replace(/\s+/g," ").trim()).slice(0,max);}
function uniq(values=[]){return [...new Set((values||[]).map(x=>clean(x,300)).filter(Boolean))];}
function idOf(value,index=0){const raw=clean(value||`task-${index+1}`,80).toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"");return raw||`task-${index+1}`;}
function targetNorm(value){const s=clean(value,400).replace(/\\/g,"/").replace(/^\.\//,"").replace(/\/+$/g,"");return s||".";}
function isWildcard(value){return /[*?{}[\]]/.test(String(value||""));}
function targetOverlap(a,b){
  const x=targetNorm(a),y=targetNorm(b);if(x==="."||y==="."||isWildcard(x)||isWildcard(y))return true;
  return x===y||x.startsWith(y+"/")||y.startsWith(x+"/");
}
function roleReadOnly(role){return role==="investigator"||role==="tester"||role==="reviewer";}

export function normalizeGraphNode(node={},index=0){
  return {id:idOf(node.id,index),text:clean(node.text||node.title||`Task ${index+1}`,1000),role:GRAPH_ROLES.includes(String(node.role||"").toLowerCase())?String(node.role).toLowerCase():"programmer",dependsOn:uniq(node.dependsOn||node.dependencies||[]),targets:uniq(node.targets||[]).map(targetNorm),status:GRAPH_STATUSES.includes(node.status)?node.status:"pending",summary:clean(node.summary||"",1200),updatedAt:node.updatedAt||new Date().toISOString()};
}
export function validateTaskGraph(graph={}){
  const nodes=(graph.nodes||[]).map(normalizeGraphNode),ids=new Set();
  for(const n of nodes){if(ids.has(n.id))throw new Error(`duplicate task graph node: ${n.id}`);ids.add(n.id);}
  for(const n of nodes)for(const dep of n.dependsOn){if(dep===n.id)throw new Error(`task graph node ${n.id} cannot depend on itself`);if(!ids.has(dep))throw new Error(`task graph node ${n.id} depends on missing node ${dep}`);}
  const by=new Map(nodes.map(n=>[n.id,n])),visiting=new Set(),visited=new Set();
  const visit=id=>{if(visited.has(id))return;if(visiting.has(id))throw new Error(`task graph cycle detected at ${id}`);visiting.add(id);for(const d of by.get(id)?.dependsOn||[])visit(d);visiting.delete(id);visited.add(id);};
  for(const n of nodes)visit(n.id);return nodes;
}
export function normalizeTaskGraph(graph={}){
  const nodes=validateTaskGraph(graph);const now=new Date().toISOString();return {version:1,goal:clean(graph.goal||"",1600),nodes,createdAt:graph.createdAt||now,updatedAt:now};
}
export function graphNode(graph,id){return (graph?.nodes||[]).find(n=>n.id===id)||null;}
export function dependencyState(graph,node){
  const by=new Map((graph?.nodes||[]).map(n=>[n.id,n]));const deps=(node?.dependsOn||[]).map(id=>by.get(id)).filter(Boolean);
  if(deps.some(x=>x.status==="blocked"))return "blocked";
  if(deps.every(x=>FINAL.has(x.status)))return "ready";return "waiting";
}
export function readyGraphNodes(graph){return (graph?.nodes||[]).filter(n=>n.status==="pending"&&dependencyState(graph,n)==="ready");}
export function graphNodeReady(graph,id){const n=graphNode(graph,id);return !!n&&n.status==="pending"&&dependencyState(graph,n)==="ready";}
export function graphTargetsConflict(a,b){
  if(!a||!b)return true;if(roleReadOnly(a.role)&&roleReadOnly(b.role))return false;
  const at=a.targets||[],bt=b.targets||[];if(!at.length||!bt.length)return true;
  return at.some(x=>bt.some(y=>targetOverlap(x,y)));
}
export function graphNodesConflict(graph,aId,bId){return graphTargetsConflict(graphNode(graph,aId),graphNode(graph,bId));}
export function parallelCandidate(graph,id){const n=graphNode(graph,id);return !!n&&graphNodeReady(graph,id)&&(roleReadOnly(n.role)||(n.role==="programmer"&&n.targets.length>0&&!n.targets.some(isWildcard)));}
export function graphWaves(graph){
  const nodes=(graph?.nodes||[]).map(x=>({...x})),by=new Map(nodes.map(n=>[n.id,n])),remaining=new Set(nodes.filter(n=>!FINAL.has(n.status)&&n.status!=="blocked").map(n=>n.id)),done=new Set(nodes.filter(n=>FINAL.has(n.status)).map(n=>n.id)),waves=[];
  let guard=0;while(remaining.size&&guard++<nodes.length+2){const ready=[...remaining].map(id=>by.get(id)).filter(n=>n.dependsOn.every(d=>done.has(d)));if(!ready.length)break;
    const groups=[];for(const n of ready){let placed=false;for(const g of groups){if(g.every(other=>!graphTargetsConflict(n,other))){g.push(n);placed=true;break;}}if(!placed)groups.push([n]);}
    waves.push(groups.map(g=>g.map(n=>n.id)));for(const n of ready){remaining.delete(n.id);done.add(n.id);}
  }return waves;
}
export function taskGraphSummary(graph){
  const nodes=graph?.nodes||[],ready=readyGraphNodes(graph),waiting=nodes.filter(n=>n.status==="pending"&&dependencyState(graph,n)==="waiting"),dependencyBlocked=nodes.filter(n=>n.status==="pending"&&dependencyState(graph,n)==="blocked");
  return {total:nodes.length,pending:nodes.filter(n=>n.status==="pending").length,running:nodes.filter(n=>n.status==="running").length,done:nodes.filter(n=>n.status==="done").length,blocked:nodes.filter(n=>n.status==="blocked").length,skipped:nodes.filter(n=>n.status==="skipped").length,ready:ready.map(n=>n.id),waiting:waiting.map(n=>n.id),dependencyBlocked:dependencyBlocked.map(n=>n.id),waves:graphWaves(graph)};
}
export function taskGraphEnvelope(graph){return {kind:"blackcore_task_graph",graph:normalizeTaskGraph(graph||{}),summary:taskGraphSummary(normalizeTaskGraph(graph||{}))};}
export function updateGraphNode(graph,id,patch={}){
  const next=normalizeTaskGraph(graph||{}),node=graphNode(next,id);if(!node)throw new Error(`task graph node not found: ${id}`);
  if(patch.text!=null)node.text=clean(patch.text,1000);if(patch.role!=null){const r=String(patch.role).toLowerCase();if(!GRAPH_ROLES.includes(r))throw new Error(`invalid task graph role: ${r}`);node.role=r;}
  if(patch.dependsOn!=null)node.dependsOn=uniq(patch.dependsOn);if(patch.targets!=null)node.targets=uniq(patch.targets).map(targetNorm);if(patch.status!=null){if(!GRAPH_STATUSES.includes(patch.status))throw new Error(`invalid task graph status: ${patch.status}`);node.status=patch.status;}if(patch.summary!=null)node.summary=clean(patch.summary,1200);node.updatedAt=new Date().toISOString();next.updatedAt=node.updatedAt;return normalizeTaskGraph(next);
}
export function markGraphNode(graph,id,status,summary=""){return updateGraphNode(graph,id,{status,summary});}
export function graphTargetAllowed(node,target){
  if(!node?.targets?.length)return false;const rel=targetNorm(target);return node.targets.some(base=>!isWildcard(base)&&(rel===base||rel.startsWith(base+"/")||base.startsWith(rel+"/")));
}
export function taskGraphPrompt(graph){
  if(!graph?.nodes?.length)return "";const s=taskGraphSummary(graph),lines=["TASK DEPENDENCY GRAPH",`Progress: ${s.done}/${s.total} done · ${s.running} running · ${s.blocked} blocked.`,`Ready now: ${s.ready.join(", ")||"none"}.`];
  for(const n of graph.nodes.slice(0,30)){const dep=n.dependsOn.length?` deps=[${n.dependsOn.join(",")}]`:"",targets=n.targets.length?` targets=[${n.targets.join(",")}]`:"";lines.push(`- ${n.id} [${n.status}] role=${n.role}${dep}${targets}: ${n.text}`);}if(s.waves.length)lines.push(`Safe dependency waves (parallel groups inside each wave): ${JSON.stringify(s.waves)}`);return lines.join("\n");
}
