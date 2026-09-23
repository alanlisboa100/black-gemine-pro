import readline from "node:readline";
import {c,esc} from "./ansi.js";
import {truncateToWidth} from "../utils/text.js";

const ACCENTS={provider:51,openai:82,deepseek:45,google:39,default:51};

/** A bounded viewport keeps selection and navigation visible on a phone. */
export function menuFrame(title,items,index,{subtitle="",footer="↑↓ navigate · Enter select · Esc back",accent="default",columns=80,rows=24}={}){
  const W=Math.max(1,columns-1),H=Math.max(1,rows-1),A=ACCENTS[accent]||51;
  const clip=s=>truncateToWidth(s,W);
  if(H<5)return [clip(`${index+1}/${items.length} ${items[index]?.label||title}`),clip(footer)].slice(0,H);
  const header=[c(`1;38;5;${A}`,title)];
  if(subtitle&&H>=9)header.push(c(244,subtitle));
  header.push(c(238,"─".repeat(W)));
  const room=Math.max(1,H-header.length-2);
  const detailed=W>=44&&room>=6;
  const stride=detailed?2:1,capacity=Math.max(1,Math.floor(room/stride));
  const start=Math.max(0,Math.min(index-Math.floor(capacity/2),items.length-capacity));
  const end=Math.min(items.length,start+capacity),body=[];
  for(let i=start;i<end;i++){
    const item=items[i],active=i===index;
    const text=`${active?"›":" "} ${String(i+1).padStart(2)}  ${item.label}${item.badge?` [${item.badge}]`:""}`;
    body.push(c(active?`1;38;5;${A}`:255,text));
    if(detailed)body.push(c(active?`38;5;${A}`:244,`      ${item.description||""}`));
  }
  return [...header,...body,c(244,`${index+1}/${items.length}${start>0?" · ↑ more":""}${end<items.length?" · ↓ more":""}`),c(244,footer)].map(clip);
}
async function numericFallback(input,title,items,{subtitle=""}={}){
  const out=input?.output||process.stdout;
  out.write(`\n${title}\n${subtitle?subtitle+"\n":""}`);
  items.forEach((x,i)=>out.write(`${i+1}. ${x.label}${x.badge?` [${x.badge}]`:""} — ${x.description||""}\n`));
  input.questionActive=true;
  try{const ans=(await input.rl.question("Select (Enter cancels): ")).trim();if(!ans)return null;const n=Number(ans)-1;return Number.isInteger(n)&&items[n]?{item:items[n],index:n}:null;}
  finally{input.questionActive=false;}
}
export async function selectMenu(input,title,items,{subtitle="",selectedIndex=0,footer,accent="default"}={}){
  if(!items.length)return null;
  const resume=input?.suspendWorkComposer?.()||(()=>{}),stdin=input?.rl?.input||process.stdin,stdout=input?.output||process.stdout;
  try{
    if(!stdin.isTTY||!stdout.isTTY||typeof stdin.setRawMode!=="function")return await numericFallback(input,title,items,{subtitle});
    let index=Math.max(0,Math.min(items.length-1,selectedIndex)),previous=[];
    const draw=()=>{
      const next=menuFrame(title,items,index,{subtitle,footer,accent,columns:stdout.columns||80,rows:stdout.rows||24});
      let update="";
      for(let i=0;i<Math.max(previous.length,next.length);i++)if(previous[i]!==next[i])update+=`\x1b[${i+1};1H${esc.clearLine}${next[i]||""}`;
      if(update)stdout.write(update);
      previous=next;
    };
    const onResize=()=>{previous=[];stdout.write(esc.clear);draw();};
    const wasRaw=!!stdin.isRaw,resumeReadline=input.suspendReadlineInput?.()||(()=>{});
    input.questionActive=true;input.rl.pause();
    let onKey,onEnd;
    try{
      readline.emitKeypressEvents(stdin);stdin.setRawMode(true);stdin.resume();
      stdout.write(esc.altOn+esc.hideCursor+esc.clear);draw();
      return await new Promise(resolve=>{
        onEnd=()=>resolve(null);
        onKey=(str,key={})=>{
          if((key.ctrl&&["c","d"].includes(key.name))||["escape","q"].includes(key.name)){resolve(null);return;}
          if(["return","enter"].includes(key.name)){resolve({item:items[index],index});return;}
          const page=Math.max(1,Math.floor(((stdout.rows||24)-6)/2));
          if(["up","k"].includes(key.name))index=(index-1+items.length)%items.length;
          else if(["down","j"].includes(key.name))index=(index+1)%items.length;
          else if(key.name==="home")index=0;
          else if(key.name==="end")index=items.length-1;
          else if(key.name==="pageup")index=Math.max(0,index-page);
          else if(key.name==="pagedown")index=Math.min(items.length-1,index+page);
          else if(/^[1-9]$/.test(str||"")&&Number(str)<=items.length)index=Number(str)-1;
          else return;
          draw();
        };
        stdin.on("keypress",onKey);stdin.once("end",onEnd);stdin.once("close",onEnd);stdout.on?.("resize",onResize);
      });
    }finally{
      if(onKey)stdin.removeListener("keypress",onKey);
      if(onEnd){stdin.removeListener("end",onEnd);stdin.removeListener("close",onEnd);}
      stdout.removeListener?.("resize",onResize);
      try{stdin.setRawMode(wasRaw);}catch{}
      stdout.write(esc.showCursor+esc.altOff);resumeReadline();input.rl.resume();input.questionActive=false;
    }
  }finally{resume();}
}
