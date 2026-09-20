import readline from "node:readline";
import {c,esc} from "./ansi.js";
import {width} from "./layout.js";
import {truncateToWidth,visibleWidth} from "../utils/text.js";

const ACCENTS={provider:51,openai:82,deepseek:45,google:39,default:51};
function color(accent){return ACCENTS[accent]||ACCENTS.default;}
function line(char="─",n=width()){return char.repeat(Math.max(1,n));}
function splitDescription(text,max){
  const words=String(text||"").split(/\s+/).filter(Boolean),out=[];let row="";
  for(const w of words){const next=row?`${row} ${w}`:w;if(visibleWidth(next)>max&&row){out.push(row);row=w;}else row=next;}
  if(row)out.push(row);return out.slice(0,3);
}
function itemRows(item,i,index,W,accent){
  const active=i===index,A=color(accent),marker=active?c(`1;38;5;${A}`,"›"):c(240,"·"),num=c(244,String(i+1).padStart(2," "));
  const badge=item.badge?` ${c(active?`1;38;5;${A}`:244,`[${item.badge}]`)}`:"";
  const label=active?c(`1;38;5;${A}`,item.label):c(255,item.label);
  const rows=[truncateToWidth(` ${marker} ${num}  ${label}${badge}`,W)];
  for(const d of splitDescription(item.description,Math.max(18,W-8)))rows.push(`       ${active?c(`38;5;${A}`,d):c(244,d)}`);
  return rows;
}
function draw(title,subtitle,items,index,{footer="↑↓ navigate   Enter select   Esc back",accent="default"}={}){
  const W=width(),A=color(accent),inner=Math.max(26,W-2);process.stdout.write(esc.clear);
  process.stdout.write(`${c(238,"╭"+line("─",Math.max(1,inner-2))+"╮")}\n`);
  process.stdout.write(`${c(238,"│")} ${c(`1;38;5;${A}`,truncateToWidth(title,Math.max(1,W-4)))}\n`);
  if(subtitle)process.stdout.write(`${c(238,"│")} ${c(244,truncateToWidth(subtitle,Math.max(1,W-4)))}\n`);
  process.stdout.write(`${c(238,"╰"+line("─",Math.max(1,inner-2))+"╯")}\n\n`);
  items.forEach((item,i)=>{for(const row of itemRows(item,i,index,W,accent))process.stdout.write(row+"\n");if(i!==items.length-1)process.stdout.write("\n");});
  process.stdout.write(`\n${c(238,line("─",W))}\n${c(244,truncateToWidth(footer,W))}\n`);
}
async function numericFallback(input,title,items,{subtitle="",footer}={}){
  process.stdout.write(`\n${title}\n${subtitle?subtitle+"\n":""}`);items.forEach((x,i)=>process.stdout.write(`${i+1}. ${x.label}${x.badge?` [${x.badge}]`:""} — ${x.description||""}\n`));
  input.questionActive=true;try{const ans=(await input.rl.question("Select (Enter cancels): ")).trim();if(!ans)return null;const n=Number(ans)-1;return Number.isInteger(n)&&items[n]?{item:items[n],index:n}:null;}finally{input.questionActive=false;}
}
export async function selectMenu(input,title,items,{subtitle="",selectedIndex=0,footer,accent="default"}={}){
  if(!items.length)return null;
  const resume=input?.suspendWorkComposer?.()||(()=>{}),stdin=input?.rl?.input||process.stdin,stdout=input?.output||process.stdout;
  try{
    if(!stdin.isTTY||!stdout.isTTY||typeof stdin.setRawMode!=="function")return numericFallback(input,title,items,{subtitle,footer});
    let index=Math.max(0,Math.min(items.length-1,selectedIndex));input.questionActive=true;input.rl.pause();readline.emitKeypressEvents(stdin);const wasRaw=!!stdin.isRaw;stdin.setRawMode(true);stdin.resume();process.stdout.write(esc.altOn+esc.hideCursor);
    try{
      draw(title,subtitle,items,index,{footer,accent});
      return await new Promise(resolve=>{
        const cleanup=()=>stdin.removeListener("keypress",onKey);
        const onKey=(str,key={})=>{
          if(key.ctrl&&key.name==="c"){cleanup();resolve(null);return;}
          if(key.name==="up"||key.name==="k"){index=(index-1+items.length)%items.length;draw(title,subtitle,items,index,{footer,accent});return;}
          if(key.name==="down"||key.name==="j"){index=(index+1)%items.length;draw(title,subtitle,items,index,{footer,accent});return;}
          if(key.name==="return"||key.name==="enter"){cleanup();resolve({item:items[index],index});return;}
          if(key.name==="escape"||key.name==="q"){cleanup();resolve(null);return;}
          const n=Number(str);if(Number.isInteger(n)&&n>=1&&n<=items.length){index=n-1;draw(title,subtitle,items,index,{footer,accent});}
        };
        stdin.on("keypress",onKey);
      });
    }finally{
      try{stdin.setRawMode(wasRaw);}catch{}process.stdout.write(esc.showCursor+esc.altOff);input.rl.resume();input.questionActive=false;
    }
  }finally{resume();}
}
