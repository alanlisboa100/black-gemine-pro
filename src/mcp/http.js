import {id as makeId} from "../utils/id.js";
import {MCP_CURRENT_VERSION,MCP_LEGACY_VERSION,withMeta,encodeHeaderValue} from "./meta.js";
import {headersForToolCall} from "./headers.js";
import {fetchAuthorized,readResponseText} from "../security/network.js";

function parseSse(text){const out=[];for(const block of text.split(/\r?\n\r?\n+/)){const lines=block.split(/\r?\n/).filter(x=>x.startsWith("data:"));if(!lines.length)continue;try{out.push(JSON.parse(lines.map(x=>x.slice(5).trimStart()).join("\n")));}catch{}}return out;}
function nameFor(method,params={}){if(method==="tools/call"||method==="prompts/get")return params.name;if(method==="resources/read")return params.uri;return null;}
export class HttpTransport{
  constructor(config,networkContext){this.config=config;this.networkContext=networkContext;this.mode="modern";this.protocolVersion=config.protocolVersion||MCP_CURRENT_VERSION;this.sessionId=null;this.lastResponseMeta=null;this.toolSchemas=new Map();}
  setTools(tools=[]){this.toolSchemas=new Map(tools.map(t=>[t.name,t]));}
  setMode(mode,version=null){this.mode=mode;if(version)this.protocolVersion=version;return this;}
  async request(method,params={},timeoutMs=30000){
    const id=makeId("rpc_"),modern=this.mode!=="legacy",version=modern?this.protocolVersion:MCP_LEGACY_VERSION,bodyParams=modern?withMeta(params,version):params;
    const msg={jsonrpc:"2.0",id,method,params:bodyParams};const h={"content-type":"application/json","accept":"application/json, text/event-stream",...(this.config.headers||{})};
    if(modern){h["MCP-Protocol-Version"]=version;h["Mcp-Method"]=method;const n=nameFor(method,params);if(n!=null)h["Mcp-Name"]=encodeHeaderValue(n);if(method==="tools/call"&&params?.name&&this.toolSchemas.has(params.name))Object.assign(h,headersForToolCall(this.toolSchemas.get(params.name),params.arguments||{}));}else if(this.sessionId)h["Mcp-Session-Id"]=this.sessionId;
    const ac=new AbortController(),timer=timeoutMs>0?setTimeout(()=>ac.abort(new Error(`MCP HTTP timeout: ${method}`)),timeoutMs):null;
    try{
      const r=await fetchAuthorized(this.networkContext,this.config.url,{method:"POST",headers:h,body:JSON.stringify(msg),signal:ac.signal});const sid=r.headers.get("mcp-session-id");if(sid&&!modern)this.sessionId=sid;const ct=r.headers.get("content-type")||"",text=await readResponseText(r,{maxBytes:this.config.maxResponseBytes||5_000_000});let envelopes=[];
      if(ct.includes("application/json")){const j=JSON.parse(text);envelopes=Array.isArray(j)?j:[j];}else envelopes=parseSse(text);
      const env=envelopes.find(x=>x?.id===id)||envelopes.find(x=>x?.result||x?.error);if(!r.ok&&!env){const e=new Error(`MCP HTTP ${r.status}`);e.status=r.status;throw e;}if(!env){const e=new Error(`MCP empty response: ${method}`);e.status=r.status;throw e;}this.lastResponseMeta=env.result?._meta||env._meta||null;
      if(env.error){const e=new Error(env.error.message||JSON.stringify(env.error));e.code=env.error.code;e.data=env.error.data;e.status=r.status;throw e;}return env.result;
    }finally{if(timer)clearTimeout(timer);}
  }
  async notify(method,params={}){if(this.mode!=="legacy")return;const msg={jsonrpc:"2.0",method,params},h={"content-type":"application/json","accept":"application/json",...(this.config.headers||{})};if(this.sessionId)h["Mcp-Session-Id"]=this.sessionId;await fetchAuthorized(this.networkContext,this.config.url,{method:"POST",headers:h,body:JSON.stringify(msg)}).then(r=>r.body?.cancel?.()).catch(()=>{});}
  close(){}
}
