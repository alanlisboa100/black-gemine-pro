import {c} from "./ansi.js";
import {visibleWidth,truncateToWidth,wrapAnsiToWidth} from "../utils/text.js";

export function escapeHtml(s=""){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

const SECTION_ICONS=[
  [/^(?:resumo|summary|tl;?dr|em resumo)\b/i,"◆"],
  [/^(?:pesquisa|research|fontes?|sources?|refer[eê]ncias?)\b/i,"⌕"],
  [/^(?:resultado|result|conclus[aã]o|conclusion)\b/i,"✓"],
  [/^(?:limita[cç][oõ]es?|limitations?|aten[cç][aã]o|warning)\b/i,"◇"]
];

function inline(text=""){
  return String(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>`${c("4;111",label)} ${c(244,`↗ ${url}`)}`)
    .replace(/\*\*([^*]+)\*\*/g,(_,value)=>c(1,value))
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g,(_,value)=>c(3,value))
    .replace(/`([^`]+)`/g,(_,value)=>c(96,value));
}

function codeToken(value,language=""){
  const lang=String(language).toLowerCase();
  if(/^\s*(?:#|\/\/)/.test(value))return c(244,value);
  if(/^['"`]/.test(value))return c(114,value);
  if(/^(?:true|false|null|undefined|none)$/i.test(value))return c(213,value);
  if(/^\d/.test(value))return c(220,value);
  if(/^(?:const|let|var|function|return|class|new|async|await|import|from|export|if|else|for|while|try|catch|throw|switch|case|break|continue|def|self|in|and|or|not|select|where|insert|update|delete|create|alter|table|policy|begin|end)$/i.test(value))return c(/sql/.test(lang)?"1;213":"1;111",value);
  return value;
}

function highlightCode(line="",language=""){
  const token=/(`(?:\\.|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|#.*$|\b(?:const|let|var|function|return|class|new|async|await|import|from|export|if|else|for|while|try|catch|throw|switch|case|break|continue|def|self|in|and|or|not|select|where|insert|update|delete|create|alter|table|policy|begin|end|true|false|null|undefined|none)\b|\b\d+(?:\.\d+)?\b)/gi;
  return String(line).replace(token,value=>codeToken(value,language));
}

function sectionHeading(value,level){
  const icon=SECTION_ICONS.find(([pattern])=>pattern.test(value))?.[1]||({1:"■",2:"▣",3:"▪"}[level]||"·");
  const color=level===1?"1;93":level===2?"1;95":"1;36";
  return `${c(color,icon)} ${c(color,value)}`;
}

function codeBlock(lines,language,columns){
  const max=Math.max(28,columns),digits=String(Math.max(1,lines.length)).length,label=(language||"code").toUpperCase(),head=`╭─ ${label} `;
  const top=c(240,head+"─".repeat(Math.max(0,max-visibleWidth(head)-1))+"╮"),bottom=c(240,"╰"+"─".repeat(Math.max(0,max-2))+"╯");
  const body=(lines.length?lines:[""]).map((line,index)=>{
    const number=String(index+1).padStart(digits),prefix=`│ ${number} │ `,available=Math.max(1,max-visibleWidth(prefix)-1),shown=truncateToWidth(line,available);
    return `${c(240,"│")} ${c(244,number)} ${c(240,"│")} ${highlightCode(shown,language)}`;
  });
  return [top,...body,bottom];
}

function isTableDivider(line=""){return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);}
function tableCells(line=""){return line.trim().replace(/^\||\|$/g,"").split("|").map(value=>value.trim());}
function renderTable(header,rows,columns){
  const all=[header,...rows],count=Math.max(1,...all.map(row=>row.length)),usable=Math.max(12,columns-count-1),cellWidth=Math.max(4,Math.floor(usable/count));
  const row=(cells,head=false)=>`${c(240,"│")} ${Array.from({length:count},(_,i)=>{
    const value=truncateToWidth(cells[i]||"",cellWidth-1).padEnd(cellWidth-1);return head?c("1;111",value):inline(value);
  }).join(c(240,"│ "))}`;
  const divider=c(240,"├"+Array.from({length:count},()=>"─".repeat(cellWidth)).join("┼")+"┤");
  return [row(header,true),divider,...rows.map(cells=>row(cells))];
}

export function renderMarkdown(text="",{columns=80}={}){
  const rows=String(text).split(/\r?\n/),out=[];let code=false,language="",codeLines=[];
  for(let index=0;index<rows.length;index++){
    let line=rows[index];const fence=line.match(/^```\s*([^\s`]*)/);
    if(fence){
      if(code){out.push(...codeBlock(codeLines,language,columns));code=false;language="";codeLines=[];}
      else{code=true;language=fence[1]||"";}
      continue;
    }
    if(code){codeLines.push(line);continue;}
    if(index+1<rows.length&&line.includes("|")&&isTableDivider(rows[index+1])){
      const header=tableCells(line),body=[];index+=2;
      while(index<rows.length&&rows[index].includes("|")&&rows[index].trim()){body.push(tableCells(rows[index]));index++;}
      index--;out.push(...renderTable(header,body,columns));continue;
    }
    const heading=line.match(/^(#{1,6})\s+(.+)$/);if(heading){out.push(sectionHeading(heading[2],heading[1].length));continue;}
    if(/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)){out.push(c(238,"─".repeat(Math.max(1,columns))));continue;}
    const task=line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);if(task){out.push(`${c(task[1].trim()?82:244,task[1].trim()?"✓":"○")} ${inline(task[2])}`);continue;}
    const ordered=line.match(/^\s*(\d+)[.)]\s+(.+)$/);if(ordered){out.push(`${c(111,ordered[1].padStart(2)+".")} ${inline(ordered[2])}`);continue;}
    const bullet=line.match(/^\s*[-*]\s+(.+)$/);if(bullet){out.push(`${c(111,"•")} ${inline(bullet[1])}`);continue;}
    const quote=line.match(/^\s*>\s?(.*)$/);if(quote){out.push(`${c(213,"▌")} ${c(245,inline(quote[1]))}`);continue;}
    out.push(inline(line));
  }
  if(code)out.push(...codeBlock(codeLines,language,columns));
  return out.flatMap(line=>wrapAnsiToWidth(line,Math.max(28,columns))).join("\n");
}
