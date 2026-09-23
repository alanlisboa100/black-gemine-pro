import {StdioTransport} from "./stdio.js";
import {HttpTransport} from "./http.js";
import {MCP_CURRENT_VERSION,MCP_LEGACY_VERSION} from "./meta.js";
import {filterValidMcpTools} from "./headers.js";
import {VERSION} from "../config/defaults.js";
export class MCPClient{
  constructor(name,config,{networkContext=null}={}){this.name=name;this.config=config;this.networkContext=networkContext||{cfg:{permissionProfile:config.allowPrivateNetwork?"balanced":"safe"},confirm:async()=>config.allowPrivateNetwork===true};this.transport=null;this.serverInfo=null;this.tools=[];this.protocolVersion=null;this.legacy=false;}
  async connect(){
    this.transport=this.config.transport==="http"||this.config.url?new HttpTransport(this.config,this.networkContext):await new StdioTransport(this.config).open();
    if(this.config.forceLegacy)return this.connectLegacy();
    try{
      this.transport.setMode("modern",this.config.protocolVersion||MCP_CURRENT_VERSION);let discover=null;try{discover=await this.transport.request("server/discover",{},15000);}catch(e){if(e.code!==-32601&&this.config.requireDiscover)throw e;}
      await this.refreshTools();this.protocolVersion=this.config.protocolVersion||MCP_CURRENT_VERSION;this.serverInfo=this.transport.lastResponseMeta?.["io.modelcontextprotocol/serverInfo"]||discover?._meta?.["io.modelcontextprotocol/serverInfo"]||null;return this;
    }catch(e){if(this.config.legacyFallback===false)throw e;return this.connectLegacy(e);}
  }
  async connectLegacy(cause=null){
    this.transport.setMode("legacy",MCP_LEGACY_VERSION);const init=await this.transport.request("initialize",{protocolVersion:MCP_LEGACY_VERSION,capabilities:{},clientInfo:{name:"BLACKCORE Native",version:VERSION}},30000);this.serverInfo=init?.serverInfo||{};this.protocolVersion=init?.protocolVersion||MCP_LEGACY_VERSION;this.legacy=true;await this.transport.notify("notifications/initialized",{});await this.refreshTools();this.legacyCause=cause?.message||null;return this;
  }
  async refreshTools(){let cursor=null,out=[];do{const r=await this.transport.request("tools/list",cursor?{cursor}:{});out.push(...(r?.tools||[]));cursor=r?.nextCursor||null;}while(cursor);const checked=filterValidMcpTools(out);this.tools=checked.tools;this.toolWarnings=checked.warnings;this.transport.setTools?.(this.tools);return this.tools;}
  async callTool(name,args){return this.transport.request("tools/call",{name,arguments:args},120000);}
  close(){this.transport?.close();}
}
