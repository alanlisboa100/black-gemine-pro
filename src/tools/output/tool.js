import {defineTool} from "../registry.js";
export const toolOutputTool=defineTool({
  name:"tool_output",description:"Read or search a full tool output previously preserved behind an out_* handle after truncation.",readOnly:true,
  parameters:{type:"object",properties:{handle:{type:"string"},action:{type:"string",enum:["read","search"]},offset:{type:"integer",minimum:0},limit:{type:"integer",minimum:100,maximum:100000},query:{type:"string"},regex:{type:"boolean"},caseSensitive:{type:"boolean"},maxResults:{type:"integer",minimum:1,maximum:500}},required:["handle"],additionalProperties:false},
  async execute(a,ctx){if(a.action==="search"){if(!a.query)throw new Error("query required for search");return ctx.outputStore.search(a.handle,a.query,a);}return JSON.stringify(ctx.outputStore.read(a.handle,a),null,2);}
});
