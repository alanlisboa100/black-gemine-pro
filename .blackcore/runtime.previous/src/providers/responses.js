import {parseSSE} from "./sse.js";
import {sleep,retryable,backoff} from "./retry.js";
import {providerAuth,findModel} from "../config/models.js";
import {openAIReasoningBody} from "../config/reasoning.js";

export function responseEndpoint(base){return base.replace(/\/+$/,"")+"/responses";}
export function responseHeaders(apiKey,extra={}){const h={"content-type":"application/json","accept":"application/json",...extra};if(apiKey)h.authorization=`Bearer ${apiKey}`;return h;}
export function responseTools(tools=[]){return tools.map(t=>({type:"function",name:t.name,description:t.description||"",parameters:t.parameters||{type:"object",properties:{}}}));}

// Responses API keeps function calls and their outputs as explicit input items.
// This conversion preserves order across multi-turn BLACKCORE tool execution.
export function toResponseInput(messages=[]){
  const input=[];let instructions="";
  for(const m of messages){
    if(m.role==="system"){instructions+=(instructions?"\n\n":"")+String(m.content||"");continue;}
    if(m.role==="tool"){input.push({type:"function_call_output",call_id:m.tool_call_id||"call_unknown",output:String(m.content||"")});continue;}
    if(m.role==="assistant"&&m.tool_calls?.length){
      if(m.content)input.push({role:"assistant",content:String(m.content)});
      for(const tc of m.tool_calls)input.push({type:"function_call",call_id:tc.id||`call_${Date.now()}`,name:tc.function?.name||"tool",arguments:tc.function?.arguments||"{}"});
      continue;
    }
    if(m.role==="user"&&m.images?.length){input.push({role:"user",content:[{type:"input_text",text:String(m.content||"")},...m.images.map(x=>({type:"input_image",image_url:x.dataUrl}))]});continue;}
    if(m.role==="user"||m.role==="assistant")input.push({role:m.role,content:String(m.content||"")});
  }
  return {instructions,input};
}

function toolCall(item,index=0){return {id:item.call_id||item.id||`call_${index}`,type:"function",function:{name:item.name||"tool",arguments:typeof item.arguments==="string"?item.arguments:JSON.stringify(item.arguments||{})}};}
export function fromResponse(j={}){
  let content=j.output_text||"",reasoning="";const toolCalls=[],collectText=!j.output_text;
  for(const item of j.output||[]){
    if(item.type==="message"&&collectText)for(const part of item.content||[]){if(part.type==="output_text"&&part.text)content+=content?"\n"+part.text:part.text;}
    else if(item.type==="function_call")toolCalls.push(toolCall(item,toolCalls.length));
    else if(item.type==="reasoning")for(const p of item.summary||item.content||[]){const t=p.text||p.content||"";if(t)reasoning+=t;}
  }
  return {message:{role:"assistant",content,...(reasoning?{reasoning_content:reasoning}:{}),...(toolCalls.length?{tool_calls:toolCalls}:{})},usage:j.usage||{},finishReason:j.status||null,raw:j};
}

function retryAfter(response){const ra=response.headers.get("retry-after");if(!ra)return 0;const seconds=Number(ra);return Number.isFinite(seconds)?seconds*1000:Math.max(0,Date.parse(ra)-Date.now());}
function streamAccumulator(){return {content:"",reasoning_content:"",toolCalls:new Map(),usage:{},finishReason:null,raw:null};}
function ensureTool(acc,item={}){
  const key=item.item_id||item.id||item.call_id||String(item.output_index??acc.toolCalls.size);
  if(!acc.toolCalls.has(key))acc.toolCalls.set(key,{id:item.call_id||item.id||`call_${acc.toolCalls.size}`,type:"function",function:{name:item.name||"",arguments:""}});
  const call=acc.toolCalls.get(key);if(item.call_id)call.id=item.call_id;if(item.name)call.function.name=item.name;if(typeof item.arguments==="string")call.function.arguments=item.arguments;return call;
}
function streamedResponse(acc){
  const message={role:"assistant",content:acc.content,...(acc.reasoning_content?{reasoning_content:acc.reasoning_content}:{}),...(acc.toolCalls.size?{tool_calls:[...acc.toolCalls.values()]}:{})};
  return {message,usage:acc.usage,finishReason:acc.finishReason,raw:acc.raw};
}

export class ResponsesProvider{
  constructor(cfg,provider,model){this.cfg=cfg;this.provider=provider;this.model=model;this.pcfg=cfg.providers?.[provider];if(!this.pcfg)throw new Error(`Unknown provider ${provider}`);}
  modelInfo(){return findModel(this.cfg,this.provider,this.model);}
  async chat({messages,tools=[],signal,onText,onReasoning,stream=this.cfg.stream,extraBody={}}){
    const apiKey=providerAuth(this.cfg,this.provider);if(!apiKey)throw new Error(`Missing API key for ${this.provider}`);
    const converted=toResponseInput(messages),body={model:this.model,input:converted.input,...(converted.instructions?{instructions:converted.instructions}:{}),...(tools.length?{tools:responseTools(tools)}:{}),...openAIReasoningBody(this.cfg,this.provider,this.model),stream:!!stream,...extraBody};
    const retryCfg=this.cfg.retry||{},max=retryCfg.maxAttempts||1;let lastErr;
    for(let attempt=1;attempt<=max;attempt++){
      try{
        const ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("request timeout")),this.cfg.requestTimeoutMs||180000);
        const abort=()=>ac.abort(signal?.reason||new Error("aborted"));if(signal){if(signal.aborted)abort();else signal.addEventListener("abort",abort,{once:true});}
        try{
          const r=await fetch(responseEndpoint(this.pcfg.baseUrl),{method:"POST",headers:responseHeaders(apiKey,this.pcfg.headers||{}),body:JSON.stringify(body),signal:ac.signal});
          if(!r.ok){const text=await r.text();const err=new Error(`${this.provider} HTTP ${r.status}: ${text.slice(0,4000)}`);err.status=r.status;err.retryAfterMs=retryAfter(r);throw err;}
          if(!stream)return fromResponse(await r.json());
          const acc=streamAccumulator();
          for await(const evt of parseSSE(r.body,{signal:ac.signal})){
            let item;try{item=JSON.parse(evt.data);}catch{continue;}
            const type=item.type||evt.event;
            if(type==="response.output_text.delta"){const delta=String(item.delta||"");acc.content+=delta;onText?.(delta);continue;}
            if(type==="response.reasoning_summary_text.delta"){const delta=String(item.delta||"");acc.reasoning_content+=delta;onReasoning?.(delta);continue;}
            if(type==="response.output_item.added"&&item.item?.type==="function_call"){ensureTool(acc,item.item);continue;}
            if(type==="response.function_call_arguments.delta"){const call=ensureTool(acc,item);call.function.arguments+=String(item.delta||"");continue;}
            if(type==="response.output_item.done"&&item.item?.type==="function_call"){ensureTool(acc,item.item);continue;}
            if(type==="response.completed"){acc.raw=item.response||item;acc.usage=item.response?.usage||acc.usage;acc.finishReason=item.response?.status||"completed";continue;}
            if(type==="response.failed")throw new Error(`${this.provider} response failed: ${item.response?.error?.message||item.error?.message||"unknown error"}`);
          }
          // Some compatible gateways only emit a final Response object. Prefer
          // its final text/usage without discarding streamed tool-call deltas.
          if(acc.raw){const final=fromResponse(acc.raw);if(!acc.content)acc.content=final.message.content||"";if(!acc.reasoning_content)acc.reasoning_content=final.message.reasoning_content||"";if(!acc.toolCalls.size)for(const tc of final.message.tool_calls||[])acc.toolCalls.set(tc.id,tc);if(Object.keys(final.usage||{}).length)acc.usage=final.usage;acc.finishReason=final.finishReason||acc.finishReason;}
          return streamedResponse(acc);
        }finally{clearTimeout(timer);signal?.removeEventListener("abort",abort);}
      }catch(e){lastErr=e;if(attempt>=max||signal?.aborted||(!retryable(e.status||0)&&e.status))throw e;await sleep(Math.max(backoff(attempt,retryCfg),Number(e.retryAfterMs||0)),signal);}
    }
    throw lastErr||new Error("responses provider failure");
  }
}
