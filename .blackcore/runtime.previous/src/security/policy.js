import {classifyCommand} from "./classifier.js";
import {isSensitivePath} from "./secrets.js";

export class SecurityPolicy{
  constructor(cfg){this.cfg=cfg;}
  async authorizeShell(command,ctx){
    const c=classifyCommand(command);if(c.level==="critical")return {allow:false,reason:"BLACKCORE blocks critical destructive commands"};
    if(this.cfg.permissionProfile==="yolo")return {allow:true,classification:c};
    if(this.cfg.permissionProfile==="safe"&&["danger","sensitive"].includes(c.level))return {allow:false,reason:`${c.level} shell command blocked by safe profile`,classification:c};
    if(c.level==="sensitive"){if(ctx.agent?.approvals?.get("shell-sensitive",command))return {allow:true,classification:c};const ok=await ctx.confirm(`Command may expose credentials or sensitive files to the model:
${command}
Run it?`,false);if(ok)ctx.agent?.approvals?.grant("shell-sensitive",command,"turn");return {allow:ok,reason:ok?"approved":"denied by user",classification:c};}
    if(c.level==="danger"&&this.cfg.confirmDangerous){const ok=await ctx.confirm(`Potentially destructive command:\n${command}\nRun it?`);return {allow:ok,reason:ok?"approved":"denied by user",classification:c};}
    return {allow:true,classification:c};
  }
  async authorizeDelete(file,ctx){
    if(this.cfg.permissionProfile==="yolo")return true;
    if(isSensitivePath(file)){if(this.cfg.permissionProfile==="safe")return false;return await ctx.confirm(`Delete sensitive-looking file?\n${file}`);}
    return true;
  }
}
