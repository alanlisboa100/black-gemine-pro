import dns from "node:dns/promises";
import net from "node:net";

const REDIRECT_STATUS=new Set([301,302,303,307,308]);

function ipv4Parts(ip){return ip.split(".").map(Number);}
export function isPrivateAddress(ip){
  if(net.isIP(ip)===4){const [a,b]=ipv4Parts(ip);return a===0||a===10||a===127||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a>=224);}
  if(net.isIP(ip)===6){const x=ip.toLowerCase(),mapped=x.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);if(mapped)return isPrivateAddress(mapped[1]);return x==="::"||x==="::1"||x.startsWith("fe8")||x.startsWith("fe9")||x.startsWith("fea")||x.startsWith("feb")||x.startsWith("fc")||x.startsWith("fd")||x.startsWith("ff");}
  return false;
}
export async function inspectUrl(url){
  const u=url instanceof URL?url:new URL(url);if(!["http:","https:"].includes(u.protocol))return {url:u,allowed:false,reason:"http/https only",addresses:[]};
  const host=u.hostname.toLowerCase();if(["localhost","localhost.localdomain"].includes(host)||host.endsWith(".localhost"))return {url:u,allowed:false,reason:"localhost/private network",addresses:[host]};
  let addresses=[];if(net.isIP(host))addresses=[host];else try{addresses=(await dns.lookup(host,{all:true,verbatim:true})).map(x=>x.address);}catch(e){return {url:u,allowed:false,reason:`DNS resolution failed: ${e.message}`,addresses:[]};}
  const priv=addresses.filter(isPrivateAddress);return {url:u,allowed:priv.length===0,reason:priv.length?`private/link-local address: ${priv.join(", ")}`:"public",addresses};
}
export async function authorizeUrl(ctx,url){
  const info=await inspectUrl(url);if(info.allowed)return info.url;
  if(info.reason==="http/https only")throw new Error(info.reason);
  if(ctx.cfg.permissionProfile==="safe")throw new Error(`Network target blocked by safe profile: ${info.reason}`);
  const ok=await ctx.confirm(`Access local/private network target?\n${info.url.href}\n${info.reason}`,false);if(!ok)throw new Error("private network access denied");return info.url;
}

// Node's default redirect mode follows Location without re-running the network
// policy. Follow redirects ourselves so every destination is authorized.
export async function fetchAuthorized(ctx,url,options={}, {maxRedirects=5}={}){
  let next=url,requestOptions={...options};
  for(let hop=0;;hop++){
    const allowed=await authorizeUrl(ctx,next);
    const response=await fetch(allowed,{...requestOptions,redirect:"manual"});
    if(!REDIRECT_STATUS.has(response.status))return response;
    const location=response.headers.get("location");
    if(!location)return response;
    try{await response.body?.cancel?.();}catch{}
    if(hop>=maxRedirects)throw new Error(`too many HTTP redirects (>${maxRedirects})`);
    const method=String(requestOptions.method||"GET").toUpperCase();
    if(response.status===303||((response.status===301||response.status===302)&&!['GET','HEAD'].includes(method))){const headers=new Headers(requestOptions.headers||{});headers.delete("content-length");headers.delete("content-type");requestOptions={...requestOptions,method:"GET",body:undefined,headers};}
    next=new URL(location,allowed);
  }
}

export async function readResponseTextResult(response,{maxBytes=1_000_000,truncate=false}={}){
  if(!response.body)return {text:"",truncated:false,bytesRead:0};
  const reader=response.body.getReader(),chunks=[];let total=0,truncated=false;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      const remaining=maxBytes-total;
      if(value.byteLength>remaining){
        if(!truncate){try{await reader.cancel("response too large");}catch{}throw new Error(`response too large: exceeds ${maxBytes} bytes`);}
        if(remaining>0)chunks.push(value.subarray(0,remaining));
        total+=Math.max(0,remaining);truncated=true;try{await reader.cancel("bounded response collected");}catch{}break;
      }
      total+=value.byteLength;chunks.push(value);
    }
  }finally{try{reader.releaseLock();}catch{}}
  return {text:Buffer.concat(chunks).toString("utf8"),truncated,bytesRead:total};
}
export async function readResponseText(response,opts={}){
  const result=await readResponseTextResult(response,opts);
  return result.text;
}
