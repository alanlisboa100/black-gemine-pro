import path from "node:path";
import {c,esc,rgb256} from "./ansi.js";
import {fit,hr,box,width} from "./layout.js";
import {Spinner} from "./spinner.js";
import {renderMarkdown} from "./markdown.js";
import {MOTION,motionEnabled,toolGlyph,oneLine,sleep,progressBar,smoothProgress,animateProgress,sparkle,logoFrames,statusLine,bootSequenceFrames} from "./motion.js";
import {humanBytes,humanDuration,safeJsonParse,visibleWidth} from "../utils/text.js";
import {modelReasoningSummary} from "../config/reasoning.js";
import {COMMAND_ITEMS} from "./command-palette.js";
import {compactFooter,composerTitle} from "./composer.js";
import {VERSION} from "../config/defaults.js";
import {getSecretSource} from "../config/loader.js";
import {providerAuthCandidates} from "../config/models.js";
import {redactSecrets} from "../security/secrets.js";

function fileLabel(value=""){const clean=String(value||"").replace(/\\/g,"/"),base=clean.split("/").filter(Boolean).at(-1);return base||clean||"target";}
function urlLabel(value=""){try{const u=new URL(String(value));return `${u.hostname}${u.port?`:${u.port}`:""}${u.pathname!=="/"?u.pathname:""}`;}catch{return fileLabel(value);}}
function commandPurpose(command=""){
  const text=String(command).toLowerCase();
  if(/python(?:3)?\s+-m\s+http\.server|http-server/.test(text))return "start local server";
  if(/\b(?:lsof|ss|netstat)\b/.test(text))return "inspect ports";
  if(/\bcurl\b|\bwget\b/.test(text))return "inspect web response";
  if(/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|verify|check)/.test(text))return "run verification";
  if(/\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|add)\b/.test(text))return "install dependencies";
  if(/\bchromium(?:-browser)?\b/.test(text))return "check Chromium";
  if(/\bgit\s+/.test(text))return "inspect repository";
  return "run command";
}
export function toolActivitySummary(name,args={}){
  const key=String(name||"tool").toLowerCase(),action=String(args.action||"").replace(/_/g," ");
  if(key==="video_editor"){
    const level=String(args.editLevel||"medium").toLowerCase(),autoLabel=level==="high"?"prepare HIGH professional edit":level==="basic"?"prepare BASIC edit":"prepare MEDIUM edit",labels={auto_edit:autoLabel,smart_cut:"clean the timeline",montage:"build transition montage",concat:"join clips",analyze:"diagnose and recommend video edits",detect_beats:"detect beats and BPM",stabilize:"stabilize camera motion",transcribe:"create captions",burn_subtitles:"burn captions",add_music:"mix music",color_grade:"grade color",auto_reframe:"reframe video"};
    const source=args.input||args.inputs?.[0]||"",target=source?fileLabel(source):"";return `${labels[args.action]||action||"edit video"}${target?` · ${target}`:""}`;
  }
  if(key==="photo_editor"){
    const level=String(args.editLevel||"medium").toLowerCase(),scope=String(args.editScope||"full").toUpperCase(),autoLabel=level==="high"?"prepare HIGH professional photo":level==="basic"?"prepare BASIC photo edit":"prepare MEDIUM photo edit",labels={auto_edit:autoLabel,change_outfit:"replace outfit in photo",analyze:"diagnose and recommend photo edits",inspect:"inspect photo",crop:"smart-crop photo",resize:"resize photo",adjust_light:"adjust photo light",adjust_color:"adjust photo color",enhance_details:"enhance photo details",denoise:"reduce photo noise",overlay_text:"add photo text",watermark:"add photo watermark",compress:"compress photo",convert:"convert photo"},target=args.input?fileLabel(args.input):"",scopeLabel=scope!=="FULL"?` · ${scope}`:"";return `${labels[args.action]||action||"edit photo"}${scopeLabel}${target?` · ${target}`:""}`;
  }
  if(key==="outfit_editor"){
    const labels={backend_status:"check outfit AI",change_outfit:"replace outfit through video",change_outfit_photo:"replace outfit in photo"},target=args.input?fileLabel(args.input):"";return `${labels[args.action]||action||"edit outfit"}${target?` · ${target}`:""}`;
  }
  if(key==="bash"||key==="shell")return commandPurpose(args.command);
  if(key==="read"||key==="document_reader")return `read ${fileLabel(args.path||args.file)}`;
  if(key==="write")return `save ${fileLabel(args.path)}${args.content!=null?` · ${humanBytes(Buffer.byteLength(String(args.content)))}`:""}`;
  if(key==="edit"||key==="patch"||key==="patch_set")return `update ${fileLabel(args.path||args.file||args.target)}`;
  if(key==="mkdir")return `create ${fileLabel(args.path)}`;
  if(key.startsWith("process_start"))return "start background process";
  if(key.startsWith("process_poll"))return "check background process";
  if(key.startsWith("process"))return action||"manage background process";
  if(key==="port_check")return `check port ${args.port||""}`.trim();
  if(key==="http_request"||key==="web_fetch")return `${String(args.method||"GET").toUpperCase()} ${urlLabel(args.url)}`;
  if(key==="browser")return `${action||"inspect"}${args.url?` · ${urlLabel(args.url)}`:""}`;
  if(key==="web_search"||key==="web_research")return `research ${String(args.query||args.q||"").slice(0,28)}`.trim();
  if(key==="news_research")return ("verify news · "+String(args.query||"").slice(0,24)).trim();
  if(key==="credibility_check")return ("check public evidence · "+urlLabel(args.target||"")).trim();
  if(key==="grep"||key==="find")return `find ${String(args.pattern||args.query||args.name||"").slice(0,30)}`.trim();
  if(key==="git"||key==="github")return action||"inspect repository";
  if(key==="verify"||key==="test")return action||"run verification";
  if(key==="audit_report")return `create ${fileLabel(args.output||"audit report")}`;
  return action||"working";
}
export function toolProgressPresentation(name,progress={}){
  const key=String(name||"").toLowerCase(),raw=Number(progress.percent),percent=Number.isFinite(raw)?Math.max(0,Math.min(100,raw)):null,label=String(progress.label||progress.stage||"working").replace(/_/g," ").toUpperCase();
  if(key!=="video_editor"&&key!=="photo_editor"&&key!=="outfit_editor")return {kind:"tools",label,detail:percent==null?String(progress.detail||""):`${Math.round(percent)}%`};
  const step=Number(progress.step),total=Number(progress.totalSteps),stepLabel=Number.isFinite(step)&&Number.isFinite(total)&&total>0?`${String(Math.round(step)).padStart(2,"0")}/${String(Math.round(total)).padStart(2,"0")} `:"",bar=percent==null?MOTION.rise[Math.floor(Date.now()/120)%MOTION.rise.length]:smoothProgress(percent/100,10),bits=[bar];
  if(percent!=null)bits.push(`${Math.round(percent)}%`);if(Number.isFinite(progress.etaMs)&&progress.etaMs>500)bits.push(`ETA ${humanDuration(progress.etaMs)}`);else if(progress.speed&&progress.speed!=="N/A")bits.push(String(progress.speed));
  const detail=oneLine(progress.detail||"",44);if(detail)bits.push(detail);
  return {kind:key==="photo_editor"?"photo":key==="outfit_editor"?"outfit":"video",label:`${stepLabel}${label}`,detail:bits.join(" · ")};
}
export function toolResultPresentation(name,result,ok=true){
  const source=typeof result==="string"?result:JSON.stringify(result??""),raw=redactSecrets(source),data=safeJsonParse(raw,null),exit=raw.match(/\bexit(?:Code)?["']?\s*[=:]\s*(-?\d+)/i),lower=raw.toLowerCase();
  if(exit&&Number(exit[1])!==0)return {state:"warn",text:`command exited ${exit[1]}`};
  if(!ok||/^\s*(?:error|blocked|unavailable):/i.test(raw)){
    if(/timed out|timeout/.test(lower))return {state:"error",text:"timed out"};
    if(/permission denied|not allowed|was not approved/.test(lower))return {state:"error",text:"permission denied"};
    if(/not found|not installed/.test(lower))return {state:"error",text:"not available"};
    return {state:"error",text:oneLine(raw.replace(/^\s*(?:error|blocked|unavailable):\s*/i,""),32)||"failed"};
  }
  if(data&&typeof data==="object"){
    if(data.ok===false)return {state:"error",text:"verification failed"};
    if(data.open===true)return {state:"ok",text:"port open"};
    if(data.available===true)return {state:"ok",text:"available"};
    if(data.running===true||data.status==="running")return {state:"ok",text:"running"};
    if(data.created===true)return {state:"ok",text:"created"};
    if(data.ok===true)return {state:"ok",text:"complete"};
  }
  if(/wrote\s+\d+\s+bytes|created\s+\//i.test(raw))return {state:"ok",text:"saved"};
  if(/<!doctype\s+html|<html/i.test(raw))return {state:"ok",text:"response received"};
  return {state:"ok",text:"complete"};
}

function usageText(u={}){
  const input=u.input_tokens??u.prompt_tokens??u.input??0,output=u.output_tokens??u.completion_tokens??u.output??0,total=u.total_tokens??u.total??(input+output);
  if(!total)return "";
  const short=n=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:String(n);
  return `${short(total)} tok`;
}

function cwdLabel(cwd){
  const base=path.basename(cwd)||cwd;
  return base.length<3?cwd:base;
}
function providerName(provider=""){
  return ({openai:"OpenAI",deepseek:"DeepSeek",google:"Google AI Studio"})[provider]||provider||"Provider";
}
function modelName(model=""){
  const raw=String(model).split("/").at(-1);
  const known={
    "deepseek-v4-flash":"DeepSeek V4 Flash","deepseek-v4-pro":"DeepSeek V4 Pro",
    "gpt-5.6-sol":"GPT-5.6 Sol","gpt-5.6-terra":"GPT-5.6 Terra","gpt-5.6-luna":"GPT-5.6 Luna",
  };
  return known[model]||known[raw]||raw.replace(/-/g," ").replace(/\b\w/g,x=>x.toUpperCase());
}
function providerKind(cfg,provider){
  const type=cfg?.providers?.[provider]?.type||"";
  return ({"openai-responses":"Responses API",openai:"Chat Completions",deepseek:"DeepSeek API",google:"Gemini API (OpenAI compatibility)"})[type]||type||"API";
}
function keyState(cfg,provider){
  const keys=providerAuthCandidates(cfg,provider);if(keys.length){const source=keys[0].env?getSecretSource(keys[0].env):"configuration";return {configured:true,label:keys.length>1?`${keys.length} KEYS SET`:"KEY SET",source,count:keys.length};}
  return {configured:false,label:"KEY NEEDED",source:null,count:0};
}

export class UI{
  constructor(cfg){this.cfg=cfg;this.extensionStatus=new Map();this.streamOpen=false;this.turnStarted=0;this.turnTools=0;this.activeSpinner=null;this.input=null;this.activitySequence=0;this.pendingActivities=new Map();this.mediaProgressStages=new Map();}
  bindInput(input){this.input=input;return this;}
  livePhase(kind,label,detail=""){
    const input=this.input;let active=false,currentLabel=label,currentDetail=detail;
    return {
      get active(){return active;},
      start(){active=true;input?.setWorkPhase(kind,currentLabel,currentDetail);return this;},
      update(text){currentLabel=String(text||currentLabel);if(active)input?.setWorkPhase(kind,currentLabel,currentDetail);return this;},
      stop(){if(active){active=false;input?.setWorkPhase("working","processing next step","");}return this;}
    };
  }
  trackSpinner(spinner){
    const start=spinner.start.bind(spinner),stop=spinner.stop.bind(spinner);
    spinner.start=()=>{const r=start();if(spinner.active)this.activeSpinner=spinner;return r;};
    spinner.stop=(final="")=>{if(this.activeSpinner===spinner)this.activeSpinner=null;return stop(final);};
    return spinner;
  }
  suspendMotion(){
    const spinner=this.activeSpinner;
    if(!spinner?.active)return ()=>{};
    spinner.stop();
    this.raw(`\r${esc.clearLine}${esc.showCursor}`);
    return ()=>{if(!spinner.active)spinner.start();};
  }
  stopMotion(){
    const spinner=this.activeSpinner;if(!spinner?.active)return false;spinner.stop();this.activeSpinner=null;this.raw(`\r${esc.clearLine}${esc.showCursor}`);return true;
  }
  output(value){const fixed=this.input?.fixedComposer;if(fixed?.active)fixed.writeOutput(value);else process.stdout.write(value);}
  write(line=""){this.output(fit(line)+"\n");}
  raw(s){this.output(s);}
  async splash(info={}){
    if(this.input?.fixedComposerActive?.())return;
    const provider=info.provider||this.cfg.provider,model=info.model||this.cfg.model,mode=info.mode||this.cfg.mode||"ACT",tools=info.tools??"ready";
    const effort=info.effort||modelReasoningSummary(this.cfg,provider,model),state=keyState(this.cfg,provider);
    const write=s=>this.raw(s);

    if(process.stdout.isTTY&&motionEnabled(this.cfg.animation)){
      write(esc.hideCursor);
      try{
        const frames=["  ◇ B", "  ◈ BLACK", "  ◆ BLACKCORE"];
        for(const frame of frames){
          write(`\r${esc.clearLine}${fit(`${c("1;95",frame)} ${c(244,VERSION)}`)}`);
          await sleep(65);
        }
        write("\n");
      }finally{write(esc.showCursor);}
    }else{
      this.write(`${c("1;95","◆")} ${c("1;255","BLACKCORE")} ${c(244,VERSION)}`);
    }

    // Status block (always shown)
    this.write(`${c(state.configured?82:220,state.configured?"●":"◇")} ${c(245,providerName(provider))} · ${c("1;255",modelName(model))} · ${c(51,String(effort).toUpperCase())}`);
    this.write(`${c(213,mode)} ${c(240,`· ${tools} tools · / commands · ${cwdLabel(info.cwd||process.cwd())}`)}`);
    if(!state.configured)this.write(`${c(220,"◇ API key required")} ${c(240,"· run blackcore login")}`);
    this.raw("\n");
  }
  setupIntro(){
    this.raw("\n"+box([
      `${c("1;255","Welcome. Your first setup takes about a minute.")}`,
      `${c(111,"1")} Choose a provider and model`,
      `${c(213,"2")} Set its reasoning level`,
      `${c(82,"3")} Save the API key privately`,
      c(240,"The key value is hidden and never printed in the terminal.")
    ],{title:`BLACKCORE SETUP · ${VERSION}`,max:76})+"\n");
  }
  divider(){this.write(c(238,hr()));}
  header(info){
    if(this.input?.fixedComposerActive?.()){this.input.fixedComposer?.setSpec?.({provider:info.provider,model:info.model,mode:info.mode,effort:info.effort,tools:info.tools,title:composerTitle({model:info.model,effort:info.effort})});return;}
    const model=info.model,effort=info.effort||modelReasoningSummary(this.cfg,info.provider,info.model);
    const state=keyState(this.cfg,info.provider),stateColor=state.configured?82:220;
    this.write(`${c(stateColor,state.configured?"◆":"◇")} ${c("1;255",modelName(model))} · ${c(51,String(effort).toUpperCase())} · ${c(245,providerName(info.provider))} · ${c(213,info.mode||"ACT")}`);
    if(!state.configured)this.write(`${c(220,"API key required")} ${c(240,"· run blackcore login")}`);
  }
  prompt(){return `${c("1;213","you")} ${c(244,"›")} `;}
  composer(info){
    const effort=info.effort||modelReasoningSummary(this.cfg,info.provider,info.model);
    const cwd=info.cwd||process.cwd();
    const state=keyState(this.cfg,info.provider);
    const footer=compactFooter({provider:info.provider,model:info.model,effort,cwd,mode:info.mode,connection:state.configured?"READY":"SET API KEY"});
    const title=composerTitle({model:info.model,effort});
    return {type:"composer",animation:this.cfg.animation,placeholder:"Describe what you want BLACKCORE to do…",title,footer,suggestions:COMMAND_ITEMS,tools:info.tools};
  }
  statusPanel({provider,model,effort,mode,cwd,tools=0,session=null}={}){
    const state=keyState(this.cfg,provider),code=state.configured?82:220,sessionBits=[];
    if(session?.id)sessionBits.push(session.id.slice(0,12));
    if(Number.isFinite(session?.messages))sessionBits.push(`${session.messages} messages`);
    const routing=this.cfg.autoRoute?"automatic routing (user enabled)":this.cfg.modelLock!==false?"selected model locked":"manual routing";
    const fallback=this.cfg.autoFallback?"fallback armed · approval always required":"fallback off";
    const rows=[
      `${c(code,state.configured?"●":"◇")} ${c(`1;38;5;${code}`,state.configured?(state.count>1?`${state.count} API KEYS CONFIGURED`:"API KEY CONFIGURED"):"API KEY MISSING")} ${c(240,"(key value hidden)")}`,
      `${c(244,"provider:")}  ${providerName(provider)} · ${providerKind(this.cfg,provider)}`,
      `${c(244,"model:")}     ${modelName(model)} · ${String(effort||"default").toUpperCase()} reasoning`,
      `${c(244,"workspace:")} ${cwdLabel(cwd)} · ${mode||"ACT"} · ${tools} available tools`,
      `${c(244,"session:")}   ${sessionBits.join(" · ")||"new conversation"}`,
      `${c(244,"routing:")}   ${routing} · ${fallback}`
    ];
    this.raw(box(rows,{title:"BLACKCORE STATUS",max:96})+"\n");
  }
  assistantPrefix(){if(this.streamOpen)return;this.raw(`${c("1;51","BLACKCORE")} ${c(244,"›")} `);this.streamOpen=true;}
  stream(text){this.assistantPrefix();this.raw(text);}
  streamEnd(){if(this.streamOpen)this.raw("\n");this.streamOpen=false;}
  assistant(text){
    const prefix=`${c("1;51","BLACKCORE")} ${c(244,"›")}`,fixed=this.input?.fixedComposer,contentColumns=fixed?.active?Math.max(28,fixed.layout.columns-6):Math.max(28,width()-4),rendered=renderMarkdown(text,{columns:contentColumns}),lines=rendered.split("\n");
    if(lines.length===1&&visibleWidth(prefix)+1+visibleWidth(lines[0])<=width()){this.write(`${prefix} ${lines[0]}`);return;}
    this.write(prefix);for(const line of lines)this.write(`  ${line}`);
  }
  turnStart(){this.turnStarted=Date.now();this.turnTools=0;this.activitySequence=0;this.pendingActivities.clear();}
  modelSpinner(model,{effort="high"}={}){
    if(this.input?.workComposerActive?.())return this.trackSpinner(this.livePhase("thinking","analyzing request",`${modelName(model)} · ${String(effort||"high").toUpperCase()}`));
    const suffix=effort?` · ${effort}`:"";
    return this.trackSpinner(new Spinner(`${modelName(model)} · thinking${suffix}`,{
      enabled:this.cfg.animation,
      interval:48,
      frames:MOTION.think,
      colors:[165,201,213,123,51,82,165],
      showElapsed:true
    }));
  }
  workPhase(phase,detail=""){
    const labels={understand:"understanding request",inspect:"mapping project",plan:"planning changes",execute:"applying changes",verify:"running quality gate",review:"reviewing changes",report:"preparing handoff"};
    if(this.input?.workComposerActive?.())this.input.setWorkPhase(phase,labels[phase]||phase,detail);
  }
  toolBatchSpinner(calls=[]){
    this.turnTools+=calls.length;
    const names=calls.slice(0,3).map(x=>x.function?.name||"tool");
    const extra=calls.length>3?` +${calls.length-3}`:"";
    const label=`${names.join(" → ")}${extra}`;
    if(this.input?.workComposerActive?.())return this.trackSpinner(this.livePhase("tools",label,`${calls.length} active`));
    return this.trackSpinner(new Spinner(`tools · ${names.join(" · ")}${extra}`,{
      enabled:this.cfg.animation,
      interval:48,
      frames:MOTION.tool,
      colors:[51,81,123,165,213,198,46],
      showElapsed:true
    }));
  }
  toolStart(name,args,{index=0,total=1}={}){
    const count=total>1?`${index+1}/${total}`:"";
    const summary=toolActivitySummary(name,args),sequence=++this.activitySequence,queue=this.pendingActivities.get(name)||[],mediaEditor=["video_editor","photo_editor","outfit_editor"].includes(String(name).toLowerCase());queue.push(sequence);this.pendingActivities.set(name,queue);if(mediaEditor)this.mediaProgressStages.set(name,"");
    if(this.input?.workComposerActive?.()){
      if(mediaEditor){const progress=toolProgressPresentation(name,{stage:"loading",label:"SOURCE",percent:0});this.input.setWorkPhase(progress.kind,progress.label,progress.detail);}
      else this.input.setWorkPhase("tools",String(name).toUpperCase(),`${count?count+" · ":""}${summary}`);
    }
    const resume=this.input?.workComposerActive?.()?(()=>{}):this.suspendMotion();
    const glyph=toolGlyph(name),seq=String(sequence).padStart(2,"0"),label=String(name).replace(/_/g," ").toUpperCase();
    try{this.write(`  ${c(240,seq)} ${c(51,glyph)} ${c("1;255",label)} ${c(244,"· "+summary)}`);}finally{resume();}
  }
  toolProgress(name,progress={},{}={}){
    const presentation=toolProgressPresentation(name,progress);
    if(this.input?.workComposerActive?.())this.input.setWorkPhase(presentation.kind,presentation.label,presentation.detail);
    else this.activeSpinner?.update?.(`${String(name).replace(/_/g," ")} · ${presentation.label}${presentation.detail?` · ${presentation.detail}`:""}`);
    if(["video_editor","photo_editor","outfit_editor"].includes(String(name).toLowerCase())&&progress.stage){
      const stage=String(progress.stage),previous=this.mediaProgressStages.get(name);
      if(previous!==stage){
        this.mediaProgressStages.set(name,stage);const step=Number(progress.step),total=Number(progress.totalSteps),index=Number.isFinite(step)&&Number.isFinite(total)&&total>0?`${String(Math.round(step)).padStart(2,"0")}/${String(Math.round(total)).padStart(2,"0")} `:"",detail=oneLine(progress.detail||"",56);
        this.write(`    ${c(51,"↳")} ${c("1;255",index+String(progress.label||stage).replace(/_/g," ").toUpperCase())}${detail?c(244," · "+detail):""}`);
      }
    }
  }
  toolResult(name,result,ok=true,durationMs=0){
    const queue=this.pendingActivities.get(name)||[],sequence=queue.shift()||this.activitySequence;if(queue.length)this.pendingActivities.set(name,queue);else this.pendingActivities.delete(name);const presentation=toolResultPresentation(name,result,ok),done=presentation.state==="ok";
    if(this.input?.workComposerActive?.())this.input.setWorkPhase("tools",String(name).toUpperCase(),done?"complete":presentation.text);if(["video_editor","photo_editor","outfit_editor"].includes(String(name).toLowerCase()))this.mediaProgressStages.delete(name);
    const resume=this.input?.workComposerActive?.()?(()=>{}):this.suspendMotion();
    const code=presentation.state==="ok"?82:presentation.state==="warn"?220:196,mark=presentation.state==="ok"?"✓":presentation.state==="warn"?"◇":"✗",seq=String(sequence).padStart(2,"0"),time=durationMs?` · ${humanDuration(durationMs)}`:"";
    try{this.write(`  ${c(240,seq)} ${c(code,mark)} ${c(code,presentation.text)}${c(240,time)}`);}finally{resume();}
  }
  turnDone({usage={},tools=this.turnTools,durationMs=null,cancelled=false,work=null}={}){
    const ms=durationMs??(this.turnStarted?Date.now()-this.turnStarted:0),bits=[];
    if(tools)bits.push(`${tools} tool${tools===1?"":"s"}`);
    if(ms)bits.push(humanDuration(ms));
    const ut=usageText(usage);if(this.cfg.showTokenUsage===true&&ut)bits.push(ut);
    if(work?.status&&work.status!=="read-only")bits.push(work.status);
    const label=cancelled?"cancelled":"done",code=cancelled?220:82;
    if(this.input?.workComposerActive?.())this.input.setWorkPhase(cancelled?"waiting":"done",label,bits.join(" · "));
    this.write(`${c(code,cancelled?"◇":"◆")} ${c(code,label)}${bits.length?c(240," · "+bits.join(" · ")):""}`);
  }
  recovery(text){const reason=toolResultPresentation("recovery",text,false).text;this.write(`${c(220,"↻")} ${c("1;220","RECOVERY")} ${c(244,`· ${reason} · changing approach`)}`);if(this.input?.workComposerActive?.())this.input.setWorkPhase("thinking","changing approach",reason);}
  notify(text,level="info"){const resume=this.suspendMotion(),code=level==="error"?196:level==="warn"?220:82;try{this.write(`${rgb256(code,level==="error"?"✗":level==="warn"?"◇":"◆")} ${text}`);}finally{resume();}}
  status(text){const resume=this.suspendMotion();try{this.write(c(244,text));}finally{resume();}}
  setExtensionStatus(name,text){if(text)this.extensionStatus.set(name,text);else this.extensionStatus.delete(name);}
  clear(){if(this.input?.fixedComposerActive?.()){this.input.fixedComposer.clearScreen();return;}this.raw(esc.clear);}
}
