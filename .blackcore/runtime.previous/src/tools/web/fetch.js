import {defineTool} from "../registry.js";
import {redactSecrets} from "../../security/secrets.js";
import {fetchAuthorized,readResponseTextResult} from "../../security/network.js";

function htmlToText(s){return s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\s+/g," ").trim();}
export const webFetchTool=defineTool({
  name:"web_fetch",description:"Fetch a public HTTP(S) URL. This is retrieval, not a search engine.",readOnly:true,
  parameters:{type:"object",properties:{url:{type:"string"},method:{type:"string",enum:["GET","HEAD"]},maxChars:{type:"integer",minimum:1000,maximum:200000}},required:["url"],additionalProperties:false},
  async execute(a,ctx){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("request timeout")),30000),abort=()=>ac.abort(ctx.signal?.reason||new Error("aborted"));ctx.signal?.addEventListener("abort",abort,{once:true});try{const maxChars=a.maxChars||80000,r=await fetchAuthorized(ctx,a.url,{method:a.method||"GET",signal:ac.signal,headers:{"user-agent":"BLACKCORE-Native/3.5"}}),ct=r.headers.get("content-type")||"";let collected={text:"",truncated:false,bytesRead:0};if(a.method!=="HEAD")collected=await readResponseTextResult(r,{maxBytes:Math.min(1_600_000,Math.max(64_000,maxChars*8)),truncate:true});let body=collected.text;if(ct.includes("html"))body=htmlToText(body);body=redactSecrets(body).slice(0,maxChars);return `HTTP ${r.status} ${r.url}\ncontent-type: ${ct}\nbody-truncated: ${collected.truncated?"yes":"no"}\n\n${body}`;}catch(e){if(String(e.message||e).includes("Network target blocked"))throw new Error(`URL blocked: ${e.message}`);throw e;}finally{clearTimeout(timer);ctx.signal?.removeEventListener("abort",abort);}}
});
