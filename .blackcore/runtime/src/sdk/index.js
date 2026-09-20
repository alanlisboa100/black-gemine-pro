import {createRuntime} from "../runtime.js";
import {SessionStore} from "../sessions/store.js";
import {BlackcoreAgent} from "../agent/agent.js";

export async function createBlackcoreSession({cwd=process.cwd(),sessionFile=null,ephemeral=true,provider=null,model=null,mode=null,onText=null,onToolResult=null,onNotify=null,input=null}={}){
  const runtime=await createRuntime(cwd),session=new SessionStore(cwd,sessionFile,{ephemeral}),ui={stream(text){onText?.(text);},streamEnd(){},assistant(text){onText?.(text);},toolResult(name,result,ok,durationMs){onToolResult?.({name,result,ok,durationMs});},notify(text,level){onNotify?.({text,level});}};
  const agent=new BlackcoreAgent({cfg:runtime.cfg,session,cwd:runtime.cwd,input,ui,registry:runtime.registry.clone(),hooks:runtime.hooks,providers:runtime.providers,skills:runtime.skills,instructions:runtime.instructions,repoSummary:runtime.repoSummary,saveConfig:runtime.saveConfig,provider,model,mode});
  if(provider||model)agent.pinModel(agent.provider,agent.model);
  const setModel=(p,m)=>agent.pinModel(p||agent.provider,m||agent.model);
  return {runtime,session,agent,prompt:(text,opts={})=>agent.prompt(text,{quiet:!onText,...opts}),cancel:()=>agent.cancel(),setModel,stats:()=>agent.stats(),close:async()=>{agent.close();runtime.mcp.close();await runtime.extensions.unloadAll();}};
}
export {ToolRegistry,defineTool} from "../tools/registry.js";
export {ProviderRegistry} from "../providers/registry.js";
export {SessionStore} from "../sessions/store.js";
export {HookBus} from "../plugins/hooks.js";
export {DEFAULT_CONFIG,VERSION} from "../config/defaults.js";
