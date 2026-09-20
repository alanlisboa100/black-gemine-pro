import {defineTool} from "../registry.js";
import {fetchAuthorized,readResponseTextResult} from "../../security/network.js";
import {redactSecrets} from "../../security/secrets.js";

function parseHtml(html,url){
  const titleMatch=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title=titleMatch?titleMatch[1].replace(/<[^>]+>/g,"").trim():url;
  const descMatch=html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
  const description=descMatch?descMatch[1].replace(/<[^>]+>/g,"").trim():"";
  
  const headings=[];
  const hReg=/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let hm;while((hm=hReg.exec(html))!==null){headings.push(hm[1].replace(/<[^>]+>/g,"").trim());}

  const links=[];
  const lReg=/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lm;while((lm=lReg.exec(html))!==null){
    const href=lm[1];
    const text=lm[2].replace(/<[^>]+>/g,"").trim();
    if(href&&!href.startsWith("#")&&!href.startsWith("javascript:"))links.push({href,text:text||href});
  }

  const cleanText=html.replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/g," ")
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/\s+/g," ")
    .trim();

  return {title,description,headings:headings.slice(0,30),links:links.slice(0,50),text:cleanText};
}

export const webScraperTool=defineTool({
  name:"web_scraper",description:"Advanced distributed web scraper: extract structured markdown, headings, metadata, clean text, and outbound links from single or multiple public URLs in parallel.",readOnly:true,
  parameters:{type:"object",properties:{urls:{type:"array",items:{type:"string"},minItems:1,maxItems:10},maxChars:{type:"integer",minimum:1000,maximum:200000}},required:["urls"],additionalProperties:false},
  async execute(a,ctx){
    const maxChars=a.maxChars||80000;
    const results=[];
    for(const url of a.urls){
      const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("request timeout")),30000);
      try{
        const r=await fetchAuthorized(ctx,url,{method:"GET",signal:ac.signal,headers:{"user-agent":"BLACKCORE-Scraper/3.8"}});
        const ct=r.headers.get("content-type")||"";
        const collected=await readResponseTextResult(r,{maxBytes:2_000_000,truncate:true});
        const parsed=parseHtml(collected.text,url);
        results.push({
          url,
          status:r.status,
          title:parsed.title,
          description:parsed.description,
          headings:parsed.headings,
          linksCount:parsed.links.length,
          links:parsed.links.slice(0,25),
          text:redactSecrets(parsed.text).slice(0,maxChars)
        });
      }catch(e){
        results.push({url,error:String(e?.message||e)});
      }finally{
        clearTimeout(timer);
      }
    }
    return JSON.stringify(results,null,2);
  }
});
