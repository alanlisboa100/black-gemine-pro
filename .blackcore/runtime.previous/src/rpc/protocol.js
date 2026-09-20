export const RPC_VERSION=1;
export function ok(id,result){return {jsonrpc:"2.0",id,result};}
export function err(id,error,code=-32000){return {jsonrpc:"2.0",id,error:{code,message:error?.message||String(error)}};}
export function event(method,params){return {jsonrpc:"2.0",method:`blackcore/${method}`,params};}
