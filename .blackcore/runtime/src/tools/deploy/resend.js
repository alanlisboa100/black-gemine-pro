import {defineTool} from "../registry.js";
import {execCapture,which} from "../../utils/exec.js";

const READ_ACTIONS=new Set(["doctor","domains_list","emails_list"]);
function value(name,input,max=20000){
  const text=String(input||"").trim();
  if(!text)throw new Error(`${name} required`);
  if(text.length>max)throw new Error(`${name} is too long`);
  return text;
}
function addresses(name,input){
  if(!Array.isArray(input)||input.length<1||input.length>50)throw new Error(`${name} must contain 1 to 50 email addresses`);
  return input.map(x=>value(name,x,320));
}

export const resendTool=defineTool({
  name:"resend",description:"Run Resend diagnostics, inspect domains/sent emails, or send a transactional email with explicit confirmation.",
  planSafe:a=>READ_ACTIONS.has(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["doctor","domains_list","emails_list","email_send"]},from:{type:"string",maxLength:320},to:{type:"array",items:{type:"string",maxLength:320},minItems:1,maxItems:50},subject:{type:"string",maxLength:998},text:{type:"string",maxLength:20000},html:{type:"string",maxLength:100000},replyTo:{type:"string",maxLength:320},scheduledAt:{type:"string",maxLength:120},idempotencyKey:{type:"string",maxLength:255}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    if(!(await which("resend")))throw new Error("Resend CLI not installed. Install the official Resend CLI and authenticate with resend login or RESEND_API_KEY.");
    let args=[];
    switch(a.action){
      case"doctor":args=["doctor"];break;
      case"domains_list":args=["domains","list"];break;
      case"emails_list":args=["emails","list"];break;
      case"email_send":{
        const from=value("from",a.from,320),to=addresses("to",a.to),subject=value("subject",a.subject,998);
        if(!!a.text===!!a.html)throw new Error("provide exactly one of text or html");
        args=["emails","send","--from",from,"--to",...to,"--subject",subject,a.text!=null?["--text",value("text",a.text)]:["--html",value("html",a.html,100000)]];
        args=args.flat();
        if(a.replyTo)args.push("--reply-to",value("replyTo",a.replyTo,320));
        if(a.scheduledAt)args.push("--scheduled-at",value("scheduledAt",a.scheduledAt,120));
        if(a.idempotencyKey)args.push("--idempotency-key",value("idempotencyKey",a.idempotencyKey,255));
        break;
      }
    }
    if(a.action==="email_send"&&ctx.cfg.permissionProfile!=="yolo"){
      const recipients=addresses("to",a.to);
      const ok=await ctx.confirm(`Send Resend email to ${recipients.join(", ")}?\nSubject: ${value("subject",a.subject,998)}`,false);
      if(!ok)return"Resend email denied";
    }
    const r=await execCapture("resend",args,{cwd:ctx.cwd,signal:ctx.signal,timeoutMs:a.action==="email_send"?120000:60000,maxChars:ctx.cfg.maxToolOutputChars});
    return `exit=${r.code}\n${r.combined}`;
  }
});
