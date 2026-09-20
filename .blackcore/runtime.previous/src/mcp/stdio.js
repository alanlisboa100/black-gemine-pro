import {spawn} from "node:child_process";
import {JsonRpcPeer} from "./jsonrpc.js";
import {MCP_CURRENT_VERSION,withMeta} from "./meta.js";
const PASSTHROUGH_ENV=["PATH","HOME","TMPDIR","TMP","TEMP","LANG","LC_ALL","TERM","SystemRoot","COMSPEC","PATHEXT"];
export function mcpChildEnv(base=process.env,extra={}){
  const out={};for(const name of PASSTHROUGH_ENV)if(base[name]!=null)out[name]=base[name];
  for(const [name,value] of Object.entries(extra||{}))if(value!=null)out[name]=String(value);
  return out;
}
export class StdioTransport{
  constructor(config){this.config=config;this.cp=null;this.peer=null;this.buffer="";this.mode="modern";this.protocolVersion=config.protocolVersion||MCP_CURRENT_VERSION;}
  async open(){
    const {command,args=[],env={}}=this.config;this.cp=spawn(command,args,{stdio:["pipe","pipe","pipe"],env:mcpChildEnv(process.env,env)});
    this.peer=new JsonRpcPeer(msg=>{const out=this.mode==="modern"&&msg.params?{...msg,params:withMeta(msg.params,this.protocolVersion)}:msg;this.cp.stdin.write(JSON.stringify(out)+"\n");});
    this.cp.stdout.on("data",d=>this.onData(d));this.cp.stderr.on("data",d=>this.config.onStderr?.(d.toString()));this.cp.on("close",()=>this.peer.close("MCP stdio server exited"));this.cp.on("error",e=>this.peer.close(e.message));return this;
  }
  setMode(mode,version=null){this.mode=mode;if(version)this.protocolVersion=version;return this;}
  onData(d){this.buffer+=d.toString();let i;while((i=this.buffer.indexOf("\n"))>=0){const line=this.buffer.slice(0,i).trim();this.buffer=this.buffer.slice(i+1);if(!line)continue;try{this.peer.receive(JSON.parse(line));}catch{}}}
  request(m,p,t){return this.peer.request(m,p,t);}notify(m,p){return this.peer.notify(m,p);}close(){try{this.cp?.kill("SIGTERM");}catch{}this.peer?.close();}
}
