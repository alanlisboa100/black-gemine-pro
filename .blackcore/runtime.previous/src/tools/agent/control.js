import {defineTool} from "../registry.js";
import {listModels} from "../../config/models.js";
import {currentReasoning,resolveReasoning,setReasoning,syncReasoningToCurrent} from "../../config/reasoning.js";
import {parseTaskBudgetValue} from "../../agent/budget.js";

function resolveModel(cfg,input=""){
  const t=String(input).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");const models=listModels(cfg);
  const aliases=[
    [/\bsol\b|gpt[\s-]*5[.,]?6[\s-]*sol/,"openai","gpt-5.6-sol"],
    [/\bterra\b|gpt[\s-]*5[.,]?6[\s-]*terra/,"openai","gpt-5.6-terra"],
    [/\bluna\b|gpt[\s-]*5[.,]?6[\s-]*luna/,"openai","gpt-5.6-luna"],
    [/(?:google.*(?:supremo|elite|free)|trio.*supremo|modelo.*supremo|model.*supremo|pool.*gratuito.*google|modelos.*gratuitos.*google|os\s*3|eles\s*3)/,"google","google-free-pool"],
    [/gemini.*3[.,]?5.*flash.*lite/,"google","gemini-3.5-flash-lite"],
    [/gemini.*3[.,]?1.*flash.*lite/,"google","gemini-3.1-flash-lite"],
    [/gemma.*4.*31b/,"google","gemma-4-31b-it"],
    [/gemma.*4.*26b/,"google","gemma-4-26b-a4b-it"],
    [/gemini.*3[.,]?8.*flash/,"google","gemini-3.8-flash"],
    [/gemini.*3[.,]?7.*flash/,"google","gemini-3.7-flash"],
    [/gemini.*3[.,]?6.*flash/,"google","gemini-3.6-flash"],
    [/gemini.*2[.,]?5.*flash/,"google","gemini-2.5-flash"],
    [/deepseek.*pro|v4[\s-]*pro|modelo[\s-]*pro|^(?:o\s+)?pro$/,"deepseek","deepseek-v4-pro"],
    [/deepseek.*flash|v4[\s-]*flash|modelo[\s-]*flash|^(?:o\s+)?flash$/,"deepseek","deepseek-v4-flash"]
  ];
  for(const [re,provider,id] of aliases)if(re.test(t)){const m=models.find(x=>x.provider===provider&&x.id===id);if(m)return m;}
  return models.find(x=>`${x.provider}/${x.id}`===input||x.id===input||String(x.label||"").toLowerCase()===t)||null;
}

export const agentControlTool=defineTool({
  name:"agent_control",
  planSafe:a=>a.action==="status",
  description:"Control BLACKCORE itself when the user asks conversationally: switch model, analysis/action mode, work style, team mode, task-graph scheduling, task cost/token budget, reasoning effort, permissions, animations, inspect status, undo or redo a file-changing task. Use this instead of telling the user to type slash commands.",
  parameters:{type:"object",properties:{action:{type:"string",enum:["status","set_model","set_autoroute","set_mode","set_work_style","set_team_mode","set_task_graph","set_budget","set_effort","set_thinking","set_permissions","set_animation","set_response_language","undo","redo"]},value:{anyOf:[{type:"string"},{type:"boolean"},{type:"null"}]}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    const agent=ctx.agent,cfg=ctx.cfg;
    if(a.action==="status"){const r=currentReasoning(cfg,agent.provider,agent.model);return JSON.stringify({model:`${agent.provider}/${agent.model}`,mode:agent.mode,workStyle:cfg.workStyle||"adaptive",agentTeamMode:cfg.agentTeamMode||"off",agentTaskGraphMode:cfg.agentTaskGraphMode||"off",maxParallelAgents:cfg.maxParallelAgents||4,lastWork:ctx.state.lastWork||null,lastCheckpoint:ctx.state.lastCheckpoint||null,lastTaskBudget:ctx.state.lastTaskBudget||null,agentPolicy:{repairCycles:cfg.agentRepairCycles??3,teamMode:cfg.agentTeamMode||"off",taskGraphMode:cfg.agentTaskGraphMode||"off",maxParallelAgents:cfg.maxParallelAgents||4,maxTurns:cfg.maxAgentTurns,maxToolCalls:cfg.maxAgentToolCalls??250,maxWallMs:cfg.maxAgentWallMs??1800000,taskBudget:cfg.agentTaskBudget||null},thinking:r.thinking!==false,effort:r.label,responseLanguage:cfg.responseLanguage||"auto",translateUserInput:false,permissions:cfg.permissionProfile,animation:cfg.animation},null,2);}
    if(a.action==="set_model"){
      const m=resolveModel(cfg,String(a.value||""));if(!m)throw new Error("model not found");
      if(m.provider===agent.provider&&m.id===agent.model)return `Model remains ${m.provider}/${m.id}.`;
      const ok=await ctx.confirm(`Change selected model from ${agent.provider}/${agent.model} to ${m.provider}/${m.id}?`,false);
      if(!ok)return "Model change not approved; current selection remains locked.";
      agent.setModel(m.provider,m.id);cfg.provider=m.provider;cfg.model=m.id;cfg.modelLock=true;cfg.autoRoute=false;cfg.autoFallback=false;agent.routeLockOnce=true;const r=syncReasoningToCurrent(cfg,m.provider,m.id);agent.saveConfig?.();return `Model changed to ${m.provider}/${m.id} with ${r.label} reasoning. Automatic routing and fallback are paused to respect the selection.`;
    }
    if(a.action==="set_autoroute"){
      const enabled=!!a.value;
      if(enabled){const ok=await ctx.confirm(`Enable automatic model routing? BLACKCORE may choose a different model for future tasks.`,false);if(!ok)return "Automatic model routing remains disabled; current model stays locked.";}
      cfg.autoRoute=enabled;cfg.modelLock=!enabled;agent.saveConfig?.();return `Automatic model selection ${enabled?"enabled":"disabled"}. ${cfg.modelLock?"Current model locked.":"BLACKCORE may choose by task."}`;
    }
    if(a.action==="set_mode"){
      const v=String(a.value||"").toUpperCase();if(!["PLAN","ACT"].includes(v))throw new Error("mode must be PLAN or ACT");agent.mode=v;cfg.mode=v;agent.saveConfig?.();return v==="PLAN"?"PLAN mode enabled; files will not be modified.":"ACT mode enabled; edits and tools are available under policy.";
    }
    if(a.action==="set_work_style"){
      const v=String(a.value||"").toLowerCase();if(!["adaptive","fast","standard","deep"].includes(v))throw new Error("work style must be adaptive, fast, standard, or deep");cfg.workStyle=v;agent.saveConfig?.();return `Work style ${v}. ${v==="adaptive"?"Simple requests stay fast; changed code is verified and broad work is reviewed.":`All future turns use the ${v} protocol until changed.`}`;
    }
    if(a.action==="set_team_mode"){
      const raw=typeof a.value==="boolean"?(a.value?"deep":"off"):String(a.value||"").toLowerCase(),v=["on","true","enabled","team","deep"].includes(raw)?"deep":["off","false","disabled"].includes(raw)?"off":raw;if(!["off","deep"].includes(v))throw new Error("team mode must be deep or off");cfg.agentTeamMode=v;agent.saveConfig?.();return v==="deep"?"Deep team mode enabled: planner → programmer → tester → reviewer handoffs are enforced for deep implementation work.":"Deep team mode disabled; the parent agent will use the normal single-agent engineering loop.";
    }
    if(a.action==="set_task_graph"){
      const raw=typeof a.value==="boolean"?(a.value?"adaptive":"off"):String(a.value||"").toLowerCase(),v=["on","true","enabled","adaptive","graph","dag"].includes(raw)?"adaptive":["off","false","disabled"].includes(raw)?"off":raw;if(!["off","adaptive"].includes(v))throw new Error("task graph mode must be adaptive or off");cfg.agentTaskGraphMode=v;agent.saveConfig?.();return v==="adaptive"?`Task-graph scheduling enabled. Deep team work will encode dependencies and can run up to ${cfg.maxParallelAgents||4} safe independent specialist tasks concurrently.`:"Task-graph scheduling disabled; deep team work remains sequential.";
    }
    if(a.action==="set_budget"){
      cfg.agentTaskBudget=parseTaskBudgetValue(cfg.agentTaskBudget,a.value);agent.saveConfig?.();return `Task budget ${cfg.agentTaskBudget.enabled?"enabled":"disabled"}: total=${Number(cfg.agentTaskBudget.maxTotalTokens||0).toLocaleString()} tokens · input=${Number(cfg.agentTaskBudget.maxInputTokens||0).toLocaleString()} · output=${Number(cfg.agentTaskBudget.maxOutputTokens||0).toLocaleString()} · cost=$${Number(cfg.agentTaskBudget.maxCostUSD||0).toFixed(2)}. New limits apply on the next top-level task.`;
    }
    if(a.action==="set_effort"){
      const v=String(a.value||"").toLowerCase(),r=resolveReasoning(cfg,agent.provider,agent.model,v);if(!r)throw new Error(`reasoning level not supported by ${agent.model}`);setReasoning(cfg,agent.provider,agent.model,r.id);syncReasoningToCurrent(cfg,agent.provider,agent.model);agent.saveConfig?.();return `Reasoning ${r.label}.`;
    }
    if(a.action==="set_thinking"){cfg.thinking=!!a.value;agent.saveConfig?.();return `Thinking ${cfg.thinking?"enabled":"disabled"}.`;}
    if(a.action==="set_permissions"){
      const v=String(a.value||"").toLowerCase();if(!["safe","balanced","yolo"].includes(v))throw new Error("permissions must be safe, balanced, or yolo");cfg.permissionProfile=v;cfg.confirmDangerous=v!=="yolo";cfg.confirmExternalReads=v!=="yolo";cfg.confirmExternalWrites=v!=="yolo";agent.security.cfg=cfg;agent.saveConfig?.();return `Permissions ${v}.`;
    }
    if(a.action==="set_animation"){cfg.animation=!!a.value;agent.saveConfig?.();return `Animations ${cfg.animation?"enabled":"disabled"}.`;}
    if(a.action==="set_response_language"){const value=String(a.value||"").toLowerCase();if(!["auto","en","english","pt","pt-br","portugues","portuguese"].includes(value))throw new Error("response language must be auto, en, or pt-BR");cfg.responseLanguage=["pt","pt-br","portugues","portuguese"].includes(value)?"pt-BR":["en","english"].includes(value)?"en":"auto";agent.saveConfig?.();return `Assistant response language ${cfg.responseLanguage}; user input remains unchanged.`;}
    if(a.action==="undo")return await agent.checkpoints.undo();
    if(a.action==="redo")return await agent.checkpoints.redo();
  }
});
