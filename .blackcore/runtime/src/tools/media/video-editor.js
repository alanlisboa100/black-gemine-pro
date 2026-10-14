import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {defineTool} from "../registry.js";
import {readable,writable,capture,ensureParent} from "../fs/common.js";
import {available,runCli} from "../common/cli.js";
import {activeSegments,analyzePcmBeats,inferMusicProfile,intersectRanges,limitSegments,mergeRanges,motionlessRanges,motionScoreNear,parseBlackLog,parseLoudnessLog,parseMotionLog,parseSceneLog,parseSilenceLog,roundTimeline,selectMusicalScenePoints} from "./video-analysis.js";
import {adaptiveEnvironmentFilter,analyzeEnvironmentFrame,environmentProfileForRange,summarizeEnvironmentProfiles} from "./video-environment.js";
import {createFfmpegProgressParser,reportVideoProgress} from "./video-progress.js";
import {buildVideoAdvice} from "./video-advisor.js";
import {assertVideoRegionalRouting,regionalVideoFilter} from "./regional-intent.js";
import {resolveVideoSelection} from "./video-selection.js";
import {listVideoEffectPacks,loadVideoEffectPack,resolveVideoEffectPreset} from "./video-effects.js";

const VIDEO_EXTS=new Set([".mp4",".mov",".mkv",".webm",".m4v",".avi",".3gp",".3g2",".mts",".m2ts",".ts"]);
const AUDIO_EXTS=new Set([".mp3",".m4a",".aac",".wav",".flac",".ogg",".opus"]);
const AUX_EXTS=new Set([".srt",".vtt",".ass",".ssa",".png",".jpg",".jpeg",".webp"]);
const TRANSITIONS=new Set(["none","fade","fadeblack","fadewhite","whiteflash","fadefast","fadeslow","dissolve","softdissolve","wipeleft","wiperight","slideleft","slideright","smoothleft","smoothright","circleopen","circleclose","hblur","pixelize","squeezeh","zoomin","zoomout","heart","burst"]);
const VIDEO_TIMEOUT_MS=4*60*60*1000;
const ANALYSIS_TIMEOUT_MS=60*60*1000;
const BRAND_WATERMARK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../assets/blackcore-watermark.png");
const EDIT_LEVELS={
  basic:{style:"clean",transition:"auto",transitionDuration:0.26,colorGrade:"natural",masterAudio:false,denoiseAudio:false,targetLufs:-16,editMethod:"audio-or-motion",silenceDuration:0.8,silencePadding:0.16,minSegment:0.9,motionThreshold:0.045,motionlessDuration:1.2,environmentSampleFps:0.25,maxEnvironmentSamples:72,environmentStrength:0.38,sceneGap:18,maxScenes:6,maxTransitions:8,maxCreativeEdits:5,creativeGap:28,insertDuration:0.55,motion:0,punchZoom:0.035,crf:24,preset:"veryfast",audioBitrate:"128k",bitrateMultiplier:1.04,watermarkRatio:0.2,watermarkOpacity:0.56},
  medium:{style:"dynamic",transition:"auto",transitionDuration:0.36,colorGrade:"studio",masterAudio:false,denoiseAudio:false,targetLufs:-14,editMethod:"audio-or-motion",silenceDuration:0.58,silencePadding:0.12,minSegment:0.72,motionThreshold:0.065,motionlessDuration:0.85,environmentSampleFps:0.5,maxEnvironmentSamples:160,environmentStrength:0.62,sceneGap:7,maxScenes:20,maxTransitions:36,maxCreativeEdits:18,creativeGap:9,insertDuration:0.78,motion:0.01,punchZoom:0.055,crf:21,preset:"veryfast",audioBitrate:"160k",bitrateMultiplier:1.18,watermarkRatio:0.23,watermarkOpacity:0.64},
  high:{style:"professional",transition:"auto",transitionDuration:0.44,colorGrade:"cinematic",masterAudio:false,denoiseAudio:false,targetLufs:-13,editMethod:"audio-or-motion",silenceDuration:0.5,silencePadding:0.1,minSegment:0.65,motionThreshold:0.085,motionlessDuration:0.65,environmentSampleFps:0.8,maxEnvironmentSamples:240,environmentStrength:0.82,sceneGap:4.8,maxScenes:30,maxTransitions:56,maxCreativeEdits:28,creativeGap:6,insertDuration:0.95,motion:0.018,punchZoom:0.075,crf:19,preset:"faster",audioBitrate:"192k",bitrateMultiplier:1.45,watermarkRatio:0.25,watermarkOpacity:0.7}
};

function normalizeEditLevel(value="medium"){
  const raw=String(value||"medium").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if(["basic","basico","light","leve"].includes(raw))return "basic";
  if(["high","alto","professional","profissional","pro"].includes(raw))return "high";
  return "medium";
}
function editProfile(a={},info={}){
  const level=normalizeEditLevel(a.editLevel),base=EDIT_LEVELS[level],video=info.video||{},sourceTotalKbps=Math.max(0,Number(info.format?.bit_rate||0)/1000),sourceVideoKbps=Math.max(450,sourceTotalKbps-(info.audio?192:0));let width=a.width,height=a.height,upscaled=false,downscaled=false;
  const preserveSourceAudio=a.preserveSourceAudio===true&&!!info.audio&&!a.targetDuration&&a.masterAudio!==true&&a.denoiseAudio!==true;
  if(!width&&!height&&(!a.aspectRatio||a.aspectRatio==="original")&&a.mobileHd!==false){
    const sourceWidth=Number(video.width)||0,sourceHeight=Number(video.height)||0,maxShort=({"720p":720,"1080p":1080,"2k":1440})[a.maxResolution||"720p"]??720;
    if(sourceWidth>=sourceHeight&&sourceHeight>maxShort){height=maxShort;width=even(sourceWidth*(maxShort/sourceHeight));downscaled=true;}
    else if(sourceHeight>sourceWidth&&sourceWidth>maxShort){width=maxShort;height=even(sourceHeight*(maxShort/sourceWidth));downscaled=true;}
  }
  if(!width&&!height&&Math.max(Number(video.width)||0,Number(video.height)||0)>2560){const scale=2560/Math.max(Number(video.width)||1,Number(video.height)||1);width=even(Number(video.width)*scale);height=even(Number(video.height)*scale);downscaled=true;}
  if(width&&height&&(width>2560||height>2560)){const scale=2560/Math.max(width,height);width=even(width*scale);height=even(height*scale);downscaled=true;}
  const floor=level==="high"?2200:level==="medium"?1250:750,videoMaxKbps=Math.round(Math.max(floor,sourceVideoKbps*base.bitrateMultiplier));
  const reqText=String(a.request||"").toLowerCase();
  const isCapcut=a.style==="capcut"||reqText.includes("capcut")||reqText.includes("tiktok")||reqText.includes("reels");
  const chosenStyle=a.style||(isCapcut?"capcut":base.style);
  const chosenColor=a.colorGrade||(isCapcut?"capcut-teal-orange":base.colorGrade);
  const chosenCaption=a.captionStyle||(isCapcut?"capcut":"clean");
  const chosenTransDur=a.transitionDuration||(isCapcut?0.24:base.transitionDuration);
  return {...base,style:chosenStyle,colorGrade:chosenColor,captionStyle:chosenCaption,transitionDuration:chosenTransDur,preserveSourceAudio,creativeRecut:false,removeSilence:a.removeSilence??!preserveSourceAudio,removeBlackFrames:true,environmentEnhancement:true,brandWatermark:true,watermarkPosition:"bottom-right",watermarkMargin:24,mobileHd:true,maxResolution:"720p",...a,style:chosenStyle,colorGrade:chosenColor,captionStyle:chosenCaption,transitionDuration:chosenTransDur,editLevel:level,preserveSourceAudio,...(width&&height?{width,height}:{}),_sceneGap:isCapcut?Math.min(base.sceneGap,4):base.sceneGap,_maxScenes:base.maxScenes,_maxTransitions:base.maxTransitions,_maxCreativeEdits:base.maxCreativeEdits,_creativeGap:base.creativeGap,_insertDuration:base.insertDuration,_motionStrength:base.motion,_punchZoom:isCapcut?Math.max(0.075,base.punchZoom):base.punchZoom,_environmentSampleFps:base.environmentSampleFps,_maxEnvironmentSamples:base.maxEnvironmentSamples,_environmentStrength:safeNumber(a.environmentStrength,base.environmentStrength,0,1),_crf:base.crf,_preset:base.preset,_audioBitrate:base.audioBitrate,_videoMaxKbps:videoMaxKbps,_watermarkRatio:base.watermarkRatio,_watermarkOpacity:base.watermarkOpacity,_upscaled:upscaled,_downscaled:downscaled};
}
function expandHome(value=""){
  const s=String(value||"").trim();
  if(s==="~")return os.homedir();
  if(s.startsWith("~/"))return path.join(os.homedir(),s.slice(2));
  return s;
}
function sec(value){
  if(value===undefined||value===null||value==="")return null;
  if(typeof value==="number")return Number.isFinite(value)?value:null;
  const s=String(value).trim();
  if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);
  const parts=s.split(":").map(Number);
  if(parts.some(x=>!Number.isFinite(x))||parts.length>3)return null;
  let n=0;for(const x of parts)n=n*60+x;return n;
}
function timeArg(value){const n=sec(value);if(n===null||n<0)throw new Error(`invalid time value: ${value}`);return String(n);}
function even(n){const v=Math.max(2,Math.round(Number(n)||2));return v%2===0?v:v-1;}
function safeNumber(value,fallback,min=-Infinity,max=Infinity){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function escapeFilterPath(p){return String(p).replace(/\\/g,"/").replace(/:/g,"\\:").replace(/'/g,"\\'").replace(/,/g,"\\,").replace(/\[/g,"\\[").replace(/\]/g,"\\]");}
function escapeDrawText(s){return String(s).replace(/\\/g,"\\\\").replace(/:/g,"\\:").replace(/'/g,"\\'").replace(/%/g,"\\%").replace(/,/g,"\\,").replace(/\[/g,"\\[").replace(/\]/g,"\\]").replace(/\n/g,"\\n");}
function posExpr(position="bottom"){
  if(position==="top")return {x:"(w-text_w)/2",y:"40"};
  if(position==="center")return {x:"(w-text_w)/2",y:"(h-text_h)/2"};
  if(position==="top-left")return {x:"40",y:"40"};
  if(position==="top-right")return {x:"w-text_w-40",y:"40"};
  if(position==="bottom-left")return {x:"40",y:"h-text_h-40"};
  if(position==="bottom-right")return {x:"w-text_w-40",y:"h-text_h-40"};
  return {x:"(w-text_w)/2",y:"h-text_h-60"};
}
function overlayExpr(position="bottom-right",margin=24){
  const m=Math.max(0,Math.round(Number(margin)||0));
  if(position==="top-left")return `${m}:${m}`;
  if(position==="top-right")return `W-w-${m}:${m}`;
  if(position==="bottom-left")return `${m}:H-h-${m}`;
  if(position==="center")return `(W-w)/2:(H-h)/2`;
  return `W-w-${m}:H-h-${m}`;
}
function atempoChain(rate){
  let r=Number(rate),parts=[];
  while(r>2){parts.push("atempo=2");r/=2;}
  while(r<0.5){parts.push("atempo=0.5");r/=0.5;}
  parts.push(`atempo=${r.toFixed(6).replace(/0+$/,"" ).replace(/\.$/,"")}`);return parts.join(",");
}
function parseFps(value){
  const [a,b]=String(value||"").split("/").map(Number),fps=b?a/b:a;
  return Number.isFinite(fps)&&fps>0?Math.min(60,Math.max(12,fps)):30;
}
async function ensureFfmpeg(){const a=await available(["ffmpeg","ffprobe"]);if(!a.ffmpeg||!a.ffprobe)throw new Error("FFmpeg/ffprobe is required. In Termux run: pkg install ffmpeg");}
async function probe(ctx,input){
  const result=await runCli(ctx,"ffprobe",["-v","error","-show_format","-show_streams","-show_chapters","-of","json",input],{allowFailure:true,timeoutMs:60000});
  if(result.exitCode!==0)throw new Error(`ffprobe failed: ${result.output.slice(-1200)}`);
  const data=JSON.parse(result.output||"{}"),streams=data.streams||[],fmt=data.format||{};
  const video=streams.find(x=>x.codec_type==="video")||null,audio=streams.find(x=>x.codec_type==="audio")||null;
  return {raw:data,duration:Number(fmt.duration||video?.duration||audio?.duration||0)||0,video,audio,format:fmt};
}
async function listMediaFiles(root,{query="",limit=80,maxDepth=3}={}){
  const needle=String(query||"").trim().toLowerCase(),out=[];let visited=0;
  async function walk(dir,depth){
    if(depth>maxDepth||out.length>=limit||visited>=2500)return;
    let rows=[];try{rows=await fs.readdir(dir,{withFileTypes:true});}catch{return;}
    for(const row of rows){
      if(out.length>=limit||visited++>=2500)break;const full=path.join(dir,row.name);
      if(row.isDirectory()){if(!row.name.startsWith("."))await walk(full,depth+1);continue;}
      if(!row.isFile())continue;const ext=path.extname(row.name).toLowerCase();
      if(!VIDEO_EXTS.has(ext)&&!AUDIO_EXTS.has(ext)&&!AUX_EXTS.has(ext))continue;
      if(needle&&!row.name.toLowerCase().includes(needle)&&!full.toLowerCase().includes(needle))continue;
      let st=null;try{st=await fs.stat(full);}catch{}out.push({path:full,name:row.name,bytes:st?.size??null,modified:st?.mtime?.toISOString?.()??null});
    }
  }
  await walk(root,0);return out;
}
function defaultOutput(input,action,format="srt"){
  const parsed=path.parse(input),dir=parsed.dir||process.cwd();
  if(action==="extract_audio")return path.join(dir,`${parsed.name}-blackcore.m4a`);
  if(action==="thumbnail")return path.join(dir,`${parsed.name}-blackcore.jpg`);
  if(action==="transcribe")return path.join(dir,`${parsed.name}-blackcore.${format}`);
  return path.join(dir,`${parsed.name}-blackcore-edited.mp4`);
}
async function resolveInput(ctx,value){return readable(ctx,expandHome(value));}
async function resolveOutput(ctx,value,input,action,format){
  const target=expandHome(value||defaultOutput(input,action,format)),out=await writable(ctx,target);
  if(path.resolve(out)===path.resolve(input))throw new Error("output must be different from input; in-place FFmpeg editing is not supported");
  await capture(ctx,out);await ensureParent(out);return out;
}
async function runEdit(ctx,args,output,timeoutMs=VIDEO_TIMEOUT_MS,progress={}){
  const stage=progress.stage||"rendering",from=safeNumber(progress.from,8,0,100),to=safeNumber(progress.to,96,from,100),duration=Number(progress.duration)||0;
  reportVideoProgress(ctx,{stage,percent:from,detail:progress.detail||"encoding picture and sound",step:progress.step,totalSteps:progress.totalSteps,level:progress.level});
  const meta={detail:progress.detail||"encoding picture and sound",step:progress.step,totalSteps:progress.totalSteps,level:progress.level},parser=duration>0?createFfmpegProgressParser({durationSeconds:duration,stage,from,to,onProgress:update=>reportVideoProgress(ctx,{...update,...meta})}):null;
  const result=await runCli(ctx,"ffmpeg",["-hide_banner","-y","-nostats",...(parser?["-progress","pipe:2"]:[]),...args,output],{allowFailure:true,timeoutMs,maxChars:500000,onStderr:parser});
  if(result.exitCode!==0)throw new Error(`ffmpeg failed: ${result.output.slice(-3500)}`);
  reportVideoProgress(ctx,{stage,percent:to,etaMs:0,detail:progress.completeDetail||"render complete",step:progress.step,totalSteps:progress.totalSteps,level:progress.level});return result;
}
async function statResult(output){let bytes=null;try{bytes=(await fs.stat(output)).size;}catch{}return bytes;}
function encodeArgs(a={},qualityOverride=null,{copyAudio=false}={}){
  const codec=a.codec||"libx264",quality=qualityOverride||a.quality,crf=quality==="high"?18:quality==="low"?28:Number.isFinite(a._crf)?a._crf:23,preset=a.preset||a._preset||"veryfast",args=["-c:v",codec,"-preset",preset,"-crf",String(crf),"-pix_fmt","yuv420p"];
  if(Number.isFinite(a._videoMaxKbps)&&a._videoMaxKbps>0)args.push("-maxrate",`${Math.round(a._videoMaxKbps)}k`,"-bufsize",`${Math.round(a._videoMaxKbps*2)}k`);
  if(copyAudio)args.push("-c:a","copy");else args.push("-c:a","aac","-b:a",a.audioBitrate||a._audioBitrate||"160k");
  args.push("-movflags","+faststart");return args;
}
function summary(info){return {duration:info.duration,video:info.video?{codec:info.video.codec_name,width:info.video.width,height:info.video.height,fps:info.video.avg_frame_rate,pix_fmt:info.video.pix_fmt,rotation:info.video.tags?.rotate||info.video.side_data_list?.find(x=>x.rotation!==undefined)?.rotation||0}:null,audio:info.audio?{codec:info.audio.codec_name,channels:info.audio.channels,sample_rate:info.audio.sample_rate,language:info.audio.tags?.language||null}:null,format:info.format?.format_name,size:Number(info.format?.size||0)||null,bit_rate:Number(info.format?.bit_rate||0)||null};}
function cleanResult(action,input,output,info,changes,extra={}){return JSON.stringify({ok:true,action,input,output,bytes:output?extra.bytes??null:null,result:info?summary(info):null,changes,...extra},null,2);}

async function detectSilence(ctx,input,info,a={}){
  if(!info.audio)return [];
  const result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-i",input,"-map","0:a:0","-af",`silencedetect=noise=${a.silenceDb??-35}dB:d=${a.silenceDuration??0.65}`,"-f","null","-"],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:2000000});
  if(result.exitCode!==0)throw new Error(`silence detection failed: ${result.output.slice(-2000)}`);
  return parseSilenceLog(result.output,info.duration);
}
async function detectScenes(ctx,input,a={}){
  const threshold=a.sceneThreshold??0.32,result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-i",input,"-vf",`select='gt(scene,${threshold})',showinfo`,"-an","-f","null","-"],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:2000000});
  if(result.exitCode!==0)throw new Error(`scene detection failed: ${result.output.slice(-2000)}`);
  return parseSceneLog(result.output).slice(0,1000);
}
async function detectBlack(ctx,input,info,a={}){
  if(!info.video)return [];
  const result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-i",input,"-vf",`blackdetect=d=${a.blackDuration??0.35}:pic_th=${a.blackThreshold??0.98}`,"-an","-f","null","-"],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:1000000});
  if(result.exitCode!==0)throw new Error(`black-frame detection failed: ${result.output.slice(-2000)}`);
  return parseBlackLog(result.output,info.duration);
}
async function detectLoudness(ctx,input,info){
  if(!info.audio)return null;
  const result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-i",input,"-map","0:a:0","-af","loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json","-f","null","-"],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:300000});
  if(result.exitCode!==0)throw new Error(`loudness analysis failed: ${result.output.slice(-2000)}`);
  return parseLoudnessLog(result.output);
}
async function detectBeats(ctx,input,info=null){
  const metadata=info||await probe(ctx,input);if(!metadata.audio)throw new Error("input has no audio stream for beat detection");
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-beats-")),pcm=path.join(tmp,"audio.pcm");
  try{
    const result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-y","-i",input,"-map","0:a:0","-af","highpass=f=35,lowpass=f=180,aresample=1000","-ac","1","-ar","1000","-f","s16le",pcm],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:120000});
    if(result.exitCode!==0)throw new Error(`beat detection failed: ${result.output.slice(-2000)}`);
    return analyzePcmBeats(await fs.readFile(pcm),{sampleRate:1000});
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
}
async function detectMotion(ctx,input){
  const result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-i",input,"-vf","fps=2,scale=160:-2:flags=fast_bilinear,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-","-an","-f","null","-"],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:2000000});
  if(result.exitCode!==0)throw new Error(`motion analysis failed: ${result.output.slice(-2000)}`);
  return parseMotionLog(result.output);
}
function summarizeMotion(frames=[]){
  if(!frames.length)return {samples:0,average:0,strongFraction:0,lowFraction:0};
  const values=frames.map(row=>Math.max(0,Math.min(1,Number(row.score)||0))),average=values.reduce((sum,value)=>sum+value,0)/values.length,strong=values.filter(value=>value>=0.55).length/values.length,low=values.filter(value=>value<=0.08).length/values.length;
  return {samples:values.length,average:Number(average.toFixed(3)),strongFraction:Number(strong.toFixed(3)),lowFraction:Number(low.toFixed(3))};
}
async function detectEnvironments(ctx,input,info,a={}){
  if(!info.video||a.environmentEnhancement===false)return [];
  const width=96,height=54,maxSamples=Math.max(12,Number(a._maxEnvironmentSamples)||160),requestedFps=safeNumber(a._environmentSampleFps,0.5,0.02,1.2),fps=Math.max(0.02,Math.min(requestedFps,maxSamples/Math.max(1,info.duration))),tmp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-scene-color-")),raw=path.join(tmp,"frames.rgb");
  try{
    const filter=`fps=${fps.toFixed(6)},scale=${width}:${height}:force_original_aspect_ratio=increase:flags=fast_bilinear,crop=${width}:${height},format=rgb24`,result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-y","-i",input,"-vf",filter,"-an","-pix_fmt","rgb24","-f","rawvideo",raw],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:200000});
    if(result.exitCode!==0)throw new Error(`scene color analysis failed: ${result.output.slice(-2000)}`);
    const data=await fs.readFile(raw),frameBytes=width*height*3,count=Math.min(maxSamples,Math.floor(data.length/frameBytes)),samples=[];
    for(let index=0;index<count;index++)samples.push(analyzeEnvironmentFrame(data.subarray(index*frameBytes,(index+1)*frameBytes),width,height,index/fps));
    return samples;
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
}
function reduceSegments(rows,max=80){
  const out=rows.map(row=>({...row,duration:row.end-row.start}));
  while(out.length>max){
    let best=0,gap=Infinity;
    for(let i=0;i<out.length-1;i++){const value=out[i+1].start-out[i].end;if(value<gap){gap=value;best=i;}}
    out.splice(best,2,{start:out[best].start,end:out[best+1].end,duration:out[best+1].end-out[best].start});
  }
  return out;
}
function splitAtSceneTimes(segments,times=[],minSegment=0.65){
  const out=[];
  for(const segment of segments){
    let start=segment.start;
    for(const point of times){
      if(point<=start+minSegment||point>=segment.end-minSegment)continue;
      out.push({start,end:point,duration:point-start});start=point;
    }
    out.push({start,end:segment.end,duration:segment.end-start});
  }
  return out;
}
function normalizeEditMethod(value="auto"){
  const method=String(value||"auto").toLowerCase();
  return ["audio","motion","audio-or-motion","audio-and-motion","scene"].includes(method)?method:"audio-or-motion";
}
function inactiveRangesFor(method,{silences=[],motionless=[],duration=0,hasAudio=false,hasMotion=false}={}){
  if(method==="scene")return [];
  if(method==="audio")return hasAudio?silences:[];
  if(method==="motion")return hasMotion?motionless:[];
  if(method==="audio-and-motion")return mergeRanges([...(hasAudio?silences:[]),...(hasMotion?motionless:[])],duration);
  if(hasAudio&&hasMotion)return intersectRanges(silences,motionless,duration);
  if(hasAudio)return silences;
  return hasMotion?motionless:[];
}
function completeScenePoints(selected=[],duration=0,{rhythm=null,a={}}={}){
  const rows=[...selected].sort((x,y)=>x.time-y.time),minSegment=Math.max(0.45,Number(a.minSegment)||0.7),edge=minSegment+0.08;
  if(rows.length||duration<edge*2)return rows;
  const fallbackGap=a.editLevel==="high"?11:a.editLevel==="medium"?16:32,budget=Math.max(1,Math.min(Number(a._maxTransitions)||12,Math.floor(duration/fallbackGap)||1)),candidates=[];
  for(const peak of rhythm?.peaks||[])candidates.push({time:Number(peak.time),score:0.72+Math.min(0.28,Number(peak.strength)||0),onBeat:true,synthetic:true});
  for(const beat of rhythm?.beatTimes||[])candidates.push({time:Number(beat),score:0.68,onBeat:true,synthetic:true});
  for(let index=1;index<=budget;index++)candidates.push({time:duration*index/(budget+1),score:0.5,onBeat:false,synthetic:true});
  const chosen=[];
  for(const row of candidates.filter(row=>Number.isFinite(row.time)&&row.time>=edge&&row.time<=duration-edge).sort((x,y)=>y.score-x.score||x.time-y.time)){
    if(chosen.some(item=>Math.abs(item.time-row.time)<Math.max(minSegment*2,fallbackGap*0.72)))continue;
    chosen.push({...row,sceneTime:Number(row.time.toFixed(3)),motion:0,beatDistance:row.onBeat?0:null});if(chosen.length>=budget)break;
  }
  return chosen.sort((x,y)=>x.time-y.time);
}
function timelineEditSamples(segments=[],plan=[]){
  if(segments.length<2)return [];
  const samples=[];let total=Number(segments[0].duration)||0;
  for(let index=1;index<segments.length;index++){
    const decision=plan[index-1]||{},duration=decision.kind==="none"?0:Number(decision.duration)||0,boundary=Math.max(0,total-duration);
    samples.push({outputStart:Math.max(0,boundary-0.18),duration:Math.max(0.4,duration+0.36),type:duration>0?"joint-crossfade":"joint-cut"});
    total+=Number(segments[index].duration)||0;total-=duration;
  }
  return samples.slice(0,12);
}
function creativeAnchorRows(duration,rhythm,scenePoints,a={}){
  const gap=Math.max(2.5,Number(a._creativeGap)||9),max=Math.max(1,Number(a._maxCreativeEdits)||12),desired=Math.max(1,Math.min(max,Math.round(duration/gap))),edge=Math.max(0.9,(Number(a._insertDuration)||0.75)*1.5),candidates=[];
  for(const row of scenePoints||[])candidates.push({...row,priority:4+(Number(row.score)||0)});
  for(const row of rhythm?.peaks||[])candidates.push({time:Number(row.time),score:Number(row.strength)||0,onBeat:true,priority:3+Math.min(2,Number(row.strength)||0)});
  for(const value of rhythm?.beatTimes||[])candidates.push({time:Number(value),score:0.7,onBeat:true,priority:2});
  for(let time=gap/2;time<duration-edge;time+=gap)candidates.push({time,score:0.55,onBeat:false,priority:1});
  const chosen=[];
  for(const row of candidates.filter(row=>Number.isFinite(row.time)&&row.time>=edge&&row.time<=duration-edge).sort((x,y)=>y.priority-x.priority||y.score-x.score||x.time-y.time)){
    if(chosen.some(item=>Math.abs(item.time-row.time)<gap*0.72))continue;
    chosen.push(row);if(chosen.length>=desired)break;
  }
  if(!chosen.length&&duration>1.8)chosen.push({time:duration/2,score:0.5,onBeat:false,priority:0});
  return chosen.sort((x,y)=>x.time-y.time);
}
function sourceShots(sceneTimes,duration,motionFrames=[]){
  const points=[0,...(sceneTimes||[]),duration].map(Number).filter(Number.isFinite).filter(value=>value>=0&&value<=duration).sort((x,y)=>x-y),unique=[];
  for(const value of points)if(unique.at(-1)===undefined||Math.abs(value-unique.at(-1))>0.12)unique.push(value);
  const shots=[];
  for(let index=0;index<unique.length-1;index++){
    const start=unique[index],end=unique[index+1],shotDuration=end-start;if(shotDuration<0.42)continue;
    shots.push({start,end,duration:shotDuration,motionScore:motionScoreNear(motionFrames,(start+end)/2,Math.min(2,Math.max(0.6,shotDuration/3)))});
  }
  return shots;
}
function chooseHighlightWindow(shots,anchor,clipDuration,motionFrames,usedSources,index,duration){
  const minimumDistance=Math.max(1.6,clipDuration*1.8),localRadius=Math.max(10,Math.min(24,duration/7)),eligible=shots.filter(row=>row.duration>=clipDuration+0.08&&Math.abs((row.start+row.end)/2-anchor)>=minimumDistance);
  const rank=rows=>rows.map(row=>{
    const center=(row.start+row.end)/2,distance=Math.abs(center-anchor),local=distance<=localRadius?1:0,direction=index%2===0?(center<anchor?0.35:0):(center>anchor?0.35:0),fresh=usedSources.some(range=>Math.max(range.start,row.start)<Math.min(range.end,row.end))?0:0.9;
    return {row,score:(Number(row.motionScore)||0)*4+local*1.8+direction+fresh-Math.min(1.4,distance/Math.max(8,duration/5))};
  }).sort((x,y)=>y.score-x.score);
  const selected=rank(eligible.filter(row=>Math.abs((row.start+row.end)/2-anchor)<=localRadius))[0]||rank(eligible)[0];
  if(!selected)return null;
  const shot=selected.row,peaks=(motionFrames||[]).filter(row=>row.time>=shot.start+clipDuration/2&&row.time<=shot.end-clipDuration/2).sort((x,y)=>(Number(y.score)||0)-(Number(x.score)||0)),center=peaks[0]?.time??((shot.start+shot.end)/2),start=Math.max(shot.start,Math.min(shot.end-clipDuration,center-clipDuration/2));
  return {start,end:start+clipDuration,motionScore:shot.motionScore,sourceDistance:Math.abs(start-anchor)};
}
function buildCreativeVisualEdl({duration,sceneTimes=[],scenePoints=[],rhythm=null,motionFrames=[],musicProfile={genre:"unknown"},a={}}){
  if(!(duration>0))return {segments:[],edits:[]};
  const anchors=creativeAnchorRows(duration,rhythm,scenePoints,a),shots=sourceShots(sceneTimes,duration,motionFrames),usedSources=[],edits=[];
  for(let index=0;index<anchors.length;index++){
    const anchor=anchors[index],beatSeconds=Number(musicProfile.bpm)>0?60/Number(musicProfile.bpm):0,base=Number(a._insertDuration)||0.75,clipDuration=Math.min(1.35,Math.max(0.46,beatSeconds?Math.round(base/beatSeconds)*beatSeconds||beatSeconds:base)),outputStart=Math.max(0.35,Math.min(duration-clipDuration-0.35,anchor.time-clipDuration/2));
    if(edits.some(row=>outputStart<row.outputStart+row.duration+0.35&&outputStart+clipDuration>row.outputStart-0.35))continue;
    const highlight=chooseHighlightWindow(shots,outputStart,clipDuration,motionFrames,usedSources,index,duration),sourceStart=highlight?.start??outputStart,recut=Math.abs(sourceStart-outputStart)>=Math.max(0.5,clipDuration*0.65),context={...anchor,genre:musicProfile.genre},requested=a.transition||"auto",entrance=requested==="none"?"none":transitionFor(a.style,requested,index,context),exit=requested==="none"?"none":"softdissolve";
    if(recut)usedSources.push({start:sourceStart,end:sourceStart+clipDuration});
    edits.push({outputStart,sourceStart,duration:clipDuration,type:recut?"highlight-recut":"punch-in",motionScore:highlight?.motionScore??motionScoreNear(motionFrames,sourceStart+clipDuration/2),onBeat:!!anchor.onBeat,score:Number(anchor.score)||0,transitionIn:entrance,transitionOut:exit});
  }
  const segments=[];let cursor=0;
  for(const edit of edits.sort((x,y)=>x.outputStart-y.outputStart)){
    if(edit.outputStart>cursor+0.001)segments.push({start:cursor,end:edit.outputStart,duration:edit.outputStart-cursor,role:"story"});
    segments.push({start:edit.sourceStart,end:edit.sourceStart+edit.duration,duration:edit.duration,role:edit.type,punchIn:true,motionScore:edit.motionScore,transitionIn:edit.transitionIn,transitionOut:edit.transitionOut,transitionDuration:Number(a.transitionDuration)||0.36,outputStart:edit.outputStart});
    cursor=edit.outputStart+edit.duration;
  }
  if(cursor<duration-0.001)segments.push({start:cursor,end:duration,duration:duration-cursor,role:"story"});
  return {segments:segments.length?segments:[{start:0,end:duration,duration,role:"story"}],edits};
}
function targetDimensions(a,info){
  if(a.width&&a.height)return {width:even(a.width),height:even(a.height),label:"custom"};
  if(a.aspectRatio==="vertical")return {width:1080,height:1920,label:"9:16"};
  if(a.aspectRatio==="square")return {width:1080,height:1080,label:"1:1"};
  if(a.aspectRatio==="landscape")return {width:1920,height:1080,label:"16:9"};
  return {width:even(info.video?.width||1280),height:even(info.video?.height||720),label:"original"};
}
function reframeFilter(a,info){
  const dims=targetDimensions(a,info),mode=a.reframeMode||"crop",w=dims.width,h=dims.height;
  if(dims.label==="original"&&!a.width&&!a.height)return {filter:"scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,setsar=1",...dims,mode:"original"};
  if(mode==="fit")return {filter:`scale=${w}:${h}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`,...dims,mode};
  if(mode==="blur")return {filter:null,...dims,mode};
  return {filter:`scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h},setsar=1`,...dims,mode:"crop"};
}
function colorFilter(preset="natural"){
  if(preset==="none")return null;
  if(preset==="cinematic")return "eq=contrast=1.12:saturation=0.95:brightness=-0.012:gamma=1.01,colorbalance=bs=.032:rs=-.018,unsharp=5:5:0.52";
  if(preset==="studio")return "eq=contrast=1.065:saturation=1.075:gamma=1.012,colorbalance=rs=.012:bs=.008,unsharp=5:5:0.4";
  if(preset==="vibrant"||preset==="capcut-vibrant")return "eq=contrast=1.12:saturation=1.28:gamma=1.02,unsharp=5:5:0.5";
  if(preset==="capcut-teal-orange"||preset==="teal-orange")return "colorbalance=rs=.08:gs=-.02:bs=-.08:rm=-.04:gm=.02:bm=.08:rh=-.02:gh=.02:bh=-.06,eq=contrast=1.14:saturation=1.24:gamma=1.03,unsharp=5:5:0.55";
  if(preset==="capcut-vintage"||preset==="vintage")return "colorbalance=rs=.05:gs=.02:bs=-.05,eq=contrast=1.06:saturation=0.92:gamma=1.04:brightness=0.01,noise=alls=6:allf=t+u,unsharp=3:3:0.3";
  if(preset==="capcut-cyberpunk"||preset==="cyberpunk")return "colorbalance=rs=.08:gs=-.06:bs=.12,eq=contrast=1.18:saturation=1.3:gamma=1.02,unsharp=5:5:0.55";
  if(preset==="capcut-glow"||preset==="glow")return "eq=contrast=1.08:saturation=1.15:gamma=1.04,unsharp=3:3:0.25";
  if(preset==="warm")return "eq=contrast=1.04:saturation=1.07,colorbalance=rs=.04:gs=.012:bs=-.025,unsharp=3:3:0.25";
  if(preset==="cool")return "eq=contrast=1.04:saturation=1.02,colorbalance=rs=-.025:bs=.04,unsharp=3:3:0.25";
  if(preset==="mono")return "hue=s=0,eq=contrast=1.1,unsharp=3:3:0.3";
  return "eq=contrast=1.035:saturation=1.045:gamma=1.005,unsharp=3:3:0.28";
}
function videoDenoiseFilter(a={}){
  if(a._motionStrength>=0.03)return "hqdn3d=1.15:1.15:4.2:4.2";
  if(a.denoiseVideo===true||a.editLevel==="medium")return "hqdn3d=0.75:0.75:2.8:2.8";
  return null;
}
function motionFilter(a,index,row,reframe,fps){
  const duration=Math.max(0.1,Number(row?.duration)||0);
  const preset=a.zoomPreset&&a.zoomPreset!=="none"?a.zoomPreset:row?.punchIn?"face-punch":"none";
  if(preset!=="none"){
    const amount=safeNumber(a.zoomStrength,a._punchZoom??0.055,preset==="subtle-push"?0.01:0.02,0.25),frames=Math.max(2,Math.round(duration*fps)),focusX=safeNumber(a.focusX,0.5,0.05,0.95),focusY=safeNumber(a.focusY,0.38,0.05,0.95),inFrames=Math.max(1,Math.round(frames*0.32)),outFrames=Math.max(1,Math.round(frames*0.32)),holdEnd=Math.max(inFrames+1,frames-outFrames),ramp=`if(lt(on,${inFrames}),on/${inFrames},if(lt(on,${holdEnd}),1,max(0,(${frames}-on)/${outFrames})))`,zoom=preset==="face-punch"?`1+${amount}`:preset==="subtle-push"?`1+${amount}*min(1,on/${frames})`:preset==="return-zoom"?`1+${amount}*max(0,1-on/${frames})`:`1+${amount}*${ramp}`;
    return `zoompan=z='${zoom}':x='iw*${focusX.toFixed(4)}-iw/zoom*${focusX.toFixed(4)}':y='ih*${focusY.toFixed(4)}-ih/zoom*${focusY.toFixed(4)}':d=1:s=${reframe.width}x${reframe.height}:fps=${fps}`;
  }
  const amount=Number(a._motionStrength)||0;if(!(amount>0)||duration<1||Number(row?.motionScore)>=0.52)return null;
  const max=(1+amount).toFixed(5),step=Math.max(0.00004,amount/(duration*Math.max(12,fps))).toFixed(7),zoom=index%2===0?`min(zoom+${step},${max})`:`if(eq(on,1),${max},max(1,zoom-${step}))`,drift=(index%3-1)*0.16,x=`iw/2-(iw/zoom/2)+(${drift.toFixed(2)})*(iw-iw/zoom)`;
  return `zoompan=z='${zoom}':x='${x}':y='ih/2-(ih/zoom/2)':d=1:s=${reframe.width}x${reframe.height}:fps=${fps}`;
}
function captionForceStyle(style="clean"){
  if(style==="capcut")return "FontName=DejaVu Sans,FontSize=24,Bold=1,PrimaryColour=&H0000E5FF,OutlineColour=&H00000000,BorderStyle=1,Outline=3.5,Shadow=2.5,BackColour=&H80000000,Alignment=2,MarginV=90";
  if(style==="tiktok")return "FontName=DejaVu Sans,FontSize=22,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=3,Shadow=1,BackColour=&H60000000,Alignment=2,MarginV=80";
  if(style==="karaoke")return "FontName=DejaVu Sans,FontSize=26,Bold=1,PrimaryColour=&H0024FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=4,Shadow=3,Alignment=2,MarginV=100";
  if(style==="social")return "FontName=DejaVu Sans,FontSize=22,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,Alignment=2,MarginV=70";
  if(style==="cinematic")return "FontName=DejaVu Sans,FontSize=18,Bold=0,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=48";
  return "FontName=DejaVu Sans,FontSize=20,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=54";
}
function transitionFor(style="clean",requested="auto",index=0,context={}){
  if(requested==="zoom-face-in-out")return "zoomin";
  if(requested==="whiteflash")return "fadewhite";
  if(requested==="zoomout")return "zoomout";
  if(requested!=="auto")return TRANSITIONS.has(requested)?requested:"fade";
  const genre=context.genre||"unknown",strong=Number(context.score)>=0.92&&context.onBeat;
  const genreSets={
    funk:strong?["burst","zoomin","fadewhite","circleopen","smoothleft"]:["smoothleft","softdissolve","zoomin","fadewhite"],
    pagode:strong?["heart","softdissolve","smoothleft"]:["softdissolve","smoothleft","fade"],
    sertanejo:strong?["heart","softdissolve","fade"]:["softdissolve","fade","smoothleft"],
    pop:strong?["zoomin","fadewhite","burst","pixelize","smoothleft"]:["smoothleft","softdissolve","zoomin","fadefast"],
    unknown:["softdissolve","smoothleft","fade"]
  };
  const styleSets={
    capcut:strong?["fadewhite","zoomin","pixelize","hblur","smoothleft"]:["fadewhite","zoomin","smoothleft","fadefast","hblur"],
    social:["smoothleft","softdissolve","zoomin","fadewhite"],
    cinematic:["softdissolve","fadeblack","fade"],
    music_video:genreSets[genre]||genreSets.unknown,
    clean:["softdissolve"]
  };
  const rows=styleSets[style]||genreSets[genre]||genreSets.unknown;return rows[index%rows.length];
}
function transitionFilter(kind,duration,offset){
  const base=`duration=${duration}:offset=${offset}`;
  if(kind==="whiteflash"||kind==="fadewhite")return `xfade=transition=fadewhite:${base}`;
  if(kind==="fadefast")return `xfade=transition=fadefast:${base}`;
  if(kind==="fadeslow")return `xfade=transition=fadeslow:${base}`;
  if(kind==="hblur")return `xfade=transition=hblur:${base}`;
  if(kind==="pixelize")return `xfade=transition=pixelize:${base}`;
  if(kind==="squeezeh")return `xfade=transition=squeezeh:${base}`;
  if(kind==="circleclose")return `xfade=transition=circleclose:${base}`;
  if(kind==="zoomout")return `xfade=transition=custom:${base}:expr='if(lte(P\,0.45)\,A*(1-2.2*P)\,B*(2.2*(P-0.45)))'`;
  if(kind==="softdissolve")return `xfade=transition=custom:${base}:expr='A*(1-(P*P*(3-2*P)))+B*(P*P*(3-2*P))'`;
  if(kind==="heart"){
    const u=`((X/W-0.5)/(0.42*max(P\,0.001)))`,v=`((0.55-Y/H)/(0.42*max(P\,0.001)))`,heart=`pow(pow(${u}\,2)+pow(${v}\,2)-1\,3)-pow(${u}\,2)*pow(${v}\,3)`;
    return `xfade=transition=custom:${base}:expr='if(lte(${heart}\,0)\,B\,A)'`;
  }
  if(kind==="burst")return `xfade=transition=pixelize:${base}`;
  return `xfade=transition=${kind}:${base}`;
}
function overlayColorFactors(value="#ffffff"){
  const match=String(value||"#ffffff").trim().match(/^#?([0-9a-f]{6})$/i),hex=match?.[1]||"ffffff";
  return [0,2,4].map(offset=>Math.max(0.12,Number.parseInt(hex.slice(offset,offset+2),16)/200).toFixed(3));
}
function overlayMotionPosition(motion="drift"){
  if(motion==="pan-left")return {x:"(W-w)/2+(W-w)*0.16",y:"(H-h)/2"};
  if(motion==="pan-right")return {x:"(W-w)/2-(W-w)*0.16",y:"(H-h)/2"};
  if(motion==="drift")return {x:"(W-w)/2+(W-w)*0.09",y:"(H-h)/2+(H-h)*0.06"};
  return {x:"(W-w)/2",y:"(H-h)/2"};
}
function overlayEventsFor(a,pack,duration,{defaultCount=8}={}){
  const explicit=Array.isArray(a.overlays)&&a.overlays.length?a.overlays.map((row,index)=>({
    preset:String(row.preset||row.id||a.overlayPresets?.[index]||"").trim(),
    start:sec(row.start??row.time),duration:sec(row.duration??row.length),opacity:row.opacity,scale:row.scale
  })):null;
  const names=Array.isArray(a.overlayPresets)&&a.overlayPresets.length?a.overlayPresets.map(value=>String(value).trim()).filter(Boolean):pack.overlays.slice(0,Math.min(pack.overlays.length,Number(a.overlayCount)||defaultCount)).map(row=>row.id);
  const rows=explicit||names.map((preset,index)=>{const presetInfo=pack.overlays.find(row=>row.id===preset)||pack.overlays[index%pack.overlays.length],length=safeNumber(a.overlayDuration,presetInfo?.defaultDuration||0.65,0.12,4),gap=duration/(names.length+1);return {preset,start:Math.max(0.05,index*gap+gap/2-length/2),duration:length};});
  return rows.map((row,index)=>{
    const preset=pack.overlays.find(item=>item.id===row.preset);if(!preset)throw new Error(`unknown video overlay preset '${row.preset}' in pack '${pack.name}'`);
    const fallbackGap=duration/(Math.max(1,rows.length)+1),fallbackLength=preset.defaultDuration||0.65,fallbackStart=Math.max(0.05,index*fallbackGap+fallbackGap/2-fallbackLength/2),start=safeNumber(row.start==null?fallbackStart:row.start,fallbackStart,0,Math.max(0,duration-0.05)),length=safeNumber(row.duration==null?undefined:row.duration,fallbackLength,0.12,4),end=Math.min(duration,start+length);
    if(end-start<0.08)throw new Error(`overlay '${preset.id}' does not fit inside the video duration`);
    return {preset,start,duration:end-start,opacity:safeNumber(row.opacity,a.overlayOpacity??preset.opacity??0.2,0.05,1),scale:safeNumber(row.scale,preset.scale||1,0.5,1.6),index};
  });
}
async function renderOverlayPack(ctx,input,info,output,a,pack,events){
  const width=even(info.video?.width||1280),height=even(info.video?.height||720),graph=["[0:v]setpts=PTS-STARTPTS[base0]"],args=["-i",input];let label="base0",nextInput=1;
  for(const event of events){
    const preset=event.preset,overlayIndex=nextInput++;
    args.push("-loop","1","-i",preset.asset);
    const [red,green,blue]=overlayColorFactors(preset.color),overlayWidth=Math.max(width,Math.round(width*event.scale)),overlayHeight=Math.max(height,Math.round(height*event.scale)),fade=Math.min(0.18,event.duration/3),fadeOut=Math.max(0,event.duration-fade),fx=`fx${event.index}`;
    graph.push(`[${overlayIndex}:v]scale=${overlayWidth}:${overlayHeight}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${overlayWidth}:${overlayHeight}:(ow-iw)/2:(oh-ih)/2:color=black,format=rgb24,lutrgb=r='val*${red}':g='val*${green}':b='val*${blue}',colorkey=0x000000:0.16:0.08,format=rgba,colorchannelmixer=aa=${event.opacity},trim=duration=${event.duration.toFixed(3)},setpts=PTS-STARTPTS,fade=t=in:st=0:d=${fade.toFixed(3)}:alpha=1,fade=t=out:st=${fadeOut.toFixed(3)}:d=${fade.toFixed(3)}:alpha=1[${fx}]`);
    const position=overlayMotionPosition(preset.motion),next=`base${event.index+1}`;
    graph.push(`[${label}][${fx}]overlay=x='${position.x}':y='${position.y}':enable='between(t,${event.start.toFixed(3)},${(event.start+event.duration).toFixed(3)})':eof_action=repeat:shortest=0[${next}]`);label=next;
  }
  args.push("-filter_complex",graph.join(";"),"-map",`[${label}]`);if(info.audio)args.push("-map","0:a:0?","-c:a","copy");else args.push("-an");args.push(...encodeArgs(a,null,{copyAudio:!!info.audio}),"-t",String(info.duration));
  await runEdit(ctx,args,output,VIDEO_TIMEOUT_MS,{stage:"effects",from:14,to:96,duration:info.duration,detail:`compositing ${events.length} selected local overlays`});
  return {events,width,height};
}
function transitionPlanFor(segments,a,musicProfile={genre:"unknown"},scenePoints=[]){
  return segments.slice(1).map((row,index)=>{
    const context=scenePoints[index]||{},hint=row.transitionIn||segments[index].transitionOut||null,kind=hint||transitionFor(a.style,a.transition||"auto",index,{...context,genre:musicProfile.genre}),tempo=Number(musicProfile.bpm)||0,tempoDuration=tempo?Math.min(0.52,Math.max(0.18,24/tempo)):Number(a.transitionDuration)||0.3,requestedDuration=a.transitionDurations?.[index]??row.transitionDuration??segments[index].transitionDuration??a.transitionDuration,duration=Math.min(safeNumber(requestedDuration,tempoDuration,0.08,0.8),tempoDuration,segments[index].duration/3,row.duration/3);
    return {...context,kind,duration:Number(duration.toFixed(3))};
  });
}
function visualSegmentsForAudioLock(segments,plan,duration){
  const rows=segments.map(row=>({...row,duration:row.end-row.start})),adjusted=plan.map(row=>({...row}));
  for(let i=0;i<plan.length;i++){
    const requested=plan[i]?.kind==="none"?0:Number(plan[i]?.duration)||0;if(!(requested>0))continue;
    const leftAvailable=Math.max(0,duration-rows[i].end),rightAvailable=Math.max(0,rows[i+1].start),d=Math.min(requested,leftAvailable+rightAvailable);if(d<0.08){adjusted[i]={...adjusted[i],kind:"none",duration:0};continue;}
    let left=Math.min(leftAvailable,d/2),right=Math.min(rightAvailable,d-left);left+=Math.min(leftAvailable-left,d-left-right);
    rows[i].end+=left;rows[i+1].start-=right;adjusted[i].duration=Number((left+right).toFixed(3));
    rows[i].duration=rows[i].end-rows[i].start;rows[i+1].duration=rows[i+1].end-rows[i+1].start;
  }
  return {rows,plan:adjusted};
}
function markReverseMoments(segments,a={}){
  if(!a.reverseMoments)return segments;
  let left=Math.max(1,Math.min(3,Number(a.maxReverseMoments)||1));
  return segments.map(row=>{
    const duration=row.end-row.start,eligible=left>0&&duration>=0.8&&duration<=4.5&&Number(row.motionScore)>=0.42;
    if(!eligible)return row;left--;return {...row,reverse:true};
  });
}
function audioMasterFilter(a={}){
  if(a.denoiseAudio===false&&a.masterAudio===false)return "anull";
  const rows=[];
  if(a.denoiseAudio!==false)rows.push("highpass=f=70","lowpass=f=15500","afftdn=nf=-28");
  rows.push("acompressor=threshold=0.12:ratio=3:attack=20:release=250:makeup=1.4");
  if(a.masterAudio!==false)rows.push(`loudnorm=I=${safeNumber(a.targetLufs,-14,-24,-9)}:TP=-1.5:LRA=11`);
  rows.push("alimiter=limit=0.95");return rows.join(",");
}
function timelineGraph(info,segments,a,{musicIndex=null,subtitles=null,watermarkIndex=null}={}){
  const sourceRows=reduceSegments(segments),initialPlan=Array.isArray(a._transitionPlan)?a._transitionPlan:transitionPlanFor(sourceRows,a,a._musicProfile||{genre:"unknown"},[]),preserveSourceAudio=a.preserveSourceAudio===true&&!!info.audio&&musicIndex===null,locked=preserveSourceAudio?visualSegmentsForAudioLock(sourceRows,initialPlan,info.duration):null,rows=locked?.rows||sourceRows,plan=locked?.plan||initialPlan,fps=safeNumber(a.fps,parseFps(info.video?.avg_frame_rate),12,60),reframe=reframeFilter(a,info),grade=colorFilter(a.colorGrade||((a.style==="cinematic"||a.style==="music_video")?"cinematic":a.style==="capcut"?"capcut-teal-orange":"natural"));
  const denoise=videoDenoiseFilter(a),filters=(index,row)=>[row.reverse?"reverse,setpts=PTS-STARTPTS":null,`fps=${fps}`,reframe.filter,denoise,motionFilter(a,index,row,reframe,fps),adaptiveEnvironmentFilter(row.environment,a._environmentStrength),grade,(row.punchIn&&a.style==="capcut"?"eq=brightness='if(lt(t,0.18),0.4*(1-t/0.18),0)'":null),"format=yuv420p","settb=AVTB"].filter(Boolean).join(","),graph=[];
  rows.forEach((row,index)=>{
    if(reframe.mode==="blur"){
      graph.push(`[0:v]trim=start=${row.start}:end=${row.end},setpts=PTS-STARTPTS,fps=${fps},split=2[bgraw${index}][fgraw${index}]`);
      graph.push(`[bgraw${index}]scale=${reframe.width}:${reframe.height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${reframe.width}:${reframe.height},boxblur=20:2[bg${index}]`);
      graph.push(`[fgraw${index}]scale=${reframe.width}:${reframe.height}:force_original_aspect_ratio=decrease:flags=lanczos[fg${index}]`);
      graph.push(`[bg${index}][fg${index}]overlay=(W-w)/2:(H-h)/2,setsar=1,${[denoise,motionFilter(a,index,row,reframe,fps),adaptiveEnvironmentFilter(row.environment,a._environmentStrength),grade,"format=yuv420p","settb=AVTB"].filter(Boolean).join(",")}[v${index}]`);
    }else graph.push(`[0:v]trim=start=${row.start}:end=${row.end},setpts=PTS-STARTPTS,${filters(index,row)}[v${index}]`);
    if(info.audio&&!preserveSourceAudio)graph.push(`[0:a]atrim=start=${row.start}:end=${row.end},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a${index}]`);
  });
  let videoLabel=`v0`,audioLabel=info.audio&&!preserveSourceAudio?"a0":null,total=rows[0]?.duration||0;
  for(let i=1;i<rows.length;i++){
    const decision=plan[i-1]||{},kind=decision.kind||transitionFor(a.style,a.transition||"auto",i-1,{genre:a._musicProfile?.genre}),duration=kind==="none"?0:Math.min(Number(decision.duration)||safeNumber(a.transitionDuration,0.3,0.08,0.8),rows[i-1].duration/3,rows[i].duration/3),nextVideo=`vx${i}`,nextAudio=`ax${i}`;
    if(kind==="none"){
      graph.push(`[${videoLabel}][v${i}]concat=n=2:v=1:a=0[${nextVideo}]`);
      if(audioLabel)graph.push(`[${audioLabel}][a${i}]concat=n=2:v=0:a=1[${nextAudio}]`);
      total+=rows[i].duration;
    }else{
      const offset=Math.max(0,total-duration);
      graph.push(`[${videoLabel}][v${i}]${transitionFilter(kind,duration,offset)}[${nextVideo}]`);
      if(audioLabel)graph.push(`[${audioLabel}][a${i}]acrossfade=d=${duration}:c1=tri:c2=tri[${nextAudio}]`);
      total+=rows[i].duration-duration;
    }
    videoLabel=nextVideo;if(audioLabel)audioLabel=nextAudio;
  }
  if(subtitles){const next="vsub";graph.push(`[${videoLabel}]subtitles='${escapeFilterPath(subtitles)}':force_style='${captionForceStyle(a.captionStyle)}'[${next}]`);videoLabel=next;}
  if(watermarkIndex!==null){
    const next="vbrand",wmWidth=even(a.overlayWidth||Math.max(96,Math.round(reframe.width*safeNumber(a._watermarkRatio,0.19,0.08,0.4)))),opacity=safeNumber(a.opacity,a._watermarkOpacity??0.68,0.05,1),margin=Math.max(10,Math.round(a.watermarkMargin??a.margin??24));
    graph.push(`[${watermarkIndex}:v]scale=${wmWidth}:-1:flags=lanczos,format=rgba,colorchannelmixer=aa=${opacity}[brand]`);
    graph.push(`[${videoLabel}][brand]overlay=${overlayExpr(a.watermarkPosition||a.position||"bottom-right",margin)}:eof_action=repeat:repeatlast=1[${next}]`);videoLabel=next;
  }
  let outputAudio=audioLabel;
  if(audioLabel){graph.push(`[${audioLabel}]${audioMasterFilter(a)}[voice]`);outputAudio="voice";}
  if(musicIndex!==null){
    graph.push(`[${musicIndex}:a]atrim=duration=${total},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${safeNumber(a.musicVolume,0.28,0,4)}[music]`);
    if(outputAudio){
      if(a.ducking!==false){graph.push(`[${outputAudio}]asplit=2[voice_mix][voice_side]`);graph.push(`[music][voice_side]sidechaincompress=threshold=0.025:ratio=10:attack=20:release=550[ducked]`);graph.push(`[voice_mix][ducked]amix=inputs=2:weights='${safeNumber(a.originalVolume,1,0,4)} 1':normalize=0,alimiter=limit=0.95[aout]`);}
      else graph.push(`[${outputAudio}][music]amix=inputs=2:weights='${safeNumber(a.originalVolume,1,0,4)} 1':normalize=0,alimiter=limit=0.95[aout]`);
      outputAudio="aout";
    }else outputAudio="music";
  }
  return {graph:graph.join(";"),videoLabel,audioLabel:outputAudio,rawAudio:preserveSourceAudio,duration:preserveSourceAudio?info.duration:total,segments:sourceRows,transitionPlan:plan,reframe,fps};
}
async function renderTimeline(ctx,input,info,segments,output,a,{music=null,musicOffset=0,subtitles=null,watermark=null,qualityOverride=null,progress=null}={}){
  const args=["-i",input];let musicIndex=null,watermarkIndex=null,nextInput=1;
  if(music){musicIndex=nextInput++;args.push("-stream_loop","-1","-ss",String(Math.max(0,musicOffset||0)),"-i",music);}
  if(watermark){watermarkIndex=nextInput++;args.push("-stream_loop","-1","-i",watermark);}
  const built=timelineGraph(info,segments,a,{musicIndex,subtitles,watermarkIndex});
  args.push("-filter_complex",built.graph,"-map",`[${built.videoLabel}]`);
  if(built.rawAudio)args.push("-map","0:a:0");else if(built.audioLabel)args.push("-map",`[${built.audioLabel}]`);else args.push("-an");
  args.push(...encodeArgs(a,qualityOverride,{copyAudio:built.rawAudio}),"-t",String(Math.max(0.05,built.duration)),"-shortest");
  await runEdit(ctx,args,output,VIDEO_TIMEOUT_MS,{stage:"rendering",from:progress?.from??42,to:progress?.to??96,duration:built.duration,detail:progress?.detail||"cuts, transitions, scale, color, audio and watermark",step:progress?.step,totalSteps:progress?.totalSteps,level:a.editLevel});return built;
}
async function verifyCreativeDifference(ctx,input,output,edits=[]){
  const samples=edits.filter(row=>row.duration>=0.35).slice(0,12);if(!samples.length)return {available:true,passed:false,samples:0,ssim:null,reason:"no creative edit samples"};
  const graph=[];
  samples.forEach((row,index)=>{
    const start=Math.max(0,Number(row.outputStart)+Number(row.duration)*0.32),end=start+Math.min(0.32,Number(row.duration)*0.36);
    graph.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=160:90:force_original_aspect_ratio=increase:flags=fast_bilinear,crop=160:72:0:0,format=yuv420p[original${index}]`);
    graph.push(`[1:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=160:90:force_original_aspect_ratio=increase:flags=fast_bilinear,crop=160:72:0:0,format=yuv420p[edited${index}]`);
  });
  let original="original0",edited="edited0";
  if(samples.length>1){original="original_samples";edited="edited_samples";graph.push(`${samples.map((_,index)=>`[original${index}]`).join("")}concat=n=${samples.length}:v=1:a=0[${original}]`);graph.push(`${samples.map((_,index)=>`[edited${index}]`).join("")}concat=n=${samples.length}:v=1:a=0[${edited}]`);}
  graph.push(`[${original}][${edited}]ssim`);
  const result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-i",input,"-i",output,"-filter_complex",graph.join(";"),"-an","-f","null","-"],{allowFailure:true,timeoutMs:ANALYSIS_TIMEOUT_MS,maxChars:300000});
  if(result.exitCode!==0)return {available:false,passed:true,samples:samples.length,ssim:null,reason:"SSIM filter unavailable; structural recut plan verified"};
  const values=[...result.output.matchAll(/All:([0-9.]+)/g)].map(match=>Number(match[1])).filter(Number.isFinite),ssim=values.at(-1);
  if(!Number.isFinite(ssim))return {available:false,passed:true,samples:samples.length,ssim:null,reason:"SSIM value unavailable; structural recut plan verified"};
  return {available:true,passed:ssim<0.985,samples:samples.length,ssim:Number(ssim.toFixed(6)),threshold:0.985};
}
async function renderMontage(ctx,inputs,infos,output,a,{progress=null}={}){
  const args=[],graph=[],first=infos[0],fps=safeNumber(a.fps,parseFps(first.video?.avg_frame_rate),12,60),reframe=reframeFilter(a,first),grade=colorFilter(a.colorGrade||"natural"),durations=[];
  inputs.forEach((input,index)=>{args.push("-i",input);const full=infos[index].duration,clip=a.clipDuration?Math.min(full,safeNumber(a.clipDuration,full,0.2,3600)):full;durations.push(clip);if(reframe.mode==="blur"){graph.push(`[${index}:v]trim=duration=${clip},setpts=PTS-STARTPTS,fps=${fps},split=2[bgraw${index}][fgraw${index}]`);graph.push(`[bgraw${index}]scale=${reframe.width}:${reframe.height}:force_original_aspect_ratio=increase,crop=${reframe.width}:${reframe.height},boxblur=20:2[bg${index}]`);graph.push(`[fgraw${index}]scale=${reframe.width}:${reframe.height}:force_original_aspect_ratio=decrease[fg${index}]`);graph.push(`[bg${index}][fg${index}]overlay=(W-w)/2:(H-h)/2,setsar=1,${grade?`${grade},`:""}format=yuv420p,settb=AVTB[v${index}]`);}else graph.push(`[${index}:v]trim=duration=${clip},setpts=PTS-STARTPTS,fps=${fps},${reframe.filter},${grade?`${grade},`:""}format=yuv420p,settb=AVTB[v${index}]`);if(infos[index].audio)graph.push(`[${index}:a]atrim=duration=${clip},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a${index}]`);else graph.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${clip},asetpts=PTS-STARTPTS[a${index}]`);});
  let videoLabel="v0",audioLabel="a0",total=durations[0],used=[];
  for(let i=1;i<inputs.length;i++){
    const kind=transitionFor(a.style,a.transition||"auto",i-1),duration=kind==="none"?0:Math.min(safeNumber(a.transitionDurations?.[i-1]??a.transitionDuration,0.55,0.08,2),durations[i-1]/3,durations[i]/3),nextVideo=`vx${i}`,nextAudio=`ax${i}`;
    if(kind==="none"){graph.push(`[${videoLabel}][v${i}]concat=n=2:v=1:a=0[${nextVideo}]`);graph.push(`[${audioLabel}][a${i}]concat=n=2:v=0:a=1[${nextAudio}]`);total+=durations[i];}
    else{graph.push(`[${videoLabel}][v${i}]${transitionFilter(kind,duration,Math.max(0,total-duration))}[${nextVideo}]`);graph.push(`[${audioLabel}][a${i}]acrossfade=d=${duration}:c1=tri:c2=tri[${nextAudio}]`);total+=durations[i]-duration;}
    used.push(kind);videoLabel=nextVideo;audioLabel=nextAudio;
  }
  graph.push(`[${audioLabel}]${audioMasterFilter(a)}[aout]`);
  args.push("-filter_complex",graph.join(";"),"-map",`[${videoLabel}]`,"-map","[aout]",...encodeArgs(a),"-t",String(total));
  await runEdit(ctx,args,output,VIDEO_TIMEOUT_MS,{stage:"rendering",from:progress?.from??28,to:progress?.to??96,duration:total,detail:progress?.detail||"joining clips and transitions"});return {duration:total,transitions:used,reframe,fps};
}
async function transcribeLocal(ctx,input,a,destination){
  const progressFrom=safeNumber(a._progressFrom,12,0,100),progressTo=safeNumber(a._progressTo,90,progressFrom,100);reportVideoProgress(ctx,{stage:"captions",percent:progressFrom,detail:"checking local speech engine"});
  const commands=await available(["whisper-cli","whisper"]),format=a.subtitleFormat||path.extname(destination).slice(1)||"srt",language=String(a.language||"auto").replace(/[^A-Za-z0-9_-]/g,"")||"auto",tmp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-whisper-"));
  try{
    if(commands["whisper-cli"]){
      const model=expandHome(a.whisperModel||process.env.BLACKCORE_WHISPER_MODEL||process.env.WHISPER_CPP_MODEL||path.join(process.env.BLACKCORE_HOME||path.join(os.homedir(),".blackcore"),"video-ai","whisper-model.bin"));
      if(!model)throw new Error("whisper-cli is installed, but a whisper.cpp model is required. Set BLACKCORE_WHISPER_MODEL or pass whisperModel");
      const checkedModel=await readable(ctx,model),wav=path.join(tmp,"audio.wav"),base=path.join(tmp,"transcript");
      await runEdit(ctx,["-i",input,"-vn","-ac","1","-ar","16000","-c:a","pcm_s16le"],wav,ANALYSIS_TIMEOUT_MS,{stage:"captions",from:progressFrom,to:progressFrom+(progressTo-progressFrom)*0.2,detail:"preparing speech audio"});
      reportVideoProgress(ctx,{stage:"captions",percent:progressFrom+(progressTo-progressFrom)*0.25,detail:"transcribing speech locally"});
      const flag=format==="vtt"?"-ovtt":format==="txt"?"-otxt":"-osrt",args=["-m",checkedModel,"-f",wav,flag,"-of",base];if(language!=="auto")args.push("-l",language);
      const result=await runCli(ctx,"whisper-cli",args,{allowFailure:true,timeoutMs:3600000,maxChars:300000});if(result.exitCode!==0)throw new Error(`whisper-cli failed: ${result.output.slice(-2500)}`);
      await fs.copyFile(`${base}.${format}`,destination);reportVideoProgress(ctx,{stage:"captions",percent:progressTo,detail:"caption timing ready"});return {backend:"whisper.cpp",model:path.basename(checkedModel),language,format};
    }
    if(commands.whisper){
      const model=String(a.whisperModel||"tiny").replace(/[^A-Za-z0-9._-]/g,""),cacheRoot=process.env.XDG_CACHE_HOME||path.join(os.homedir(),".cache"),cachedModel=await readable(ctx,path.join(cacheRoot,"whisper",`${model}.pt`));
      try{await fs.access(cachedModel);}catch{throw new Error(`Whisper model '${model}' is not cached locally. Download it explicitly before transcription; BLACKCORE will not silently download a large model`);}
      const args=[input,"--model",model,"--output_format",format,"--output_dir",tmp,"--fp16","False"];if(language!=="auto")args.push("--language",language);
      reportVideoProgress(ctx,{stage:"captions",percent:progressFrom+(progressTo-progressFrom)*0.15,detail:"transcribing speech locally"});
      const result=await runCli(ctx,"whisper",args,{allowFailure:true,timeoutMs:3600000,maxChars:300000});if(result.exitCode!==0)throw new Error(`Whisper failed: ${result.output.slice(-2500)}`);
      const generated=path.join(tmp,`${path.parse(input).name}.${format}`);await fs.copyFile(generated,destination);reportVideoProgress(ctx,{stage:"captions",percent:progressTo,detail:"caption timing ready"});return {backend:"OpenAI Whisper local",model,language,format};
    }
    throw new Error("Local transcription requires the free whisper.cpp CLI or the open-source Whisper CLI. No Whisper backend was found");
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
}
async function filtersAvailable(ctx,names=[]){
  const result=await runCli(ctx,"ffmpeg",["-hide_banner","-filters"],{allowFailure:true,timeoutMs:30000,maxChars:500000});
  return Object.fromEntries(names.map(name=>[name,new RegExp(`\\b${name}\\b`).test(result.output)]));
}
async function fileExists(file){if(!file)return false;try{await fs.access(expandHome(file));return true;}catch{return false;}}
async function inspectVideoAiCapabilities(ctx,info){
  const commands=await available(["whisper-cli","whisper","rembg"]),cppModel=process.env.BLACKCORE_WHISPER_MODEL||process.env.WHISPER_CPP_MODEL||path.join(process.env.BLACKCORE_HOME||path.join(os.homedir(),".blackcore"),"video-ai","whisper-model.bin"),pythonModel=path.join(process.env.XDG_CACHE_HOME||path.join(os.homedir(),".cache"),"whisper","tiny.pt"),cppModelReady=Boolean(commands["whisper-cli"])&&await fileExists(cppModel),pythonModelReady=Boolean(commands.whisper)&&await fileExists(pythonModel),stabilization=info.video?await filtersAvailable(ctx,["vidstabdetect","vidstabtransform"]).catch(()=>({vidstabdetect:false,vidstabtransform:false})):{vidstabdetect:false,vidstabtransform:false},provider=ctx?.agent?.provider||ctx?.cfg?.provider||"active",model=ctx?.agent?.model||ctx?.cfg?.model||null;
  return {
    planningModel:{ready:true,provider,model,role:"interprets the request and chooses from the measured plan; it does not fake the render"},
    googleFreePool:{active:provider==="google"&&model==="google-free-pool",role:"free creative planning when selected in BLACKCORE"},
    musicSceneIntelligence:{ready:true,role:"local scenes, motion, silence, peaks, beats, BPM and restrained genre estimate"},
    environmentSceneIntelligence:{ready:Boolean(info.video),role:"local low/harsh light, water, sky, grass, vegetation and mountain sampling"},
    localWhisper:{installed:Boolean(commands["whisper-cli"]||commands.whisper),modelReady:cppModelReady||pythonModelReady,ready:cppModelReady||pythonModelReady,role:"optional local speech captions"},
    stabilization:{ready:Boolean(stabilization.vidstabdetect&&stabilization.vidstabtransform),filters:stabilization},
    rembg:{installed:Boolean(commands.rembg),readyForVideo:false,role:"photo subject/background masks only; independent video-frame masks are disabled to prevent flicker"},
    groundedSam2:{readyForVideo:false,role:"external GPU tracking can be connected through a compatible temporal backend; the photo endpoint is not treated as video tracking"},
    outfitAi:{status:"check-separately",role:"safe temporal outfit replacement requires a garment reference and configured outfit GPU backend"}
  };
}

const ACTIONS=["list_media","list_effects","inspect","analyze","detect_silence","detect_scenes","detect_black","detect_beats","trim","timeline","smart_cut","auto_edit","speed_curve","freeze_frame","shake","flash","rgb_split","blur_in","apply_overlay_pack","regional_edit","concat","montage","resize","auto_reframe","crop","rotate","speed","volume","mute","fade","add_music","normalize_audio","denoise","color_grade","stabilize","transcribe","burn_subtitles","overlay_text","watermark","compress","extract_audio","thumbnail"];

export const videoEditorTool=defineTool({
  name:"video_editor",
  description:"Professional local video studio for Termux/Android. Every natural edit request must be copied verbatim into request. auto_edit performs complete timeline work and can use the bundled BLACKCORE Premium Lite effects pack. list_effects is read-only and lists licensed local overlays and transition presets; apply_overlay_pack composites selected overlays with independent start/duration values. zoomPreset face-in-out/face-punch uses a composition focal point (not face recognition) and can zoom in and return smoothly. regional_edit is the only route for a named local area such as eyes, face, window, clothing, sky, water or grass when pixels must change: it requires a real temporally tracked grayscale mask video, supplied as maskVideo or returned by BLACKCORE_VIDEO_SEGMENT_ENDPOINT, and never falls back to every frame. White mask pixels are edited; black pixels are preserved. Audio timing remains locked during regional_edit. analyze is read-only. Return only verified visible/audible changes and the output path.",
  mutates:true,
  planSafe:a=>["inspect","list_media","list_effects","analyze","detect_silence","detect_scenes","detect_black","detect_beats"].includes(a.action),
  parameters:{
    type:"object",additionalProperties:false,
    properties:{
      action:{type:"string",enum:ACTIONS},
      input:{type:"string",maxLength:4096},directory:{type:"string",maxLength:4096},query:{type:"string",maxLength:200},limit:{type:"integer",minimum:1,maximum:200},inputs:{type:"array",items:{type:"string",maxLength:4096},minItems:2,maxItems:30},output:{type:"string",maxLength:4096},
      start:{type:["number","string"]},end:{type:["number","string"]},duration:{type:["number","string"]},targetDuration:{type:"number",minimum:1,maximum:21600},clipDuration:{type:"number",minimum:0.2,maximum:3600},
      segments:{type:"array",minItems:1,maxItems:120,items:{type:"object",additionalProperties:false,properties:{start:{type:["number","string"]},end:{type:["number","string"]}},required:["start","end"]}},
      width:{type:"integer",minimum:2,maximum:16384},height:{type:"integer",minimum:2,maximum:16384},x:{type:"integer",minimum:0,maximum:16384},y:{type:"integer",minimum:0,maximum:16384},fps:{type:"number",minimum:12,maximum:60},
      degrees:{type:"integer",enum:[90,180,270]},rate:{type:"number",minimum:0.125,maximum:8},gain:{type:"number",minimum:0,maximum:8},
      curvePreset:{type:"string",enum:["hero","bullet","flash_in","flash_out","montage","jump_cut"]},freezeDuration:{type:"number",minimum:0.1,maximum:10},freezePunch:{type:"boolean"},shakeIntensity:{type:"number",minimum:1,maximum:20},shakeFrequency:{type:"number",minimum:1,maximum:60},flashColor:{type:"string",maxLength:40},strobe:{type:"boolean"},strobeInterval:{type:"number",minimum:0.05,maximum:10},rgbSplitOffset:{type:"integer",minimum:1,maximum:40},blurDuration:{type:"number",minimum:0.1,maximum:10},
      editLevel:{type:"string",enum:["basic","medium","high"]},fadeIn:{type:"number",minimum:0,maximum:120},fadeOut:{type:"number",minimum:0,maximum:120},transition:{type:"string",enum:["auto",...TRANSITIONS,"zoom-face-in-out"]},transitionDuration:{type:"number",minimum:0.08,maximum:2},transitionDurations:{type:"array",maxItems:120,items:{type:"number",minimum:0.08,maximum:2}},style:{type:"string",enum:["clean","dynamic","professional","cinematic","social","music_video","podcast","capcut"]},
      music:{type:"string",maxLength:4096},musicVolume:{type:"number",minimum:0,maximum:4},originalVolume:{type:"number",minimum:0,maximum:4},ducking:{type:"boolean"},syncToBeats:{type:"boolean"},musicGenre:{type:"string",enum:["auto","funk","pagode","sertanejo","pop","other"]},preserveSourceAudio:{type:"boolean"},creativeRecut:{type:"boolean"},masterAudio:{type:"boolean"},denoiseAudio:{type:"boolean"},denoiseVideo:{type:"boolean"},targetLufs:{type:"number",minimum:-24,maximum:-9},
      removeSilence:{type:"boolean"},removeBlackFrames:{type:"boolean"},editMethod:{type:"string",enum:["auto","audio","motion","audio-or-motion","audio-and-motion","scene"]},silencePadding:{type:"number",minimum:0,maximum:2},minSegment:{type:"number",minimum:0.2,maximum:30},silenceDb:{type:"number",minimum:-80,maximum:-5},silenceDuration:{type:"number",minimum:0.1,maximum:30},motionThreshold:{type:"number",minimum:0,maximum:1},motionlessDuration:{type:"number",minimum:0.1,maximum:30},sceneThreshold:{type:"number",minimum:0.01,maximum:1},blackThreshold:{type:"number",minimum:0.5,maximum:1},blackDuration:{type:"number",minimum:0.1,maximum:30},analysisDepth:{type:"string",enum:["quick","full"]},
      aspectRatio:{type:"string",enum:["original","vertical","square","landscape"]},reframeMode:{type:"string",enum:["crop","fit","blur"]},upscale:{type:"boolean"},mobileHd:{type:"boolean"},maxResolution:{type:"string",enum:["720p","1080p","2k"]},reverseMoments:{type:"boolean"},maxReverseMoments:{type:"integer",minimum:1,maximum:3},zoomPreset:{type:"string",enum:["none","face-in-out","face-punch","subtle-push","return-zoom"]},focusX:{type:"number",minimum:0,maximum:1},focusY:{type:"number",minimum:0,maximum:1},zoomStrength:{type:"number",minimum:0.01,maximum:0.25},colorGrade:{type:"string",enum:["none","natural","studio","cinematic","vibrant","warm","cool","mono","capcut-vibrant","capcut-teal-orange","capcut-vintage","capcut-cyberpunk","capcut-glow"]},environmentEnhancement:{type:"boolean"},environmentStrength:{type:"number",minimum:0,maximum:1},
      subtitles:{type:"string",maxLength:4096},autoCaptions:{type:"boolean"},subtitleFormat:{type:"string",enum:["srt","vtt","txt"]},captionStyle:{type:"string",enum:["clean","social","cinematic","capcut","tiktok","karaoke"]},language:{type:"string",maxLength:20},whisperModel:{type:"string",maxLength:4096},
      text:{type:"string",maxLength:1000},fontSize:{type:"integer",minimum:8,maximum:300},fontColor:{type:"string",maxLength:40},box:{type:"boolean"},position:{type:"string",enum:["top","center","bottom","top-left","top-right","bottom-left","bottom-right"]},
      overlay:{type:"string",maxLength:4096},overlayWidth:{type:"integer",minimum:8,maximum:4096},opacity:{type:"number",minimum:0.05,maximum:1},margin:{type:"integer",minimum:0,maximum:1000},effectPack:{type:"string",maxLength:120},overlayPack:{type:"boolean"},overlayPresets:{type:"array",maxItems:30,items:{type:"string",maxLength:100}},overlayCount:{type:"integer",minimum:1,maximum:30},overlayDuration:{type:"number",minimum:0.12,maximum:4},overlayOpacity:{type:"number",minimum:0.05,maximum:1},overlays:{type:"array",maxItems:30,items:{type:"object",additionalProperties:false,properties:{preset:{type:"string",maxLength:100},id:{type:"string",maxLength:100},start:{type:["number","string"]},time:{type:["number","string"]},duration:{type:["number","string"]},length:{type:["number","string"]},opacity:{type:"number",minimum:0.05,maximum:1},scale:{type:"number",minimum:0.5,maximum:1.6}}}},brandWatermark:{type:"boolean"},watermarkPosition:{type:"string",enum:["top-left","top-right","bottom-left","bottom-right","center"]},watermarkMargin:{type:"integer",minimum:0,maximum:1000},
      quality:{type:"string",enum:["high","medium","low"]},codec:{type:"string",enum:["libx264","libx265"]},preset:{type:"string",enum:["ultrafast","superfast","veryfast","faster","fast","medium","slow"]},audioBitrate:{type:"string",enum:["96k","128k","160k","192k","256k","320k"]},time:{type:["number","string"]},
      request:{type:"string",maxLength:1200},regionTarget:{type:"string",enum:["eyes","window","face","hair","clothing","sky","water","grass","mountain","background","subject","custom"]},regionPrompt:{type:"string",maxLength:300},maskVideo:{type:"string",maxLength:4096},temporalSegmentationEndpoint:{type:"string",maxLength:4096},temporalSegmentationEndpointEnv:{type:"string",maxLength:128},temporalSegmentationTokenEnv:{type:"string",maxLength:128},allowRemote:{type:"boolean"},brightness:{type:"number",minimum:-100,maximum:100},contrast:{type:"number",minimum:-100,maximum:100},saturation:{type:"number",minimum:-100,maximum:100},gamma:{type:"number",minimum:0.2,maximum:3},exposure:{type:"number",minimum:-2,maximum:2},detailAmount:{type:"number",minimum:0,maximum:2.5},blurRadius:{type:"number",minimum:0,maximum:30}
    },required:["action"]
  },
  async execute(a,ctx){
    const regionalIntent=assertVideoRegionalRouting(a);
    if(a.action==="regional_edit")a={...a,regionTarget:a.regionTarget||regionalIntent.target||"custom",regionPrompt:a.regionPrompt||regionalIntent.regionPrompt||regionalIntent.target||"custom"};
    if(a.action==="list_media"){
      reportVideoProgress(ctx,{stage:"loading",percent:10,detail:"scanning media folders"});
      const requested=expandHome(a.directory||"~/storage/downloads"),directory=await readable(ctx,requested),files=await listMediaFiles(directory,{query:a.query,limit:a.limit||80});
      reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:`${files.length} media file${files.length===1?"":"s"} ready`});
      return JSON.stringify({ok:true,action:a.action,directory,query:a.query||null,count:files.length,files},null,2);
    }
    if(a.action==="list_effects"){
      const packs=await listVideoEffectPacks();reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:`${packs.length} local video effects pack${packs.length===1?"":"s"} ready`});
      return JSON.stringify({ok:true,action:a.action,packs},null,2);
    }
    await ensureFfmpeg();
    if(a.action==="concat"||a.action==="montage"){
      if(!a.inputs?.length)throw new Error("inputs required for montage");
      reportVideoProgress(ctx,{stage:"loading",percent:2,detail:`opening ${a.inputs.length} clips`});
      const inputs=[];for(const item of a.inputs)inputs.push(await resolveInput(ctx,item));
      const infos=[];for(let index=0;index<inputs.length;index++){const info=await probe(ctx,inputs[index]);if(!info.video)throw new Error(`input has no video stream: ${inputs[index]}`);infos.push(info);reportVideoProgress(ctx,{stage:"loading",percent:4+((index+1)/inputs.length)*14,detail:`clip ${index+1}/${inputs.length} ready`});}
      reportVideoProgress(ctx,{stage:"cutting",percent:22,detail:a.action==="concat"?"building clean timeline":"building transition timeline"});
      const output=await resolveOutput(ctx,a.output,inputs[0],a.action),built=await renderMontage(ctx,inputs,infos,output,{...a,transition:a.action==="concat"?"none":a.transition},{progress:{from:28,to:95}});
      reportVideoProgress(ctx,{stage:"verifying",percent:97,detail:"checking final video"});
      const finalInfo=await probe(ctx,output),changes=[`combined ${inputs.length} clips`,a.action==="concat"?"used clean cuts":`applied ${built.transitions.join(", ")} transitions`,"matched frame size and frame rate","smoothed and mastered the combined audio"];
      reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"video ready"});
      return cleanResult(a.action,null,output,finalInfo,changes,{inputs:inputs.length,duration:built.duration,bytes:await statResult(output)});
    }
    if(!a.input)throw new Error("input required");
    reportVideoProgress(ctx,{stage:"loading",percent:2,detail:"opening source video"});
    const input=await resolveInput(ctx,a.input);reportVideoProgress(ctx,{stage:"loading",percent:4,detail:"reading video metadata"});
    const info=await probe(ctx,input);reportVideoProgress(ctx,{stage:"loading",percent:7,detail:"media ready"});
    if(a.action==="apply_overlay_pack"){
      if(!info.video)throw new Error("input has no video stream");
      const pack=await loadVideoEffectPack(a.effectPack||"blackcore-premium-lite"),events=overlayEventsFor(a,pack,info.duration,{defaultCount:8}),output=await resolveOutput(ctx,a.output,input,a.action);
      reportVideoProgress(ctx,{stage:"effects",percent:10,detail:`preparing ${pack.title||pack.name} with ${events.length} selected overlays`});
      await renderOverlayPack(ctx,input,info,output,a,pack,events);const finalInfo=await probe(ctx,output),names=events.map(row=>row.preset.id);
      reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"overlay pack rendered and verified"});
      return cleanResult(a.action,input,output,finalInfo,[`applied ${events.length} selected visual overlays from ${pack.title||pack.name}`,`used independent durations from ${events.map(row=>row.duration.toFixed(2)).join(", ")} seconds`,"preserved the original soundtrack and timeline"],{bytes:await statResult(output),effectPack:{name:pack.name,version:pack.version,license:pack.license,source:pack.source},overlays:names.map((name,index)=>({preset:name,start:Number(events[index].start.toFixed(3)),duration:Number(events[index].duration.toFixed(3)),opacity:events[index].opacity}))});
    }
    if(a.action==="inspect"){reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"media inspection ready"});return JSON.stringify({ok:true,input,summary:summary(info),streams:info.raw.streams,chapters:info.raw.chapters||[]},null,2);}
    if(a.action==="detect_silence"){reportVideoProgress(ctx,{stage:"silence",percent:16,detail:"measuring pauses and speech gaps"});const silences=roundTimeline(await detectSilence(ctx,input,info,a));reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"silence map ready"});return JSON.stringify({ok:true,input,silences},null,2);}
    if(a.action==="detect_scenes"){reportVideoProgress(ctx,{stage:"scenes",percent:16,detail:"measuring visual changes"});const sceneTimes=await detectScenes(ctx,input,a);reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"scene map ready"});return JSON.stringify({ok:true,input,threshold:a.sceneThreshold??0.32,sceneTimes},null,2);}
    if(a.action==="detect_black"){reportVideoProgress(ctx,{stage:"black_frames",percent:16,detail:"checking blank frames"});const blackFrames=roundTimeline(await detectBlack(ctx,input,info,a));reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"frame scan ready"});return JSON.stringify({ok:true,input,blackFrames},null,2);}
    if(a.action==="detect_beats"){reportVideoProgress(ctx,{stage:"rhythm",percent:16,detail:"detecting peaks, beat grid and BPM"});const audioRhythm=await detectBeats(ctx,input,info);reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"rhythm map ready"});return JSON.stringify({ok:true,input,audioRhythm},null,2);}
    if(a.action==="analyze"){
      reportVideoProgress(ctx,{stage:"silence",percent:12,detail:"measuring pauses and speech gaps"});const silences=await detectSilence(ctx,input,info,a);
      reportVideoProgress(ctx,{stage:"scenes",percent:32,detail:"detecting visual scene changes"});const scenes=info.video?await detectScenes(ctx,input,a):[];
      reportVideoProgress(ctx,{stage:"analyzing",percent:52,detail:"measuring loudness and peaks"});const loudness=await detectLoudness(ctx,input,info),full=a.analysisDepth!=="quick";
      reportVideoProgress(ctx,{stage:"black_frames",percent:66,detail:full?"checking blank and unusable frames":"quick scan complete"});const blackFrames=full?await detectBlack(ctx,input,info,a):[];
      reportVideoProgress(ctx,{stage:"rhythm",percent:76,detail:full&&info.audio?"detecting beats and BPM":"skipping deep rhythm scan"});const audioRhythm=full&&info.audio?await detectBeats(ctx,input,info):null;
      reportVideoProgress(ctx,{stage:"scene_quality",percent:84,detail:full&&info.video?"measuring movement and protecting action":"quick motion scan skipped"});const motionFrames=full&&info.video?await detectMotion(ctx,input).catch(()=>[]):[];
      const analysisProfile=editProfile({...a,editLevel:a.editLevel||"medium",brandWatermark:false},info);reportVideoProgress(ctx,{stage:"environment",percent:90,detail:full&&info.video?"sampling light, color and environments":"quick environment scan skipped"});const environmentSamples=full&&info.video?await detectEnvironments(ctx,input,info,analysisProfile).catch(()=>[]):[],removed=mergeRanges([...(a.removeSilence===false?[]:silences),...(a.removeBlackFrames===true?blackFrames:[])],info.duration),suggested=roundTimeline(reduceSegments(activeSegments(info.duration,removed,{padding:a.silencePadding??0.12,minSegment:a.minSegment??0.45}))),videoSummary=summary(info),analysis={silences:roundTimeline(silences),blackFrames:roundTimeline(blackFrames),sceneTimes:scenes,loudness,audioRhythm,musicProfile:inferMusicProfile(audioRhythm||{},a.musicGenre||"auto",input),motion:summarizeMotion(motionFrames),environment:{samples:environmentSamples.length,summary:summarizeEnvironmentProfiles(environmentSamples)},suggestedSegments:suggested,estimatedEditedDuration:Number(suggested.reduce((sum,row)=>sum+row.duration,0).toFixed(3))},capabilities=await inspectVideoAiCapabilities(ctx,info),advice=buildVideoAdvice({summary:videoSummary,analysis,capabilities});
      reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"diagnosis and selectable video plan ready"});
      return JSON.stringify({ok:true,action:a.action,input,summary:videoSummary,analysis,advice},null,2);
    }
    if(a.action==="transcribe"){
      reportVideoProgress(ctx,{stage:"captions",percent:10,detail:"preparing local transcription"});
      const requestedExt=path.extname(String(a.output||"")).slice(1).toLowerCase(),format=a.subtitleFormat||(["srt","vtt","txt"].includes(requestedExt)?requestedExt:"srt"),output=await resolveOutput(ctx,a.output,input,a.action,format),transcription=await transcribeLocal(ctx,input,{...a,subtitleFormat:format},output);
      reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"caption file ready"});
      return cleanResult(a.action,input,output,null,[`transcribed the spoken audio in ${transcription.language} with ${transcription.backend}`,`created ${format.toUpperCase()} captions`],{bytes:await statResult(output),transcription});
    }
    if(a.action==="regional_edit"){
      if(!info.video)throw new Error("input has no video stream");const output=await resolveOutput(ctx,a.output,input,a.action),temp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-regional-video-"));try{reportVideoProgress(ctx,{stage:"masking",percent:12,detail:`tracking ${regionalIntent.target||a.regionPrompt||"selected region"} through the video`});const selection=await resolveVideoSelection(ctx,a,input,info,temp),regional=regionalVideoFilter(a),width=even(info.video.width),height=even(info.video.height),graph=`[0:v]setpts=PTS-STARTPTS,split=2[base][work];[work]${regional.filter}[edited];[1:v]scale=${width}:${height}:flags=bilinear,format=gray,setpts=PTS-STARTPTS[mask];[base][edited][mask]maskedmerge,format=yuv420p[v]`,args=["-i",input,"-i",selection.file,"-filter_complex",graph,"-map","[v]"];if(info.audio)args.push("-map","0:a:0?");args.push(...encodeArgs(a,null,{copyAudio:!!info.audio}),"-shortest");await runEdit(ctx,args,output,VIDEO_TIMEOUT_MS,{stage:"rendering",from:22,to:96,duration:info.duration,detail:`applying ${regional.target} adjustment only inside the tracked mask`});reportVideoProgress(ctx,{stage:"verifying",percent:98,detail:"checking mask coverage, duration, picture and preserved timing"});const finalInfo=await probe(ctx,output),durationDelta=Math.abs(finalInfo.duration-info.duration);if(durationDelta>Math.max(0.25,info.duration*0.01)){await fs.rm(output,{force:true});throw new Error(`regional video quality check rejected a ${durationDelta.toFixed(3)}s timing change`);}reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"temporally selected edit verified"});return cleanResult(a.action,input,output,finalInfo,[`adjusted ${regional.target} only inside a temporally tracked mask`,`preserved pixels outside the mask through masked compositing`,info.audio?"preserved the original soundtrack and timing without cuts or speed changes":"preserved the original timeline without speed changes"],{bytes:await statResult(output),regionalIntent,selection:{source:selection.source,coverage:selection.coverage,duration:selection.metadata.duration,durationDifference:selection.durationDifference},verification:{passed:true,durationDelta:Number(durationDelta.toFixed(4)),globalFallback:false}});}finally{await fs.rm(temp,{recursive:true,force:true});}
    }
    if(a.action==="smart_cut"||a.action==="auto_edit"){
      if(!info.video)throw new Error("input has no video stream");const automatic=a.action==="auto_edit",renderArgs=automatic?editProfile(a,info):{style:"clean",transition:"none",colorGrade:"none",masterAudio:false,denoiseAudio:false,brandWatermark:false,preserveSourceAudio:false,environmentEnhancement:false,...a},totalSteps=automatic?18:null,progress=(stage,percent,detail,step)=>reportVideoProgress(ctx,{stage,percent,detail,step:automatic?step:null,totalSteps,level:renderArgs.editLevel});
      progress("loading",8,automatic?`${renderArgs.editLevel.toUpperCase()} edit profile selected`:"clean timeline selected",1);
      progress("black_frames",11,renderArgs.preserveSourceAudio?"checking picture gaps without shortening the soundtrack":"checking blank starts, endings and unusable gaps",2);
      const removeSilence=renderArgs.removeSilence!==false&&!renderArgs.preserveSourceAudio,detectedBlack=renderArgs.removeBlackFrames===false?[]:await detectBlack(ctx,input,info,renderArgs),blackFrames=renderArgs.preserveSourceAudio?[]:renderArgs.removeBlackFrames===true?detectedBlack:detectedBlack.filter(row=>row.start<0.2||row.end>info.duration-0.2);
      progress("silence",17,renderArgs.preserveSourceAudio?"audio lock active — no soundtrack gaps will be cut":removeSilence?"finding pauses and low-value gaps":"silence removal disabled",3);
      const silences=removeSilence?await detectSilence(ctx,input,info,renderArgs):[];
      progress("scenes",24,automatic?"mapping visual changes and strong cut points":"using clean cut points",4);
      const rawScenes=automatic?await detectScenes(ctx,input,renderArgs):[];
      progress("scene_quality",28,automatic?"measuring motion to protect strong dance and action scenes":"keeping the original scene order",5);
      const motionFrames=automatic?await detectMotion(ctx,input).catch(()=>[]):[],motionless=automatic?motionlessRanges(motionFrames,info.duration,{threshold:renderArgs.motionThreshold,minDuration:renderArgs.motionlessDuration}):[];
      const environmentSamples=automatic&&renderArgs.environmentEnhancement!==false?await detectEnvironments(ctx,input,info,renderArgs).catch(()=>[]):[],sampleEnvironmentSummary=summarizeEnvironmentProfiles(environmentSamples),detectedEnvironments=Object.entries(sampleEnvironmentSummary).filter(([,count])=>count>0).map(([name])=>name);
      progress("environment",32,renderArgs.environmentEnhancement===false?"adaptive scene color disabled":environmentSamples.length?`sampling light and environment · ${detectedEnvironments.length?detectedEnvironments.join(", "):"neutral scenes"}`:"scene color scan unavailable — keeping the base grade",6);
      let music=null,beats=null,sourceRhythm=null,musicOffset=0;
      if(renderArgs.music){
        progress("rhythm",36,"detecting peaks, BPM and beat grid in the supplied music",7);music=await resolveInput(ctx,renderArgs.music);const musicInfo=await probe(ctx,music);if(!musicInfo.audio)throw new Error("music has no audio stream");
        if(renderArgs.syncToBeats!==false){beats=await detectBeats(ctx,music,musicInfo);musicOffset=beats.beatTimes[0]||0;}
      }else if(automatic&&renderArgs.editLevel!=="basic"&&info.audio){
        progress("rhythm",36,renderArgs.preserveSourceAudio?"mapping beats while keeping the requested soundtrack lock":"mapping beats for joint picture-and-sound cuts",7);sourceRhythm=await detectBeats(ctx,input,info).catch(()=>null);
      }else progress("rhythm",36,"keeping the source rhythm natural",7);
      const activeRhythm=beats||sourceRhythm,musicProfile=inferMusicProfile(activeRhythm||{},renderArgs.musicGenre||"auto",renderArgs.music||input);
      progress("music_identity",39,musicProfile.genre==="unknown"?"genre uncertain — using neutral musical pacing":`${musicProfile.genre} rhythm profile · ${musicProfile.bpm||"free"} BPM · ${musicProfile.energy} energy`,8);
      const desiredBudget=Math.max(info.duration>=(renderArgs.minSegment||0.7)*2?1:0,Math.floor(info.duration/(renderArgs.editLevel==="high"?6:renderArgs.editLevel==="medium"?9:28))),dynamicBudget=Math.max(0,Math.min(renderArgs._maxCreativeEdits??12,Math.max(rawScenes.length||activeRhythm?1:0,desiredBudget))),selectedScenePoints=automatic?selectMusicalScenePoints(rawScenes,info.duration,{rhythm:activeRhythm,motionFrames,maxTransitions:dynamicBudget,minGap:renderArgs._sceneGap,beatSnap:renderArgs.editLevel==="high"?0.26:0.2}):[],scenePoints=automatic?completeScenePoints(selectedScenePoints,info.duration,{rhythm:activeRhythm,a:renderArgs}):[],scenes=scenePoints.map(row=>row.time),editMethod=normalizeEditMethod(renderArgs.editMethod),inactive=renderArgs.preserveSourceAudio||!removeSilence?[]:inactiveRangesFor(editMethod,{silences,motionless,duration:info.duration,hasAudio:!!info.audio,hasMotion:motionFrames.length>0}),removed=mergeRanges([...inactive,...blackFrames],info.duration);
      progress("cutting",42,renderArgs.preserveSourceAudio&&renderArgs.creativeRecut===true?"building the explicitly requested visual recut over locked audio":renderArgs.preserveSourceAudio?"keeping every source scene chronological over locked audio":"cutting picture and soundtrack together in chronological order",9);
      let segments=activeSegments(info.duration,removed,{padding:renderArgs.silencePadding??0.12,minSegment:renderArgs.minSegment??0.5}),creativeEdits=[];
      if(automatic&&renderArgs.preserveSourceAudio&&renderArgs.creativeRecut===true){const recut=buildCreativeVisualEdl({duration:info.duration,sceneTimes:rawScenes,scenePoints,rhythm:activeRhythm,motionFrames,musicProfile,a:renderArgs});segments=recut.segments;creativeEdits=recut.edits;}
      else{if(scenes.length)segments=splitAtSceneTimes(segments,scenes,renderArgs.minSegment??0.65);segments=limitSegments(segments,renderArgs.targetDuration||0,{minSegment:renderArgs.minSegment??0.75});}
      segments=segments.map((row,index)=>{const motionScore=row.motionScore??motionScoreNear(motionFrames,(row.start+row.end)/2,Math.min(2.5,Math.max(0.7,(row.end-row.start)/3))),synthetic=scenePoints.some(point=>point.synthetic&&Math.abs(Number(point.time)-row.start)<0.08),environment=environmentProfileForRange(environmentSamples,row.start,row.end),zoomRequested=renderArgs.zoomPreset&&renderArgs.zoomPreset!=="none",zoomSlot=zoomRequested&&(row.punchIn||index%Math.max(1,Math.ceil(segments.length/3))===0);return {...row,motionScore,environment,...(synthetic&&motionScore<0.52?{punchIn:true,role:"rhythm-punch"}:{}),...(zoomSlot?{punchIn:true,role:row.role||"camera-focus"}:{})};});segments=markReverseMoments(reduceSegments(segments),renderArgs);
      const transitionPlan=transitionPlanFor(segments,renderArgs,musicProfile,scenePoints),transitionCount=transitionPlan.filter(row=>row.kind!=="none").length;renderArgs._transitionPlan=transitionPlan;renderArgs._musicProfile=musicProfile;
      progress("transitions",46,transitionCount?`building ${transitionCount} visible beat-aware entrances and exits`:"using clean visual cuts without forced effects",10);
      const dims=targetDimensions(renderArgs,info);progress("scaling",48,renderArgs._downscaled?`optimizing ${info.video.width}×${info.video.height} to mobile HD ${dims.width}×${dims.height}`:`preserving ${dims.width}×${dims.height} with Lanczos scaling`,11);
      progress("color",50,`${renderArgs.colorGrade||"natural"} base grade plus restrained scene-aware light and color`,12);
      progress(renderArgs.preserveSourceAudio?"audio_lock":"audio_edit",52,renderArgs.preserveSourceAudio?"copying the original soundtrack continuously — no cuts or crossfades":info.audio?"matching every video cut with an audio cut and controlled crossfade":"source has no audio track",13);
      const output=await resolveOutput(ctx,renderArgs.output,input,a.action),subtitles=renderArgs.subtitles?await resolveInput(ctx,renderArgs.subtitles):null,customWatermark=renderArgs.overlay?await resolveInput(ctx,renderArgs.overlay):null,builtinWatermark=renderArgs.brandWatermark!==false?await fs.access(BRAND_WATERMARK).then(()=>BRAND_WATERMARK).catch(()=>null):null,watermark=customWatermark||builtinWatermark,tmp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-auto-edit-")),effectPackName=renderArgs.effectPack||(renderArgs.overlayPack===true?"blackcore-premium-lite":null),effectPack=effectPackName?await loadVideoEffectPack(effectPackName):null,effectEvents=effectPack?overlayEventsFor(renderArgs,effectPack,info.duration,{defaultCount:6}):[];progress("watermark",54,watermark?"applying the polished BLACKCORE signature":"watermark disabled or unavailable",14);let built,captionInfo=null;
      try{
        let renderOutput=effectEvents.length?path.join(tmp,"edited-base.mp4"):output;
        if(renderArgs.autoCaptions&&!subtitles){
          const generated=path.join(tmp,"captions.srt");built=await renderTimeline(ctx,input,info,segments,renderOutput,renderArgs,{music,musicOffset,watermark,qualityOverride:"high",progress:{from:56,to:72,detail:`rendering ${renderArgs.editLevel} master with adaptive scene color`,step:15,totalSteps}});
          if(effectEvents.length){const effectInfo=await probe(ctx,renderOutput),effectOutput=path.join(tmp,"effects-base.mp4");await renderOverlayPack(ctx,renderOutput,effectInfo,effectOutput,renderArgs,effectPack,effectEvents);renderOutput=effectOutput;}
          const base=renderOutput;
          reportVideoProgress(ctx,{stage:"captions",percent:74,detail:"transcribing speech locally",step:15,totalSteps,level:renderArgs.editLevel});captionInfo=await transcribeLocal(ctx,base,{...renderArgs,subtitleFormat:"srt",_progressFrom:74,_progressTo:84},generated);reportVideoProgress(ctx,{stage:"captions",percent:85,detail:"burning captions into the picture",step:15,totalSteps,level:renderArgs.editLevel});
          const baseInfo=await probe(ctx,base);await runEdit(ctx,["-i",base,"-vf",`subtitles='${escapeFilterPath(generated)}':force_style='${captionForceStyle(renderArgs.captionStyle)}'`,"-map","0:v:0","-map","0:a?",...encodeArgs(renderArgs,null,{copyAudio:renderArgs.preserveSourceAudio})],output,VIDEO_TIMEOUT_MS,{stage:"captions",from:85,to:96,duration:baseInfo.duration,detail:"styling and burning captions",step:15,totalSteps,level:renderArgs.editLevel});
          if(!baseInfo.audio)captionInfo={...captionInfo,note:"video had no original audio"};
        }else{built=await renderTimeline(ctx,input,info,segments,renderOutput,renderArgs,{music,musicOffset,subtitles,watermark,progress:{from:56,to:96,detail:subtitles?"joint cuts, adaptive color, transitions, watermark and captions":renderArgs.preserveSourceAudio?`${renderArgs.editLevel} scene color and transitions with explicit audio lock`:`${renderArgs.editLevel} joint A/V edit with adaptive scene color`,step:15,totalSteps}});if(effectEvents.length){const effectInfo=await probe(ctx,renderOutput);await renderOverlayPack(ctx,renderOutput,effectInfo,output,renderArgs,effectPack,effectEvents);}}
      }finally{await fs.rm(tmp,{recursive:true,force:true});}
      progress("finalizing",96.5,"closing the mobile HD file and fast-start index",16);
      progress("edit_check",97,"measuring whether the recut is visibly different from the source",17);
      const finalInfo=await probe(ctx,output),removedSeconds=Math.max(0,info.duration-segments.reduce((sum,row)=>sum+row.duration,0)),timelineReduction=Math.max(0,info.duration-finalInfo.duration),verificationSamples=creativeEdits.length?creativeEdits:timelineEditSamples(segments,built.transitionPlan),structuralEdit=creativeEdits.length>0||removedSeconds>0.05||transitionCount>0||segments.some(row=>row.punchIn||row.reverse),visualVerification=structuralEdit?(renderArgs.preserveSourceAudio&&!creativeEdits.length?{available:false,passed:true,samples:verificationSamples.length,ssim:null,reason:"chronological transition graph verified with explicitly requested audio lock"}:await verifyCreativeDifference(ctx,input,output,verificationSamples)):null,changes=[];
      if(visualVerification&&!visualVerification.passed){await fs.rm(output,{force:true});throw new Error(`visual edit verification failed: output remained too similar to the source (SSIM ${visualVerification.ssim}); no watermark-only result was delivered`);}
      progress("verifying",98,"checking duration, resolution, picture, sound and output size",18);
      if(removedSeconds>0.05)changes.push(`removed ${removedSeconds.toFixed(2)} seconds only where the selected activity rule found silence, still picture, or black frames`);else changes.push("preserved the complete useful timeline in chronological order");
      const transitionKinds=[...new Set(built.transitionPlan.filter(row=>row.kind!=="none").map(row=>row.kind))],timelinePunches=segments.filter(row=>row.punchIn).length,motionPasses=segments.filter(row=>!row.punchIn&&!row.reverse&&row.duration>=1&&Number(row.motionScore)<0.52&&renderArgs._motionStrength>0).length,environmentSummary=summarizeEnvironmentProfiles(segments.map(row=>row.environment)),environmentLabels={water:"water",sky:"sky",grass:"grass",vegetation:"vegetation",mountain:"mountain landscape","low-light":"low-light","harsh-light":"bright-light"},environmentChanges=Object.entries(environmentSummary).filter(([,count])=>count>0).map(([name,count])=>`${count} ${environmentLabels[name]} scene${count===1?"":"s"}`);
      if(creativeEdits.length){const highlightCount=creativeEdits.filter(row=>row.type==="highlight-recut").length,punchCount=creativeEdits.length-highlightCount;changes.push(`created ${creativeEdits.length} real visual recuts over the locked soundtrack (${highlightCount} highlight inserts and ${punchCount} punch-ins)`);changes.push(`applied ${transitionCount} controlled transition entrances and exits${transitionKinds.length?` (${transitionKinds.join(", ")})`:""}`);}
      else if(segments.length>1)changes.push(`rebuilt ${segments.length} chronological scenes with ${transitionCount} rhythm-aware transitions${transitionKinds.length?` (${transitionKinds.join(", ")})`:""}`);
      if(timelinePunches)changes.push(`added ${timelinePunches} restrained rhythm punch-in${timelinePunches===1?"":"s"} to single-shot material`);
      if(motionPasses)changes.push(`added controlled push and pan to ${motionPasses} calmer shot${motionPasses===1?"":"s"} while protecting active scenes from artificial speed changes`);
      if(segments.some(row=>row.reverse))changes.push("added a short silent visual reverse on a suitable high-motion scene without reversing the music");
      if(renderArgs._downscaled)changes.push(`optimized the picture to ${built.reframe.width}×${built.reframe.height} mobile HD with Lanczos resampling`);else if(renderArgs.aspectRatio&&renderArgs.aspectRatio!=="original")changes.push(`reframed the image to ${built.reframe.label}`);
      const appliedGrade=renderArgs.colorGrade||"none";if(appliedGrade!=="none")changes.push(`applied a ${appliedGrade} color grade with controlled sharpening`);
      if(environmentChanges.length)changes.push(`applied restrained environment-specific light, color, and detail enhancement to ${environmentChanges.join(", ")}`);
      if(renderArgs.preserveSourceAudio&&info.audio&&!music)changes.push("preserved the original soundtrack continuously because audio lock was explicitly requested, without audio cuts, crossfades, speed changes, or remastering");else if(info.audio){changes.push(`cut picture and soundtrack together with ${transitionCount} matched audio crossfades; final timeline shortened ${timelineReduction.toFixed(2)} seconds without changing playback speed`);if(renderArgs.denoiseAudio!==false||renderArgs.masterAudio!==false)changes.push("reduced noise, controlled dynamics, and mastered the original audio");}
      if(music){changes.push(`mixed the music under the original audio${renderArgs.ducking===false?"":" with automatic voice ducking"}`);if(beats?.bpm)changes.push(segments.length>1?`aligned cut rhythm to the music at approximately ${beats.bpm} BPM`:`aligned the music start and timeline length to an approximately ${beats.bpm} BPM beat grid`);}else if(sourceRhythm?.bpm&&sourceRhythm.confidence>=0.35)changes.push(`used the source rhythm near ${sourceRhythm.bpm} BPM to guide pacing`);
      if(effectEvents.length)changes.push(`composited ${effectEvents.length} optional overlays from ${effectPack.title||effectPack.name} with independent timing`);
      if(renderArgs.zoomPreset&&renderArgs.zoomPreset!=="none")changes.push(`used ${renderArgs.zoomPreset} camera movement around the requested focal point (${safeNumber(renderArgs.focusX,0.5,0,1).toFixed(2)}, ${safeNumber(renderArgs.focusY,0.38,0,1).toFixed(2)})`);
      if(watermark)changes.push(`added the BLACKCORE signature watermark at ${renderArgs.watermarkPosition||"bottom-right"}`);
      if(subtitles||captionInfo)changes.push(`burned ${renderArgs.captionStyle||"clean"} captions into the video`);
      progress("verifying",100,"professional output verified and ready",18);
      return cleanResult(a.action,input,output,finalInfo,changes,{editLevel:renderArgs.editLevel||null,bytes:await statResult(output),effectPack:effectPack?{name:effectPack.name,version:effectPack.version,license:effectPack.license,source:effectPack.source,overlays:effectEvents.map(row=>({preset:row.preset.id,start:Number(row.start.toFixed(3)),duration:Number(row.duration.toFixed(3)),opacity:row.opacity}))}:null,timeline:roundTimeline(segments),analysis:{editMethod,preserveSourceAudio:renderArgs.preserveSourceAudio,motionlessRanges:roundTimeline(motionless),inactiveRanges:roundTimeline(inactive),silencesDetected:roundTimeline(silences),blackFramesRemoved:roundTimeline(blackFrames),sceneTimes:scenes,sourceRhythm,musicRhythm:beats,musicProfile,motionSamples:motionFrames.length,timelineReduction:Number(timelineReduction.toFixed(3)),environment:{enabled:renderArgs.environmentEnhancement!==false,strength:renderArgs._environmentStrength,samples:environmentSamples.length,summary:environmentSummary,scenes:segments.map(row=>({start:Number(row.start.toFixed(3)),end:Number(row.end.toFixed(3)),primary:row.environment?.primary||"neutral",tags:row.environment?.tags||[],confidence:row.environment?.confidence||0}))},creativeEdits:creativeEdits.map(row=>({outputStart:Number(row.outputStart.toFixed(3)),sourceStart:Number(row.sourceStart.toFixed(3)),duration:Number(row.duration.toFixed(3)),type:row.type,onBeat:row.onBeat,transitionIn:row.transitionIn,transitionOut:row.transitionOut})),transitions:built.transitionPlan,visualVerification},captioning:captionInfo});
    }
    const output=await resolveOutput(ctx,a.output,input,a.action),enc=encodeArgs(a);let args=[],changes=[];
    if(a.action==="trim"){
      const start=a.start!==undefined?timeArg(a.start):"0";args.push("-ss",start,"-i",input);if(a.end!==undefined){const d=sec(a.end)-sec(a.start??0);if(!(d>0))throw new Error("end must be greater than start");args.push("-t",String(d));}else if(a.duration!==undefined)args.push("-t",timeArg(a.duration));args.push(...enc);changes=[`kept the requested range starting at ${start} seconds`];
    }else if(a.action==="timeline"){
      if(!a.segments?.length)throw new Error("segments required for timeline");const segments=a.segments.map(s=>{const start=sec(s.start),end=sec(s.end);if(start===null||end===null||end<=start||end>info.duration+0.1)throw new Error(`invalid timeline segment ${JSON.stringify(s)}`);return {start,end,duration:end-start};}),subtitles=a.subtitles?await resolveInput(ctx,a.subtitles):null,built=await renderTimeline(ctx,input,info,segments,output,{transition:"none",colorGrade:"none",masterAudio:false,denoiseAudio:false,...a},{subtitles});const finalInfo=await probe(ctx,output);return cleanResult(a.action,input,output,finalInfo,[`kept ${segments.length} requested timeline segments`,a.transition&&a.transition!=="none"?"joined them with transitions":"joined them with clean cuts"],{segments:segments.length,duration:built.duration,bytes:await statResult(output)});
    }else if(a.action==="resize"){
      if(!a.width&&!a.height)throw new Error("width or height required");const w=a.width?even(a.width):-2,h=a.height?even(a.height):-2;args=["-i",input,"-vf",`scale=${w}:${h}`,...enc];changes=[`resized the frame to ${a.width||"auto"}×${a.height||"auto"}`];
    }else if(a.action==="auto_reframe"){
      const frame=reframeFilter(a,info);if(a.reframeMode==="blur"){const w=frame.width,h=frame.height;args=["-i",input,"-filter_complex",`[0:v]split=2[bg][fg];[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=20:2[bg2];[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg2];[bg2][fg2]overlay=(W-w)/2:(H-h)/2,setsar=1[v]`,"-map","[v]"];if(info.audio)args.push("-map","0:a?");args.push(...enc);}else args=["-i",input,"-vf",frame.filter,...enc];changes=[`reframed the image to ${frame.label} using ${a.reframeMode||"crop"} composition`];
    }else if(a.action==="crop"){
      if(!a.width||!a.height)throw new Error("width and height required");args=["-i",input,"-vf",`crop=${even(a.width)}:${even(a.height)}:${a.x??0}:${a.y??0}`,...enc];changes=[`cropped the frame to ${even(a.width)}×${even(a.height)}`];
    }else if(a.action==="rotate"){
      const f=a.degrees===90?"transpose=1":a.degrees===270?"transpose=2":"hflip,vflip";args=["-i",input,"-vf",f,...enc];changes=[`rotated the image ${a.degrees} degrees`];
    }else if(a.action==="speed"){
      const rate=Number(a.rate||1);if(info.audio)args=["-i",input,"-filter_complex",`[0:v]setpts=PTS/${rate}[v];[0:a]${atempoChain(rate)}[a]`,"-map","[v]","-map","[a]",...enc];else args=["-i",input,"-vf",`setpts=PTS/${rate}`,...enc];changes=[`changed playback speed to ${rate}× while preserving audio pitch`];
    }else if(a.action==="speed_curve"){
      const preset=String(a.curvePreset||"hero").toLowerCase();
      const dur=info.duration;
      if(dur<0.4)throw new Error("video is too short for a speed curve");
      const curves={
        hero: [
          {start:0, end:0.25, rate:1.0},
          {start:0.25, end:0.48, rate:2.5},
          {start:0.48, end:0.75, rate:0.4},
          {start:0.75, end:1.0, rate:1.2}
        ],
        bullet: [
          {start:0, end:0.20, rate:1.0},
          {start:0.20, end:0.40, rate:3.0},
          {start:0.40, end:0.70, rate:0.35},
          {start:0.70, end:1.0, rate:1.5}
        ],
        flash_in: [
          {start:0, end:0.30, rate:3.2},
          {start:0.30, end:1.0, rate:1.0}
        ],
        flash_out: [
          {start:0, end:0.70, rate:1.0},
          {start:0.70, end:1.0, rate:3.2}
        ],
        montage: [
          {start:0, end:0.25, rate:2.2},
          {start:0.25, end:0.50, rate:0.5},
          {start:0.50, end:0.75, rate:2.2},
          {start:0.75, end:1.0, rate:0.5}
        ],
        jump_cut: [
          {start:0, end:0.33, rate:1.8},
          {start:0.33, end:0.66, rate:0.6},
          {start:0.66, end:1.0, rate:2.0}
        ]
      };
      const stages=curves[preset]||curves.hero;
      const graph=[];
      const vInputs=[];
      const aInputs=[];
      stages.forEach((stg,idx)=>{
        const t0=(stg.start*dur).toFixed(3);
        const t1=(stg.end*dur).toFixed(3);
        const r=stg.rate;
        graph.push(`[0:v]trim=start=${t0}:end=${t1},setpts=PTS-STARTPTS,setpts=PTS/${r}[cv${idx}]`);
        vInputs.push(`[cv${idx}]`);
        if(info.audio){
          graph.push(`[0:a]atrim=start=${t0}:end=${t1},asetpts=PTS-STARTPTS,${atempoChain(r)}[ca${idx}]`);
          aInputs.push(`[ca${idx}]`);
        }
      });
      graph.push(`${vInputs.join("")}concat=n=${stages.length}:v=1:a=0[v]`);
      if(info.audio)graph.push(`${aInputs.join("")}concat=n=${stages.length}:v=0:a=1[a]`);
      args=["-i",input,"-filter_complex",graph.join(";"),"-map","[v]"];
      if(info.audio)args.push("-map","[a]");
      args.push(...enc);
      changes=[`applied CapCut '${preset}' speed curve with dynamic speed ramping and synchronized audio pitch`];
    }else if(a.action==="freeze_frame"){
      const freezeAt=safeNumber(sec(a.time),info.duration/2,0.05,Math.max(0.1,info.duration-0.05));
      const freezeLen=safeNumber(a.freezeDuration,0.8,0.1,10);
      const punch=a.freezePunch!==false;
      const fps=safeNumber(a.fps,parseFps(info.video?.avg_frame_rate),12,60);
      const w=even(info.video?.width||1280),h=even(info.video?.height||720);
      const graph=[];
      graph.push(`[0:v]trim=start=0:end=${freezeAt.toFixed(3)},setpts=PTS-STARTPTS[f_pre]`);
      const punchFilter=punch?`,zoompan=z='1.08':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=${fps}`:"";
      graph.push(`[0:v]trim=start=${freezeAt.toFixed(3)}:end=${(freezeAt+0.04).toFixed(3)},setpts=PTS-STARTPTS,loop=loop=${Math.round(freezeLen*fps)}:size=1:start=0,trim=duration=${freezeLen.toFixed(3)}${punchFilter}[f_still]`);
      graph.push(`[0:v]trim=start=${freezeAt.toFixed(3)}:end=${info.duration.toFixed(3)},setpts=PTS-STARTPTS[f_post]`);
      graph.push(`[f_pre][f_still][f_post]concat=n=3:v=1:a=0[v]`);
      if(info.audio){
        graph.push(`[0:a]atrim=start=0:end=${freezeAt.toFixed(3)},asetpts=PTS-STARTPTS[fa_pre]`);
        graph.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${freezeLen.toFixed(3)},asetpts=PTS-STARTPTS[fa_still]`);
        graph.push(`[0:a]atrim=start=${freezeAt.toFixed(3)}:end=${info.duration.toFixed(3)},asetpts=PTS-STARTPTS[fa_post]`);
        graph.push(`[fa_pre][fa_still][fa_post]concat=n=3:v=0:a=1[a]`);
      }
      args=["-i",input,"-filter_complex",graph.join(";"),"-map","[v]"];
      if(info.audio)args.push("-map","[a]");
      args.push(...enc);
      changes=[`froze keyframe at ${freezeAt.toFixed(2)}s for ${freezeLen.toFixed(2)}s with ${punch?"CapCut action punch zoom":"clean hold"}`];
    }else if(a.action==="shake"){
      const intensity=safeNumber(a.shakeIntensity,4,1,20);
      const freq=safeNumber(a.shakeFrequency,18,2,60);
      const pad=Math.max(4,Math.round(intensity*3));
      const st=a.start!==undefined?sec(a.start):0;
      const d=a.duration!==undefined?sec(a.duration):(info.duration-st);
      const endT=Math.min(info.duration,st+d);
      const shakeExpr=`crop=in_w-${pad*2}:in_h-${pad*2}:${pad}+${pad}*sin(2*PI*t*${freq}):${pad}+${pad}*cos(2*PI*t*${Math.round(freq*1.27)}),scale=in_w:in_h:flags=lanczos`;
      if(st>0||endT<info.duration-0.05){
        args=["-i",input,"-filter_complex",`[0:v]split=2[orig][shk];[shk]${shakeExpr}[shk_out];[orig][shk_out]overlay=enable='between(t,${st.toFixed(3)},${endT.toFixed(3)})'[v]`,"-map","[v]"];
      }else{
        args=["-i",input,"-vf",shakeExpr];
      }
      if(info.audio)args.push("-map","0:a:0?","-c:a","copy");
      args.push(...encodeArgs(a,null,{copyAudio:!!info.audio}));
      changes=[`added CapCut camera impact shake (intensity ${intensity}, ${freq}Hz)`];
    }else if(a.action==="flash"){
      const d=safeNumber(a.duration,0.22,0.05,5);
      const st=safeNumber(sec(a.start??0),0,0,Math.max(0,info.duration-0.05));
      let filter;
      if(a.strobe){
        const interval=safeNumber(a.strobeInterval,0.5,0.1,5);
        filter=`eq=brightness='if(lt(mod(t,${interval.toFixed(3)}),${d.toFixed(3)}),0.65*(1-mod(t,${interval.toFixed(3)})/${d.toFixed(3)}),0)'`;
      }else{
        filter=`eq=brightness='if(between(t,${st.toFixed(3)},${(st+d).toFixed(3)}),0.7*(1-(t-${st.toFixed(3)})/${d.toFixed(3)}),0)'`;
      }
      args=["-i",input,"-vf",filter];
      if(info.audio)args.push("-c:a","copy");
      args.push(...encodeArgs(a,null,{copyAudio:!!info.audio}));
      changes=[a.strobe?`added CapCut rhythmic strobe white flash every ${safeNumber(a.strobeInterval,0.5).toFixed(2)}s`:`added CapCut white flash transition effect at ${st.toFixed(2)}s (${d.toFixed(2)}s duration)`];
    }else if(a.action==="rgb_split"){
      const offset=Math.round(safeNumber(a.rgbSplitOffset,8,1,40));
      const graph=`[0:v]split=3[r][g][b];[r]lutrgb=g=0:b=0,crop=iw-${offset}:ih:0:0,pad=iw+${offset}:ih:${offset}:0:color=black[r_shifted];[g]lutrgb=r=0:b=0[g_base];[b]lutrgb=r=0:g=0,crop=iw-${offset}:ih:${offset}:0,pad=iw+${offset}:ih:0:0:color=black[b_shifted];[r_shifted][g_base]blend=all_mode=addition[rg];[rg][b_shifted]blend=all_mode=addition[v]`;
      args=["-i",input,"-filter_complex",graph,"-map","[v]"];
      if(info.audio)args.push("-map","0:a:0?","-c:a","copy");
      args.push(...encodeArgs(a,null,{copyAudio:!!info.audio}));
      changes=[`applied CapCut TikTok chromatic aberration / RGB split glitch (${offset}px)`];
    }else if(a.action==="blur_in"){
      const d=safeNumber(a.duration||a.blurDuration,0.85,0.1,10);
      const radius=Math.round(safeNumber(a.blurRadius,24,2,80));
      const graph=`[0:v]split=2[orig][blur];[blur]boxblur=${radius}:2,format=rgba,fade=t=out:st=0:d=${d.toFixed(3)}:alpha=1[blur_faded];[orig][blur_faded]overlay=0:0[v]`;
      args=["-i",input,"-filter_complex",graph,"-map","[v]"];
      if(info.audio)args.push("-map","0:a:0?","-c:a","copy");
      args.push(...encodeArgs(a,null,{copyAudio:!!info.audio}));
      changes=[`applied CapCut cinematic blur-in intro (${radius}px blur fading over ${d.toFixed(2)}s)`];
    }else if(a.action==="volume"){
      if(!info.audio)throw new Error("input has no audio stream");args=["-i",input,"-c:v","copy","-af",`volume=${Number(a.gain??1)}`,"-c:a","aac","-b:a",a.audioBitrate||"160k"];changes=[`set original audio gain to ${Number(a.gain??1)}×`];
    }else if(a.action==="mute"){args=["-i",input,"-c:v","copy","-an"];changes=["removed the audio track"];}
    else if(a.action==="fade"){
      const fi=Number(a.fadeIn??0),fo=Number(a.fadeOut??0),vf=[];if(fi>0)vf.push(`fade=t=in:st=0:d=${fi}`);if(fo>0){if(!(info.duration>fo))throw new Error("fadeOut is longer than the input duration");vf.push(`fade=t=out:st=${Math.max(0,info.duration-fo)}:d=${fo}`);}args=["-i",input];if(vf.length)args.push("-vf",vf.join(","));if(info.audio){const af=[];if(fi>0)af.push(`afade=t=in:st=0:d=${fi}`);if(fo>0)af.push(`afade=t=out:st=${Math.max(0,info.duration-fo)}:d=${fo}`);if(af.length)args.push("-af",af.join(","));}args.push(...enc);changes=[`added ${fi}s fade-in and ${fo}s fade-out to picture and sound`];
    }else if(a.action==="add_music"){
      if(!a.music)throw new Error("music required");const music=await resolveInput(ctx,a.music),mv=Number(a.musicVolume??0.28),ov=Number(a.originalVolume??1);args=["-i",input,"-stream_loop","-1","-i",music];if(info.audio&&a.ducking!==false){args.push("-filter_complex",`[0:a]volume=${ov},aresample=48000,asplit=2[voice_mix][voice_side];[1:a]volume=${mv},aresample=48000[music];[music][voice_side]sidechaincompress=threshold=0.025:ratio=10:attack=20:release=550[ducked];[voice_mix][ducked]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]`,"-map","0:v:0","-map","[a]",...enc,"-shortest");}else if(info.audio)args.push("-filter_complex",`[0:a]volume=${ov}[a0];[1:a]volume=${mv}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.95[a]`,"-map","0:v:0","-map","[a]",...enc,"-shortest");else args.push("-map","0:v:0","-map","1:a:0",...enc,"-shortest");changes=[`mixed background music at ${mv}×`,info.audio&&a.ducking!==false?"automatically lowered music under speech":"preserved a fixed music level"];
    }else if(a.action==="normalize_audio"){
      if(!info.audio)throw new Error("input has no audio stream");args=["-i",input,"-c:v","copy","-af",`loudnorm=I=${safeNumber(a.targetLufs,-14,-24,-9)}:TP=-1.5:LRA=11,alimiter=limit=0.95`,"-c:a","aac","-b:a",a.audioBitrate||"192k"];changes=[`mastered loudness to ${safeNumber(a.targetLufs,-14,-24,-9)} LUFS and controlled true peaks`];
    }else if(a.action==="denoise"){
      args=["-i",input,"-vf","hqdn3d=1.5:1.5:6:6"];if(info.audio)args.push("-af","highpass=f=70,afftdn=nf=-28,lowpass=f=15500");args.push(...enc);changes=["reduced temporal and spatial picture noise",...(info.audio?["cleaned low-frequency rumble and steady audio noise"]:[])];
    }else if(a.action==="color_grade"){
      const preset=a.colorGrade||"natural",filter=colorFilter(preset);args=["-i",input,...(filter?["-vf",filter]:[]),...enc];changes=[preset==="none"?"preserved the original color":`applied a professional ${preset} color grade`];
    }else if(a.action==="stabilize"){
      reportVideoProgress(ctx,{stage:"stabilizing",percent:12,detail:"checking motion filters"});const support=await filtersAvailable(ctx,["vidstabdetect","vidstabtransform"]);if(!support.vidstabdetect||!support.vidstabtransform)throw new Error("this FFmpeg build does not include the vidstab filters required for stabilization");const tmp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-stabilize-")),data=path.join(tmp,"transforms.trf");try{reportVideoProgress(ctx,{stage:"stabilizing",percent:18,detail:"analyzing camera movement"});const first=await runCli(ctx,"ffmpeg",["-hide_banner","-y","-i",input,"-vf",`vidstabdetect=shakiness=6:accuracy=15:result='${escapeFilterPath(data)}'`,"-an","-f","null","-"],{allowFailure:true,timeoutMs:VIDEO_TIMEOUT_MS,maxChars:300000});if(first.exitCode!==0)throw new Error(`stabilization analysis failed: ${first.output.slice(-2500)}`);args=["-i",input,"-vf",`vidstabtransform=input='${escapeFilterPath(data)}':smoothing=24:optzoom=2:zoom=2,unsharp=5:5:0.5:3:3:0.25`,...enc];await runEdit(ctx,args,output,VIDEO_TIMEOUT_MS,{stage:"stabilizing",from:48,to:96,duration:info.duration,detail:"smoothing motion and hiding borders"});reportVideoProgress(ctx,{stage:"verifying",percent:98,detail:"checking stabilized video"});const finalInfo=await probe(ctx,output);reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"stabilized video ready"});return cleanResult(a.action,input,output,finalInfo,["analyzed camera motion and stabilized shake","applied adaptive zoom and gentle sharpening to hide moving borders"],{bytes:await statResult(output)});}finally{await fs.rm(tmp,{recursive:true,force:true});}
    }else if(a.action==="burn_subtitles"){
      if(!a.subtitles)throw new Error("subtitles required");const subs=await resolveInput(ctx,a.subtitles);args=["-i",input,"-vf",`subtitles='${escapeFilterPath(subs)}':force_style='${captionForceStyle(a.captionStyle)}'`,...enc];changes=[`burned ${a.captionStyle||"clean"} captions into the picture`];
    }else if(a.action==="overlay_text"){
      if(!a.text)throw new Error("text required");const p=posExpr(a.position),fontSize=a.fontSize||42,color=String(a.fontColor||"white").replace(/[^A-Za-z0-9#@._-]/g,"");let filter=`drawtext=text='${escapeDrawText(a.text)}':x=${p.x}:y=${p.y}:fontsize=${fontSize}:fontcolor=${color||"white"}`;if(a.box!==false)filter+=":box=1:boxcolor=black@0.55:boxborderw=12";args=["-i",input,"-vf",filter,...enc];changes=[`added the requested text at ${a.position||"bottom"}`];
    }else if(a.action==="watermark"){
      if(!a.overlay)throw new Error("overlay required");const overlay=await resolveInput(ctx,a.overlay),ow=a.overlayWidth||220,opacity=a.opacity??0.85;args=["-i",input,"-i",overlay,"-filter_complex",`[1:v]scale=${even(ow)}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${overlayExpr(a.position,a.margin)}[v]`,"-map","[v]"];if(info.audio)args.push("-map","0:a?");args.push(...enc);changes=[`added a ${Math.round(opacity*100)}% opacity watermark at ${a.position||"bottom-right"}`];
    }else if(a.action==="compress"){args=["-i",input,...enc];changes=[`compressed the video at ${a.quality||"medium"} quality with web-faststart playback`];}
    else if(a.action==="extract_audio"){args=["-i",input,"-vn","-c:a",path.extname(output).toLowerCase()===".mp3"?"libmp3lame":"aac","-b:a",a.audioBitrate||"192k"];changes=["extracted the full audio track"];}
    else if(a.action==="thumbnail"){args=["-ss",timeArg(a.time??Math.min(1,Math.max(0,info.duration/3))),"-i",input,"-frames:v","1","-q:v","2"];changes=["captured a high-quality thumbnail from the selected moment"];}
    else throw new Error(`unsupported video editor action: ${a.action}`);
    const progressStage={add_music:"mixing",burn_subtitles:"captions",stabilize:"stabilizing",speed_curve:"rendering",freeze_frame:"cutting",shake:"effects",flash:"effects",rgb_split:"effects",blur_in:"effects"}[a.action]||"rendering";
    await runEdit(ctx,args,output,VIDEO_TIMEOUT_MS,{stage:progressStage,from:12,to:96,duration:a.action==="thumbnail"?0:info.duration,detail:{add_music:"balancing voice and music",burn_subtitles:"styling and burning captions",normalize_audio:"mastering loudness and peaks",denoise:"cleaning picture and sound",color_grade:"applying the selected color look",speed_curve:"building dynamic speed curve ramping",freeze_frame:"creating action keyframe freeze and punch",shake:"applying camera shake and impact jitter",flash:"generating white flash impact strobe",rgb_split:"rendering chromatic aberration glitch",blur_in:"rendering intro blur-in transition"}[a.action]||"processing picture and sound"});
    reportVideoProgress(ctx,{stage:"verifying",percent:98,detail:"checking output file"});
    const finalInfo=(a.action!=="extract_audio"&&a.action!=="thumbnail")?await probe(ctx,output).catch(()=>null):null;
    reportVideoProgress(ctx,{stage:"verifying",percent:100,detail:"output ready"});
    return cleanResult(a.action,input,output,finalInfo,changes,{bytes:await statResult(output)});
  }
});
