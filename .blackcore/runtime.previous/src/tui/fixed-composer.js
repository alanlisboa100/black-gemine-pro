import readline from "node:readline";
import {PassThrough} from "node:stream";
import {c,esc} from "./ansi.js";
import {truncateToWidth,visibleWidth,humanDuration,wrapAnsiToWidth} from "../utils/text.js";
import {VERSION} from "../config/defaults.js";

const BORDER="\x1b[38;5;37m";
const DIM="\x1b[38;5;245m";
const CYAN="\x1b[38;5;51m";
const FG="\x1b[38;5;255m";
const MAGENTA="\x1b[38;5;213m";
const GREEN="\x1b[38;5;82m";
const YELLOW="\x1b[38;5;220m";
const BOLD="\x1b[1m";
const BG="\x1b[48;5;235m";
const RESET=esc.reset;
const THINK=["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
const TOOLS=["⣾","⣽","⣻","⢿","⡿","⣟","⣯","⣷"];
const VIDEO=["◐","◓","◑","◒"];
const MOUSE_PREFIX="\x1b[<";

function move(row,col=1){return `\x1b[${Math.max(1,row)};${Math.max(1,col)}H`;}
function scrollRegion(top,bottom){return `\x1b[${top};${bottom}r`;}
function resetScrollRegion(){return "\x1b[r";}
function clearLineAt(row){return `${move(row,1)}${esc.clearLine}`;}
function clip(text,width){return truncateToWidth(String(text??""),Math.max(1,width));}
function line(ch,count){return ch.repeat(Math.max(1,count));}
function rawCols(out){return Number(out?.columns||process.stdout.columns||80);}
function rawRows(out){return Number(out?.rows||process.stdout.rows||24);}
function providerLabel(provider=""){return ({openai:"OpenAI",deepseek:"DeepSeek",google:"Google AI Studio"})[provider]||provider||"Provider";}
function cleanModelTitle(spec={}){
  const raw=String(spec.model||"").split("/").at(-1),known={"deepseek-v4-flash":"V4 Flash","deepseek-v4-pro":"V4 Pro","gpt-5.6-sol":"GPT-5.6 Sol","gpt-5.6-terra":"GPT-5.6 Terra","gpt-5.6-luna":"GPT-5.6 Luna","google-free-pool":"Google Supremo Pool (3.8 · 3.7 · 3.6)","gemini-3.8-flash":"Gemini 3.8 Flash","gemini-3.7-flash":"Gemini 3.7 Flash","gemini-3.5-flash-lite":"Gemini 3.5 Flash-Lite","gemini-3.1-flash-lite":"Gemini 3.1 Flash Lite","gemma-4-31b-it":"Gemma 4 31B","gemma-4-26b-a4b-it":"Gemma 4 26B A4B","gemini-3.6-flash":"Gemini 3.6 Flash","gemini-2.5-flash":"Gemini 2.5 Flash"}
  return known[raw]||String(spec.title||raw||"selected model").replace(/^BLACKCORE\s*·\s*/i,"").replace(/\s*·\s*(?:OFF|ON|LOW|MEDIUM|HIGH|XHIGH|MAX|STANDARD|PRO)$/i,"");
}
function reasoningLabel(value=""){return String(value||"").replace(/^reasoning\s*/i,"").trim().toUpperCase();}
function borderLine(label,columns,left="╭",right="╮"){
  const inner=Math.max(24,columns-2),shown=clip(String(label||""),Math.max(4,inner-4)),fill=line("─",Math.max(1,inner-visibleWidth(shown)-3));
  return `${BORDER}${left}─ ${shown} ${fill}${right}${RESET}`;
}
function contentLine(content,columns,{background=false}={}){
  const inner=Math.max(24,columns-2),shown=clip(content,Math.max(1,inner-2)),pad=" ".repeat(Math.max(0,inner-2-visibleWidth(shown)));
  return `${BORDER}│${RESET}${background?BG:""} ${shown}${pad} ${background?RESET:""}${BORDER}│${RESET}`;
}
function separatorLine(columns){
  const inner=Math.max(24,columns-2),left="╼╼╼╼",right="╾╾",fill=line("─",Math.max(1,inner-visibleWidth(left)-visibleWidth(right)));
  return `${BORDER}├${CYAN}${left}${BORDER}${fill}${CYAN}${right}${BORDER}┤${RESET}`;
}
function outputWidth(layout){return Math.max(8,layout.columns-4);}

export function fixedScrollBar({total=0,rows=1,start=0,arrows=true}={}){
  const size=Math.max(1,rows),cells=Array(size).fill(`${DIM}┊${RESET}`);if(total<=size)return cells;
  if(size===1)return [`${CYAN}█${RESET}`];const inset=arrows?1:0;if(arrows){cells[0]=`${CYAN}▲${RESET}`;cells[size-1]=`${CYAN}▼${RESET}`;if(size===2)return cells;}
  const track=Math.max(1,size-(arrows?2:0)),window=Math.min(total,size),thumb=Math.max(1,Math.round(track*window/total)),maxStart=Math.max(1,total-window),position=Math.round(Math.min(1,Math.max(0,start/maxStart))*Math.max(0,track-thumb));
  for(let index=0;index<thumb;index++)cells[inset+position+index]=`${CYAN}█${RESET}`;return cells;
}
function inputWindow(chars,cursor,max){
  let start=0;while(start<cursor&&visibleWidth(chars.slice(start,cursor).join(""))>Math.max(1,max-3))start++;
  let end=start;while(end<chars.length){if(visibleWidth(chars.slice(start,end+1).join(""))>max-1)break;end++;}
  let text=chars.slice(start,end).join(""),cursorCol=visibleWidth(chars.slice(start,cursor).join(""));
  if(start>0){text="…"+text;cursorCol++;}if(end<chars.length&&visibleWidth(text)<max)text=clip(text,max-1)+"…";
  const glyphs=[...text],before=glyphs.slice(0,Math.max(0,cursorCol)).join(""),after=glyphs.slice(Math.max(0,cursorCol)).join("");
  return `${before}${c("1;51","▌")}${after}`;
}

export function fixedViewportLayout({columns=80,rows=24}={}){
  const cols=Math.max(30,Number(columns)||80),height=Math.max(14,Number(rows)||24),hud=cols>=42&&height>=20,headerTop=1,headerBottom=hud?5:4,composerBottom=height,composerTop=height-(hud?3:2),outputTop=headerBottom+1,outputBottom=composerTop-1;
  return {columns:cols,rows:height,hud,headerTop,headerBottom,outputTop,outputBottom,composerTop,composerBottom,outputRows:outputBottom-outputTop+1};
}

export function fixedComposerSupport({input,output,env=process.env}={}){
  if(!(input?.isTTY&&output?.isTTY&&typeof input.setRawMode==="function"))return {supported:false,reason:"not-tty"};
  if(rawCols(output)<30)return {supported:false,reason:"too-narrow"};
  if(rawRows(output)<14)return {supported:false,reason:"short-terminal"};
  const termux=!!(env?.TERMUX_VERSION||String(env?.PREFIX||"").includes("com.termux"));
  return {supported:true,reason:termux?"termux-fixed-viewport":"fixed-viewport"};
}

export class FixedComposer{
  constructor(controller,spec={}){
    this.controller=controller;this.spec=spec;this.stdin=controller.rl.input||process.stdin;this.out=controller.output||process.stdout;
    this.active=false;this.working=false;this.timer=null;this.tick=0;this.started=Date.now();this.phase={kind:"ready",label:"write naturally",detail:"Enter sends"};this.lastPhaseFrame="";
    const env=this.controller.env||process.env,termux=!!(env?.TERMUX_VERSION||String(env?.PREFIX||"").includes("com.termux")),mouseSetting=String(env.BLACKCORE_TERMUX_MOUSE??"").trim();this.termux=termux;this.mouseEnabled=mouseSetting==="1"||(mouseSetting!=="0"&&!termux);this.touchScrollKeys=this.termux&&!this.mouseEnabled;
    this.chars=[];this.cursor=0;this.historyIndex=-1;this.draft=[];this.wasRaw=false;this.waiter=null;this.layout=fixedViewportLayout();this.keyHandler=this.onKey.bind(this);this.rawInputHandler=this.onRawInput.bind(this);this.resizeHandler=()=>{if(this.active)this.ensureLayout();};
    this.transcript=[];this.partialTranscript="";this.alternate=false;this.scrollOffset=0;this.unreadLines=0;this.outputRenderTimer=null;this.keyboardInput=null;this.rawInputBuffer="";this.rawInputTimer=null;this.restoreReadlineInput=null;this.pointerDrag=null;this.pointerScrollDelta=0;this.pointerScrollTarget=null;this.pointerScrollTimer=null;
  }
  supported(){return fixedComposerSupport({input:this.stdin,output:this.out,env:this.controller.env||process.env}).supported;}
  start({preserve=false}={}){
    if(!this.supported()||this.active)return false;
    this.layout=fixedViewportLayout({columns:rawCols(this.out),rows:rawRows(this.out)});this.wasRaw=!!this.stdin.isRaw;this.controller.questionActive=true;this.controller.rl.pause();this.restoreReadlineInput=this.controller.suspendReadlineInput?.()||(()=>{});this.stdin.setRawMode(true);this.stdin.resume();this.stdin.setEncoding("utf8");
    this.keyboardInput=new PassThrough();this.keyboardInput.setEncoding("utf8");readline.emitKeypressEvents(this.keyboardInput);this.keyboardInput.on("keypress",this.keyHandler);
    this.active=true;if(!preserve)this.started=Date.now();this.stdin.on("data",this.rawInputHandler);this.out.on?.("resize",this.resizeHandler);this.alternate=true;this.out.write(`${esc.mouseOff}${esc.altOn}${this.mouseEnabled?esc.mouseOn:""}${esc.clear}${esc.hideCursor}`);this.configureViewport({replay:true});
    this.timer=setInterval(()=>{this.tick++;if(this.working)this.renderPhase();},90);return true;
  }
  configureViewport({clear=false,replay=false}={}){
    this.layout=fixedViewportLayout({columns:rawCols(this.out),rows:rawRows(this.out)});const {outputTop,outputBottom}=this.layout;
    this.lastPhaseFrame="";this.out.write(`${resetScrollRegion()}${clear?esc.clear:""}${esc.hideCursor}`);this.writeFixed(this.headerLines(),this.layout.headerTop);this.writeFixed(this.composerLines(),this.layout.composerTop);this.out.write(`${scrollRegion(outputTop,outputBottom)}${move(outputBottom,1)}`);if(replay||this.active)this.replayTranscript();
  }
  clearScreen(){if(!this.active)return;this.transcript=[];this.partialTranscript="";this.scrollOffset=0;this.unreadLines=0;this.configureViewport({clear:true});}
  ensureLayout(){const next=fixedViewportLayout({columns:rawCols(this.out),rows:rawRows(this.out)});if(next.columns===this.layout.columns&&next.rows===this.layout.rows)return false;this.layout=next;this.configureViewport({clear:true,replay:true});return true;}
  writeFixed(lines,start){this.out.write(esc.save);for(let index=0;index<lines.length;index++)this.out.write(`${clearLineAt(start+index)}${clip(lines[index],this.layout.columns)}`);this.out.write(esc.restore);}
  displayLines(){
    const logical=[...this.transcript,...(this.partialTranscript?[this.partialTranscript]:[])],width=outputWidth(this.layout);
    return logical.flatMap(value=>wrapAnsiToWidth(value,width));
  }
  recordOutput(value){
    const before=this.displayLines().length,normalized=String(value??"").replace(/\r(?!\n)/g,""),parts=(this.partialTranscript+normalized).split("\n");this.partialTranscript=parts.pop()||"";this.transcript.push(...parts);if(this.transcript.length>1000)this.transcript.splice(0,this.transcript.length-1000);
    const delta=Math.max(0,this.displayLines().length-before);if(this.scrollOffset>0&&delta){this.scrollOffset+=delta;this.unreadLines+=delta;}return delta;
  }
  viewState(){
    const lines=this.displayLines(),rows=Math.max(1,this.layout.outputRows),maxOffset=Math.max(0,lines.length-rows);this.scrollOffset=Math.min(maxOffset,Math.max(0,this.scrollOffset));
    const start=Math.max(0,lines.length-rows-this.scrollOffset),end=Math.min(lines.length,start+rows);
    return {lines,rows,maxOffset,start,end,visible:lines.slice(start,end)};
  }
  renderOutput(){
    if(!this.active)return;const state=this.viewState(),{outputTop,outputRows,columns}=this.layout,width=outputWidth(this.layout),bar=fixedScrollBar({total:state.lines.length,rows:outputRows,start:state.start,arrows:this.mouseEnabled});this.out.write(esc.save);
    for(let index=0;index<outputRows;index++){const shown=index<state.visible.length?clip(state.visible[index],width):"",pad=" ".repeat(Math.max(0,width-visibleWidth(shown)));this.out.write(`${clearLineAt(outputTop+index)}${BORDER}│${RESET} ${shown}${pad}${bar[index]}${BORDER}│${RESET}`);}
    this.out.write(`${RESET}${esc.restore}`);
  }
  scheduleOutputRender(immediate=false){
    if(!this.active)return;if(immediate){if(this.outputRenderTimer){clearTimeout(this.outputRenderTimer);this.outputRenderTimer=null;}this.renderOutput();return;}if(this.outputRenderTimer)return;this.outputRenderTimer=setTimeout(()=>{this.outputRenderTimer=null;this.renderOutput();},16);
  }
  writeOutput(value){
    if(!this.active){this.out.write(String(value??""));return;}this.ensureLayout();const reviewing=this.scrollOffset>0,delta=this.recordOutput(value);
    if(reviewing){if(delta){this.renderHeader();this.renderComposer();}return;}
    this.scheduleOutputRender(String(value??"").includes("\n"));
  }
  replayTranscript(){this.renderOutput();}
  scrollBy(amount){
    if(!this.active)return false;const state=this.viewState(),next=Math.min(state.maxOffset,Math.max(0,this.scrollOffset+amount));if(next===this.scrollOffset)return false;this.scrollOffset=next;if(next===0)this.unreadLines=0;this.renderOutput();this.renderHeader();this.renderComposer();return true;
  }
  scrollToTop(){const state=this.viewState();return this.scrollBy(state.maxOffset-this.scrollOffset);}
  scrollToBottom(){if(!this.scrollOffset)return false;return this.scrollBy(-this.scrollOffset);}
  connectionLine(){const queued=this.controller.queue.length,mode=this.spec.mode||"ACT",connection=this.spec.connection||"READY",tools=Number(this.spec.tools)||0,view=this.viewState(),prefix=connection!=="READY"?`${connection} · `:"",position=this.scrollOffset?`VIEW ${view.start+1}-${view.end}/${view.lines.length}${this.unreadLines?` · +${this.unreadLines} new`:""}`:"VIEW LATEST";return `${prefix}${mode}${tools?` · ${tools} TOOLS`:""}${queued?` · QUEUE ${queued}`:""} · ${position}`;}
  phaseLine(){
    const elapsed=humanDuration(Date.now()-this.started),kind=this.phase.kind,label=this.phase.label,detail=this.phase.detail?`${DIM} · ${this.phase.detail}${RESET}`:"";
    if(kind==="inspect")return `${CYAN}${THINK[this.tick%THINK.length]} SCAN${RESET}   ${FG}${label||"mapping project"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="plan")return `${MAGENTA}◇ PLAN${RESET}   ${FG}${label||"planning changes"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="execute")return `${CYAN}${TOOLS[this.tick%TOOLS.length]} BUILD${RESET}  ${FG}${label||"applying changes"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="verify")return `${GREEN}✓ CHECK${RESET}  ${FG}${label||"running quality gate"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="review")return `${MAGENTA}◇ REVIEW${RESET} ${FG}${label||"reviewing changes"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="report")return `${CYAN}◆ REPORT${RESET} ${FG}${label||"preparing handoff"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="thinking")return `${MAGENTA}${THINK[this.tick%THINK.length]} THINK${RESET}  ${FG}${label||"analyzing request"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="video")return `${MAGENTA}${VIDEO[this.tick%VIDEO.length]} EDIT${RESET}   ${FG}${label||"processing video"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="tools")return `${CYAN}${TOOLS[this.tick%TOOLS.length]} RUN${RESET}    ${FG}${label||"tool"}${RESET}${detail} ${DIM}· ${elapsed}${RESET}`;
    if(kind==="waiting")return `${c(220,"◇ WAIT")}   ${FG}${label||"approval"}${RESET}${detail}`;
    if(kind==="done")return `${GREEN}◆ DONE${RESET}   ${FG}${label||"turn complete"}${RESET}${detail}`;
    return `${GREEN}◆ READY${RESET}  ${FG}${label||"write naturally"}${RESET}${detail}`;
  }
  headerLines(){
    const cols=this.layout.columns,provider=providerLabel(this.spec.provider),model=cleanModelTitle(this.spec),effort=reasoningLabel(this.spec.effort),modelLine=`${CYAN}MODEL${RESET}  ${FG}${model}${RESET} ${DIM}· ${provider}${effort?` · ${effort}`:""}${RESET}`;
    const title=borderLine(`${MAGENTA}✦${RESET} ${FG}B L A C K C O R E${RESET} ${CYAN}//${RESET} ${YELLOW}ULTRA${RESET} ${CYAN}•${RESET} ${BOLD}${CYAN}E${RESET}${BOLD}${MAGENTA}L${RESET}${BOLD}${YELLOW}I${RESET}${BOLD}${GREEN}T${RESET}${BOLD}${CYAN}E${RESET} ${BOLD}${MAGENTA}A${RESET}${BOLD}${YELLOW}I${RESET}`,cols),status=contentLine(this.phaseLine(),cols),footer=borderLine(`${CYAN}${this.connectionLine()}${RESET}`,cols,"╰","╯");
    return this.layout.hud?[title,contentLine(modelLine,cols),separatorLine(cols),status,footer]:[title,contentLine(modelLine,cols),status,footer];
  }
  composerLines(){
    const cols=this.layout.columns,inner=Math.max(24,cols-2),inputMax=Math.max(8,inner-7),placeholder=this.spec.placeholder||"Describe what you want BLACKCORE to do…";
    const body=this.chars.length?inputWindow(this.chars,this.cursor,inputMax):`${DIM}${clip(placeholder,inputMax)}${RESET}${c("1;51","▌")}`,hint=this.scrollOffset?`PgDn ↓ · Ctrl+End latest · ${this.scrollOffset} lines up`:this.working?"Enter queues · Ctrl+C cancel":"Enter sends · Ctrl+C clears",navigation=this.mouseEnabled?"PgUp/PgDn · swipe center/drag rail":this.touchScrollKeys?"Swipe ↑↓ scroll · Ctrl+P/N history":"PgUp/PgDn · Ctrl+Home/End",title=borderLine(`${CYAN}MESSAGE${RESET}${this.working?`${MAGENTA} · LIVE${RESET}`:""} ${MAGENTA}+${RESET}`,cols),input=contentLine(`${CYAN}›${RESET} ${FG}${body}${RESET}`,cols,{background:true}),footer=borderLine(`${DIM}${navigation}${RESET}`,cols,"╰","╯");
    return this.layout.hud?[title,input,contentLine(`${DIM}${hint}${RESET}`,cols),footer]:[title,input,borderLine(`${DIM}${hint}${RESET}`,cols,"╰","╯")];
  }
  renderHeader(){if(this.active&&!this.ensureLayout())this.writeFixed(this.headerLines(),this.layout.headerTop);}
  renderPhase(){if(!this.active||this.ensureLayout())return;const frame=contentLine(this.phaseLine(),this.layout.columns);if(frame===this.lastPhaseFrame)return;this.lastPhaseFrame=frame;this.writeFixed([frame],this.layout.headerTop+(this.layout.hud?3:2));}
  renderComposer(){if(this.active&&!this.ensureLayout())this.writeFixed(this.composerLines(),this.layout.composerTop);}
  setSpec(spec={}){this.spec={...this.spec,...spec};if(this.active){this.renderHeader();this.renderComposer();}}
  setPhase(kind,label="",detail=""){const next={kind:kind||"working",label:String(label||""),detail:String(detail||"")},stageChanged=this.phase.kind!==next.kind||this.phase.label!==next.label;this.phase=next;if(stageChanged)this.started=Date.now();if(this.active)this.renderPhase();}
  beginWork(spec={}){this.setSpec(spec);this.working=true;this.phase={kind:"working",label:"preparing",detail:""};this.started=Date.now();this.renderHeader();this.renderComposer();}
  endWork(){this.working=false;this.phase={kind:"ready",label:"write naturally",detail:"Enter sends"};this.started=Date.now();this.renderHeader();this.renderComposer();}
  ask(spec={}){
    if(!this.active&&!this.start())return Promise.reject(new Error("fixed composer unavailable"));if(this.waiter)return Promise.reject(new Error("composer is already waiting for input"));
    this.setSpec(spec);this.working=false;this.phase={kind:"ready",label:"write naturally",detail:"Enter sends"};this.renderHeader();this.renderComposer();return new Promise((resolve,reject)=>{this.waiter={resolve,reject};});
  }
  echoUser(value){this.writeOutput(`${c("1;213","you")} ${c(244,"›")} ${String(value)}\n`);}
  resetInput(){this.chars=[];this.cursor=0;this.historyIndex=-1;this.draft=[];}
  submitCurrent(){
    const value=this.chars.join("").trim();if(!value)return;
    this.scrollToBottom();
    if(this.controller.isCancelInput?.(value)&&this.working){this.resetInput();this.controller.onInterrupt?.();this.renderComposer();return;}
    if(this.waiter&&!this.working){const waiter=this.waiter;this.waiter=null;this.controller.remember(value);this.resetInput();this.renderComposer();this.echoUser(value);waiter.resolve(value);return;}
    this.controller.queue.push(value);this.controller.remember(value);this.controller.onQueued?.(value,this.controller.queue.length);this.resetInput();this.renderHeader();this.renderComposer();
  }
  resolveEmpty(){if(!this.waiter)return false;const waiter=this.waiter;this.waiter=null;this.resetInput();this.renderComposer();waiter.resolve("");return true;}
  rejectInput(error){if(!this.waiter)return false;const waiter=this.waiter;this.waiter=null;waiter.reject(error);return true;}
  setText(text){this.chars=[...String(text||"")];this.cursor=this.chars.length;this.renderComposer();}
  historyPrevious(){const history=this.controller.rl.history||[];if(history.length){if(this.historyIndex<0)this.draft=[...this.chars];this.historyIndex=Math.min(history.length-1,this.historyIndex+1);this.setText(history[this.historyIndex]||"");}}
  historyNext(){const history=this.controller.rl.history||[];if(this.historyIndex>=0){this.historyIndex--;this.setText(this.historyIndex>=0?(history[this.historyIndex]||""):this.draft.join(""));}}
  applyPointerScroll(){
    if(this.pointerScrollTimer){clearTimeout(this.pointerScrollTimer);this.pointerScrollTimer=null;}const target=this.pointerScrollTarget,delta=this.pointerScrollDelta;this.pointerScrollTarget=null;this.pointerScrollDelta=0;if(target!=null)this.scrollBy(target-this.scrollOffset);else if(delta)this.scrollBy(delta);
  }
  queuePointerScroll({delta=0,target=null}={}){
    if(target!=null){this.pointerScrollTarget=target;this.pointerScrollDelta=0;}else if(this.pointerScrollTarget==null)this.pointerScrollDelta+=delta;if(this.pointerScrollTimer)return;this.pointerScrollTimer=setTimeout(()=>this.applyPointerScroll(),24);
  }
  railTarget(y){
    const state=this.viewState(),ratio=this.layout.outputRows<=1?1:(y-this.layout.outputTop)/(this.layout.outputRows-1);return Math.round(state.maxOffset*(1-Math.min(1,Math.max(0,ratio))));
  }
  mouseEvent(code,x,y,kind="M"){
    if(!this.mouseEnabled)return;if(code&64){this.scrollBy(code&1?-3:3);return;}const button=code&3,moving=!!(code&32),release=kind==="m"||button===3;if(release){this.applyPointerScroll();this.pointerDrag=null;return;}if(button!==0||kind!=="M")return;const inside=y>=this.layout.outputTop&&y<=this.layout.outputBottom;if(!inside){this.pointerDrag=null;return;}const rail=x>=this.layout.columns-2;if(!moving){this.pointerDrag={lastY:y,rail};if(rail)this.scrollBy(this.railTarget(y)-this.scrollOffset);return;}if(!this.pointerDrag)this.pointerDrag={lastY:y,rail};if(this.pointerDrag.rail||rail){this.pointerDrag.rail=true;this.pointerDrag.lastY=y;this.queuePointerScroll({target:this.railTarget(y)});return;}const delta=this.pointerDrag.lastY-y;this.pointerDrag.lastY=y;if(delta)this.queuePointerScroll({delta:delta*2});
  }
  scheduleRawInputFlush(){
    if(this.rawInputTimer)return;this.rawInputTimer=setTimeout(()=>{this.rawInputTimer=null;const pending=this.rawInputBuffer;this.rawInputBuffer="";if(!pending)return;if(!pending.startsWith(MOUSE_PREFIX)){this.keyboardInput?.write(pending);return;}const tail=pending.slice(MOUSE_PREFIX.length).replace(/^[0-9;]*/,"").replace(/^[Mm]/,"");if(tail)this.keyboardInput?.write(tail);},40);
  }
  onRawInput(data){
    if(!this.active)return;if(this.rawInputTimer){clearTimeout(this.rawInputTimer);this.rawInputTimer=null;}this.rawInputBuffer+=String(data??"");
    while(this.rawInputBuffer){const index=this.rawInputBuffer.indexOf(MOUSE_PREFIX);if(index<0){let keep=0;for(let size=Math.min(MOUSE_PREFIX.length-1,this.rawInputBuffer.length);size>0;size--){if(MOUSE_PREFIX.startsWith(this.rawInputBuffer.slice(-size))){keep=size;break;}}const safe=keep?this.rawInputBuffer.slice(0,-keep):this.rawInputBuffer;if(safe)this.keyboardInput?.write(safe);this.rawInputBuffer=keep?this.rawInputBuffer.slice(-keep):"";if(this.rawInputBuffer)this.scheduleRawInputFlush();return;}if(index>0){this.keyboardInput?.write(this.rawInputBuffer.slice(0,index));this.rawInputBuffer=this.rawInputBuffer.slice(index);continue;}const match=this.rawInputBuffer.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])/);if(match){this.rawInputBuffer=this.rawInputBuffer.slice(match[0].length);this.mouseEvent(Number(match[1]),Number(match[2]),Number(match[3]),match[4]);continue;}const malformed=this.rawInputBuffer.match(/^\x1b\[<[^\x1b]*?[Mm]/);if(malformed){this.rawInputBuffer=this.rawInputBuffer.slice(malformed[0].length);continue;}if(this.rawInputBuffer.length>80){this.rawInputBuffer="";return;}this.scheduleRawInputFlush();return;}
  }
  onMouseData(data){
    if(!this.active)return;for(const match of String(data??"").matchAll(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/g))this.mouseEvent(Number(match[1]),Number(match[2]),Number(match[3]),match[4]);
  }
  onKey(str,key={}){
    if(!this.active)return;
    if(String(str||"").startsWith("\x1b[<"))return;
    if(key.ctrl&&key.name==="c"){if(!this.working&&this.resolveEmpty())return;this.controller.onInterrupt?.();return;}
    if(key.ctrl&&key.name==="d"&&!this.chars.length&&!this.working){this.rejectInput(new Error("EOF"));return;}
    if(key.ctrl&&key.name==="l"){this.configureViewport({clear:true,replay:true});return;}
    if(key.name==="pageup"){this.scrollBy(Math.max(1,this.layout.outputRows-2));return;}
    if(key.name==="pagedown"){this.scrollBy(-Math.max(1,this.layout.outputRows-2));return;}
    if(key.ctrl&&key.name==="p"){this.historyPrevious();return;}
    if(key.ctrl&&key.name==="n"){this.historyNext();return;}
    if(key.alt&&key.name==="up"){this.historyPrevious();return;}
    if(key.alt&&key.name==="down"){this.historyNext();return;}
    if(key.ctrl&&key.name==="up"){this.scrollBy(1);return;}
    if(key.ctrl&&key.name==="down"){this.scrollBy(-1);return;}
    if(key.ctrl&&key.name==="home"){this.scrollToTop();return;}
    if(key.ctrl&&key.name==="end"){this.scrollToBottom();return;}
    if((key.shift||key.meta)&&key.name==="up"){this.scrollBy(1);return;}
    if((key.shift||key.meta)&&key.name==="down"){this.scrollBy(-1);return;}
    if(key.name==="return"||key.name==="enter"){this.submitCurrent();return;}
    if(key.name==="left"){this.cursor=Math.max(0,this.cursor-1);this.renderComposer();return;}
    if(key.name==="right"){this.cursor=Math.min(this.chars.length,this.cursor+1);this.renderComposer();return;}
    if(key.name==="home"){this.cursor=0;this.renderComposer();return;}
    if(key.name==="end"){this.cursor=this.chars.length;this.renderComposer();return;}
    if(key.name==="backspace"){if(this.cursor>0){this.chars.splice(this.cursor-1,1);this.cursor--;}this.renderComposer();return;}
    if(key.name==="delete"){if(this.cursor<this.chars.length)this.chars.splice(this.cursor,1);this.renderComposer();return;}
    if(key.name==="escape"){this.resetInput();this.renderComposer();return;}
    if(key.name==="up"){if(this.touchScrollKeys)this.scrollBy(1);else this.historyPrevious();return;}
    if(key.name==="down"){if(this.touchScrollKeys)this.scrollBy(-1);else this.historyNext();return;}
    if(str&&!key.ctrl&&!key.meta&&str!=="\r"&&str!=="\n"){const add=[...str];this.chars.splice(this.cursor,0,...add);this.cursor+=add.length;this.historyIndex=-1;this.renderComposer();}
  }
  stop({clear=true}={}){
    if(!this.active)return;if(this.timer){clearInterval(this.timer);this.timer=null;}if(this.outputRenderTimer){clearTimeout(this.outputRenderTimer);this.outputRenderTimer=null;}if(this.rawInputTimer){clearTimeout(this.rawInputTimer);this.rawInputTimer=null;}if(this.pointerScrollTimer){clearTimeout(this.pointerScrollTimer);this.pointerScrollTimer=null;}this.pointerDrag=null;this.pointerScrollDelta=0;this.pointerScrollTarget=null;this.rawInputBuffer="";this.stdin.removeListener("data",this.rawInputHandler);this.keyboardInput?.removeListener("keypress",this.keyHandler);this.keyboardInput?.end();this.keyboardInput=null;this.out.removeListener?.("resize",this.resizeHandler);this.active=false;
    try{this.stdin.setRawMode(this.wasRaw);}catch{}this.restoreReadlineInput?.();this.restoreReadlineInput=null;this.controller.rl.resume();this.controller.questionActive=false;this.out.write(resetScrollRegion());
    if(clear){for(let row=this.layout.headerTop;row<=this.layout.headerBottom;row++)this.out.write(clearLineAt(row));for(let row=this.layout.composerTop;row<=this.layout.composerBottom;row++)this.out.write(clearLineAt(row));}
    this.out.write(`${esc.mouseOff}${move(this.layout.rows,1)}${esc.clearLine}${esc.showCursor}${this.alternate?esc.altOff:""}`);this.alternate=false;
  }
  suspend(){
    if(!this.active)return ()=>{};const snapshot={chars:[...this.chars],cursor:this.cursor,phase:{...this.phase},started:this.started,spec:{...this.spec},working:this.working};this.stop({clear:true});
    return ()=>{this.chars=[...snapshot.chars];this.cursor=snapshot.cursor;this.phase={...snapshot.phase};this.started=snapshot.started;this.spec={...snapshot.spec};this.working=snapshot.working;this.start({preserve:true});};
  }
}

export function fixedComposerPreview({text="",phase="thinking",model="deepseek-v4-pro",effort="max",mode="ACT",queued=0,mouseEnabled=false,touchScrollKeys=false}={},columns=54){
  const cols=Math.max(30,columns),inner=Math.max(24,cols-2),input=clip(text||"Describe what you want…",Math.max(8,inner-7)),top=label=>clip(`╭─ ${label} ${"─".repeat(Math.max(1,inner-visibleWidth(label)-3))}╮`,cols),bottom=label=>clip(`╰─ ${label} ${"─".repeat(Math.max(1,inner-visibleWidth(label)-3))}╯`,cols),content=value=>{const shown=clip(value,cols-4),pad=" ".repeat(Math.max(0,cols-4-visibleWidth(shown)));return `│ ${shown}${pad} │`;},rail=value=>{const shown=clip(value,cols-4),pad=" ".repeat(Math.max(0,cols-4-visibleWidth(shown)));return `│ ${shown}${pad}█│`;},rule=`├╼╼╼╼${"─".repeat(Math.max(1,inner-6))}╾╾┤`;
  return [top(`✦ B L A C K C O R E // ULTRA • ELITE AI`),content(`MODEL  ${model} · ${effort.toUpperCase()}`),rule,content(`${phase==="tools"?"╺━ RUN   current tool":"⠹ THINK analyzing request"} · 12s`),bottom(`${mode}${queued?` · QUEUE ${queued}`:""} · VIEW LATEST`),rail("responses, code and tools scroll here"),top("MESSAGE · LIVE +"),content(`› ${input} ▌`),content("Enter queues · Ctrl+C cancel"),bottom(mouseEnabled?"PgUp/PgDn · swipe center/drag rail":touchScrollKeys?"Swipe ↑↓ scroll · Ctrl+P/N history":"PgUp/PgDn · Ctrl+Home/End")];
}
