import {defineTool} from "../registry.js";
import {runCli} from "../common/cli.js";
import {readable} from "../fs/common.js";

const MUTATING=new Set(["install","uninstall","launch","tap","swipe","text","key"]);
function target(a){return a.serial?["-s",a.serial]:[];}
export const androidDeviceTool=defineTool({
  name:"android_device",description:"Inspect and test Android devices through ADB: list devices, read device details/logs, install or uninstall APKs, launch activities, and send explicit UI input.",parallelSafe:false,planSafe:a=>["devices","info","logcat"].includes(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["devices","info","logcat","install","uninstall","launch","tap","swipe","text","key"]},serial:{type:"string",maxLength:200},apk:{type:"string"},package:{type:"string",maxLength:300},activity:{type:"string",maxLength:500},x:{type:"integer",minimum:0,maximum:20000},y:{type:"integer",minimum:0,maximum:20000},x2:{type:"integer",minimum:0,maximum:20000},y2:{type:"integer",minimum:0,maximum:20000},durationMs:{type:"integer",minimum:1,maximum:30000},text:{type:"string",maxLength:2000},keyCode:{type:"integer",minimum:0,maximum:1000},lines:{type:"integer",minimum:1,maximum:5000}},required:["action"],additionalProperties:false},
  async execute(a,ctx){
    if(MUTATING.has(a.action)&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Run Android device action ${a.action}${a.serial?` on ${a.serial}`:""}?`,false);if(!ok)return"Android device action denied";}
    let args=target(a);
    if(a.action==="devices")args.push("devices","-l");
    else if(a.action==="info")args.push("shell","getprop");
    else if(a.action==="logcat")args.push("logcat","-d","-t",String(a.lines||300));
    else if(a.action==="install"){if(!a.apk)throw new Error("apk required");args.push("install","-r",await readable(ctx,a.apk));}
    else if(a.action==="uninstall"){if(!a.package)throw new Error("package required");args.push("uninstall",a.package);}
    else if(a.action==="launch"){if(!a.package)throw new Error("package required");args.push("shell","am","start","-n",a.activity?`${a.package}/${a.activity}`:a.package);}
    else if(a.action==="tap"){if(a.x==null||a.y==null)throw new Error("x and y required");args.push("shell","input","tap",String(a.x),String(a.y));}
    else if(a.action==="swipe"){if([a.x,a.y,a.x2,a.y2].some(v=>v==null))throw new Error("x, y, x2 and y2 required");args.push("shell","input","swipe",String(a.x),String(a.y),String(a.x2),String(a.y2),String(a.durationMs||300));}
    else if(a.action==="text"){if(a.text==null)throw new Error("text required");args.push("shell","input","text",a.text.replace(/ /g,"%s"));}
    else {if(a.keyCode==null)throw new Error("keyCode required");args.push("shell","input","keyevent",String(a.keyCode));}
    const result=await runCli(ctx,"adb",args,{timeoutMs:a.action==="install"?300000:120000});return result.output;
  }
});
