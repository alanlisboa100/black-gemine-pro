function splitEventBuffer(buf){const a=buf.indexOf("\n\n"),b=buf.indexOf("\r\n\r\n");if(a<0&&b<0)return null;if(a>=0&&(b<0||a<b))return {block:buf.slice(0,a),rest:buf.slice(a+2)};return {block:buf.slice(0,b),rest:buf.slice(b+4)};}
function parseBlock(block){let event="message",id=null,retry=null,data=[];for(const raw of block.split(/\r?\n/)){if(raw.startsWith(":"))continue;const colon=raw.indexOf(":"),field=colon<0?raw:raw.slice(0,colon);let val=colon<0?"":raw.slice(colon+1);if(val.startsWith(" "))val=val.slice(1);if(field==="event")event=val;else if(field==="data")data.push(val);else if(field==="id")id=val;else if(field==="retry"&&/^\d+$/.test(val))retry=Number(val);}return data.length?{event,data:data.join("\n"),id,retry}:null;}
export async function* parseSSE(stream,{signal}={}){
  if(!stream?.getReader)throw new Error("provider returned no readable response body");
  const reader=stream.getReader(),decoder=new TextDecoder();let buf="",complete=false;
  const aborted=()=>reader.cancel(signal.reason).catch(()=>{});
  signal?.addEventListener("abort",aborted,{once:true});
  try{
    while(true){
      if(signal?.aborted)throw signal.reason||new Error("aborted");
      const {done,value}=await reader.read();
      if(signal?.aborted)throw signal.reason||new Error("aborted");
      if(done){complete=true;break;}
      buf+=decoder.decode(value,{stream:true});let part;
      while((part=splitEventBuffer(buf))){buf=part.rest;const evt=parseBlock(part.block);if(evt)yield evt;}
    }
    buf+=decoder.decode();if(buf.trim()){const evt=parseBlock(buf);if(evt)yield evt;}
  }finally{
    signal?.removeEventListener("abort",aborted);
    if(!complete)await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}
