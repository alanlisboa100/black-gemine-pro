import {defineTool} from "../registry.js";
import {normalizeTaskGraph,normalizeGraphNode,updateGraphNode,taskGraphEnvelope,taskGraphSummary,readyGraphNodes} from "../../agent/task-graph.js";

const NODE_SCHEMA={type:"object",properties:{id:{type:"string"},text:{type:"string"},role:{type:"string",enum:["programmer","investigator","tester","reviewer"]},dependsOn:{type:"array",items:{type:"string"}},targets:{type:"array",items:{type:"string"}},status:{type:"string",enum:["pending","running","done","blocked","skipped"]},summary:{type:"string"}},required:["id","text"],additionalProperties:false};

function output(graph){const env=taskGraphEnvelope(graph);return JSON.stringify(env,null,2);}
export const taskGraphTool=defineTool({
  name:"task_graph",description:"Create and maintain BLACKCORE's dependency-aware task DAG for deep work. Use it after the planner handoff to record independent work units, dependencies, roles, and expected target paths. Ready nodes with disjoint targets may be delegated in parallel. This changes only session planning metadata, never project files.",planSafe:()=>true,
  parameters:{type:"object",properties:{action:{type:"string",enum:["list","replace","add","update","ready","clear"]},goal:{type:"string"},nodes:{type:"array",items:NODE_SCHEMA},node:{...NODE_SCHEMA},id:{type:"string"},text:{type:"string"},role:{type:"string",enum:["programmer","investigator","tester","reviewer"]},dependsOn:{type:"array",items:{type:"string"}},targets:{type:"array",items:{type:"string"}},status:{type:"string",enum:["pending","running","done","blocked","skipped"]},summary:{type:"string"}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    const state=ctx.state;let graph=state.taskGraph||normalizeTaskGraph({goal:a.goal||"",nodes:[]});
    if(a.action==="clear"){state.taskGraph=null;ctx.saveState?.();return JSON.stringify({kind:"blackcore_task_graph",graph:null,summary:{total:0,ready:[]}},null,2);}
    if(a.action==="replace")graph=normalizeTaskGraph({goal:a.goal||ctx.work?.text||graph.goal||"",nodes:a.nodes||[]});
    if(a.action==="add"){
      const node=normalizeGraphNode(a.node||{id:a.id,text:a.text,role:a.role,dependsOn:a.dependsOn,targets:a.targets,status:a.status,summary:a.summary},graph.nodes.length);if(graph.nodes.some(x=>x.id===node.id))throw new Error(`task graph node already exists: ${node.id}`);graph=normalizeTaskGraph({...graph,nodes:[...graph.nodes,node]});
    }
    if(a.action==="update"){
      if(!a.id)throw new Error("id required");graph=updateGraphNode(graph,a.id,{text:a.text,role:a.role,dependsOn:a.dependsOn,targets:a.targets,status:a.status,summary:a.summary});
    }
    state.taskGraph=graph;ctx.saveState?.();
    if(a.action==="ready")return JSON.stringify({kind:"blackcore_task_graph_ready",ready:readyGraphNodes(graph),summary:taskGraphSummary(graph)},null,2);
    return output(graph);
  }
});
