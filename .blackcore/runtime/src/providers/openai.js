import {parseSSE} from "./sse.js";
import {sleep,retryable,backoff} from "./retry.js";
import {providerAuth,findModel} from "../config/models.js";
import {toChatVisionMessages} from "../context/images.js";
import {googleCompatibleSchema} from "./google-tool-schema.js";

function toolDef(t,provider){
  const parameters=provider==="google"?googleCompatibleSchema(t.parameters):t.parameters||{type:"object",properties:{}};
  return {type:"function",function:{name:t.name,description:t.description||"",parameters}};
}
function headers(apiKey,extra={}){
  const h={"content-type":"application/json","accept":"application/json",...extra};if(apiKey)h.authorization=`Bearer ${apiKey}`;return h;
}
function endpoint(base){return base.replace(/\/+$/,"")+"/chat/completions";}
function bodyRetryAfterMs(text=""){
  const raw=String(text||"");
  const m=raw.match(/"retryDelay"\s*:\s*"([0-9]+(?:\.[0-9]+)?)s"/i)||raw.match(/retry\s+in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  return m?Math.max(0,Number(m[1])*1000):0;
}
function errorDetail(text=""){
  const raw=String(text||"").trim();if(!raw)return "request failed";
  try{
    const j=JSON.parse(raw),item=Array.isArray(j)?j[0]:j,err=item?.error||item;
    const msg=err?.message||err?.status||item?.message;
    if(msg)return String(msg).replace(/\s+/g," ").slice(0,1200);
  }catch{}
  return raw.replace(/\s+/g," ").slice(0,1200);
}
function finishMessage(acc){
  return {role:"assistant",content:acc.content||"",...(acc.reasoning_content?{reasoning_content:acc.reasoning_content}:{}),...(acc.toolCalls.length?{tool_calls:acc.toolCalls}: {})};
}
function mergeToolDelta(acc,delta){
  const i=delta.index??0;acc.toolCalls[i]??={id:"",type:"function",function:{name:"",arguments:""}};
  const t=acc.toolCalls[i];if(delta.id)t.id=delta.id;if(delta.type)t.type=delta.type;
  if(delta.function?.name)t.function.name+=delta.function.name;if(delta.function?.arguments)t.function.arguments+=delta.function.arguments;
  if(delta.extra_content)t.extra_content={...(t.extra_content||{}),...delta.extra_content};
}
export class OpenAIProvider{
  constructor(cfg,provider,model){
    this.cfg=cfg;this.provider=provider;this.model=model;this.pcfg=cfg.providers?.[provider];
    if(!this.pcfg)throw new Error(`Unknown provider ${provider}`);
  }
  modelInfo(){return findModel(this.cfg,this.provider,this.model);}
  async chat({messages,tools=[],signal,onText,onReasoning,stream=this.cfg.stream,extraBody={}}){
    const apiKey=providerAuth(this.cfg,this.provider);if(!apiKey&&this.pcfg.apiKeyOptional!==true)throw new Error(`Missing API key for ${this.provider}`);
    const minfo=this.modelInfo();
    const serverModel=minfo?.serverModel||this.pcfg.serverModel||this.model;
    const body={model:serverModel,messages:toChatVisionMessages(messages),stream:!!stream,...extraBody};
    if(tools.length)body.tools=tools.map(t=>toolDef(t,this.provider));
    const retryCfg=this.cfg.retry||{};const max=retryCfg.maxAttempts||1;let lastErr;
    for(let attempt=1;attempt<=max;attempt++){
      let emitted=false;
      try{
        const ac=new AbortController();const timer=setTimeout(()=>ac.abort(new Error("request timeout")),this.cfg.requestTimeoutMs||180000);
        const abort=()=>ac.abort(signal.reason||new Error("aborted"));if(signal){if(signal.aborted)abort();else signal.addEventListener("abort",abort,{once:true});}
        try{
          const r=await fetch(endpoint(this.pcfg.baseUrl),{method:"POST",headers:headers(apiKey,this.pcfg.headers||{}),body:JSON.stringify(body),signal:ac.signal});
          if(!r.ok){
            const text=await r.text();const err=new Error(`${this.provider} HTTP ${r.status}: ${errorDetail(text)}`);err.status=r.status;err.responseBody=text;const ra=r.headers.get("retry-after");if(ra){const seconds=Number(ra);err.retryAfterMs=Number.isFinite(seconds)?seconds*1000:Math.max(0,Date.parse(ra)-Date.now());}else err.retryAfterMs=bodyRetryAfterMs(text);throw err;
          }
          if(!stream){
            const j=await r.json();const choice=j.choices?.[0]||{};const message=choice.message||{role:"assistant",content:""};if(message.reasoning&&!message.reasoning_content)message.reasoning_content=message.reasoning;return {message,usage:j.usage||{},finishReason:choice.finish_reason,raw:j};
          }
          const acc={content:"",reasoning_content:"",toolCalls:[],usage:{},finishReason:null};
          for await(const evt of parseSSE(r.body,{signal:ac.signal})){
            if(evt.data==="[DONE]")break;let j;try{j=JSON.parse(evt.data);}catch{continue;}
            if(j.error)throw new Error(`${this.provider} stream error: ${j.error.message||"unknown error"}`);
            if(j.usage)acc.usage=j.usage;const c=j.choices?.[0];if(!c)continue;const d=c.delta||{};
            if(typeof d.content==="string"){acc.content+=d.content;emitted=true;onText?.(d.content);}
            const reasoning=typeof d.reasoning_content==="string"?d.reasoning_content:typeof d.reasoning==="string"?d.reasoning:"";if(reasoning){acc.reasoning_content+=reasoning;emitted=true;onReasoning?.(reasoning);}
            for(const td of d.tool_calls||[])mergeToolDelta(acc,td);
            if(c.finish_reason)acc.finishReason=c.finish_reason;
          }
          if(!acc.finishReason)throw new Error(`${this.provider} stream interrupted before completion`);
          return {message:finishMessage(acc),usage:acc.usage,finishReason:acc.finishReason};
        }finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);}
      }catch(e){
        lastErr=e;if(emitted||attempt>=max||signal?.aborted||!retryable(e.status||0)&&e.status)throw e;const delay=Math.max(backoff(attempt,retryCfg),Number(e.retryAfterMs||0));await sleep(delay,signal);
      }
    }throw lastErr||new Error("provider failure");
  }
}
