import {defineTool} from "../registry.js";
import {readResponseText} from "../../security/network.js";

function decode(s=""){return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
function unwrap(url=""){try{const u=new URL(url,"https://duckduckgo.com"),target=u.searchParams.get("uddg");return target?decodeURIComponent(target):u.href;}catch{return url;}}
function domainOf(url=""){try{return new URL(url).hostname.replace(/^www\./,"");}catch{return"unknown";}}
function sourceType(domain=""){
  if(/(?:^|\.)gov(?:\.[a-z]{2})?$|\.gov\.br$/.test(domain))return"government";
  if(/(?:docs?|developer|support)\./.test(domain)||/(?:^|\.)w3\.org$/.test(domain))return"documentation";
  if(/(?:^|\.)github\.com$|(?:^|\.)gitlab\.com$/.test(domain))return"repository";
  if(/(?:^|\.)edu(?:\.[a-z]{2})?$/.test(domain))return"academic";
  return"web";
}
function resultFromBlock(block){
  const anchor=block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);if(!anchor)return null;
  const url=unwrap(decode(anchor[1])),title=decode(anchor[2]);if(!title||!/^https?:/i.test(url))return null;
  const snippetMatch=block.match(/<(?:a|div)[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i),snippet=decode(snippetMatch?.[1]||"").slice(0,600),domain=domainOf(url);
  return {title,url,domain,sourceType:sourceType(domain),...(snippet?{snippet}:{})};
}
function parseResults(html,max=8){
  const out=[],seen=new Set(),blocks=String(html).split(/<div[^>]+class="[^"]*results_links[^"]*"[^>]*>/i).slice(1);
  for(const block of blocks){const item=resultFromBlock(block);if(item&&!seen.has(item.url)){seen.add(item.url);out.push(item);}if(out.length>=max)break;}
  const re=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;let match;
  while((match=re.exec(html))&&out.length<max){const url=unwrap(decode(match[1])),title=decode(match[2]);if(!title||!/^https?:/i.test(url)||seen.has(url))continue;const domain=domainOf(url);seen.add(url);out.push({title,url,domain,sourceType:sourceType(domain)});}
  return out.map((item,index)=>({rank:index+1,...item}));
}

async function searchPublicWeb(query,max,ctx){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("search timeout")),20000),abort=()=>ac.abort(ctx.signal?.reason||new Error("aborted"));ctx.signal?.addEventListener("abort",abort,{once:true});
  try{
    const url=`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,response=await fetch(url,{redirect:"error",signal:ac.signal,headers:{"user-agent":"Mozilla/5.0 BLACKCORE/3.4","accept":"text/html"}});
    if(!response.ok)throw new Error(`search HTTP ${response.status}`);const html=await readResponseText(response,{maxBytes:2_000_000}),results=parseResults(html,max);if(!results.length)throw new Error("search provider returned no parseable results");return results;
  }finally{clearTimeout(timer);ctx.signal?.removeEventListener("abort",abort);}
}

function researchEnvelope(query,results){
  const domains=[...new Set(results.map(item=>item.domain))];return {query,resultCount:results.length,uniqueDomains:domains.length,domains,results,note:"Discovery results are not a factual summary. Open the strongest sources with web_fetch before drawing conclusions."};
}

export const webSearchTool=defineTool({
  name:"web_search",description:"Search the public web for current technical information. Returns ranked titles, domains, source types, snippets when available, and URLs. Open promising sources with web_fetch before concluding.",readOnly:true,parallelSafe:true,
  parameters:{type:"object",properties:{query:{type:"string"},maxResults:{type:"integer",minimum:1,maximum:12}},required:["query"],additionalProperties:false},
  async execute(a,ctx){const query=String(a.query||"").trim();if(!query)throw new Error("query required");return JSON.stringify(researchEnvelope(query,await searchPublicWeb(query,a.maxResults||8,ctx)),null,2);}
});

export const webResearchTool=defineTool({
  name:"web_research",description:"Run two to four focused web searches, deduplicate their sources, and return a compact research map with domain diversity and query coverage. Follow selected sources with web_fetch; search snippets are discovery evidence only.",readOnly:true,parallelSafe:true,
  parameters:{type:"object",properties:{queries:{type:"array",items:{type:"string",minLength:2,maxLength:500},minItems:2,maxItems:4},maxResultsPerQuery:{type:"integer",minimum:1,maximum:6}},required:["queries"],additionalProperties:false},
  async execute(a,ctx){
    const queries=[...new Set(a.queries.map(value=>String(value).trim()).filter(Boolean))];if(queries.length<2)throw new Error("at least two distinct queries required");
    const groups=await Promise.all(queries.map(async query=>({query,results:await searchPublicWeb(query,a.maxResultsPerQuery||4,ctx)}))),byUrl=new Map();
    for(const group of groups)for(const item of group.results){const prior=byUrl.get(item.url);if(prior){if(!prior.queries.includes(group.query))prior.queries.push(group.query);}else byUrl.set(item.url,{...item,queries:[group.query]});}
    const sources=[...byUrl.values()].sort((a,b)=>b.queries.length-a.queries.length||a.rank-b.rank).map((item,index)=>({rank:index+1,...item})),domains=[...new Set(sources.map(item=>item.domain))];
    return JSON.stringify({queries,coverage:groups.map(group=>({query:group.query,results:group.results.length})),sourceCount:sources.length,uniqueDomains:domains.length,domains,sources,note:"This is a source map, not a synthesized conclusion. Fetch and compare primary sources before answering."},null,2);
  }
});

export {parseResults as parseWebSearchResults,searchPublicWeb};
