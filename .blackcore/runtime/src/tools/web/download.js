import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {writable,capture,ensureParent} from "../fs/common.js";
import {fetchAuthorized} from "../../security/network.js";

async function writeStream(response,file,maxBytes,signal){
  if(!response.body){await fs.writeFile(file,"");return 0;}
  const handle=await fs.open(file,"wx"),reader=response.body.getReader();let total=0;
  try{
    while(true){if(signal?.aborted)throw signal.reason||new Error("aborted");const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){try{await reader.cancel("download too large");}catch{}throw new Error(`download too large: exceeds ${maxBytes} bytes`);}await handle.write(value);}
    return total;
  }finally{try{reader.releaseLock();}catch{}await handle.close();}
}

export const downloadTool=defineTool({
  name:"download",description:"Download a public HTTP(S) URL to a workspace file with a size limit.",mutates:true,
  parameters:{type:"object",properties:{url:{type:"string"},path:{type:"string"},maxBytes:{type:"integer",minimum:1,maximum:100000000},timeoutMs:{type:"integer",minimum:1000,maximum:180000}},required:["url","path"],additionalProperties:false},
  async execute(a,ctx){
    const dest=await writable(ctx,a.path),max=a.maxBytes||25_000_000,ac=new AbortController(),timer=setTimeout(()=>ac.abort(new Error("download timeout")),a.timeoutMs||120000),abort=()=>ac.abort(ctx.signal?.reason||new Error("aborted"));ctx.signal?.addEventListener("abort",abort,{once:true});let tmp;
    try{
      const r=await fetchAuthorized(ctx,a.url,{signal:ac.signal,headers:{"user-agent":"BLACKCORE-Native/2.0"}});if(!r.ok)throw new Error(`HTTP ${r.status}`);const len=Number(r.headers.get("content-length")||0);if(len>max)throw new Error(`download too large: ${len}`);
      await capture(ctx,dest);await ensureParent(dest);tmp=path.join(path.dirname(dest),`.blackcore-download-${process.pid}-${Date.now()}.tmp`);const bytes=await writeStream(r,tmp,max,ac.signal);await fs.rename(tmp,dest);tmp=null;return `downloaded ${bytes} bytes -> ${dest}`;
    }finally{clearTimeout(timer);ctx.signal?.removeEventListener("abort",abort);if(tmp)try{await fs.unlink(tmp);}catch{}}
  }
});
