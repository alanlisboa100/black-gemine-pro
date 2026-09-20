import {id as makeId} from "../utils/id.js";
export class JsonRpcPeer{
  constructor(send){this.send=send;this.pending=new Map();}
  request(method,params,timeoutMs=30000){
    const id=makeId("rpc_"),msg={jsonrpc:"2.0",id,method,...(params===undefined?{}:{params})};
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`JSON-RPC timeout: ${method}`));},timeoutMs);this.pending.set(id,{resolve,reject,timer,method});Promise.resolve().then(()=>this.send(msg)).catch(e=>{const p=this.pending.get(id);if(!p)return;this.pending.delete(id);clearTimeout(timer);reject(e);});});
  }
  notify(method,params){return Promise.resolve().then(()=>this.send({jsonrpc:"2.0",method,...(params===undefined?{}:{params})}));}
  receive(msg){
    if(msg?.id!=null&&("result"in msg||"error"in msg)){const p=this.pending.get(msg.id);if(!p)return;this.pending.delete(msg.id);clearTimeout(p.timer);if(msg.error){const e=new Error(msg.error.message||JSON.stringify(msg.error));e.code=msg.error.code;e.data=msg.error.data;p.reject(e);}else p.resolve(msg.result);return;}
  }
  close(reason="closed"){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(reason));}this.pending.clear();}
}
