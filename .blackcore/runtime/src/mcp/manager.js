import {MCPClient} from "./client.js";
import {defineTool} from "../tools/registry.js";
export function isTrustedMcpServer(cfg,name){return Array.isArray(cfg.trustedMcpServers)&&cfg.trustedMcpServers.includes(name);}
export class MCPManager{
  constructor(cfg,registry){this.cfg=cfg;this.registry=registry;this.clients=new Map();this.registered=[];}
  async load(){
    for(const [name,conf] of Object.entries(this.cfg.mcp?.servers||{})){if(conf.enabled===false)continue;if(!isTrustedMcpServer(this.cfg,name)){conf._error="server is not globally trusted; add its name to trustedMcpServers";continue;}try{const networkContext={cfg:{...this.cfg,permissionProfile:conf.allowPrivateNetwork?"balanced":"safe"},confirm:async()=>conf.allowPrivateNetwork===true},c=await new MCPClient(name,conf,{networkContext}).connect();this.clients.set(name,c);for(const t of c.tools){const toolName=`mcp_${name}_${t.name}`.replace(/[^A-Za-z0-9_-]/g,"_"),readOnly=t.annotations?.readOnlyHint===true;const def=defineTool({name:toolName,description:`MCP ${name}/${t.name}: ${t.description||""}`,parameters:t.inputSchema||{type:"object",properties:{}},readOnly,mutates:!readOnly,async execute(args,ctx){if(!readOnly&&ctx.cfg.confirmExternalWrites!==false){const ok=await ctx.confirm(`Run trusted MCP action ${name}/${t.name}?\nThis tool may change external state.`,false);if(!ok)throw new Error("MCP action denied");}const r=await c.callTool(t.name,args);if(r?.isError)throw new Error(JSON.stringify(r.content));return (r?.content||[]).map(x=>x.text??JSON.stringify(x)).join("\n");}});this.registry.register(def,{group:`mcp:${name}`});this.registered.push(toolName);}}catch(e){conf._error=e.message;}}
    return this;
  }
  list(){return Object.entries(this.cfg.mcp?.servers||{}).map(([name,conf])=>{const c=this.clients.get(name);return {name,connected:!!c,serverInfo:c?.serverInfo||null,tools:c?.tools?.length||0,error:conf._error||null};});}
  close(){for(const c of this.clients.values())c.close();}
}
