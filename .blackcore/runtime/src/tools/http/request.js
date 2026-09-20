import {defineTool} from "../registry.js";
import {fetchAuthorized,readResponseText} from "../../security/network.js";
import {getSecret} from "../../config/loader.js";
import {redactSecrets} from "../../security/secrets.js";

const MUTATING=new Set(["POST","PUT","PATCH","DELETE"]);
const METHODS=["GET","HEAD","POST","PUT","PATCH","DELETE"];
function normalizedHeaders(input={}){const out={};for(const [k,v] of Object.entries(input||{})){if(!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(k))throw new Error(`invalid header name: ${k}`);out[k]=String(v);}return out;}

export const httpRequestTool=defineTool({
  name:"http_request",description:"Make a bounded HTTP request for API testing. Can inject a bearer token from a named BLACKCORE/environment secret without exposing its value to the model.",readOnly:false,parallelSafe:false,
  parameters:{type:"object",properties:{url:{type:"string"},method:{type:"string",enum:METHODS},headers:{type:"object",additionalProperties:{type:"string"}},body:{type:"string"},json:{},bearerEnv:{type:"string"},timeoutMs:{type:"integer",minimum:1000,maximum:180000},maxChars:{type:"integer",minimum:1000,maximum:300000}},required:["url"],additionalProperties:false},
  async execute(a,ctx){
    const method=(a.method||"GET").toUpperCase();if(!METHODS.includes(method))throw new Error("unsupported method");
    const previewUrl=new URL(a.url);
    if(MUTATING.has(method)&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Send ${method} request to ${previewUrl.origin}?`);if(!ok)return "HTTP request denied";}
    const headers=normalizedHeaders(a.headers);let body=a.body;
    if(a.json!==undefined){body=JSON.stringify(a.json);if(!Object.keys(headers).some(k=>k.toLowerCase()==="content-type"))headers["content-type"]="application/json";}
    if(a.bearerEnv){if(!/^[A-Z_][A-Z0-9_]{1,127}$/i.test(a.bearerEnv))throw new Error("invalid bearerEnv name");const secret=getSecret(a.bearerEnv);if(!secret)throw new Error(`secret not configured: ${a.bearerEnv}`);headers.authorization=`Bearer ${secret}`;}
    const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),a.timeoutMs||45000);const abort=()=>ac.abort();ctx.signal?.addEventListener("abort",abort,{once:true});
    try{const maxChars=a.maxChars||120000,r=await fetchAuthorized(ctx,a.url,{method,headers,body:method==="GET"||method==="HEAD"?undefined:body,signal:ac.signal});const text=method==="HEAD"?"":await readResponseText(r,{maxBytes:Math.min(1_000_000,Math.max(64_000,maxChars*4))});const safeHeaders={};for(const [k,v] of r.headers)if(!["set-cookie","authorization","proxy-authorization"].includes(k.toLowerCase()))safeHeaders[k]=v;const limited=redactSecrets(text).slice(0,maxChars);return JSON.stringify({status:r.status,ok:r.ok,url:r.url,headers:safeHeaders,body:limited,truncated:text.length>limited.length},null,2);}finally{clearTimeout(timer);ctx.signal?.removeEventListener("abort",abort);}
  }
});
