import {providerAuth} from "../config/models.js";
import {currentReasoning} from "../config/reasoning.js";
import {toChatVisionMessages} from "../context/images.js";
import {sleep,retryable,backoff} from "./retry.js";
import {googleCompatibleSchema} from "./google-tool-schema.js";

function nativeBase(pcfg={}){
  if(pcfg.nativeBaseUrl)return String(pcfg.nativeBaseUrl).replace(/\/+$/,"");
  return String(pcfg.baseUrl||"https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/openai\/?$/,"" ).trim().replace(/\/+$/,"");
}
function endpoint(pcfg,model){return `${nativeBase(pcfg)}/models/${encodeURIComponent(model)}:generateContent`;}
function safeJson(value){try{return JSON.parse(String(value||""));}catch{return String(value??"");}}
function bodyRetryAfterMs(text=""){
  const raw=String(text||"");
  const m=raw.match(/"retryDelay"\s*:\s*"([0-9]+(?:\.[0-9]+)?)s"/i)||raw.match(/retry\s+in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  return m?Math.max(0,Number(m[1])*1000):0;
}
function errorDetail(text=""){const raw=String(text||"").trim();if(!raw)return "request failed";try{const j=JSON.parse(raw),item=Array.isArray(j)?j[0]:j,err=item?.error||item;return String(err?.message||err?.status||item?.message||raw).replace(/\s+/g," ").slice(0,1200);}catch{return raw.replace(/\s+/g," ").slice(0,1200);}}
function toolDeclarations(tools=[]){return tools.map(t=>({name:t.name,description:t.description||"",parameters:googleCompatibleSchema(t.parameters)}));}
function openAIContentParts(content){
  if(typeof content==="string"||content==null)return [{text:String(content||"")}];
  if(!Array.isArray(content))return [{text:String(content)}];
  const parts=[];
  for(const item of content){
    if(item?.type==="text")parts.push({text:String(item.text||"")});
    else if(item?.type==="image_url"){
      const url=String(item.image_url?.url||"");const m=url.match(/^data:([^;,]+);base64,(.+)$/s);
      if(m)parts.push({inlineData:{mimeType:m[1],data:m[2]}});
    }
  }
  return parts.length?parts:[{text:""}];
}
function argsOf(call){const raw=call?.function?.arguments;return typeof raw==="string"?safeJson(raw):raw||{};}
function toolNameMap(messages=[]){
  const map=new Map();
  for(const m of messages)for(const c of m?.tool_calls||[])if(c?.id)map.set(c.id,c.function?.name||"tool");
  return map;
}
export function mergeNativeContents(contents=[]){
  const out=[];
  for(const item of contents){
    const prev=out.at(-1);
    if(prev&&prev.role===item.role){prev.parts.push(...(item.parts||[]));continue;}
    out.push({role:item.role,parts:[...(item.parts||[])]});
  }
  return out;
}
export function nativeContents(messages=[]){
  const normalized=toChatVisionMessages(messages),names=toolNameMap(normalized),contents=[];
  for(const m of normalized){
    if(m.role==="system")continue;
    if(m.role==="tool"){
      const name=m.name||names.get(m.tool_call_id)||"tool";
      const result=safeJson(m.content);
      contents.push({role:"user",parts:[{functionResponse:{id:m.tool_call_id||undefined,name,response:{result}}}]});
      continue;
    }
    if(m.role==="assistant"){
      const parts=[];
      if(m.content)parts.push({text:String(m.content)});
      for(const c of m.tool_calls||[]){
        const nativePart=c.extra_content?.google?.native_part;
        parts.push(nativePart&&nativePart.functionCall?nativePart:{functionCall:{id:c.id||undefined,name:c.function?.name||"tool",args:argsOf(c)}});
      }
      if(parts.length)contents.push({role:"model",parts});
      continue;
    }
    contents.push({role:"user",parts:openAIContentParts(m.content)});
  }
  return mergeNativeContents(contents);
}
function systemInstruction(messages=[]){
  const text=messages.filter(m=>m.role==="system").map(m=>String(m.content||"")).filter(Boolean).join("\n\n");
  return text?{parts:[{text}]}:undefined;
}
function usageOf(meta={}){
  const input=Number(meta.promptTokenCount||0),output=Number(meta.candidatesTokenCount||0),reasoning=Number(meta.thoughtsTokenCount||0);
  return {prompt_tokens:input,completion_tokens:output,total_tokens:Number(meta.totalTokenCount||input+output),completion_tokens_details:{reasoning_tokens:reasoning}};
}
function resultOf(json={}){
  const candidate=json.candidates?.[0]||{},parts=candidate.content?.parts||[];let content="",reasoning="";const tool_calls=[];
  for(const part of parts){
    if(typeof part.text==="string"){
      if(part.thought)reasoning+=part.text;else content+=part.text;
    }
    if(part.functionCall){const fc=part.functionCall;tool_calls.push({id:fc.id||`call_${tool_calls.length+1}`,type:"function",function:{name:fc.name||"tool",arguments:JSON.stringify(fc.args||{})},extra_content:{google:{native_part:part}}});}
  }
  const message={role:"assistant",content,...(reasoning?{reasoning_content:reasoning}:{}),...(tool_calls.length?{tool_calls}: {})};
  return {message,usage:usageOf(json.usageMetadata||{}),finishReason:candidate.finishReason||null,raw:json};
}
function gemmaThinking(cfg,provider,model){const level=currentReasoning(cfg,provider,model);return level?.id==="high"?"high":"minimal";}

export async function chatGemmaNative(cfg,provider,model,{messages,tools=[],signal,onText,onReasoning,stream=cfg.stream}={}){
  const pcfg=cfg.providers?.[provider]||{},apiKey=providerAuth(cfg,provider);if(!apiKey)throw new Error(`Missing API key for ${provider}`);
  const body={contents:nativeContents(messages)};const sys=systemInstruction(messages);if(sys)body.systemInstruction=sys;
  if(tools.length)body.tools=[{functionDeclarations:toolDeclarations(tools)}];
  body.generationConfig={thinkingConfig:{thinkingLevel:gemmaThinking(cfg,provider,model)}};
  const retryCfg=cfg.retry||{},max=retryCfg.maxAttempts||1;let lastErr;
  for(let attempt=1;attempt<=max;attempt++){
    try{
      const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("request timeout")),cfg.requestTimeoutMs||180000);
      const abort=()=>ac.abort(signal?.reason||new Error("aborted"));if(signal){if(signal.aborted)abort();else signal.addEventListener("abort",abort,{once:true});}
      try{
        const r=await fetch(endpoint(pcfg,model),{method:"POST",headers:{"content-type":"application/json","accept":"application/json","x-goog-api-key":apiKey,...(pcfg.nativeHeaders||{})},body:JSON.stringify(body),signal:ac.signal});
        if(!r.ok){const text=await r.text();const err=new Error(`${provider} HTTP ${r.status}: ${errorDetail(text)}`);err.status=r.status;err.responseBody=text;const ra=r.headers.get("retry-after");if(ra){const seconds=Number(ra);err.retryAfterMs=Number.isFinite(seconds)?seconds*1000:Math.max(0,Date.parse(ra)-Date.now());}else err.retryAfterMs=bodyRetryAfterMs(text);throw err;}
        const json=await r.json(),out=resultOf(json);if(stream&&out.message.reasoning_content)onReasoning?.(out.message.reasoning_content);if(stream&&out.message.content)onText?.(out.message.content);return out;
      }finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);}
    }catch(e){lastErr=e;if(attempt>=max||signal?.aborted||(!retryable(e.status||0)&&e.status))throw e;await sleep(Math.max(backoff(attempt,retryCfg),Number(e.retryAfterMs||0)),signal);}
  }
  throw lastErr||new Error("google native provider failure");
}
