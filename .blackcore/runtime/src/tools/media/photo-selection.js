import fs from "node:fs/promises";
import {openAsBlob} from "node:fs";
import os from "node:os";
import path from "node:path";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {available,runCli} from "../common/cli.js";
import {readable} from "../fs/common.js";
import {getSecret} from "../../config/loader.js";
import {fetchAuthorized} from "../../security/network.js";
import {configuredRembgModel} from "./photo-ai-config.js";

const IMAGE_EXTS=new Set([".jpg",".jpeg",".png",".webp",".avif",".heic",".heif",".tif",".tiff",".bmp"]);
const MAX_MASK_BYTES=30_000_000;

function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function round(value,digits=6){return Number((Number(value)||0).toFixed(digits));}
function expandHome(value=""){const text=String(value||"").trim();if(text==="~")return os.homedir();if(text.startsWith("~/"))return path.join(os.homedir(),text.slice(2));return text;}
function firstFrame(input){return `${input}[0]`;}
function secretName(value,fallback){const name=String(value||fallback);if(!/^[A-Z_][A-Z0-9_]{1,127}$/.test(name))throw new Error(`invalid secret name: ${name}`);return name;}
function optionalSecret(name){if(process.env[name])return process.env[name];try{return getSecret(name);}catch{return null;}}
function isLoopback(url){const host=url.hostname.toLowerCase();return host==="localhost"||host.endsWith(".localhost")||host==="127.0.0.1"||host==="::1";}
function baseUrl(value){const url=new URL(String(value||""));if(!["http:","https:"].includes(url.protocol))throw new Error("photo segmentation endpoint must use http or https");url.hash="";url.search="";if(!url.pathname.endsWith("/"))url.pathname+="/";return url;}
function imageEnv(){return {...process.env,MAGICK_THREAD_LIMIT:process.env.MAGICK_THREAD_LIMIT||"2",MAGICK_MEMORY_LIMIT:process.env.MAGICK_MEMORY_LIMIT||"768MiB",MAGICK_MAP_LIMIT:process.env.MAGICK_MAP_LIMIT||"2GiB"};}

async function maskCoverage(ctx,command,file){const result=await runCli(ctx,command,[firstFrame(file),"-alpha","off","-colorspace","Gray","-format","%[fx:mean]","info:"],{allowFailure:true,timeoutMs:120000,maxChars:30000,env:imageEnv()});if(result.exitCode!==0)throw new Error(`could not inspect selection mask: ${result.output.slice(-1000)}`);return Number(result.stdout.trim());}

async function writeResponse(response,destination){
  const type=String(response.headers.get("content-type")||"").toLowerCase(),length=Number(response.headers.get("content-length")||0);if(!response.ok)throw new Error(`photo segmentation backend failed with HTTP ${response.status}`);if(length>MAX_MASK_BYTES)throw new Error("photo segmentation mask exceeds the 30 MB safety limit");if(!response.body||(!type.startsWith("image/")&&!type.includes("octet-stream")))throw new Error(`photo segmentation backend returned ${type||"an unknown format"} instead of an image mask`);const handle=await fs.open(destination,"w");try{await pipeline(Readable.fromWeb(response.body),handle.createWriteStream());}finally{await handle.close().catch(()=>{});}if((await fs.stat(destination)).size<64)throw new Error("photo segmentation backend returned an empty mask");
}

async function remoteMask(ctx,a,input,temp,scope){
  if(scope==="detail"&&!String(a.regionPrompt||"").trim())throw new Error("detail editing through the segmentation backend requires regionPrompt, for example 'eyes', 'shirt' or 'grass'");
  const endpointName=secretName(a.segmentationEndpointEnv,"BLACKCORE_PHOTO_SEGMENT_ENDPOINT"),endpointValue=a.segmentationEndpoint||optionalSecret(endpointName);if(!endpointValue)return null;const base=baseUrl(endpointValue);if(!isLoopback(base)&&a.allowRemote!==true)throw new Error("remote photo segmentation requires allowRemote=true because the source photo leaves the phone");if(!isLoopback(base)&&ctx.cfg.permissionProfile==="safe")throw new Error("remote photo segmentation is blocked by the safe permission profile");if(!isLoopback(base)&&ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Upload ${path.basename(input)} to ${base.origin} to select ${scope}?`,false);if(!ok)throw new Error("remote photo segmentation upload denied");}
  const form=new FormData(),tokenName=secretName(a.segmentationTokenEnv,"BLACKCORE_PHOTO_SEGMENT_TOKEN"),token=optionalSecret(tokenName),headers=token?{authorization:`Bearer ${token}`}:{ };form.append("image",await openAsBlob(input),path.basename(input));form.append("scope",scope);form.append("region_prompt",a.regionPrompt||"");form.append("region_target",a.regionTarget||"");form.append("region_boxes",JSON.stringify(a.regionBoxes||[]));form.append("region_polygons",JSON.stringify(a.regionPolygons||[]));form.append("output","grayscale-mask");form.append("white_means","edit-selected-region");const response=await fetchAuthorized(ctx,new URL("v1/photo/mask",base),{method:"POST",headers,body:form},{maxRedirects:0}),destination=path.join(temp,"backend-mask.bin");await writeResponse(response,destination);return {file:destination,source:"backend",invert:false};
}

async function alphaMask(ctx,command,input,metadata,temp,scope){
  if(!/(?:alpha|a$)/i.test(String(metadata.channels||"")))return null;const file=path.join(temp,"alpha-mask.png"),result=await runCli(ctx,command,[firstFrame(input),"-auto-orient","-alpha","extract",file],{allowFailure:true,timeoutMs:180000,maxChars:50000,env:imageEnv()});if(result.exitCode!==0)return null;const coverage=await maskCoverage(ctx,command,file);if(!(coverage>0.005&&coverage<0.995))return null;return {file,source:"source-alpha",invert:scope==="background"};
}

async function rembgMask(ctx,command,input,temp,scope){
  const commands=await available(["rembg"]);if(!commands.rembg)return null;const model=await configuredRembgModel().catch(()=>null);if(!model)return null;const foreground=path.join(temp,"rembg-subject.png"),file=path.join(temp,"rembg-mask.png"),removed=await runCli(ctx,"rembg",["i","-m",model,"-dc",input,foreground],{allowFailure:true,timeoutMs:20*60*1000,maxChars:120000});if(removed.exitCode!==0)return null;const extracted=await runCli(ctx,command,[firstFrame(foreground),"-alpha","extract",file],{allowFailure:true,timeoutMs:180000,maxChars:50000,env:imageEnv()});if(extracted.exitCode!==0)return null;return {file,source:`rembg:${model}`,invert:scope==="background"};
}

function unit(value,name){const number=Number(value);if(!Number.isFinite(number)||number<0||number>1)throw new Error(`${name} must be a normalized number from 0 to 1`);return number;}

async function geometryMask(ctx,command,a,metadata,temp){
  const boxes=Array.isArray(a.regionBoxes)?a.regionBoxes:[],polygons=Array.isArray(a.regionPolygons)?a.regionPolygons:[];if(!boxes.length&&!polygons.length)return null;
  const file=path.join(temp,"geometry-mask.png"),args=["-size",`${metadata.width}x${metadata.height}`,"xc:black","-fill","white","-stroke","none"];
  for(const [index,box] of boxes.entries()){
    const x=unit(box.x,`regionBoxes[${index}].x`),y=unit(box.y,`regionBoxes[${index}].y`),width=unit(box.width,`regionBoxes[${index}].width`),height=unit(box.height,`regionBoxes[${index}].height`);if(width<0.002||height<0.002||x+width>1.000001||y+height>1.000001)throw new Error(`regionBoxes[${index}] must be a non-empty normalized box fully inside the photo`);
    const left=Math.round(x*metadata.width),top=Math.round(y*metadata.height),right=Math.max(left+1,Math.round((x+width)*metadata.width)),bottom=Math.max(top+1,Math.round((y+height)*metadata.height));
    if(box.shape==="ellipse"){const centerX=round((left+right)/2,3),centerY=round((top+bottom)/2,3),radiusX=round((right-left)/2,3),radiusY=round((bottom-top)/2,3);args.push("-draw",`ellipse ${centerX},${centerY} ${radiusX},${radiusY} 0,360`);}else args.push("-draw",`rectangle ${left},${top} ${right},${bottom}`);
  }
  for(const [index,polygon] of polygons.entries()){
    const points=Array.isArray(polygon?.points)?polygon.points:[];if(points.length<3)throw new Error(`regionPolygons[${index}] requires at least three normalized points`);const coordinates=points.map((point,pointIndex)=>`${Math.round(unit(point.x,`regionPolygons[${index}].points[${pointIndex}].x`)*metadata.width)},${Math.round(unit(point.y,`regionPolygons[${index}].points[${pointIndex}].y`)*metadata.height)}`).join(" ");args.push("-draw",`polygon ${coordinates}`);
  }
  args.push(file);const result=await runCli(ctx,command,args,{allowFailure:true,timeoutMs:180000,maxChars:80000,env:imageEnv()});if(result.exitCode!==0)throw new Error(`coordinate selection mask failed: ${result.output.slice(-1600)}`);return {file,source:polygons.length?boxes.length?"region-geometry":"region-polygons":"region-boxes",invert:false};
}

async function normalizeMask(ctx,command,selection,metadata,a,temp){
  const normalized=path.join(temp,"selection-mask.png"),feather=clamp(Number(a.maskFeather??2),0,32),expand=Math.round(clamp(Number(a.maskExpand??0),-32,32)),args=[firstFrame(selection.file),"-auto-orient","-resize",`${metadata.width}x${metadata.height}!`,"-alpha","off","-colorspace","Gray","-contrast-stretch","0%x0%"];
  if(selection.invert)args.push("-negate");if(expand>0)args.push("-morphology","Dilate",`Disk:${expand}`);else if(expand<0)args.push("-morphology","Erode",`Disk:${Math.abs(expand)}`);if(feather>0)args.push("-blur",`0x${feather}`);args.push(normalized);const result=await runCli(ctx,command,args,{allowFailure:true,timeoutMs:180000,maxChars:80000,env:imageEnv()});if(result.exitCode!==0)throw new Error(`selection mask normalization failed: ${result.output.slice(-1600)}`);const coverage=await maskCoverage(ctx,command,normalized);if(!(coverage>0.005&&coverage<0.995))throw new Error(`selection mask covers ${(coverage*100).toFixed(1)}% of the photo; choose a real partial area or use editScope=full`);return {...selection,file:normalized,coverage:round(coverage),feather,expand};
}

export async function resolvePhotoSelection(ctx,a,input,metadata,command,temp){
  const scope=String(a.editScope||"full");if(scope==="full")return null;let selection=null;
  if(a.mask){const file=await readable(ctx,expandHome(a.mask));if(!IMAGE_EXTS.has(path.extname(file).toLowerCase()))throw new Error("selection mask must be a JPG, PNG, WebP, AVIF, HEIC, TIFF or BMP image");selection={file,source:"manual-mask",invert:a.invertMask===true};}
  if(!selection)selection=await geometryMask(ctx,command,a,metadata,temp);
  if(!selection&&["subject","background"].includes(scope))selection=await alphaMask(ctx,command,input,metadata,temp,scope)||await rembgMask(ctx,command,input,temp,scope);
  if(!selection)selection=await remoteMask(ctx,a,input,temp,scope);
  if(!selection){if(scope==="detail")throw new Error("detail editing requires a mask or regionPrompt with BLACKCORE_PHOTO_SEGMENT_ENDPOINT configured");if(scope==="mask")throw new Error("editScope=mask requires a mask image; white pixels mark the area to edit");throw new Error(`${scope} selection needs source transparency, an installed rembg command, a manual mask, or BLACKCORE_PHOTO_SEGMENT_ENDPOINT`);}
  return normalizeMask(ctx,command,selection,metadata,a,temp);
}

export async function inspectPhotoSelectionCapabilities(ctx,a,input,metadata,command){
  const commands=await available(["rembg"]),endpointName=secretName(a.segmentationEndpointEnv,"BLACKCORE_PHOTO_SEGMENT_ENDPOINT"),semanticBackend=Boolean(a.segmentationEndpoint||optionalSecret(endpointName)),temp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-photo-capability-"));let meaningfulSourceAlpha=false;
  try{meaningfulSourceAlpha=Boolean(await alphaMask(ctx,command,input,metadata,temp,"subject"));}finally{await fs.rm(temp,{recursive:true,force:true});}
  return {manualMask:true,normalizedBoxesAndPolygons:true,meaningfulSourceAlpha,rembgInstalled:Boolean(commands.rembg),semanticBackend,automaticSubjectBackground:meaningfulSourceAlpha||Boolean(commands.rembg)||semanticBackend,namedDetail:semanticBackend,rembgInstallCommand:"bash scripts/install-photo-ai.sh --mode rembg",semanticSetupGuide:"docs/PHOTO-AI-INSTALLATION.md"};
}

export async function compositePhotoSelection(ctx,command,input,edited,mask,output){const result=await runCli(ctx,command,[firstFrame(input),"-auto-orient",firstFrame(edited),"-auto-orient","(",firstFrame(mask),"-alpha","off",")","-composite",output],{allowFailure:true,timeoutMs:20*60*1000,maxChars:160000,env:imageEnv()});if(result.exitCode!==0)throw new Error(`selected-area composite failed: ${result.output.slice(-1800)}`);}

async function sample(ctx,command,file,mode,destination){const args=[firstFrame(file),"-auto-orient","-resize","160x160!"];if(mode==="gray")args.push("-alpha","off","-colorspace","Gray");else args.push("-background","#7f7f7f","-alpha","remove","-alpha","off","-colorspace","sRGB");args.push("-depth","8",`${mode==="gray"?"gray":"rgb"}:${destination}`);const result=await runCli(ctx,command,args,{allowFailure:true,timeoutMs:180000,maxChars:60000,env:imageEnv()});if(result.exitCode!==0)throw new Error(`selected-area verification sampling failed: ${result.output.slice(-1200)}`);return fs.readFile(destination);}

export async function verifyPhotoSelection(ctx,command,input,output,mask,temp,{minimumInside=0.014}={}){
  const [before,after,weights]=await Promise.all([sample(ctx,command,input,"rgb",path.join(temp,"before.rgb")),sample(ctx,command,output,"rgb",path.join(temp,"after.rgb")),sample(ctx,command,mask,"gray",path.join(temp,"mask.gray"))]);let insideDelta=0,outsideDelta=0,insideWeight=0,outsideWeight=0,insideChanged=0,insidePixels=0;const pixels=Math.min(weights.length,Math.floor(before.length/3),Math.floor(after.length/3));for(let index=0;index<pixels;index++){const weight=weights[index]/255,outside=1-weight,offset=index*3,delta=(Math.abs(before[offset]-after[offset])+Math.abs(before[offset+1]-after[offset+1])+Math.abs(before[offset+2]-after[offset+2]))/(3*255);insideDelta+=delta*weight;outsideDelta+=delta*outside;insideWeight+=weight;outsideWeight+=outside;if(weight>0.5){insidePixels++;if(delta>0.025)insideChanged++;}}
  const insideMean=insideDelta/Math.max(1,insideWeight),outsideMean=outsideDelta/Math.max(1,outsideWeight),insideChangedFraction=insideChanged/Math.max(1,insidePixels),outsideLimit=Math.max(0.004,insideMean*0.08),passed=insideMean>minimumInside&&insideChangedFraction>0.04&&outsideMean<=outsideLimit;return {passed,insideMean:round(insideMean),outsideMean:round(outsideMean),insideChangedFraction:round(insideChangedFraction),minimumInside,outsideLimit:round(outsideLimit),pixels};
}
