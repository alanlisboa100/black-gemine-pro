import readline from "node:readline";
import {motionEnabled,motionElapsed} from "./motion.js";
import path from "node:path";
import os from "node:os";
import {c,esc} from "./ansi.js";
import {truncateToWidth,visibleWidth,humanDuration} from "../utils/text.js";

const BORDER="\x1b[38;5;239m";
const DIM="\x1b[38;5;245m";
const CYAN="\x1b[38;5;51m";
const FG="\x1b[38;5;255m";
const MAGENTA="\x1b[38;5;213m";
const GREEN="\x1b[38;5;82m";
const BG="\x1b[48;5;235m";
const RESET=esc.reset;
const THINK=["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
const TOOLS=["⣾","⣽","⣻","⢿","⡿","⣟","⣯","⣷"];
const VIDEO=["◐","◓","◑","◒"];
const WAVE=["▁▂▄▆█▆▄▂","▂▄▆█▆▄▂▁","▄▆█▆▄▂▁▂","▆█▆▄▂▁▂▄","█▆▄▂▁▂▄▆","▆▄▂▁▂▄▆█"];

function move(row,col=1){return `\x1b[${Math.max(1,row)};${Math.max(1,col)}H`;}
function scrollRegion(top,bottom){return `\x1b[${top};${bottom}r`;}
function resetScrollRegion(){return "\x1b[r";}
function clearLineAt(row){return `${move(row,1)}${esc.clearLine}`;}
function homePath(p){const h=os.homedir();if(p===h)return"~";if(p?.startsWith(h+path.sep))return `~${p.slice(h.length)}`;return p||"";}
function safeCols(out){return Math.max(30,out.columns||process.stdout.columns||80);}
function safeRows(out){return Math.max(14,out.rows||process.stdout.rows||24);}
function clip(text,w){return truncateToWidth(String(text??""),Math.max(1,w));}
function line(ch,n){return ch.repeat(Math.max(1,n));}
function inputWindow(chars,cursor,max){
  let start=0;
  while(start<cursor&&visibleWidth(chars.slice(start,cursor).join(""))>Math.max(1,max-3))start++;
  let end=start;
  while(end<chars.length){if(visibleWidth(chars.slice(start,end+1).join(""))>max-1)break;end++;}
  let text=chars.slice(start,end).join("");
  let cursorCol=visibleWidth(chars.slice(start,cursor).join(""));
  if(start>0){text="…"+text;cursorCol++;}
  if(end<chars.length&&visibleWidth(text)<max)text=clip(text,max-1)+"…";
  const before=[...text].slice(0,Math.max(0,cursorCol)).join("");
  const after=[...text].slice(Math.max(0,cursorCol)).join("");
  return {rendered:`${before}${c("1;51","▌")}${after}`};
}

export function liveComposerSupport({input,output,env=process.env}={}){
  if(!(input?.isTTY&&output?.isTTY&&typeof input.setRawMode==="function"))return {supported:false,reason:"not-tty"};
  if(env?.TERMUX_VERSION||String(env?.PREFIX||"").includes("com.termux"))return {supported:false,reason:"termux-linear-output"};
  if(safeCols(output)<72)return {supported:false,reason:"narrow-terminal"};
  if(safeRows(output)<18)return {supported:false,reason:"short-terminal"};
  return {supported:true,reason:"pinned-composer"};
}

export class LiveComposer{
  constructor(controller,spec={}){
    this.controller=controller;this.spec=spec;this.stdin=controller.rl.input||process.stdin;this.out=controller.output||process.stdout;
    this.active=false;this.paused=false;this.timer=null;this.tick=0;this.started=Date.now();this.phase={kind:"working",label:"preparing",detail:""};
    this.chars=[];this.cursor=0;this.historyIndex=-1;this.draft=[];this.wasRaw=false;this.reserved=5;this.rows=24;this.cols=80;this.outputBottom=19;this.keyHandler=this.onKey.bind(this);
  }
  supported(){return liveComposerSupport({input:this.stdin,output:this.out,env:this.controller.env||process.env}).supported;}
  start({preserve=false}={}){
    if(!this.supported()||this.active)return false;
    this.rows=safeRows(this.out);this.cols=safeCols(this.out);this.reserved=Math.min(5,Math.max(4,this.rows-6));this.outputBottom=Math.max(5,this.rows-this.reserved);
    this.wasRaw=!!this.stdin.isRaw;this.controller.questionActive=true;this.controller.rl.pause();readline.emitKeypressEvents(this.stdin);this.stdin.setRawMode(true);this.stdin.resume();this.stdin.setEncoding("utf8");
    this.active=true;this.paused=false;if(!preserve)this.started=Date.now();
    this.out.write(`${scrollRegion(1,this.outputBottom)}${move(this.outputBottom,1)}${esc.hideCursor}`);
    this.stdin.on("keypress",this.keyHandler);this.render({full:true});
    // Termux can handle animated status text well, but repainting the whole
    // composer 11+ times a second makes low-end devices visibly flicker. The
    // timer now touches one status line only; input changes still redraw the
    // full panel immediately.
    this.syncMotion();return true;
  }
  syncMotion(){
    clearInterval(this.timer);this.timer=null;
    if(!this.active)return;
    const animated=motionEnabled(this.spec.animation,this.controller.env||process.env);
    if(!animated)this.tick=0;
    this.timer=setInterval(()=>{if(animated)this.tick++;this.render({full:false});},animated?125:1000);
    this.timer.unref?.();
  }
  setSpec(spec={}){this.spec={...this.spec,...spec};if(this.active){this.syncMotion();this.render({full:true});}}
  setPhase(kind,label="",detail=""){
    const next={kind:kind||"working",label:String(label||""),detail:String(detail||"")},stageChanged=this.phase.kind!==next.kind||this.phase.label!==next.label;this.phase=next;if(stageChanged)this.started=Date.now();if(this.active)this.render({full:false});
  }
  phaseLine(){
    const elapsed=motionElapsed(this.started),kind=this.phase.kind;
    const semantic={inspect:["SCAN",CYAN],plan:["PLAN",MAGENTA],execute:["BUILD",CYAN],verify:["CHECK",GREEN],review:["REVIEW",MAGENTA],report:["REPORT",CYAN]}[kind];
    if(semantic)return `${semantic[1]}◆ ${semantic[0]}${RESET}  ${FG}${this.phase.label}${RESET}${this.phase.detail?`${DIM} · ${this.phase.detail}${RESET}`:""} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="thinking")return `${MAGENTA}${THINK[this.tick%THINK.length]} THINK${RESET}  ${FG}${this.phase.label}${RESET}${this.phase.detail?`${DIM} · ${this.phase.detail}${RESET}`:""} ${DIM}· ${elapsed}${RESET}  ${MAGENTA}${WAVE[this.tick%WAVE.length]}${RESET}`;
    if(kind==="video")return `${MAGENTA}${VIDEO[this.tick%VIDEO.length]} EDIT${RESET}   ${FG}${this.phase.label||"processing video"}${RESET}${this.phase.detail?`${DIM} · ${this.phase.detail}${RESET}`:""} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="tools")return `${CYAN}${TOOLS[this.tick%TOOLS.length]} TOOLS${RESET}  ${FG}${this.phase.label}${RESET}${this.phase.detail?`${DIM} · ${this.phase.detail}${RESET}`:""} ${DIM}· ${elapsed}${RESET}  ${CYAN}${WAVE[(this.tick+2)%WAVE.length]}${RESET}`;
    if(kind==="waiting")return `${c(220,"◇ WAIT")}  ${FG}${this.phase.label||"approval"}${RESET} ${DIM}· input required${RESET}`;
    if(kind==="done")return `${GREEN}◆ DONE${RESET}  ${FG}${this.phase.label||"turn complete"}${RESET}`;
    return `${CYAN}◆ WORK${RESET}  ${FG}${this.phase.label||"BLACKCORE working"}${RESET} ${DIM}· ${elapsed}${RESET}`;
  }
  footer(){
    const q=this.controller.queue.length,mode=this.spec.mode||"ACT",model=this.spec.model||"",effort=this.spec.effort||"";
    const left=`${mode} · ${model}${effort?` ${String(effort).toLowerCase()}`:""}`;
    const right=q?`queued ${q}`:"Enter queues · Ctrl+C cancel";
    return `${left} · ${right}`;
  }
  render({full=true}={}){
    if(!this.active)return;
    const rows=safeRows(this.out),cols=safeCols(this.out);if(rows!==this.rows||cols!==this.cols){this.rows=rows;this.cols=cols;this.outputBottom=Math.max(5,this.rows-this.reserved);this.out.write(`${resetScrollRegion()}${scrollRegion(1,this.outputBottom)}`);full=true;}
    const start=this.outputBottom+1,inner=Math.max(24,this.cols-2),inputMax=Math.max(8,inner-7);
    if(!full){
      const frame=clip(this.phaseLine(),this.cols);
      if(frame!==this.lastPhaseFrame)this.out.write(esc.save+clearLineAt(start)+frame+esc.restore);
      this.lastPhaseFrame=frame;
      return;
    }
    const placeholder=this.spec.placeholder||"Write while BLACKCORE works…";
    let body;if(this.chars.length)body=inputWindow(this.chars,this.cursor,inputMax).rendered;else body=`${DIM}${clip(placeholder,inputMax)}${RESET}${c("1;51","▌")}`;
    const plainBody=this.chars.length?this.chars.join(""):placeholder;const pad=" ".repeat(Math.max(0,inner-4-Math.min(inputMax,visibleWidth(plainBody))-1));
    const status=clip(this.phaseLine(),this.cols);
    const title=" MESSAGE · LIVE ",top=`╭─${title}${line("─",Math.max(1,inner-visibleWidth(title)-1))}╮`;
    const mid=`${BORDER}│${RESET}${BG} ${CYAN}› ${RESET}${FG}${body}${RESET}${BG}${pad} ${RESET}${BORDER}│${RESET}`;
    const bottom=`${BORDER}╰${line("─",inner)}╯${RESET}`;
    const footer=clip(this.footer(),this.cols);
    this.lastPhaseFrame=status;
    const lines=[status,top,mid,bottom,`${DIM}${footer}${RESET}`];
    this.out.write(esc.save+Array.from({length:this.reserved},(_,i)=>`${clearLineAt(start+i)}${i<lines.length?clip(lines[i],this.cols):""}`).join("")+esc.restore);
  }
  queueCurrent(){
    const value=this.chars.join("").trim();if(!value)return;
    if(this.controller.isCancelInput?.(value)){this.chars=[];this.cursor=0;this.controller.onInterrupt?.();this.render({full:true});return;}
    this.controller.queue.push(value);this.controller.remember(value);this.controller.onQueued?.(value,this.controller.queue.length);this.chars=[];this.cursor=0;this.historyIndex=-1;this.draft=[];this.render({full:true});
  }
  setText(text){this.chars=[...String(text||"")];this.cursor=this.chars.length;this.render({full:true});}
  onKey(str,key={}){
    if(!this.active)return;
    if(key.ctrl&&key.name==="c"){this.controller.onInterrupt?.();return;}
    if(key.ctrl&&key.name==="l"){this.render();return;}
    if(key.name==="return"||key.name==="enter"){this.queueCurrent();return;}
    if(key.name==="left"){this.cursor=Math.max(0,this.cursor-1);this.render({full:true});return;}
    if(key.name==="right"){this.cursor=Math.min(this.chars.length,this.cursor+1);this.render({full:true});return;}
    if(key.name==="home"){this.cursor=0;this.render({full:true});return;}
    if(key.name==="end"){this.cursor=this.chars.length;this.render({full:true});return;}
    if(key.name==="backspace"){if(this.cursor>0){this.chars.splice(this.cursor-1,1);this.cursor--;}this.render({full:true});return;}
    if(key.name==="delete"){if(this.cursor<this.chars.length)this.chars.splice(this.cursor,1);this.render({full:true});return;}
    if(key.name==="escape"){this.chars=[];this.cursor=0;this.render({full:true});return;}
    if(key.name==="up"){
      const h=this.controller.rl.history||[];if(h.length){if(this.historyIndex<0)this.draft=[...this.chars];this.historyIndex=Math.min(h.length-1,this.historyIndex+1);this.setText(h[this.historyIndex]||"");}return;
    }
    if(key.name==="down"){
      const h=this.controller.rl.history||[];if(this.historyIndex>=0){this.historyIndex--;this.setText(this.historyIndex>=0?(h[this.historyIndex]||""):this.draft.join(""));}return;
    }
    if(str&&!key.ctrl&&!key.meta&&str!=="\r"&&str!=="\n"){const add=[...str];this.chars.splice(this.cursor,0,...add);this.cursor+=add.length;this.historyIndex=-1;this.render({full:true});}
  }
  stop({clear=true}={}){
    if(!this.active)return;
    if(this.timer){clearInterval(this.timer);this.timer=null;}this.stdin.removeListener("keypress",this.keyHandler);this.active=false;
    try{this.stdin.setRawMode(this.wasRaw);}catch{}this.controller.rl.resume();this.controller.questionActive=false;
    this.out.write(esc.save+resetScrollRegion());
    if(clear){const start=this.outputBottom+1;for(let i=0;i<this.reserved;i++)this.out.write(clearLineAt(start+i));}
    this.out.write(esc.restore+esc.showCursor);
  }
  suspend(){
    if(!this.active)return ()=>{};
    const snapshot={chars:[...this.chars],cursor:this.cursor,phase:{...this.phase},started:this.started,spec:{...this.spec}};this.stop({clear:true});
    return ()=>{this.chars=[...snapshot.chars];this.cursor=snapshot.cursor;this.phase={...snapshot.phase};this.started=snapshot.started;this.spec={...snapshot.spec};this.start({preserve:true});};
  }
}

export function liveComposerPreview({text="",phase="thinking",model="deepseek-v4-pro",effort="max",mode="ACT",queued=0}={},columns=54){
  const inner=Math.max(24,columns-2),input=clip(text||"Write while BLACKCORE works…",Math.max(8,inner-7));
  return [
    clip(`${phase==="tools"?"╺━ TOOLS":"⠹ THINK"}  ${model} · ${effort} · 12s  ▂▄▆█▆▄`,columns),
    clip(`╭─ MESSAGE · LIVE ${"─".repeat(Math.max(1,inner-17))}╮`,columns),
    clip(`│ › ${input} ▌${" ".repeat(Math.max(0,inner-6-visibleWidth(input)))} │`,columns),
    clip(`╰${"─".repeat(inner)}╯`,columns),
    clip(`${mode} · ${model} ${effort} · ${queued?`queued ${queued}`:"Enter queues · Ctrl+C cancel"}`,columns)
  ];
}
