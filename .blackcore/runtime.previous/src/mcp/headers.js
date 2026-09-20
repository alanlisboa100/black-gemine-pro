import {encodeHeaderValue} from "./meta.js";

const NAME=/^[A-Za-z0-9][A-Za-z0-9-]*$/;
function scanInvalid(node,reachable=true,path=[]){
  if(!node||typeof node!=="object")return[];const out=[];
  if("x-mcp-header" in node){if(!reachable)out.push(`x-mcp-header is not reachable through properties at ${path.join(".")||"$"}`);if(!["string","integer","boolean"].includes(node.type))out.push(`x-mcp-header has unsupported type ${node.type||"unknown"} at ${path.join(".")||"$"}`);if(typeof node["x-mcp-header"]!=="string"||!NAME.test(node["x-mcp-header"]))out.push(`invalid x-mcp-header name at ${path.join(".")||"$"}`);}
  for(const [k,v] of Object.entries(node)){
    if(k==="properties"&&v&&typeof v==="object"){for(const [name,child] of Object.entries(v))out.push(...scanInvalid(child,reachable,path.concat(name)));}
    else if(v&&typeof v==="object"&&k!=="x-mcp-header")out.push(...scanInvalid(v,false,path.concat(k)));
  }
  return out;
}
function collect(node,path=[],out=[]){if(!node?.properties)return out;for(const [name,schema] of Object.entries(node.properties)){const p=path.concat(name);if(schema?.["x-mcp-header"])out.push({path:p,header:schema["x-mcp-header"],type:schema.type});if(schema?.properties)collect(schema,p,out);}return out;}
function get(obj,path){let cur=obj;for(const p of path){if(cur==null||typeof cur!=="object"||!(p in cur))return undefined;cur=cur[p];}return cur;}
export function analyzeToolHeaders(tool){const issues=scanInvalid(tool?.inputSchema||{});return {valid:issues.length===0,issues,fields:issues.length?[]:collect(tool?.inputSchema||{})};}
export function headersForToolCall(tool,args={}){const a=analyzeToolHeaders(tool);if(!a.valid)throw new Error(`invalid MCP tool header annotations: ${a.issues.join("; ")}`);const headers={};for(const f of a.fields){const v=get(args,f.path);if(v===undefined||v===null)continue;headers[`Mcp-Param-${f.header}`]=encodeHeaderValue(v);}return headers;}
export function filterValidMcpTools(tools=[]){const warnings=[],valid=[];for(const t of tools){const a=analyzeToolHeaders(t);if(a.valid)valid.push(t);else warnings.push({tool:t.name,issues:a.issues});}return {tools:valid,warnings};}
