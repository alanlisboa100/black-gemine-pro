import readline from "node:readline/promises";
import {execCapture} from "../utils/exec.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {BC_HOME,ensureHome} from "../utils/paths.js";
import {readComposer} from "./composer.js";
import {LiveComposer} from "./live-composer.js";
import {FixedComposer} from "./fixed-composer.js";
import {truncateToWidth,visibleWidth} from "../utils/text.js";

function wrapQuestion(text,width){
  const out=[];
  for(const paragraph of String(text||"").split(/\r?\n/)){
    let rest=paragraph.trim();
    if(!rest){out.push("");continue;}
    while(visibleWidth(rest)>width){let cut=Math.min(rest.length,width),space=rest.lastIndexOf(" ",cut);if(space>Math.floor(width/2))cut=space;out.push(rest.slice(0,cut));rest=rest.slice(cut).trimStart();}
    out.push(rest);
  }
  return out;
}

export function confirmationPrompt(question,def=false,columns=80){
  const width=Math.max(30,Math.min(80,columns||80)),inner=width-2,contentWidth=inner-2,title=" CONFIRM ",top=`╭─${title}${"─".repeat(Math.max(1,inner-visibleWidth(title)-1))}╮`;
  const rows=wrapQuestion(question,contentWidth).map(line=>`│ ${truncateToWidth(line,contentWidth).padEnd(contentWidth)} │`);
  const hint=`Default: ${def?"allow":"deny"} · type yes/sim to allow`;
  return [top,...rows,`│ ${truncateToWidth(hint,contentWidth).padEnd(contentWidth)} │`,`╰${"─".repeat(inner)}╯`].join("\n")+"\n";
}

function shellQuote(s){return `'${String(s).replace(/'/g,`'\\''`)}'`;}
export function isCancelInput(value){return /^(?:\/(?:cancel|stop)|cancel|stop|cancelar|cancela|pare|parar)(?:\s+(?:isso|a[ií]|agora|essa\s+tentativa))?[.!]?$/i.test(String(value||"").trim());}
export class InputController{
  constructor({historySize=1000,historyFile=path.join(BC_HOME,"history"),input=process.stdin,output=process.stdout,terminal=true,env=process.env}={}){ensureHome();this.historyFile=historyFile;this.historySize=historySize;this.output=output;this.env=env;this.queue=[];this.questionActive=false;this.onQueued=null;this.onInterrupt=null;this.liveComposer=null;this.fixedComposer=null;const previousKeypress=new Set(input.listeners?.("keypress")||[]);this.rl=readline.createInterface({input,output,historySize,removeHistoryDuplicates:true,terminal});this.readlineKeypressListeners=(input.listeners?.("keypress")||[]).filter(listener=>!previousKeypress.has(listener));this.readlineSuspendDepth=0;try{const h=fs.readFileSync(historyFile,"utf8").split(/\r?\n/).filter(Boolean).slice(-historySize);this.rl.history=[...h].reverse();}catch{}this.draft="";this.rl.on("line",line=>{if(!this.questionActive){const value=String(line||"");if(isCancelInput(value)){this.onInterrupt?.();return;}if(value.trim()){this.queue.push(value);this.remember(value);this.onQueued?.(value,this.queue.length);}}});}
  async ask(prompt){
    if(this.queue.length)return this.queue.shift();
    if(prompt&&typeof prompt==="object"&&prompt.type==="composer"){
      if(this.fixedComposer?.active)return this.fixedComposer.ask(prompt);
      const value=await readComposer(this,prompt);
      if(value?.trim())this.remember(value);
      return value;
    }
    this.questionActive=true;try{const value=await this.rl.question(prompt);if(value.trim())this.remember(value);return value;}finally{this.questionActive=false;}
  }
  queuedCount(){return this.queue.length;}
  isCancelInput(value){return isCancelInput(value);}
  remember(value){try{let h=[];try{h=fs.readFileSync(this.historyFile,"utf8").split(/\r?\n/).filter(Boolean);}catch{}if(h.at(-1)!==value)h.push(value);h=h.slice(-this.historySize);fs.writeFileSync(this.historyFile,h.join("\n")+"\n",{mode:0o600});}catch{}}
  beginWorkComposer(spec={}){
    if(this.fixedComposer?.active){this.fixedComposer.beginWork(spec);return true;}
    if(this.liveComposer?.active)this.liveComposer.stop({clear:true});
    const live=new LiveComposer(this,spec);
    if(!live.start())return false;
    this.liveComposer=live;return true;
  }
  endWorkComposer(){if(this.fixedComposer?.active){this.fixedComposer.endWork();return;}if(this.liveComposer){this.liveComposer.stop({clear:true});this.liveComposer=null;}}
  workComposerActive(){return !!(this.fixedComposer?.active||this.liveComposer?.active);}
  setWorkPhase(kind,label="",detail=""){if(this.fixedComposer?.active)this.fixedComposer.setPhase(kind,label,detail);else this.liveComposer?.setPhase(kind,label,detail);}
  suspendReadlineInput(){
    const input=this.rl.input,listeners=this.readlineKeypressListeners||[];this.readlineSuspendDepth++;if(this.readlineSuspendDepth===1)for(const listener of listeners)input.removeListener?.("keypress",listener);let restored=false;return ()=>{if(restored)return;restored=true;this.readlineSuspendDepth=Math.max(0,this.readlineSuspendDepth-1);if(this.readlineSuspendDepth)return;for(const listener of listeners)if(!(input.listeners?.("keypress")||[]).includes(listener))input.on?.("keypress",listener);};
  }
  suspendWorkComposer(){if(this.fixedComposer?.active)return this.fixedComposer.suspend();if(!this.liveComposer?.active)return ()=>{};return this.liveComposer.suspend();}
  startFixedComposer(spec={}){if(this.fixedComposer?.active){this.fixedComposer.setSpec(spec);return true;}const fixed=new FixedComposer(this,spec);if(!fixed.start())return false;this.fixedComposer=fixed;return true;}
  fixedComposerActive(){return !!this.fixedComposer?.active;}
  async confirm(question,def=false){const resume=this.suspendWorkComposer();this.questionActive=true;try{this.output.write(confirmationPrompt(question,def,this.output.columns||process.stdout.columns||80));const a=(await this.rl.question(`› Allow? ${def?"[Y/n]":"[y/N]"} `)).trim().toLowerCase();return !a?def:["y","yes","s","sim"].includes(a);}finally{this.questionActive=false;resume();}}
  async externalEditor(initial="",editor=process.env.VISUAL||process.env.EDITOR||"nano"){
    const resume=this.suspendWorkComposer(),file=path.join(os.tmpdir(),`blackcore-edit-${process.pid}-${Date.now()}.md`);fs.writeFileSync(file,initial,"utf8");try{const r=await execCapture(process.env.SHELL||"sh",["-c",`${editor} ${shellQuote(file)}`],{timeoutMs:0});if(r.code!==0)throw new Error(r.combined);return fs.readFileSync(file,"utf8");}finally{try{fs.unlinkSync(file);}catch{}resume();}
  }
  close(){if(this.fixedComposer){this.fixedComposer.stop({clear:true});this.fixedComposer=null;}if(this.liveComposer){this.liveComposer.stop({clear:true});this.liveComposer=null;}this.rl.close();}
}
