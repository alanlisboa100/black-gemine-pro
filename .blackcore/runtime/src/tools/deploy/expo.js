import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";
export const expoTool=defineTool({
  name:"expo",description:"Run Expo project checks/start/export using npx expo.",
  parameters:{type:"object",properties:{action:{type:"string",enum:["doctor","start","export","prebuild"]},args:{type:"array",items:{type:"string"}}},required:["action"],additionalProperties:false},
  async execute(a,ctx){if(!(await which("npx")))throw new Error("npx not installed");const cmd=a.action==="doctor"?["expo-doctor",...(a.args||[])]:["expo",a.action,...(a.args||[])];const r=await execCapture("npx",cmd,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:a.action==="start"?120000:600000,maxChars:ctx.cfg.maxToolOutputChars});return `exit=${r.code}\n${r.combined}`;}
});
export const easTool=defineTool({
  name:"eas",description:"Run EAS build/update/submit with confirmation for remote release actions.",
  parameters:{type:"object",properties:{action:{type:"string",enum:["whoami","build","update","submit"]},platform:{type:"string",enum:["android","ios","all"]},profile:{type:"string"},args:{type:"array",items:{type:"string"}}},required:["action"],additionalProperties:false},
  async execute(a,ctx){if(!(await which("eas")))throw new Error("EAS CLI not installed. Run: npm i -g eas-cli");if(["build","update","submit"].includes(a.action)&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Run remote EAS ${a.action}?`);if(!ok)return"EAS action denied";}const args=[a.action];if(a.platform&&a.action!=="whoami")args.push("--platform",a.platform);if(a.profile)args.push("--profile",a.profile);args.push(...(a.args||[]));const r=await execCapture("eas",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:900000,maxChars:ctx.cfg.maxToolOutputChars});return `exit=${r.code}\n${r.combined}`;}
});
