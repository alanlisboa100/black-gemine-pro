import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";
import {execCapture} from "../../utils/exec.js";

export const gradleTool=defineTool({
  name:"gradle",description:"Run the project's Gradle wrapper for Android build/test tasks.",
  parameters:{type:"object",properties:{task:{type:"string"},args:{type:"array",items:{type:"string"}}},required:["task"],additionalProperties:false},
  async execute(a,ctx){const candidates=[path.join(ctx.cwd,"gradlew"),path.join(ctx.cwd,"android","gradlew")],wrapper=candidates.find(fs.existsSync);if(!wrapper)throw new Error("gradlew not found");const cwd=path.dirname(wrapper),args=[a.task,...(a.args||[])];const r=await execCapture(wrapper,args,{cwd,signal:ctx.signal,timeoutMs:900000,maxChars:ctx.cfg.maxToolOutputChars});return `exit=${r.code}\n${r.combined}`;}
});
