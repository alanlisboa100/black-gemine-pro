import {PLAN_ALLOWED} from "../tools/builtins.js";
export function activeTools(registry,cfg,mode,state,{subagent=false}={}){
  let tools=registry.list(cfg.activeTools);const disabled=new Set(state.toolSettings?.disabled||[]);tools=tools.filter(t=>!disabled.has(t.name));
  if(mode==="PLAN")tools=tools.filter(t=>PLAN_ALLOWED.has(t.name)||t.readOnly);
  if(subagent)tools=tools.filter(t=>t.name!=="delegate"&&t.name!=="delegate_ready");
  return tools;
}
