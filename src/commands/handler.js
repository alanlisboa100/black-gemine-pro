import fs from "node:fs";
import path from "node:path";
import {HELP} from "./help.js";
import {listModels,parseModelRef} from "../config/models.js";
import {choose} from "../tui/chooser.js";
import {SessionStore} from "../sessions/store.js";
import {searchSessions} from "../sessions/search.js";
import {exportHtml,exportJson} from "../sessions/export.js";
import {importSession} from "../sessions/import.js";
import {compactSession} from "../sessions/compaction.js";
import {execCapture} from "../utils/exec.js";
import {c} from "../tui/ansi.js";
import {BC_HOME} from "../utils/paths.js";
import {formatUsage,estimateCost} from "../providers/usage.js";
import {findModel} from "../config/models.js";
import {routeModel} from "../providers/router.js";
import {inspectSessionFile,repairSessionFile} from "../sessions/repair.js";
import {clipboardSet,clipboardGet} from "../utils/clipboard.js";
import {pickModelAndEffort} from "../tui/model-picker.js";
import {currentReasoning,reasoningProfile,resolveReasoning,setReasoning,syncReasoningToCurrent} from "../config/reasoning.js";
import {inspectGitReview} from "../tools/git/review.js";
import {createWorktree,listWorktrees,removeWorktree} from "../tools/git/worktree.js";
import {parseTaskBudgetValue} from "../agent/budget.js";
import {loadAgentMemory,clearAgentMemory} from "../context/agent-memory.js";
import {colorDiffPatch,formatGitReview,formatWorktreePanel} from "../tui/git-review.js";

function usage(u={}){return formatUsage(u);}
export async function handleCommand(app,cmd){
  const {runtime,input}=app,{cfg}=runtime,ui=runtime.ui,arg=cmd.arg.trim();const agent=app.agent,session=app.session;
  switch(cmd.name){
    case"quit":case"exit":return {exit:true};
    case"help":ui.raw(HELP+"\n");return{};
    case"clear":ui.clear();return{};
    case"hotkeys":ui.raw("Ctrl+C cancels active model/tool work. Ctrl+G via /editor opens $EDITOR. Use !cmd to include shell output, !!cmd for local-only shell.\n");return{};
    case"model":{const picked=await pickModelAndEffort(app);if(picked){ui.notify(`model ${picked.model.id} · reasoning ${picked.reasoning.label}`);ui.header(app.headerInfo());}return{};}
    case"models":{
      if(process.stdin.isTTY&&process.stdout.isTTY){
        const picked=await pickModelAndEffort(app);
        if(picked){ui.notify(`model ${picked.model.label||picked.model.id} · ${picked.reasoning.label}`);ui.header(app.headerInfo());}
      }else for(const m of listModels(cfg))ui.write(`${m.provider}/${m.id} · context ${m.context||"?"}`);
      return{};
    }
    case"thinking":{
      const wantsOn=arg?["on","true","1","yes"].includes(arg.toLowerCase()):currentReasoning(cfg,agent.provider,agent.model).thinking===false;
      const profile=reasoningProfile(agent.model);
      if(!profile){ui.notify(`${agent.model} uses the provider default configuration; use /effort when available.`,"warn");return{};}
      const level=wantsOn
        ?(profile.levels.find(x=>x.id===profile.default)||profile.levels.find(x=>x.thinking!==false)||profile.levels[0])
        :profile.levels.find(x=>x.thinking===false);
      if(!level){ui.notify(`${agent.model} does not offer a no-reasoning mode.`,"warn");return{};}
      setReasoning(cfg,agent.provider,agent.model,level.id);syncReasoningToCurrent(cfg,agent.provider,agent.model);runtime.saveConfig();ui.notify(`thinking ${level.thinking===false?"off":"on"} · reasoning ${level.label}`);return{};
    }
    case"autoroute":cfg.autoRoute=arg?["on","true","1","yes"].includes(arg.toLowerCase()):!cfg.autoRoute;cfg.modelLock=!cfg.autoRoute;runtime.saveConfig();ui.notify(`automatic model routing ${cfg.autoRoute?"on · future tasks may choose a model":"off · model locked"}`);return{};
    case"autofallback":cfg.autoFallback=arg?["on","true","1","yes"].includes(arg.toLowerCase()):!cfg.autoFallback;runtime.saveConfig();ui.notify(`provider fallback ${cfg.autoFallback?"armed · every model change still asks first":"off · selected model stays locked"}`);return{};
    case"fallbacks":ui.raw(JSON.stringify(cfg.fallbackModels||[],null,2)+"\n");return{};
    case"route":{const r=routeModel(cfg,arg,{currentProvider:agent.provider,currentModel:agent.model});ui.raw(JSON.stringify(r,null,2)+"\n");return{};}
    case"review":{
      const full=/\bfull\b/i.test(arg),scope=/\bstaged\b/i.test(arg)?"staged":/\bworking\b/i.test(arg)?"working":"all";
      const review=await inspectGitReview(runtime.cwd,{scope,maxPatchChars:full?30000:0});ui.raw(formatGitReview(review)+"\n");
      if(full&&review.patch){ui.raw(colorDiffPatch(review.patch)+(review.patchTruncated?"\n… patch preview truncated; use git diff for the full patch.\n":"\n"));}
      return{};
    }
    case"worktree":{
      const [action="list",branch,...rest]=arg.split(/\s+/).filter(Boolean),ctx={cwd:runtime.cwd,cfg,agent,checkpoints:agent.checkpoints,confirm:(q,d)=>input.confirm(q,d)};
      if(action==="list"){ui.raw(formatWorktreePanel(await listWorktrees(ctx))+"\n");return{};}
      if(action==="create"){
        if(!branch){ui.notify("use /worktree create <branch> [path]","warn");return{};}
        const r=await createWorktree(ctx,{branch,path:rest[0]});ui.notify(r.ok?`worktree ready · ${r.path}`:r.reason,"warn");return{};
      }
      if(action==="remove"){
        if(!branch){ui.notify("use /worktree remove <path>","warn");return{};}
        const r=await removeWorktree(ctx,{path:branch,force:rest.includes("--force")});ui.notify(r.ok?`worktree removed · ${r.path}`:r.reason,"warn");return{};
      }
      ui.notify("use /worktree [list|create|remove]","warn");return{};
    }
    case"effort":{if(!arg){const x=currentReasoning(cfg,agent.provider,agent.model);ui.status(`current reasoning: ${x.label}`);return{};}const x=resolveReasoning(cfg,agent.provider,agent.model,arg);if(!x){ui.notify(`reasoning level not supported by ${agent.model}`,"warn");return{};}setReasoning(cfg,agent.provider,agent.model,x.id);syncReasoningToCurrent(cfg,agent.provider,agent.model);runtime.saveConfig();ui.notify(`reasoning ${x.label}`);return{};}
    case"settings":ui.raw(JSON.stringify({provider:agent.provider,model:agent.model,modelLock:cfg.modelLock!==false,autoRoute:cfg.autoRoute,autoFallback:cfg.autoFallback,fallbackApproval:"always required",crossProviderFallback:cfg.crossProviderFallback===true,thinking:cfg.thinking,reasoningEffort:cfg.reasoningEffort,workStyle:cfg.workStyle||"adaptive",agentTeamMode:cfg.agentTeamMode||"off",agentTaskGraphMode:cfg.agentTaskGraphMode||"off",maxParallelAgents:cfg.maxParallelAgents||4,agentTaskBudget:cfg.agentTaskBudget||null,lastTaskBudget:agent.sessionState.data.lastTaskBudget||null,responseLanguage:cfg.responseLanguage,translateUserInput:cfg.translateUserInput===true,mode:agent.mode,permissionProfile:cfg.permissionProfile,stream:cfg.stream,animation:cfg.animation,maxAgentTurns:cfg.maxAgentTurns,contextReserveTokens:cfg.contextReserveTokens},null,2)+"\n");return{};
    case"status":ui.statusPanel({provider:agent.provider,model:agent.model,effort:currentReasoning(cfg,agent.provider,agent.model).label,mode:agent.mode,cwd:runtime.cwd,tools:agent.getTools().length,session:session.info()});return{};
    case"language":{
      if(!arg){ui.status(`assistant response language: ${cfg.responseLanguage||"auto"}; user input translation: disabled`);return{};}
      const value=arg.toLowerCase();if(!["auto","en","english","pt-br","pt","portugues","portuguese"].includes(value)){ui.notify("use /language auto|en|pt-BR","warn");return{};}
      cfg.responseLanguage=["pt-br","pt","portugues","portuguese"].includes(value)?"pt-BR":["en","english"].includes(value)?"en":"auto";runtime.saveConfig();ui.notify(`assistant response language ${cfg.responseLanguage}; user input remains unchanged`);return{};
    }
    case"permissions":if(!["safe","balanced","yolo"].includes(arg)){ui.status(`current ${cfg.permissionProfile}; use safe|balanced|yolo`);return{};}cfg.permissionProfile=arg;cfg.confirmDangerous=arg!=="yolo";cfg.confirmExternalReads=arg!=="yolo";cfg.confirmExternalWrites=arg!=="yolo";runtime.saveConfig();agent.security.cfg=cfg;ui.notify(`permissions ${arg}`);return{};
    case"work":{
      if(arg){const value=arg.toLowerCase();if(!["adaptive","fast","standard","deep"].includes(value)){ui.notify("use /work adaptive|fast|standard|deep","warn");return{};}cfg.workStyle=value;runtime.saveConfig();ui.notify(`work protocol ${value}`);return{};}
      ui.raw(JSON.stringify({configured:cfg.workStyle||"adaptive",lastTurn:agent.sessionState.data.lastWork||null},null,2)+"\n");return{};
    }
    case"budget":{
      if(!arg){ui.raw(JSON.stringify({configured:cfg.agentTaskBudget||null,lastTask:agent.sessionState.data.lastTaskBudget||null},null,2)+"\n");return{};}
      cfg.agentTaskBudget=parseTaskBudgetValue(cfg.agentTaskBudget,arg);runtime.saveConfig();ui.notify(`task budget ${cfg.agentTaskBudget.enabled?"on":"off"} · total ${Number(cfg.agentTaskBudget.maxTotalTokens||0).toLocaleString()} tokens · cost $${Number(cfg.agentTaskBudget.maxCostUSD||0).toFixed(2)}`);return{};
    }
    case"memory-history":{
      const active=app.workingCwd();if(/^clear$/i.test(arg)){const ok=await input.confirm(`Clear BLACKCORE automatic project history for ${active}?`,false);if(ok)ui.notify(clearAgentMemory(active)?"automatic project history cleared":"no automatic project history found");return{};}
      const m=loadAgentMemory(active,{query:arg||"",maxChars:30000,maxTasks:20});ui.raw((m.text||"No automatic project history yet.")+"\n");return{};
    }
    case"tools":for(const t of agent.getTools())ui.write(`${t.name.padEnd(18)} ${t.readOnly?"read":"write"} · ${t.description}`);return{};
    case"tool":{const [name,state]=arg.split(/\s+/),tool=runtime.registry.get(name);if(!tool){ui.notify("tool not found","error");return{};}const disabled=new Set(agent.sessionState.data.toolSettings?.disabled||[]);if(state==="off")disabled.add(name);else if(state==="on")disabled.delete(name);else{ui.status(`${name}: ${disabled.has(name)?"off":"on"}`);return{};}agent.sessionState.data.toolSettings={disabled:[...disabled]};agent.sessionState.save();ui.notify(`${name} ${state}`);return{};}
    case"reload":await runtime.reload();ui.notify("extensions, skills and prompts reloaded");return{};
    case"doctor":{const {doctor}=await import("../doctor.js");await doctor(runtime.cwd,{api:false,full:/\bfull\b/i.test(arg),permissions:/\bpermissions?\b/i.test(arg)});return{};}
    case"new":await app.replaceSession(new SessionStore(runtime.cwd));ui.notify(`new session ${app.session.info().id}`);return{};
    case"sessions":{const files=SessionStore.list(runtime.cwd).slice(0,30);files.forEach((f,i)=>{const s=new SessionStore(runtime.cwd,f);const inf=s.info();ui.write(`${i+1}. ${inf.id.slice(0,12)} · ${inf.name||"unnamed"} · ${inf.messages} msgs`);});return{};}
    case"resume":{let file=SessionStore.find(runtime.cwd,arg);if(!file&&arg){const hits=searchSessions(runtime.cwd,arg);file=hits[0]?.file;}if(!file){ui.notify("session not found","error");return{};}await app.replaceSession(new SessionStore(runtime.cwd,file));ui.notify(`resumed ${app.session.info().id}`);return{};}
    case"resume-task":await app.resumeInterruptedTask(null,{ask:true});return{};
    case"name":session.name(arg||null);ui.notify(`session name ${arg||"cleared"}`);return{};
    case"session":ui.raw(JSON.stringify(session.info(),null,2)+"\n");ui.status(`last usage ${usage(agent.lastUsage)} · session ${usage(session.usageTotals())}`);return{};
    case"usage":{
      const rows=session.usageByModel();let grand=0,hasCost=false;
      if(!rows.length){ui.status("no token usage recorded in this branch");return{};}
      for(const row of rows){const [provider,...parts]=row.ref.split("/"),model=parts.join("/"),info=findModel(cfg,provider,model)||{},cost=estimateCost(row.usage,info);if(cost){grand+=cost.total;hasCost=true;}ui.write(`${row.ref.padEnd(36)} ${formatUsage(row.usage)}${cost?` · ~${cost.currency} ${cost.total.toFixed(4)}`:""}`);}
      if(hasCost)ui.status(`estimated session cost: USD ${grand.toFixed(4)} (pricing config; provider billing is authoritative)`);return{};
    }
    case"tree":ui.raw(session.tree.render({activeId:session.activeId,max:400})+"\n");return{};
    case"session-check":{const r=inspectSessionFile(session.file);ui.raw(JSON.stringify(r,null,2)+"\n");return{};}
    case"session-repair":{if(session.ephemeral){ui.notify("ephemeral session has no file","warn");return{};}const ok=await input.confirm("Repair current session file? A backup will be created.",false);if(!ok)return{};const r=repairSessionFile(session.file);await app.replaceSession(new SessionStore(runtime.cwd,session.file));ui.raw(JSON.stringify(r,null,2)+"\n");return{};}
    case"jump":try{session.setActive(arg);ui.notify(`active entry ${arg}`);}catch(e){ui.notify(e.message,"error");}return{};
    case"fork":try{await app.replaceSession(session.forkFrom(arg));ui.notify("forked session");}catch(e){ui.notify(e.message,"error");}return{};
    case"clone":await app.replaceSession(session.cloneTo());ui.notify("cloned session branch");return{};
    case"label":{const [entry,...rest]=arg.split(/\s+/);try{session.label(entry,rest.join(" "));ui.notify("label saved");}catch(e){ui.notify(e.message,"error");}return{};}
    case"compact":{const p=runtime.providers.create(agent.provider,agent.model);const r=await compactSession({session,provider:p,cfg,customPrompt:arg});ui.notify(r.compacted?`compacted ${r.covered} messages`:"nothing to compact");return{};}
    case"export":{const file=path.resolve(arg||`blackcore-session-${Date.now()}.html`);exportHtml(session,file);ui.notify(`exported ${file}`);return{};}
    case"export-json":{const file=path.resolve(arg||`blackcore-session-${Date.now()}.json`);exportJson(session,file);ui.notify(`exported ${file}`);return{};}
    case"import":try{await app.replaceSession(importSession(runtime.cwd,path.resolve(arg)));ui.notify("session imported");}catch(e){ui.notify(e.message,"error");}return{};
    case"plan":agent.mode="PLAN";cfg.mode="PLAN";runtime.saveConfig();ui.notify("PLAN mode");return{};
    case"act":agent.mode="ACT";cfg.mode="ACT";runtime.saveConfig();ui.notify("ACT mode");return{};
    case"context":runtime.instructions.files.length?runtime.instructions.files.forEach(f=>ui.write(f)):ui.status("no BLACKCORE.md / AGENTS.md files loaded");return{};
    case"skills":for(const s of runtime.skills.list())ui.write(`${s.name.padEnd(22)} ${s.description}`);return{};
    case"skill":{const s=runtime.skills.get(arg);if(!s){ui.notify("skill not found","error");return{};}const set=new Set(agent.sessionState.data.activeSkills||[]);set.add(s.name);agent.sessionState.data.activeSkills=[...set];agent.sessionState.save();ui.notify(`skill ${s.name} active`);return{};}
    case"unskill":{const set=new Set(agent.sessionState.data.activeSkills||[]);set.delete(arg);agent.sessionState.data.activeSkills=[...set];agent.sessionState.save();ui.notify(`skill ${arg} inactive`);return{};}
    case"prompts":for(const p of runtime.prompts.list())ui.write(p.name);return{};
    case"prompt":{const [name,...args]=arg.split(/\s+/);try{const text=runtime.prompts.render(name,args);await agent.prompt(text);}catch(e){ui.notify(e.message,"error");}return{};}
    case"todos":ui.raw(JSON.stringify(agent.sessionState.data.todos||[],null,2)+"\n");return{};
    case"graph":case"task-graph":ui.raw(JSON.stringify(agent.sessionState.data.taskGraph||{nodes:[]},null,2)+"\n");return{};
    case"checkpoints":agent.checkpoints.list().slice(0,30).forEach((f,i)=>ui.write(`${i+1}. ${path.basename(f)}`));return{};
    case"undo":try{ui.notify(await agent.checkpoints.undo());}catch(e){ui.notify(e.message,"error");}return{};
    case"redo":try{ui.notify(await agent.checkpoints.redo());}catch(e){ui.notify(e.message,"error");}return{};
    case"processes":ui.raw(JSON.stringify(agent.processes.list(),null,2)+"\n");return{};
    case"extensions":for(const x of runtime.extensions.loaded.values())ui.write(`${x.name} · ${x.file}`);return{};
    case"trust":{
      const [scope,...rest]=arg.split(/\s+/),value=rest.join(" ").trim();
      if(scope==="extension"){
        const expanded=value.replace(/^~(?=\/|$)/,process.env.HOME||BC_HOME),file=path.resolve(expanded),globalRoot=path.join(BC_HOME,"extensions");if(!value||!file.startsWith(globalRoot+path.sep)){ui.notify(`extension must be inside ${globalRoot}`,"error");return{};}cfg.trustedGlobalExtensions??=[];if(!cfg.trustedGlobalExtensions.includes(file))cfg.trustedGlobalExtensions.push(file);runtime.saveConfig();ui.notify("global extension trusted; /reload to load it");return{};
      }
      if(scope==="package"){
        const found=runtime.packageManager.list().find(p=>path.basename(p)===value);if(!found){ui.notify("package not found","error");return{};}runtime.packageManager.trust(found);runtime.saveConfig();ui.notify("package trusted; /reload to load its extensions");return{};
      }
      if(scope==="mcp"){
        if(!value||!cfg.mcp?.servers?.[value]){ui.notify("MCP server not found in global settings","error");return{};}
        cfg.trustedMcpServers??=[];if(!cfg.trustedMcpServers.includes(value))cfg.trustedMcpServers.push(value);runtime.saveConfig();ui.notify(`MCP server ${value} trusted; restart BLACKCORE to load it`);return{};
      }
      const r=path.resolve(runtime.cwd);cfg.trustedProjects??=[];if(!cfg.trustedProjects.includes(r))cfg.trustedProjects.push(r);runtime.saveConfig();ui.notify("project trusted; /reload to load project extensions");return{};
    }
    case"mcp":ui.raw(JSON.stringify(runtime.mcp.list(),null,2)+"\n");return{};
    case"packages":for(const p of runtime.packageManager.list())ui.write(p);return{};
    case"package-install":try{ui.notify(`installed ${await runtime.packageManager.install(arg)}; /reload`);}catch(e){ui.notify(e.message,"error");}return{};
    case"package-remove":ui.notify(runtime.packageManager.remove(arg)?`removed ${arg}`:`not found ${arg}`);return{};
    case"copy":{const m=session.lastMessage("assistant");if(!m){ui.status("no assistant response to copy");return{};}try{const via=await clipboardSet(m.content||"");ui.notify(`copied last response via ${via}`);}catch(e){ui.notify(e.message,"error");}return{};}
    case"paste":{try{const text=await clipboardGet();if(!text.trim()){ui.status("clipboard empty");return{};}await agent.prompt(text);}catch(e){ui.notify(e.message,"error");}return{};}
    case"editor":{const text=await input.externalEditor("",cfg.editor);if(text.trim())await agent.prompt(text);return{};}
    case"anim":cfg.animation=!cfg.animation;runtime.saveConfig();ui.notify(`animations ${cfg.animation?"on":"off"}`);return{};
    case"source":ui.write(BC_HOME);return{};
    default:{
      const custom=runtime.commands.get(cmd.name);if(custom){await custom.handler({app,arg,agent,session,runtime,ui,input});return{};}
      ui.notify(`unknown command /${cmd.name}. Use /help`,"warn");return{};
    }
  }
}
