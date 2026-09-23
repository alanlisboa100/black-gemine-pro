import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {readable} from "../fs/common.js";
import {walk,readText} from "../../utils/fs.js";
import {fetchAuthorized,readResponseText} from "../../security/network.js";
import {redactSecrets} from "../../security/secrets.js";

function decode(value=""){return String(value).replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
function matches(html,re,limit=100){const out=[];for(const m of html.matchAll(re)){out.push(m);if(out.length>=limit)break;}return out;}
function attr(tag,name){return (tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,"i"))||[]).slice(1).find(x=>x!==undefined)||null;}
function text(html=""){return decode(html.replace(/<script\b[\s\S]*?<\/script\s*>/gi," ").replace(/<style\b[\s\S]*?<\/style\s*>/gi," "));}
function count(re,value){return matches(value,re,10000).length;}

function pageSignals(html,url,response){
  const title=decode((html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)||[])[1]||""),lang=attr((html.match(/<html\b[^>]*>/i)||[])[0]||"","lang"),description=attr((html.match(/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>/i)||[])[0]||"","content"),viewport=!!html.match(/<meta\b[^>]*\bname\s*=\s*["']viewport["']/i);
  const headings=matches(html,/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,80).map(m=>({level:Number(m[1]),text:decode(m[2]).slice(0,240)})),images=matches(html,/<img\b[^>]*>/gi,500),forms=matches(html,/<form\b[^>]*>/gi,100),links=matches(html,/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a\s*>/gi,1000);
  const issues=[];if(!title)issues.push({severity:"error",code:"missing-title"});if(!description)issues.push({severity:"warn",code:"missing-description"});if(!lang)issues.push({severity:"warn",code:"missing-lang"});if(!viewport)issues.push({severity:"warn",code:"missing-viewport"});if(!headings.some(x=>x.level===1))issues.push({severity:"warn",code:"missing-h1"});const noAlt=images.filter(m=>attr(m[0],"alt")===null).length;if(noAlt)issues.push({severity:"warn",code:"images-without-alt",count:noAlt});
  const headers={};for(const name of ["content-security-policy","strict-transport-security","x-content-type-options","referrer-policy","permissions-policy"])headers[name]=response.headers.get(name)||null;
  return {url,title,lang,description,viewport,headings,metrics:{htmlChars:html.length,textChars:text(html).length,links:links.length,forms:forms.length,inputs:count(/<(?:input|select|textarea|button)\b/gi,html),images:images.length,imagesWithoutAlt:noAlt,scripts:count(/<script\b/gi,html),stylesheets:count(/<link\b[^>]*\brel\s*=\s*["']stylesheet["']/gi,html)},headers,issues,rawLinks:links.map(m=>(m[1]||m[2]||m[3]||"").trim()).filter(Boolean)};
}
function prioritizeLinks(base,raw=[],max=30){
  const seen=new Set(),out=[];for(const href of raw){let u;try{u=new URL(href,base);}catch{continue;}if(!/^https?:$/.test(u.protocol)||u.origin!==base.origin)continue;u.hash="";const key=u.href;if(seen.has(key))continue;seen.add(key);const depth=u.pathname.split("/").filter(Boolean).length,important=/(?:login|sign|checkout|cart|dashboard|admin|account|pricing|contact|blog|docs|api|produto|curso|compra|pagamento)/i.test(u.pathname)?30:0,score=100-depth*7+important;out.push({url:key,path:u.pathname,score,reason:important?"high-value route":"same-origin route"});}return out.sort((a,b)=>b.score-a.score).slice(0,max);
}
async function fetchPage(ctx,url,maxBytes=2_500_000){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("scan timeout")),45000),abort=()=>ac.abort(ctx.signal?.reason||new Error("aborted"));ctx.signal?.addEventListener("abort",abort,{once:true});
  try{const response=await fetchAuthorized(ctx,url,{signal:ac.signal,headers:{"user-agent":"BLACKCORE-Scan/3.1","accept":"text/html,application/xhtml+xml"}}),contentType=response.headers.get("content-type")||"";if(!contentType.includes("html"))throw new Error(`scan expected HTML, received ${contentType||"unknown content type"}`);const html=await readResponseText(response,{maxBytes});return {response,html};}finally{clearTimeout(timer);ctx.signal?.removeEventListener("abort",abort);}
}
function sourceSignals(content="",rel=""){
  const lines=content.split(/\r?\n/),todo=count(/\b(?:TODO|FIXME|HACK|XXX)\b/g,content),complexity=count(/\b(?:if|else|for|while|switch|case|catch)\b|&&|\|\|/g,content),unsafe=count(/\b(?:eval|exec|spawn|innerHTML|dangerouslySetInnerHTML)\b/g,content),longLines=lines.filter(x=>x.length>140).length,functions=count(/\b(?:function|class)\b|=>/g,content),score=Math.min(100,Math.round(Math.log10(content.length+10)*8+todo*8+unsafe*10+complexity*.22+longLines*.4));
  const reasons=[];if(content.length>100000)reasons.push("large file");if(complexity>80)reasons.push("high branch density");if(todo)reasons.push(`${todo} TODO/FIXME markers`);if(unsafe)reasons.push(`${unsafe} sensitive execution/DOM patterns`);if(longLines>10)reasons.push(`${longLines} long lines`);return {path:rel,bytes:Buffer.byteLength(content),lines:lines.length,functions,complexity,todo,unsafe,longLines,score,reasons};
}
async function projectScan(a,ctx){
  const root=await readable(ctx,a.path||"."),all=await walk(root,{maxFiles:a.maxFiles||2000}),ext=/\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|swift|php|rb|cs|cpp|c|h|html|css|scss|sql|md|ya?ml|json)$/i,files=all.filter(x=>ext.test(x)).slice(0,a.maxFiles||800),rows=[];let bytes=0,lines=0;
  for(const file of files){let content;try{content=await readText(file,a.maxFileBytes||300000);}catch{continue;}const row=sourceSignals(content,path.relative(ctx.cwd,file));rows.push(row);bytes+=row.bytes;lines+=row.lines;}
  rows.sort((x,y)=>y.score-x.score||y.bytes-x.bytes);return {action:"project",root,inventory:{filesScanned:rows.length,bytes,lines},hotspots:rows.slice(0,a.limit||40),nextSteps:rows.slice(0,8).map(x=>({action:"file",path:x.path,reason:x.reasons.join(", ")||`score ${x.score}`}))};
}
async function fileScan(a,ctx){
  if(!a.path)throw new Error("path required");const file=await readable(ctx,a.path),body=await readText(file,a.maxFileBytes||800000),all=body.split(/\r?\n/),start=Math.max(1,a.startLine||1),end=Math.min(all.length,a.endLine||all.length),selected=all.slice(start-1,end),chunkSize=a.chunkLines||120,chunks=[];
  for(let i=0;i<selected.length;i+=chunkSize){const from=start+i,to=Math.min(end,from+chunkSize-1),content=selected.slice(i,i+chunkSize).join("\n"),signals=sourceSignals(content,path.relative(ctx.cwd,file));chunks.push({index:chunks.length+1,from,to,score:signals.score,reasons:signals.reasons,preview:redactSecrets(content).slice(0,a.previewChars||1200)});}
  chunks.sort((x,y)=>y.score-x.score||x.from-y.from);return {action:"file",path:path.relative(ctx.cwd,file),range:{start,end,totalLines:all.length},summary:sourceSignals(selected.join("\n"),path.relative(ctx.cwd,file)),chunks:chunks.slice(0,a.limit||20),nextSteps:chunks.slice(0,6).map(x=>({action:"file",path:a.path,startLine:x.from,endLine:x.to,reason:x.reasons.join(", ")||`chunk score ${x.score}`}))};
}

export const scanTool=defineTool({
  name:"scan",description:"Run an AI-guided staged scan. Start with site_map or project, inspect the ranked evidence, then scan only the suggested site_page or file ranges. Designed for iterative website, repository and file analysis without flooding model context.",readOnly:true,parallelSafe:true,
  parameters:{type:"object",properties:{action:{type:"string",enum:["site_map","site_page","project","file"]},url:{type:"string"},path:{type:"string"},startLine:{type:"integer",minimum:1},endLine:{type:"integer",minimum:1},chunkLines:{type:"integer",minimum:20,maximum:500},limit:{type:"integer",minimum:1,maximum:100},maxPages:{type:"integer",minimum:1,maximum:100},maxFiles:{type:"integer",minimum:10,maximum:5000},maxFileBytes:{type:"integer",minimum:10000,maximum:2000000},previewChars:{type:"integer",minimum:200,maximum:5000}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    if(a.action==="project")return JSON.stringify(await projectScan(a,ctx),null,2);if(a.action==="file")return JSON.stringify(await fileScan(a,ctx),null,2);if(!a.url)throw new Error("url required");const {response,html}=await fetchPage(ctx,a.url),url=new URL(response.url),signals=pageSignals(html,url.href,response),routes=prioritizeLinks(url,signals.rawLinks,a.maxPages||30);delete signals.rawLinks;
    if(a.action==="site_map")return JSON.stringify({action:"site_map",entry:signals,routes,nextSteps:routes.slice(0,10).map(x=>({action:"site_page",url:x.url,reason:x.reason}))},null,2);
    return JSON.stringify({action:"site_page",...signals,contentPreview:redactSecrets(text(html)).slice(0,a.previewChars||5000),routes,nextSteps:routes.slice(0,8).map(x=>({action:"site_page",url:x.url,reason:x.reason}))},null,2);
  }
});
