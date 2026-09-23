import {defineTool} from "../registry.js";
import {fetchAuthorized,readResponseTextResult} from "../../security/network.js";
import {redactSecrets} from "../../security/secrets.js";
import {searchPublicWeb} from "./search.js";

const FACT_CHECK_DOMAINS=[
  "aosfatos.org","lupa.uol.com.br","projetocomprova.com.br","boatos.org",
  "factcheck.org","snopes.com","politifact.com","reuters.com","apnews.com"
];
const SOCIAL_HOSTS=[
  ["instagram",/(?:^|\.)instagram\.com$/],
  ["tiktok",/(?:^|\.)tiktok\.com$/],
  ["x",/(?:^|\.)(?:x|twitter)\.com$/],
  ["youtube",/(?:^|\.)youtube\.com$/],
  ["facebook",/(?:^|\.)facebook\.com$/],
  ["threads",/(?:^|\.)threads\.net$/]
];
const STOP_WORDS=new Set("a o as os um uma de da do das dos e em no na nos nas para por com que this the and for from what why how hoje today últimas ultimas news notícias noticias".split(" "));

function decode(value=""){
  return String(value).replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g," ").trim();
}
function attributes(tag=""){
  const out={};for(const match of String(tag).matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))out[match[1].toLowerCase()]=decode(match[2]??match[3]??match[4]??"");return out;
}
function metaMap(html=""){
  const out={};for(const tag of String(html).match(/<meta\b[^>]*>/gi)||[]){const a=attributes(tag),key=(a.property||a.name||a.itemprop||"").toLowerCase();if(key&&a.content&&!out[key])out[key]=a.content;}return out;
}
function firstMatch(text,patterns=[]){for(const pattern of patterns){const match=String(text).match(pattern);if(match?.[1])return decode(match[1]);}return null;}
function articleText(html="",max=2400){
  return decode(String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi," ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi," ")
    .replace(/<[^>]+>/g," ")).slice(0,max);
}
export function extractPageEvidence(html="",url=""){
  const meta=metaMap(html),title=meta["og:title"]||meta["twitter:title"]||firstMatch(html,[/<title[^>]*>([\s\S]*?)<\/title>/i]),description=meta["og:description"]||meta["twitter:description"]||meta.description||null;
  const publishedAt=meta["article:published_time"]||meta.datepublished||meta.date||firstMatch(html,[
    /"datePublished"\s*:\s*"([^"]+)"/i,
    /<time[^>]+datetime=["']([^"']+)["']/i
  ]);
  const canonical=firstMatch(html,[/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i]);
  return {
    url:canonical||url,
    title:title||null,
    description:description||null,
    publisher:meta["og:site_name"]||null,
    publishedAt:publishedAt||null,
    language:firstMatch(html,[/<html[^>]+lang=["']([^"']+)["']/i]),
    platformVerified:/"is_verified"\s*:\s*true/i.test(html),
    text:articleText(html)
  };
}
function platformTarget(target=""){
  try{
    const url=new URL(target),host=url.hostname.toLowerCase().replace(/^www\./,""),platform=SOCIAL_HOSTS.find(([,pattern])=>pattern.test(host))?.[0]||null,parts=url.pathname.split("/").filter(Boolean);
    let handle=parts[0]||null;
    if(platform==="instagram"&&["p","reel","reels","stories","explore"].includes(handle))handle=null;
    if(platform==="youtube"&&handle?.startsWith("@"))handle=handle.slice(1);
    return {url:url.href,host,platform,handle:handle?.replace(/^@/,"")||null,isProfile:!!(platform&&handle)};
  }catch{return {url:null,host:null,platform:null,handle:null,isProfile:false};}
}
export function buildCredibilityQueries(target,context=""){
  const parsed=platformTarget(target),focus=parsed.handle?'"'+parsed.handle+'" '+parsed.platform:String(target).slice(0,300),extra=String(context||"").trim();
  return [...new Set([
    [focus,extra].filter(Boolean).join(" "),
    focus+" oficial official identidade",
    focus+" golpe fraude fake impersonation fact check"
  ].map(x=>x.trim()).filter(Boolean))].slice(0,3);
}
function domainOf(url=""){try{return new URL(url).hostname.replace(/^www\./,"").toLowerCase();}catch{return"unknown";}}
function factCheckSource(domain=""){return FACT_CHECK_DOMAINS.some(item=>domain===item||domain.endsWith("."+item));}
function contains(text,pattern){return pattern.test(String(text||""));}
function escapeRegex(value=""){return String(value).replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&");}
export function analyzePublicProfileSignals({target="",page=null,sources=[]}={}){
  const parsed=platformTarget(target),combined=[page?.title,page?.description,page?.text].filter(Boolean).join(" "),handle=parsed.handle||"";
  const matchingSources=sources.filter(source=>handle&&contains((source.title||"")+" "+(source.snippet||""),new RegExp(escapeRegex(handle),"i"))),factChecks=sources.filter(source=>factCheckSource(source.domain||domainOf(source.url)));
  const commercial=contains(combined,/\b(?:compre|comprar|buy|promo(?:ção)?|cupom|desconto|whatsapp|telegram|link\s+(?:na|in)\s+bio|vendas?|store|loja)\b/i);
  const engagement=contains(combined,/\b(?:siga|follow|curta|like|comente|comment|marque|tag|compartilhe|share|sorteio|giveaway|ganhe|pr[eê]mio)\b/i);
  const identityEvidence=page?.platformVerified?"platform-marked-verified":matchingSources.length>=2?"public-presence-corroborated":page?"profile-page-reachable":"unresolved";
  return {
    targetType:parsed.isProfile?"public-social-profile":parsed.url?"public-link":"claim-or-name",
    platform:parsed.platform,
    handle:parsed.handle,
    identityEvidence,
    contentPattern:commercial&&engagement?"commercial-and-engagement":commercial?"commercial":engagement?"engagement-seeking":"not-established",
    signals:{
      profilePageRetrieved:!!page,
      platformVerificationObserved:!!page?.platformVerified,
      matchingPublicSources:matchingSources.length,
      factCheckMentions:factChecks.length,
      commercialCallToAction:commercial,
      engagementCallToAction:engagement
    },
    caution:"These signals evaluate public evidence and content patterns, not the person's character. Missing verification, follower counts or a blocked/private page are not proof of fraud."
  };
}
function titleTokens(title=""){return new Set(decode(title).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(x=>x.length>2&&!STOP_WORDS.has(x)));}
function overlap(a,b){const x=titleTokens(a),y=titleTokens(b);if(!x.size||!y.size)return 0;let common=0;for(const item of x)if(y.has(item))common++;return common/Math.min(x.size,y.size);}
function clusterStories(sources=[]){
  const clusters=[];
  for(const source of sources){
    const cluster=clusters.find(item=>overlap(item.headline,source.title||"")>=0.55);
    if(cluster)cluster.sources.push(source);else clusters.push({headline:source.title||"Untitled story",sources:[source]});
  }
  return clusters.map((cluster,index)=>({story:index+1,headline:cluster.headline,corroboratingDomains:[...new Set(cluster.sources.map(x=>x.domain))],independentSourceCount:new Set(cluster.sources.map(x=>x.domain)).size,sources:cluster.sources}));
}
async function fetchEvidence(item,ctx,{maxBytes=420_000,maxText=2400}={}){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("article timeout")),18_000),abort=()=>ac.abort(ctx.signal?.reason||new Error("aborted"));ctx.signal?.addEventListener("abort",abort,{once:true});
  try{
    const response=await fetchAuthorized(ctx,item.url,{signal:ac.signal,headers:{"user-agent":"Mozilla/5.0 BLACKCORE/3.5","accept":"text/html,application/xhtml+xml"}});
    const type=response.headers.get("content-type")||"";
    if(!response.ok)throw new Error("HTTP "+response.status);
    if(!/html|text\//i.test(type))throw new Error("unsupported content-type "+(type||"unknown"));
    const effectiveUrl=response.url||item.url,body=await readResponseTextResult(response,{maxBytes,truncate:true}),page=extractPageEvidence(body.text,effectiveUrl);
    page.text=page.text.slice(0,maxText);
    return {...item,...page,url:page.url||effectiveUrl,domain:domainOf(page.url||effectiveUrl),fetch:{ok:true,truncated:body.truncated,bytesRead:body.bytesRead}};
  }catch(error){return {...item,fetch:{ok:false,error:String(error?.message||error).slice(0,180)}};}
  finally{clearTimeout(timer);ctx.signal?.removeEventListener("abort",abort);}
}
function diverse(results=[],limit=6){
  const picked=[],seen=new Set();
  for(const item of results)if(!seen.has(item.domain)){picked.push(item);seen.add(item.domain);if(picked.length>=limit)return picked;}
  for(const item of results)if(!picked.some(x=>x.url===item.url)){picked.push(item);if(picked.length>=limit)break;}
  return picked;
}
async function searches(queries,ctx,max=6){
  const groups=await Promise.all(queries.map(async query=>{try{return {query,results:await searchPublicWeb(query,max,ctx)};}catch(error){return {query,results:[],error:String(error?.message||error).slice(0,180)};}})),seen=new Map();
  for(const group of groups)for(const item of group.results){const old=seen.get(item.url);if(old)old.queries=[...new Set([...old.queries,group.query])];else seen.set(item.url,{...item,queries:[group.query]});}
  if(!seen.size)throw new Error("No public search results were available for this investigation. Try a more specific target or run again later.");
  return {groups,sources:[...seen.values()]};
}

export const newsResearchTool=defineTool({
  name:"news_research",
  description:"Research current news as story evidence, not a link list. Searches multiple queries, opens diverse publisher pages with bounded retrieval, extracts dates/descriptions/article text, clusters overlapping coverage and reports corroboration. Use it for news briefings and synthesize what happened, when, why it matters and what remains uncertain.",
  readOnly:true,parallelSafe:true,
  parameters:{type:"object",properties:{query:{type:"string",minLength:2,maxLength:500},language:{type:"string",enum:["pt-BR","en","auto"]},freshness:{type:"string",enum:["day","week","month","any"]},maxStories:{type:"integer",minimum:2,maximum:8}},required:["query"],additionalProperties:false},
  async execute(a,ctx){
    const query=String(a.query).trim(),language=a.language||"auto",freshness=a.freshness||"day",suffix=language==="en"?"latest news":language==="pt-BR"?"últimas notícias":/\b(the|this|news|latest|update|about)\b/i.test(query)?"latest news":"últimas notícias";
    const dateHint=language==="en"?(freshness==="day"?"today":freshness==="week"?"this week":freshness==="month"?"this month":""):(freshness==="day"?"hoje":freshness==="week"?"esta semana":freshness==="month"?"este mês":"");
    const queries=[query,(query+" "+suffix+" "+dateHint).trim()];
    const found=await searches([...new Set(queries)],ctx,Math.min(10,(a.maxStories||5)*2)),selected=diverse(found.sources,Math.min(8,(a.maxStories||5)+2)),opened=await Promise.all(selected.map(item=>fetchEvidence(item,ctx))),clusters=clusterStories(opened).slice(0,a.maxStories||5);
    return JSON.stringify({
      kind:"news-evidence",
      query,
      researchedAt:new Date().toISOString(),
      freshness,
      coverage:{queries:found.groups.map(group=>({query:group.query,results:group.results.length})),sources:opened.length,domains:[...new Set(opened.map(x=>x.domain))]},
      stories:clusters,
      presentationContract:[
        "Deliver the news itself in stacked readable story cards; links are supporting sources, not the answer.",
        "For each story state what happened, when, why it matters, confidence and disagreements.",
        "Do not claim corroboration when a story has only one independent domain. Distinguish publication date from event date."
      ],
      limitations:"Publisher blocks, partial pages and missing dates are shown in fetch evidence. Search rank and snippets alone are discovery evidence, not proof."
    },null,2);
  }
});

export const credibilityCheckTool=defineTool({
  name:"credibility_check",
  description:"Investigate a public social-profile URL, public link or factual claim. Opens the public target when possible, searches identity/corroboration/fact-check evidence and reports commercial or engagement-seeking signals. It assesses evidence and claims, never a person's character; blocked/private content remains unverified.",
  readOnly:true,parallelSafe:true,
  parameters:{type:"object",properties:{target:{type:"string",minLength:2,maxLength:2000},context:{type:"string",maxLength:1000},maxSources:{type:"integer",minimum:3,maximum:12}},required:["target"],additionalProperties:false},
  async execute(a,ctx){
    const target=String(a.target).trim(),parsed=platformTarget(target),queries=buildCredibilityQueries(target,a.context||""),found=await searches(queries,ctx,Math.min(6,a.maxSources||5));
    let targetPage=null,targetFetch={attempted:false,ok:false};
    if(parsed.url){
      targetFetch={attempted:true,ok:false};
      const opened=await fetchEvidence({title:target,url:parsed.url,domain:parsed.host,sourceType:"public-target"},ctx,{maxBytes:500_000,maxText:3500});
      if(opened.fetch?.ok){targetPage=opened;targetFetch=opened.fetch;}else targetFetch=opened.fetch;
    }
    const sources=diverse(found.sources,a.maxSources||7),analysis=analyzePublicProfileSignals({target,page:targetPage,sources});
    return JSON.stringify({
      kind:"credibility-evidence",
      target:redactSecrets(target),
      checkedAt:new Date().toISOString(),
      publicTarget:targetPage,
      targetFetch,
      analysis,
      research:{queries,sourceCount:sources.length,uniqueDomains:new Set(sources.map(x=>x.domain)).size,sources:sources.map((source,index)=>({rank:index+1,...source,factCheckSource:factCheckSource(source.domain)}))},
      verdictContract:{
        identity:["confirmed-by-platform-or-authoritative-source","probable-public-presence","possible-impersonation","unresolved"],
        claim:["supported","contradicted","misleading-context","unverified"],
        informationRisk:["low","medium","high","insufficient-evidence"],
        contentPattern:["informational","commercial","engagement-seeking","mixed","not-established"]
      },
      guardrails:[
        "Rate the reliability of public claims and identity evidence, not the person's worth or character.",
        "Never call a person fake, fraudulent or trustworthy from follower counts, appearance, missing verification or one search result.",
        "Use possible impersonation only with concrete identity conflicts. Treat private, blocked or unavailable pages as insufficient evidence.",
        "Show evidence for every warning and separate observed facts from inference."
      ]
    },null,2);
  }
});

export {platformTarget as parsePublicTarget,clusterStories};
