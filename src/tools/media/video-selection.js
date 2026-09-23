import fs from "node:fs/promises";
import {openAsBlob} from "node:fs";
import os from "node:os";
import path from "node:path";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {runCli} from "../common/cli.js";
import {readable} from "../fs/common.js";
import {getSecret} from "../../config/loader.js";
import {fetchAuthorized} from "../../security/network.js";

const VIDEO_MASK_EXTS=new Set([".mp4",".mov",".mkv",".webm",".m4v",".avi"]),MAX_MASK_BYTES=1_000_000_000;
function expandHome(value=""){const text=String(value||"").trim();if(text==="~")return os.homedir();if(text.startsWith("~/"))return path.join(os.homedir(),text.slice(2));return text;}
function secretName(value,fallback){const name=String(value||fallback);if(!/^[A-Z_][A-Z0-9_]{1,127}$/.test(name))throw new Error(`invalid secret name: ${name}`);return name;}
function optionalSecret(name){if(process.env[name])return process.env[name];try{return getSecret(name);}catch{return null;}}
function isLoopback(url){const host=url.hostname.toLowerCase();return host==="localhost"||host.endsWith(".localhost")||host==="127.0.0.1"||host==="::1";}
function baseUrl(value){const url=new URL(String(value||""));if(!["http:","https:"].includes(url.protocol))throw new Error("video segmentation endpoint must use http or https");url.hash="";url.search="";if(!url.pathname.endsWith("/"))url.pathname+="/";return url;}

async function writeResponse(response,destination){
  const type=String(response.headers.get("content-type")||"").toLowerCase(),length=Number(response.headers.get("content-length")||0);if(!response.ok)throw new Error(`video segmentation backend failed with HTTP ${response.status}`);if(length>MAX_MASK_BYTES)throw new Error("temporal mask exceeds the 1 GB safety limit");if(!response.body||(!type.startsWith("video/")&&!type.includes("octet-stream")))throw new Error(`video segmentation backend returned ${type||"an unknown format"} instead of a temporal mask video`);const handle=await fs.open(destination,"w");try{await pipeline(Readable.fromWeb(response.body),handle.createWriteStream());}finally{await handle.close().catch(()=>{});}if((await fs.stat(destination)).size<256)throw new Error("video segmentation backend returned an empty temporal mask");
}

async function remoteTemporalMask(ctx,a,input,temp){
  const endpointName=secretName(a.temporalSegmentationEndpointEnv,"BLACKCORE_VIDEO_SEGMENT_ENDPOINT"),endpointValue=a.temporalSegmentationEndpoint||optionalSecret(endpointName);if(!endpointValue)return null;if(!String(a.regionPrompt||a.regionTarget||"").trim())throw new Error("temporal segmentation requires regionPrompt or regionTarget, for example 'window' or 'eyes'");const base=baseUrl(endpointValue);if(!isLoopback(base)&&a.allowRemote!==true)throw new Error("remote temporal segmentation requires allowRemote=true because the video leaves the phone");if(!isLoopback(base)&&ctx.cfg.permissionProfile==="safe")throw new Error("remote temporal segmentation is blocked by the safe permission profile");if(!isLoopback(base)&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Upload ${path.basename(input)} to ${base.origin} for temporal region tracking?`,false);if(!ok)throw new Error("remote temporal segmentation upload denied");}
  const form=new FormData(),tokenName=secretName(a.temporalSegmentationTokenEnv,"BLACKCORE_VIDEO_SEGMENT_TOKEN"),token=optionalSecret(tokenName),headers=token?{authorization:`Bearer ${token}`}:{ };form.append("video",await openAsBlob(input),path.basename(input));form.append("region_prompt",a.regionPrompt||a.regionTarget);form.append("output","grayscale-mask-video");form.append("white_means","edit-selected-region");form.append("tracking","temporal-consistent");const response=await fetchAuthorized(ctx,new URL("v1/video/mask",base),{method:"POST",headers,body:form},{maxRedirects:0}),destination=path.join(temp,"backend-mask.mp4");await writeResponse(response,destination);return {file:destination,source:"temporal-segmentation-backend"};
}

async function inspectMask(ctx,file){
  const probe=await runCli(ctx,"ffprobe",["-v","error","-select_streams","v:0","-show_entries","stream=width,height,codec_type:format=duration","-of","json",file],{allowFailure:true,timeoutMs:60000,maxChars:30000});if(probe.exitCode!==0)throw new Error(`could not inspect temporal mask: ${probe.output.slice(-1200)}`);let data;try{data=JSON.parse(probe.stdout||"{}");}catch{throw new Error("temporal mask metadata is invalid");}const stream=data.streams?.[0];if(!stream||stream.codec_type!=="video")throw new Error("temporal mask must contain a video stream, not a still image");return {width:Number(stream.width)||0,height:Number(stream.height)||0,duration:Number(data.format?.duration)||0};
}

async function maskCoverage(ctx,file,duration){
  const fps=Math.max(0.2,Math.min(2,120/Math.max(1,duration))),raw=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-video-mask-sample-")),sample=path.join(raw,"mask.gray");try{const result=await runCli(ctx,"ffmpeg",["-hide_banner","-nostats","-y","-i",file,"-map","0:v:0","-vf",`fps=${fps.toFixed(5)},scale=64:64:flags=fast_bilinear,format=gray`,"-frames:v","240","-f","rawvideo",sample],{allowFailure:true,timeoutMs:20*60*1000,maxChars:120000});if(result.exitCode!==0)throw new Error(`could not sample temporal mask: ${result.output.slice(-1600)}`);const bytes=await fs.readFile(sample);if(bytes.length<4096)throw new Error("temporal mask contains no usable frames");let sum=0;for(const value of bytes)sum+=value;return sum/(bytes.length*255);}finally{await fs.rm(raw,{recursive:true,force:true});}
}

export async function resolveVideoSelection(ctx,a,input,info,temp){
  let selection=null;if(a.maskVideo){const file=await readable(ctx,expandHome(a.maskVideo));if(!VIDEO_MASK_EXTS.has(path.extname(file).toLowerCase()))throw new Error("maskVideo must be an MP4, MOV, MKV, WebM, M4V or AVI temporal grayscale mask");selection={file,source:"manual-temporal-mask"};}if(!selection)selection=await remoteTemporalMask(ctx,a,input,temp);if(!selection)throw new Error("regional video editing has no temporal mask; global fallback is forbidden");const metadata=await inspectMask(ctx,selection.file),durationDifference=Math.abs(Number(info.duration||0)-metadata.duration),durationTolerance=Math.max(0.4,Number(info.duration||0)*0.025);if(!metadata.duration||durationDifference>durationTolerance)throw new Error(`temporal mask duration ${metadata.duration.toFixed(3)}s does not track the ${Number(info.duration||0).toFixed(3)}s source video`);const coverage=await maskCoverage(ctx,selection.file,metadata.duration);if(!(coverage>0.002&&coverage<0.985))throw new Error(`temporal mask covers ${(coverage*100).toFixed(1)}% of sampled frames; it must identify a real partial moving area`);return {...selection,metadata,coverage:Number(coverage.toFixed(6)),durationDifference:Number(durationDifference.toFixed(4))};
}
