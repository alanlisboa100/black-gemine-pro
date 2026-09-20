import {createRuntime} from "../runtime.js";
import {SessionStore} from "../sessions/store.js";
import {BlackcoreAgent} from "../agent/agent.js";
import {ok,err,event} from "./protocol.js";

function send(obj){process.stdout.write(JSON.stringify(obj)+"\n");}
export async function rpcServer(cwd=process.cwd(),{events=false}={}){
  const runtime=await createRuntime(cwd),session=new SessionStore(cwd,null,{ephemeral:true});
  const ui={stream(text){if(events)send(event("model.delta",{text}));},streamEnd(){if(events)send(event("model.end",{}));},assistant(){},toolResult(name,result,ok,durationMs){if(events)send(event("tool.result",{name,result,ok,durationMs}));},notify(text,level){if(events)send(event("ui.notification",{text,level}));}};
  const agent=new BlackcoreAgent({cfg:runtime.cfg,session,cwd:runtime.cwd,input:null,ui,registry:runtime.registry.clone(),hooks:runtime.hooks,providers:runtime.providers,skills:runtime.skills,instructions:runtime.instructions,repoSummary:runtime.repoSummary,saveConfig:runtime.saveConfig});
  if(events){runtime.hooks.on("tool:before",({name,args})=>send(event("tool.start",{name,args})),{owner:"rpc"});runtime.hooks.on("model:reasoning",({chunk})=>send(event("model.reasoning",{text:chunk})),{owner:"rpc"});}
  let buf="",chain=Promise.resolve();process.stdin.setEncoding("utf8");process.stdin.on("data",chunk=>{buf+=chunk;let i;while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i);buf=buf.slice(i+1);if(!line.trim())continue;chain=chain.then(()=>handle(line)).catch(()=>{});}});
  async function handle(line){let req;try{req=JSON.parse(line);}catch{return send(err(null,new Error("invalid JSON"),-32700));}try{let result;switch(req.method){case"prompt":result=await agent.prompt(req.params?.text||"",{quiet:!events});break;case"stats":result=agent.stats();break;case"cancel":agent.cancel();result=true;break;case"setModel":{const provider=req.params?.provider||agent.provider,model=req.params?.model||agent.model;result=agent.pinModel(provider,model);break;}case"setMode":agent.mode=String(req.params?.mode||agent.mode).toUpperCase();result=true;break;case"tools":result=agent.getTools().map(t=>({name:t.name,description:t.description,parameters:t.parameters,readOnly:!!t.readOnly}));break;case"session":result=session.info();break;default:throw new Error(`unknown method ${req.method}`);}if(req.id!=null)send(ok(req.id,result));}catch(e){if(req.id!=null)send(err(req.id,e));}}
  process.stdin.on("end",()=>chain.finally(async()=>{agent.close();runtime.mcp.close();await runtime.extensions.unloadAll();}));
}
