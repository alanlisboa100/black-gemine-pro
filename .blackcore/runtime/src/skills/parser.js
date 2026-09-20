export function parseFrontmatter(text,file=""){
  const s=String(text);if(!s.startsWith("---\n"))return {meta:{},body:s};const end=s.indexOf("\n---\n",4);if(end<0)return {meta:{},body:s};
  const raw=s.slice(4,end),meta={};for(const line of raw.split(/\r?\n/)){const i=line.indexOf(":");if(i<0)continue;const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();if(k)meta[k]=v;}
  return {meta,body:s.slice(end+5).trimStart()};
}
