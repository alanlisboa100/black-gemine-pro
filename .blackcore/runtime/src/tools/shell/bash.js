import {defineTool} from "../registry.js";
import {execCapture} from "../../utils/exec.js";

export const bashTool=defineTool({
  name:"bash",description:"Execute a shell command in the workspace with timeout and safety checks.",
  parameters:{type:"object",properties:{command:{type:"string"},timeoutMs:{type:"integer",minimum:1000,maximum:600000}},required:["command"],additionalProperties:false},
  async execute(a,ctx){const auth=await ctx.security.authorizeShell(a.command,ctx);if(!auth.allow)throw new Error(auth.reason);ctx.audit?.record("shell",{command:a.command,classification:auth.classification?.level});
    const r=await execCapture(process.env.SHELL||"sh",["-c",a.command],{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:a.timeoutMs||60000,maxChars:ctx.cfg.maxToolOutputChars});return `exit=${r.code}\n${r.combined}`;
  }
});
