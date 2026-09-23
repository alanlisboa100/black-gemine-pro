export function visibleWidth(input=""){
  return stripAnsi(String(input)).replace(/\p{Mark}/gu,"").length;
}
export function stripAnsi(input=""){
  return String(input).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,"");
}
export function truncateToWidth(input,width,suffix="…"){
  const s=String(input); if(width<=0) return "";
  if(visibleWidth(s)<=width) return s;
  const plain=stripAnsi(s);
  if(width<=suffix.length) return plain.slice(0,width);
  return plain.slice(0,Math.max(0,width-suffix.length))+suffix;
}
export function wrapAnsiToWidth(input,width=80){
  const limit=Math.max(1,Number(width)||80),source=String(input??""),physical=source.split("\n"),all=[];
  for(const value of physical){
    const tokens=[];
    for(let index=0;index<value.length;){
      if(value[index]==="\x1b"){
        const match=value.slice(index).match(/^\x1b\[[0-?]*[ -/]*[@-~]/);
        if(match){tokens.push({value:match[0],width:0,space:false});index+=match[0].length;continue;}
      }
      const char=String.fromCodePoint(value.codePointAt(index)),w=visibleWidth(char);tokens.push({value:char,width:w,space:/\s/u.test(char)});index+=char.length;
    }
    let line=[],lineWidth=0,lastSpace=-1;
    const recompute=()=>{lineWidth=line.reduce((sum,x)=>sum+x.width,0);lastSpace=-1;for(let i=0;i<line.length;i++)if(line[i].space)lastSpace=i;};
    const pushLine=items=>all.push(items.map(x=>x.value).join("").replace(/\s+$/u,""));
    for(const token of tokens){
      if(token.width&&lineWidth+token.width>limit&&line.length){
        if(lastSpace>=0){
          pushLine(line.slice(0,lastSpace));
          line=line.slice(lastSpace+1).filter((item,index)=>index>0||!item.space);recompute();
        }else{pushLine(line);line=[];lineWidth=0;lastSpace=-1;}
      }
      if(!line.length&&token.space)continue;
      line.push(token);lineWidth+=token.width;if(token.space)lastSpace=line.length-1;
    }
    pushLine(line);
  }
  return all.length?all:[""];
}
export function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
export function lines(s){return String(s??"").split(/\r?\n/);}
export function indent(s,prefix="  "){return lines(s).map(x=>prefix+x).join("\n");}
export function humanBytes(n=0){
  const units=["B","KB","MB","GB","TB"]; let i=0,v=Number(n)||0;
  while(v>=1024&&i<units.length-1){v/=1024;i++;}
  return `${v>=10||i===0?v.toFixed(0):v.toFixed(1)} ${units[i]}`;
}
export function humanDuration(ms=0){
  if(ms<1000)return `${ms}ms`; const s=ms/1000;
  if(s<60)return `${s.toFixed(s<10?1:0)}s`; const m=s/60;
  if(m<60)return `${m.toFixed(m<10?1:0)}m`; return `${(m/60).toFixed(1)}h`;
}
export function safeJsonParse(s,fallback=null){try{return JSON.parse(s);}catch{return fallback;}}
export function normalizeNewlines(s){return String(s??"").replace(/\r\n/g,"\n");}
export function takeLastChars(s,n){s=String(s??"");return s.length<=n?s:s.slice(-n);}
export function formatError(e){
  if(!e)return "Unknown error"; if(typeof e==="string")return e;
  return e.stack||e.message||String(e);
}
export function shellQuote(s){return `'${String(s).replace(/'/g,`'\\''`)}'`;}
export function slugify(s=""){
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"item";
}
