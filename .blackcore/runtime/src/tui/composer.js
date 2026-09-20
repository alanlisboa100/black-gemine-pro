import readline from "node:readline";
import {c,esc,cursorUp,cursorDown} from "./ansi.js";
import {width} from "./layout.js";
import {truncateToWidth,visibleWidth} from "../utils/text.js";

const FG="\x1b[38;5;255m";
const DIM="\x1b[38;5;245m";
const CYAN="\x1b[38;5;51m";
const BORDER="\x1b[38;5;239m";
const RESET=esc.reset;

function providerLabel(provider=""){
  return ({openai:"OpenAI",deepseek:"DeepSeek",google:"Google AI Studio"})[provider]||provider||"Provider";
}
function shortModel(model=""){
  const raw=String(model).split("/").at(-1);
  const known={
    "deepseek-v4-flash":"V4 Flash","deepseek-v4-pro":"V4 Pro",
    "gpt-5.6-sol":"GPT-5.6 Sol","gpt-5.6-terra":"GPT-5.6 Terra","gpt-5.6-luna":"GPT-5.6 Luna",
    "google-free-pool":"Google Supremo Pool (3.8 · 3.7 · 3.6)","gemini-3.8-flash":"Gemini 3.8 Flash","gemini-3.7-flash":"Gemini 3.7 Flash","gemini-3.5-flash-lite":"Gemini 3.5 Flash-Lite","gemini-3.1-flash-lite":"Gemini 3.1 Flash Lite",
    "gemma-4-31b-it":"Gemma 4 31B","gemma-4-26b-a4b-it":"Gemma 4 26B A4B","gemini-3.6-flash":"Gemini 3.6 Flash","gemini-2.5-flash":"Gemini 2.5 Flash"
  };
  return known[model]||known[raw]||raw.replace(/-/g," ").replace(/\b\w/g,x=>x.toUpperCase());
}
function line(ch,n){return ch.repeat(Math.max(1,n));}
function labeledBorder(label,inner,left,right){
  const shown=truncateToWidth(String(label||""),Math.max(4,inner-4));
  return `${left}─ ${shown} ${line("─",inner-visibleWidth(shown)-3)}${right}`;
}
function matchedSuggestions(value,items=[]){
  if(!value.startsWith("/")||/\s/.test(value))return [];
  const q=value.toLowerCase();
  return items.filter(x=>String(x.label||"").toLowerCase().startsWith(q)).slice(0,6);
}
function sliceWindow(chars,cursor,maxWidth){
  let start=0;
  while(start<cursor&&visibleWidth(chars.slice(start,cursor).join(""))>Math.max(1,maxWidth-2))start++;
  let end=start;
  while(end<chars.length){const candidate=chars.slice(start,end+1).join("");if(visibleWidth(candidate)>maxWidth)break;end++;}
  let text=chars.slice(start,end).join(""),cursorCol=visibleWidth(chars.slice(start,cursor).join(""));
  if(start>0){text="…"+text;cursorCol+=1;}
  if(end<chars.length&&visibleWidth(text)<maxWidth)text=truncateToWidth(text,maxWidth-1)+"…";
  return {text,cursorCol};
}
function clearRendered(rendered,output=process.stdout){
  if(!rendered?.lines)return;
  // Cursor sits on the input row (one row below the top border).
  output.write("\r"+cursorUp(1));
  for(let i=0;i<rendered.lines;i++){
    output.write(esc.clearLine);
    if(i<rendered.lines-1)output.write(cursorDown(1));
  }
  if(rendered.lines>1)output.write(cursorUp(rendered.lines-1));
  output.write("\r");
}
function render(state,spec,output=process.stdout){
  const W=Math.max(30,output.columns||width()),inner=Math.max(24,W-2);
  const inputMax=Math.max(8,inner-4);
  const {text,cursorCol}=sliceWindow(state.chars,state.cursor,inputMax);
  const placeholder=!state.chars.length?(spec.placeholder||"Tell BLACKCORE what you want to do…"):"";
  const body=state.chars.length?text:truncateToWidth(placeholder,inputMax),bodyColor=state.chars.length?FG:DIM;
  const prefix="› ";
  const bodyPlain=`${prefix}${body}`;
  const pad=" ".repeat(Math.max(0,inner-2-visibleWidth(bodyPlain)));

  const title=spec.title||"BLACKCORE",footer=spec.footer||"READY · / commands";
  output.write(`${BORDER}${labeledBorder(title,inner,"╭","╮")}${RESET}\n`);
  output.write(`${BORDER}│${RESET} ${CYAN}${prefix}${bodyColor}${body}${RESET}${pad} ${BORDER}│${RESET}\n`);
  output.write(`${BORDER}${labeledBorder(footer,inner,"╰","╯")}${RESET}\n`);

  const suggestions=matchedSuggestions(state.chars.join(""),spec.suggestions);
  if(suggestions.length){
    output.write(`${BORDER}${line("─",W)}${RESET}\n`);
    for(let i=0;i<suggestions.length;i++){
      const s=suggestions[i],active=i===state.suggestionIndex;
      const left=String(s.label||"").padEnd(14),desc=truncateToWidth(s.description||"",Math.max(8,W-18));
      output.write(`${active?CYAN:DIM}${active?"›":" "} ${left} ${desc}${RESET}\n`);
    }
  }
  const lines=3+(suggestions.length?1+suggestions.length:0);
  // We are one row below the last rendered line. Move back to the input row (row 1).
  output.write(cursorUp(lines-1));
  output.write("\r");
  const cursorAbs=Math.min(W-2,2+visibleWidth(prefix)+cursorCol);
  if(cursorAbs>0)output.write(`\x1b[${cursorAbs}C`);
  return {lines,suggestions};
}

export async function readComposer(controller,spec={}){
  const stdin=controller.rl.input||process.stdin;
  const output=controller.output||process.stdout;
  if(!stdin.isTTY||!output.isTTY||typeof stdin.setRawMode!=="function")return null;
  const history=[];try{history.push(...controller.rl.history);}catch{}
  const state={chars:[],cursor:0,historyIndex:-1,draft:[],suggestionIndex:0};
  controller.questionActive=true;controller.rl.pause();readline.emitKeypressEvents(stdin);
  const wasRaw=!!stdin.isRaw;stdin.setRawMode(true);stdin.resume();stdin.setEncoding("utf8");output.write(esc.showCursor);
  let rendered=render(state,spec,output);
  const redraw=()=>{clearRendered(rendered,output);const ms=matchedSuggestions(state.chars.join(""),spec.suggestions);if(!ms.length)state.suggestionIndex=0;else state.suggestionIndex=Math.max(0,Math.min(state.suggestionIndex,ms.length-1));rendered=render(state,spec,output);};
  const setText=text=>{state.chars=[...String(text||"")];state.cursor=state.chars.length;state.suggestionIndex=0;redraw();};
  return await new Promise((resolve,reject)=>{
    const cleanup=()=>stdin.removeListener("keypress",onKey);
    const finish=(value,{echo=true}={})=>{
      cleanup();clearRendered(rendered,output);try{stdin.setRawMode(wasRaw);}catch{}controller.rl.resume();controller.questionActive=false;
      if(echo&&String(value).trim())output.write(`${c("1;213","you")} ${c(244,"›")} ${String(value)}\n`);
      resolve(value);
    };
    const onKey=(str,key={})=>{
      const value=state.chars.join(""),suggestions=matchedSuggestions(value,spec.suggestions);
      if(key.ctrl&&key.name==="c"){finish("",{echo:false});return;}
      if(key.ctrl&&key.name==="d"&&!state.chars.length){cleanup();clearRendered(rendered,output);try{stdin.setRawMode(wasRaw);}catch{}controller.rl.resume();controller.questionActive=false;reject(new Error("EOF"));return;}
      if(key.name==="return"||key.name==="enter"){
        let out=value;
        if(suggestions.length&&state.suggestionIndex>=0){const exact=suggestions.find(x=>String(x.label||"").toLowerCase()===value.toLowerCase());if(exact)out=exact.label;else if(value==="/"||state.suggestionIndex>0)out=suggestions[state.suggestionIndex].label;}
        finish(out);return;
      }
      if(key.name==="tab"&&suggestions.length){state.suggestionIndex=(state.suggestionIndex+1)%suggestions.length;setText(suggestions[state.suggestionIndex].label);return;}
      if(key.name==="up"){
        if(suggestions.length){state.suggestionIndex=(state.suggestionIndex-1+suggestions.length)%suggestions.length;redraw();return;}
        if(history.length){if(state.historyIndex<0)state.draft=[...state.chars];state.historyIndex=Math.min(history.length-1,state.historyIndex+1);setText(history[state.historyIndex]||"");}return;
      }
      if(key.name==="down"){
        if(suggestions.length){state.suggestionIndex=(state.suggestionIndex+1)%suggestions.length;redraw();return;}
        if(state.historyIndex>=0){state.historyIndex--;setText(state.historyIndex>=0?(history[state.historyIndex]||""):state.draft.join(""));}return;
      }
      if(key.name==="left"){state.cursor=Math.max(0,state.cursor-1);redraw();return;}
      if(key.name==="right"){state.cursor=Math.min(state.chars.length,state.cursor+1);redraw();return;}
      if(key.name==="home"){state.cursor=0;redraw();return;}
      if(key.name==="end"){state.cursor=state.chars.length;redraw();return;}
      if(key.name==="backspace"){if(state.cursor>0){state.chars.splice(state.cursor-1,1);state.cursor--;state.suggestionIndex=0;redraw();}return;}
      if(key.name==="delete"){if(state.cursor<state.chars.length){state.chars.splice(state.cursor,1);state.suggestionIndex=0;redraw();}return;}
      if(key.name==="escape"){state.suggestionIndex=0;redraw();return;}
      if(str&&!key.ctrl&&!key.meta&&str!=="\r"&&str!=="\n"){const add=[...str];state.chars.splice(state.cursor,0,...add);state.cursor+=add.length;state.historyIndex=-1;state.suggestionIndex=0;redraw();}
    };
    stdin.on("keypress",onKey);
  });
}

export function composerPreviewLines({text="",title="BLACKCORE",footer="READY · / commands",suggestions=[],placeholder="Tell BLACKCORE what you want to do…"}={},columns=54){
  const value=String(text),matched=matchedSuggestions(value,suggestions),inner=Math.max(24,columns-2),prefix="› ",max=Math.max(8,inner-4),win=sliceWindow([...value],[...value].length,max),body=value?win.text:truncateToWidth(placeholder,max);
  const top=labeledBorder(title,inner,"╭","╮"),mid=`│ ${prefix}${body}${" ".repeat(Math.max(0,inner-2-visibleWidth(prefix+body)))} │`,bottom=labeledBorder(footer,inner,"╰","╯");
  return [truncateToWidth(top,columns),truncateToWidth(mid,columns),truncateToWidth(bottom,columns),...(matched.length?["─".repeat(columns),...matched.map((s,i)=>truncateToWidth(`${i===0?"›":" "} ${String(s.label||"").padEnd(14)} ${s.description||""}`,columns))]:[])];
}

export function composerTitle({model="",effort=""}={}){
  return `BLACKCORE · ${shortModel(model)}${effort?` · ${String(effort).toUpperCase()}`:""}`;
}

export function compactFooter({provider="",mode="ACT",connection="READY"}={}){
  const readiness=connection||"READY";
  return `${readiness} · ${providerLabel(provider)} · ${mode} · / commands`;
}
