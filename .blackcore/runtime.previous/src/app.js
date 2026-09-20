import {createRuntime} from "./runtime.js";
import {SessionStore} from "./sessions/store.js";
import {BlackcoreAgent} from "./agent/agent.js";
import {InputController} from "./tui/input.js";
import {handleCommand} from "./commands/handler.js";
import {parseSlash} from "./commands/parser.js";
import {execCapture} from "./utils/exec.js";
import {redactSecrets} from "./security/secrets.js";
import {applyNaturalIntent} from "./natural/intent.js";
import {commandPalette} from "./tui/command-palette.js";
import {modelReasoningSummary} from "./config/reasoning.js";
import {findRecoverableTask,repairInterruptedToolCalls} from "./agent/task-recovery.js";

export class BlackcoreApp{
  constructor(runtime,input,session){this.runtime=runtime;this.input=input;this.session=session;this.agent=null;}
  static async create(cwd,{sessionFile=null,ephemeral=false,provider=null,model=null,mode=null}={}){
    const runtime=await createRuntime(cwd),input=new InputController(),session=new SessionStore(cwd,sessionFile,{ephemeral}),app=new BlackcoreApp(runtime,input,session);runtime.ui.bindInput?.(input);app.makeAgent({provider,model,mode});return app;
  }
  makeAgent(overrides={}){
    this.agent=new BlackcoreAgent({cfg:this.runtime.cfg,session:this.session,cwd:this.runtime.cwd,input:this.input,ui:this.runtime.ui,registry:this.runtime.registry.clone(),hooks:this.runtime.hooks,providers:this.runtime.providers,skills:this.runtime.skills,instructions:this.runtime.instructions,repoSummary:this.runtime.repoSummary,saveConfig:this.runtime.saveConfig,...overrides});
    return this.agent;
  }
  workingCwd(){const active=this.agent?.sessionState?.data?.activeProject?.root;return active||this.runtime.cwd;}
  headerInfo(){
    const tools=typeof this.agent?.getTools==="function"?this.agent.getTools().length:"ready";
    return {cwd:this.workingCwd(),provider:this.agent.provider,model:this.agent.model,mode:this.agent.mode,session:this.session.info().id,tools,effort:modelReasoningSummary(this.runtime.cfg,this.agent.provider,this.agent.model)};
  }
  async replaceSession(session){this.agent?.close();this.session=session;this.makeAgent({provider:this.runtime.cfg.provider,model:this.runtime.cfg.model,mode:this.runtime.cfg.mode});}
  async runAgentPrompt(text,opts={}){
    const ui=this.runtime.ui,liveSpec=ui.composer(this.headerInfo());
    this.input.beginWorkComposer({...liveSpec,model:this.agent.model,provider:this.agent.provider,mode:this.agent.mode,effort:modelReasoningSummary(this.runtime.cfg,this.agent.provider,this.agent.model),placeholder:"Write while BLACKCORE works…"});
    try{return await this.agent.prompt(text,opts);}finally{this.input.endWorkComposer();}
  }
  async resumeInterruptedTask(task=null,{ask=true}={}){
    const found=task||findRecoverableTask(this.runtime.cwd);if(!found){this.runtime.ui.status("No interrupted BLACKCORE task was found for this workspace.");return false;}
    if(ask){const ok=await this.input.confirm(`Interrupted task found: ${String(found.originalText||"task").replace(/\s+/g," ").slice(0,120)}\nResume it now from the saved checkpoint and plan?`,true);if(!ok)return false;}
    if(found.sessionFile&&found.sessionFile!==this.session.file){try{await this.replaceSession(new SessionStore(this.runtime.cwd,found.sessionFile));}catch(e){this.runtime.ui.notify(`recovery session could not be reopened: ${e.message}`,"warn");}}
    const repaired=repairInterruptedToolCalls(this.session);if(repaired)this.runtime.ui.notify(`recovery repaired ${repaired} interrupted tool result${repaired===1?"":"s"} · effects will be re-checked`,"warn");
    this.runtime.ui.notify(`resuming interrupted task · phase ${found.work?.phase||found.activity?.phase||"unknown"}`,"ok");
    await this.runAgentPrompt("continue the interrupted BLACKCORE task",{resumeTask:found});return true;
  }
  async inlineShell(command,{send=true}={}){
    const auth=await this.agent.security.authorizeShell(command,{confirm:(q,d)=>this.input.confirm(q,d)});if(!auth.allow)throw new Error(auth.reason);const r=await execCapture(process.env.SHELL||"sh",["-c",command],{cwd:this.workingCwd(),timeoutMs:120000,maxChars:this.runtime.cfg.maxToolOutputChars});const text=redactSecrets(`$ ${command}\nexit=${r.code}\n${r.combined}`);this.runtime.ui.raw(text+"\n");if(send)this.session.addMessage("user",`[USER SHELL COMMAND]\n${text}`);return text;
  }
  async dispatchCommand(cmd){
    try{return await handleCommand(this,cmd);}
    catch(e){this.runtime.ui.notify(`command /${cmd?.name||"?"} failed: ${e?.message||String(e)}`,"error");return{};}
  }
  async interactive(){
    const {ui}=this.runtime,initialComposer=ui.composer(this.headerInfo());
    if(!this.input.startFixedComposer({...initialComposer,model:this.agent.model,provider:this.agent.provider,mode:this.agent.mode,effort:modelReasoningSummary(this.runtime.cfg,this.agent.provider,this.agent.model),connection:"READY"}))await ui.splash(this.headerInfo());
    const recoverable=findRecoverableTask(this.runtime.cwd);if(recoverable){ui.notify(`interrupted task detected · ${String(recoverable.originalText||"task").replace(/\s+/g," ").slice(0,100)}`,"warn");try{await this.resumeInterruptedTask(recoverable,{ask:true});}catch(e){ui.notify(`recovery paused · ${e.message||String(e)}`,"warn");}}
    this.input.onQueued=(line,count)=>{if(this.agent.running)ui.status(`queued ${count} · ${String(line).slice(0,48)}`);};
    this.input.onInterrupt=()=>{if(this.agent.running){if(this.agent.cancel()){ui.stopMotion?.();ui.notify("cancel requested · stopping active tools…","warn");}}else ui.status("Use /quit to exit.");};
    this.input.rl.on("SIGINT",()=>this.input.onInterrupt?.());
    while(true){let raw;try{raw=await this.input.ask(ui.composer(this.headerInfo()));}catch{break;}let text=raw.trim();if(!text)continue;
      if(text==="/"){const picked=await commandPalette(this);if(!picked){ui.header(this.headerInfo());continue;}text=`/${picked}`;}
      if(text.startsWith("!!")){try{await this.inlineShell(text.slice(2).trim(),{send:false});}catch(e){ui.notify(e.message,"error");}continue;}
      if(text.startsWith("!")){try{await this.inlineShell(text.slice(1).trim(),{send:true});}catch(e){ui.notify(e.message,"error");}continue;}
      const cmd=parseSlash(text);if(cmd){const r=await this.dispatchCommand(cmd);if(r.exit)break;continue;}
      try{
        const intent=await applyNaturalIntent(this,text);if(intent.exit)break;if(intent.handled)continue;
        await this.runAgentPrompt(intent.text||text);
      }catch(e){ui.notify(e.message||String(e),"error");}
    }
    await this.close();ui.status("BLACKCORE offline.");
  }
  async close(){this.agent?.close();this.runtime.mcp.close();await this.runtime.extensions.unloadAll();this.input.close();}
}
