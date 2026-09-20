import {id} from "../utils/id.js";
export const SESSION_VERSION=1;
export function header({cwd,name=null,sessionId=id("s_")}){
  return {type:"session_header",version:SESSION_VERSION,sessionId,cwd,name,createdAt:new Date().toISOString()};
}
export function entry({type="message",parentId=null,role=null,content=null,data=null,label=null}={}){
  return {type,id:id("e_"),parentId,role,content,data,label,createdAt:new Date().toISOString()};
}
export function usageEntry(parentId,usage,provider,model){
  return entry({type:"usage",parentId,data:{usage,provider,model}});
}
export function compactEntry(parentId,summary,coveredEntryIds){
  return entry({type:"compaction",parentId,content:summary,data:{coveredEntryIds}});
}
