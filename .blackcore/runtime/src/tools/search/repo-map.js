import {defineTool} from "../registry.js";
import {buildRepoIndex,renderRepoIndex} from "../../context/repo-index.js";
export const repoMapTool=defineTool({name:"repo_map",description:"Build a compact high-signal map of the repository.",readOnly:true,parameters:{type:"object",properties:{maxFiles:{type:"integer",minimum:100,maximum:30000},maxDetailed:{type:"integer",minimum:20,maximum:1000}},additionalProperties:false},async execute(a,ctx){return renderRepoIndex(await buildRepoIndex(ctx.cwd,{maxFiles:a.maxFiles||12000,maxDetailed:a.maxDetailed||240}));}});
