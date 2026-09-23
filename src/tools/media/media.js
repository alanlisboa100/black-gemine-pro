import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {readable,writable,capture,ensureParent} from "../fs/common.js";
import {available,runCli} from "../common/cli.js";

async function imageCommand(){
  const commands=await available(["magick","convert"]);
  return commands.magick?"magick":commands.convert?"convert":null;
}

export const mediaTool=defineTool({
  name:"media",
  description:"Structured FFmpeg/ImageMagick media pipeline for inspection, image conversion/resizing, video conversion, audio extraction, frame extraction and GIF creation. Outputs stay inside the authorized workspace and are checkpointed where possible.",
  planSafe:a=>a.action==="inspect",
  parameters:{
    type:"object",
    properties:{
      action:{type:"string",enum:["inspect","image_convert","image_resize","video_convert","audio_extract","extract_frames","gif"]},
      input:{type:"string"},output:{type:"string"},
      width:{type:"integer",minimum:1,maximum:16384},height:{type:"integer",minimum:1,maximum:16384},
      quality:{type:"integer",minimum:1,maximum:100},fps:{type:"number",minimum:.1,maximum:120},
      start:{type:"string",maxLength:40},duration:{type:"string",maxLength:40},codec:{type:"string",maxLength:80},
      args:{type:"array",items:{type:"string"},maxItems:30}
    },
    required:["action","input"],additionalProperties:false
  },
  async execute(a,ctx){
    const input=await readable(ctx,a.input);
    if(a.action==="inspect"){
      const commands=await available(["ffprobe","identify"]);
      let result;
      if(commands.ffprobe) result=await runCli(ctx,"ffprobe",["-v","error","-show_format","-show_streams","-of","json",input],{allowFailure:true});
      if((!result||result.exitCode!==0)&&commands.identify) result=await runCli(ctx,"identify",["-verbose",input],{allowFailure:true});
      if(!result) throw new Error("ffprobe or ImageMagick identify is required");
      return result.output;
    }
    if(!a.output) throw new Error("output required");
    const output=await writable(ctx,a.output);
    await capture(ctx,output);
    await ensureParent(output);
    let command;
    const args=[];
    if(a.action.startsWith("image_")){
      command=await imageCommand();
      if(!command) throw new Error("ImageMagick is not installed");
      args.push(input);
      if(a.action==="image_resize") args.push("-resize",`${a.width||""}x${a.height||""}`);
      if(a.quality) args.push("-quality",String(a.quality));
      args.push(...(a.args||[]),output);
    }else{
      command="ffmpeg";
      args.push("-y");
      if(a.start) args.push("-ss",a.start);
      args.push("-i",input);
      if(a.duration) args.push("-t",a.duration);
      if(a.action==="video_convert"){
        if(a.codec) args.push("-c:v",a.codec);
        if(a.quality) args.push("-crf",String(Math.max(0,Math.round((100-a.quality)*.51))));
      }
      if(a.action==="audio_extract") args.push("-vn","-c:a",a.codec||"aac");
      if(a.action==="extract_frames") args.push("-vf",`fps=${a.fps||1}`);
      if(a.action==="gif") args.push("-vf",`fps=${a.fps||12},scale=${a.width||640}:-1:flags=lanczos`);
      args.push(...(a.args||[]),output);
    }
    const result=await runCli(ctx,command,args,{timeoutMs:900000});
    let bytes=null;
    try{bytes=(await fs.stat(output)).size;}catch{}
    return JSON.stringify({ok:result.exitCode===0,action:a.action,input:path.relative(ctx.cwd,input),output:path.relative(ctx.cwd,output),bytes,command:result.command,tail:result.output.slice(-4000)},null,2);
  }
});
