import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {defineTool} from "../registry.js";
import {available,runCli} from "../common/cli.js";
import {capture,ensureParent,readable,writable} from "../fs/common.js";
import {analyzePhotoFrame,buildAutoPhotoPlan,photoCropGeometry} from "./photo-analysis.js";
import {photoEffectPack,resolvePhotoEffectPreset,photoEffectPresetTokens} from "./photo-effects.js";
import {applySupremePipeline,buildSkinMask,hasSupremeArguments,SUPREME_KEYS,SUPREME_DEFAULTS,TONE_CURVES,HSL_BANDS,MAX_ENGINE_PIXELS} from "./photo-supreme.js";
import {outfitEditorTool} from "./outfit-editor.js";
import {reportPhotoProgress} from "./photo-progress.js";
import {resolvePhotoSelection,compositePhotoSelection,verifyPhotoSelection,inspectPhotoSelectionCapabilities} from "./photo-selection.js";
import {buildPhotoAdvice} from "./photo-advisor.js";
import {preparePhotoRegionalArgs} from "./regional-intent.js";
import {configuredRembgModel} from "./photo-ai-config.js";

const PHOTO_EXTS=new Set([".jpg",".jpeg",".png",".webp",".avif",".heic",".heif",".tif",".tiff",".bmp",".gif"]);
const OUTPUT_EXTS=new Set([".jpg",".jpeg",".png",".webp",".avif",".heic",".tif",".tiff",".bmp"]);
const FORMAT_EXT={jpg:".jpg",jpeg:".jpg",png:".png",webp:".webp",avif:".avif",heic:".heic",tiff:".tiff",bmp:".bmp"};
const BRAND_WATERMARK=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../assets/blackcore-photo-watermark.png");
const PHOTO_TIMEOUT_MS=45*60*1000;
const ACTIONS=["list_images","list_effects","inspect","analyze","auto_edit","supreme_edit","change_outfit","remove_background","replace_background","crop","resize","rotate","flip","adjust_light","adjust_color","enhance_details","denoise","blur","overlay_text","watermark","convert","compress"];
const SELECTIVE_ACTIONS=new Set(["auto_edit","supreme_edit","adjust_light","adjust_color","enhance_details","denoise","blur"]);
const TONE_CURVE_NAMES=Object.keys(TONE_CURVES);

function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function round(value,digits=4){return Number((Number(value)||0).toFixed(digits));}
function expandHome(value=""){const text=String(value||"").trim();if(text==="~")return os.homedir();if(text.startsWith("~/"))return path.join(os.homedir(),text.slice(2));return text;}
function firstFrame(input){return `${input}[0]`;}
function gravity(position="center"){
  return ({"top-left":"NorthWest",top:"North","top-right":"NorthEast",left:"West",center:"Center",right:"East","bottom-left":"SouthWest",bottom:"South","bottom-right":"SouthEast"})[position]||"Center";
}
function safeColor(value,fallback){const text=String(value||"").trim();return /^(?:#[0-9a-fA-F]{3,8}|[A-Za-z]{3,24}|rgba?\([0-9.,% ]+\))$/.test(text)?text:fallback;}
function imageEnv(){return {...process.env,MAGICK_THREAD_LIMIT:process.env.MAGICK_THREAD_LIMIT||"2",MAGICK_MEMORY_LIMIT:process.env.MAGICK_MEMORY_LIMIT||"768MiB",MAGICK_MAP_LIMIT:process.env.MAGICK_MAP_LIMIT||"2GiB"};}

async function imageCommand(){const commands=await available(["magick","convert"]),command=commands.magick?"magick":commands.convert?"convert":null;if(!command)throw new Error("ImageMagick is required. In Termux run: pkg install imagemagick");return command;}

async function listImages(root,{query="",limit=80,maxDepth=4}={}){
  const needle=String(query||"").trim().toLowerCase(),files=[];let visited=0;
  async function walk(directory,depth){
    if(depth>maxDepth||files.length>=limit||visited>=4000)return;
    let rows=[];try{rows=await fs.readdir(directory,{withFileTypes:true});}catch{return;}
    for(const row of rows){
      if(files.length>=limit||visited++>=4000)break;const full=path.join(directory,row.name);
      if(row.isDirectory()){if(!row.name.startsWith("."))await walk(full,depth+1);continue;}
      if(!row.isFile()||!PHOTO_EXTS.has(path.extname(row.name).toLowerCase()))continue;
      if(needle&&!row.name.toLowerCase().includes(needle)&&!full.toLowerCase().includes(needle))continue;
      let stat=null;try{stat=await fs.stat(full);}catch{}files.push({path:full,name:row.name,bytes:stat?.size??null,modifiedAt:stat?.mtime?.toISOString?.()??null});
    }
  }
  await walk(root,0);return files;
}

async function inspectPhoto(ctx,command,input){
  const format="%m\\n%w\\n%h\\n%[orientation]\\n%[colorspace]\\n%[channels]\\n%z\\n%Q\\n%n",result=await runCli(ctx,command,[firstFrame(input),"-auto-orient","-format",format,"info:"],{allowFailure:true,timeoutMs:120000,maxChars:30000,env:imageEnv()});
  if(result.exitCode!==0)throw new Error(`ImageMagick could not read the photo: ${result.output.slice(-1200)}`);
  const rows=result.stdout.trim().split(/\r?\n/);return {format:rows[0]||path.extname(input).slice(1).toUpperCase(),width:Number(rows[1])||0,height:Number(rows[2])||0,orientation:rows[3]||"Undefined",colorspace:rows[4]||null,channels:rows[5]||null,depth:Number(rows[6])||null,quality:Number(rows[7])||null,frames:Number(rows[8])||1};
}

function sampleSize(width,height,max=144){const scale=Math.min(1,max/Math.max(1,width,height));return {width:Math.max(8,Math.round(width*scale)),height:Math.max(8,Math.round(height*scale))};}

async function analyzePhoto(ctx,command,input,metadata){
  const size=sampleSize(metadata.width,metadata.height),tmp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-photo-iq-")),raw=path.join(tmp,"sample.rgb");
  try{
    const result=await runCli(ctx,command,[firstFrame(input),"-auto-orient","-background","white","-alpha","remove","-alpha","off","-resize",`${size.width}x${size.height}!`,"-depth","8",`rgb:${raw}`],{allowFailure:true,timeoutMs:180000,maxChars:80000,env:imageEnv()});
    if(result.exitCode!==0)throw new Error(`photo analysis failed: ${result.output.slice(-1400)}`);
    const frame=await fs.readFile(raw);return {...analyzePhotoFrame(frame,size.width,size.height),sample:{width:size.width,height:size.height}};
  }finally{await fs.rm(tmp,{recursive:true,force:true});}
}

function defaultExtension(input,a={}){
  if(a.action==="remove_background")return ".png";
  if(a.format&&FORMAT_EXT[a.format])return FORMAT_EXT[a.format];const inputExt=path.extname(input).toLowerCase();
  if(OUTPUT_EXTS.has(inputExt))return inputExt===".jpeg"?".jpg":inputExt;
  return ".jpg";
}

function defaultOutput(input,a={}){
  const parsed=path.parse(input),suffix=a.action==="compress"?"blackcore-compressed":a.action==="crop"?"blackcore-cropped":a.action==="remove_background"?"blackcore-no-background":a.action==="replace_background"?"blackcore-new-background":"blackcore-edited";
  return path.join(parsed.dir,`${parsed.name}-${suffix}${defaultExtension(input,a)}`);
}

async function resolveOutput(ctx,value,input,a){
  const target=expandHome(value||defaultOutput(input,a)),extension=path.extname(target).toLowerCase();if(!OUTPUT_EXTS.has(extension))throw new Error(`unsupported output image format: ${extension||"missing extension"}`);
  const output=await writable(ctx,target);if(path.resolve(output)===path.resolve(input))throw new Error("output must be different from input; the original photo is always preserved");await capture(ctx,output);await ensureParent(output);return output;
}

function addChannelMultiplier(args,channel,value){if(Math.abs(Number(value)-1)<0.001)return;args.push("-channel",channel,"-evaluate","multiply",String(round(value,4)),"+channel");}

function addAutoPlan(args,plan){
  if(plan.denoise>0)for(let index=0;index<plan.denoise;index++)args.push("-despeckle");
  addChannelMultiplier(args,"R",plan.red);addChannelMultiplier(args,"G",plan.green);addChannelMultiplier(args,"B",plan.blue);
  if(Math.abs(plan.gamma-1)>0.001)args.push("-gamma",String(plan.gamma));
  if(Math.abs(plan.brightness)>0.01||Math.abs(plan.contrast)>0.01)args.push("-brightness-contrast",`${plan.brightness}x${plan.contrast}`);
  if(plan.blackPoint>0||plan.whitePoint<100)args.push("-level",`${plan.blackPoint}%,${plan.whitePoint}%,1.0`);
  if(plan.sigmoidContrast>0)args.push("-sigmoidal-contrast",`${plan.sigmoidContrast}x${plan.sigmoidMidpoint}%`);
  if(Math.abs(plan.saturation-100)>0.01)args.push("-modulate",`100,${plan.saturation},100`);
  if(plan.unsharp)args.push("-unsharp",`0x${plan.unsharp.sigma}+${plan.unsharp.amount}+${plan.unsharp.threshold}`);
  if(plan.monochrome)args.push("-colorspace","Gray","-colorspace","sRGB");
}

function explicitCrop(a,metadata,analysis){
  if(a.cropWidth||a.cropHeight||a.x!==undefined||a.y!==undefined){
    const width=Math.round(Number(a.cropWidth||a.width)||metadata.width),height=Math.round(Number(a.cropHeight||a.height)||metadata.height),x=Math.round(Number(a.x)||0),y=Math.round(Number(a.y)||0);
    if(!(width>0&&height>0)||x<0||y<0||x+width>metadata.width||y+height>metadata.height)throw new Error(`crop ${width}x${height}+${x}+${y} is outside the ${metadata.width}x${metadata.height} photo`);
    return {width,height,x,y,aspectRatio:"custom",focus:null};
  }
  const ratio=a.aspectRatio||"original",crop=photoCropGeometry(metadata.width,metadata.height,ratio,analysis.focus);if(!crop&&a.action==="crop")throw new Error("crop requires aspectRatio or cropWidth/cropHeight");return crop;
}

function addResize(args,a){
  if(!a.width&&!a.height)return null;const width=a.width?Math.round(a.width):null,height=a.height?Math.round(a.height):null,mode=a.resizeMode||"fit",geometry=`${width||""}x${height||""}`;
  if(mode==="stretch")args.push("-resize",`${geometry}!`);
  else if(mode==="fill"&&width&&height)args.push("-resize",`${geometry}^` ,"-gravity",gravity(a.position||"center"),"-extent",geometry);
  else args.push("-resize",`${geometry}${a.allowUpscale===true?"":">"}`);
  return {width,height,mode};
}

async function watermarkSpec(a,ctx){
  if(!a.overlay&&a.brandWatermark!==true&&a.action!=="watermark")return null;
  const file=a.overlay?await readable(ctx,expandHome(a.overlay)):await fs.access(BRAND_WATERMARK).then(()=>BRAND_WATERMARK).catch(()=>null);if(!file)throw new Error("watermark image is unavailable");return {file,brand:!a.overlay};
}

function addWatermark(args,spec,a,metadata){
  if(!spec)return null;const width=Math.max(24,Math.round(Number(a.overlayWidth)||metadata.width*0.2)),opacity=clamp(Number(a.opacity??0.68),0.05,1),margin=Math.max(0,Math.round(Number(a.margin??24))),position=a.position||a.watermarkPosition||"bottom-right";
  args.push("(",firstFrame(spec.file),"-auto-orient","-resize",`${width}x`,"-alpha","set","-channel","A","-evaluate","multiply",String(round(opacity,3)),"+channel",")","-gravity",gravity(position),"-geometry",`+${margin}+${margin}`,"-composite");return {width,opacity,position,brand:spec.brand};
}

function addText(args,a,metadata){
  if(!a.text)return null;const position=a.position||"bottom",margin=Math.max(0,Math.round(Number(a.margin??32))),fontSize=Math.max(8,Math.round(Number(a.fontSize)||metadata.width*0.045)),font=String(a.font||"DejaVu-Sans").replace(/[^A-Za-z0-9._+-]/g,""),fill=safeColor(a.fontColor,"white"),stroke=safeColor(a.strokeColor,"#000000B0"),strokeWidth=clamp(Number(a.strokeWidth??Math.max(1,fontSize*0.045)),0,20),offset=position.startsWith("top")?`+0+${margin}`:position.startsWith("bottom")||position==="bottom"?`+0+${margin}`:"+0+0";
  args.push("-gravity",gravity(position),"-font",font,"-pointsize",String(fontSize),"-fill",fill,"-stroke",stroke,"-strokewidth",String(round(strokeWidth,2)));if(a.textBox!==false)args.push("-undercolor",safeColor(a.boxColor,"#00000070"));args.push("-annotate",offset,String(a.text));return {text:String(a.text),position,fontSize};
}

function explicitEdits(args,a,changes){
  if(a.action==="rotate"){const degrees=Number(a.degrees);if(!Number.isFinite(degrees)||Math.abs(degrees)>360)throw new Error("degrees between -360 and 360 required");args.push("-rotate",String(degrees));changes.push(`rotated the photo ${degrees} degrees`);}
  if(a.action==="flip"){const direction=a.direction||"horizontal";args.push(direction==="vertical"?"-flip":"-flop");changes.push(`flipped the photo ${direction}ly`);}
  if(a.action==="adjust_light"){
    const brightness=clamp(Number(a.brightness)||0,-100,100),contrast=clamp(Number(a.contrast)||0,-100,100),gamma=clamp(Number(a.gamma)||1,0.2,3),exposure=clamp(Number(a.exposure)||0,-3,3);if(exposure)args.push("-evaluate","multiply",String(round(2**exposure,5)));if(Math.abs(gamma-1)>0.001)args.push("-gamma",String(gamma));if(brightness||contrast)args.push("-brightness-contrast",`${brightness}x${contrast}`);changes.push("adjusted exposure, brightness, contrast and gamma as requested");
  }
  if(a.action==="adjust_color"){
    const saturation=clamp(Number(a.saturation)||0,-100,100),vibrance=clamp(Number(a.vibrance)||0,-100,100),hue=clamp(Number(a.hue)||0,-180,180),temperature=clamp(Number(a.temperature)||0,-1,1),tint=clamp(Number(a.tint)||0,-1,1);if(temperature){addChannelMultiplier(args,"R",1+temperature*0.045);addChannelMultiplier(args,"B",1-temperature*0.045);}if(tint)addChannelMultiplier(args,"G",1+tint*0.035);if(saturation||vibrance||hue)args.push("-modulate",`100,${clamp(100+saturation+vibrance*0.45,0,200)},${clamp(100+hue*100/180,0,200)}`);if(a.monochrome===true)args.push("-colorspace","Gray","-colorspace","sRGB");changes.push(a.monochrome===true?"created a controlled monochrome finish":"adjusted white balance, saturation, vibrance and hue as requested");
  }
  if(a.action==="enhance_details"){const amount=clamp(Number(a.detailAmount??1),0.1,3),sigma=round(0.7+amount*0.25,2);args.push("-unsharp",`0x${sigma}+${round(0.45+amount*0.45,2)}+0.015`);changes.push("enhanced fine details with controlled sharpening");}
  if(a.action==="denoise"){const strength=Math.max(1,Math.min(3,Math.round(Number(a.denoiseStrength)||1)));for(let index=0;index<strength;index++)args.push("-despeckle");if(strength>=3)args.push("-blur","0x0.25");changes.push(`reduced image noise at strength ${strength}`);}
  if(a.action==="blur"){const radius=clamp(Number(a.blurRadius)||2,0.1,50);args.push("-blur",`0x${radius}`);changes.push(`applied ${radius}px blur`);}
}

function addEncoding(args,a,output){
  const extension=path.extname(output).toLowerCase(),quality=Math.round(clamp(Number(a.quality??(a.action==="compress"?82:92)),1,100));if(a.stripMetadata===true||a.action==="compress")args.push("-strip");
  if(extension===".jpg"||extension===".jpeg")args.push("-background",safeColor(a.backgroundColor,"white"),"-alpha","remove","-alpha","off","-sampling-factor","4:2:0","-interlace","Plane","-quality",String(quality));
  else if(extension===".png")args.push("-define",`png:compression-level=${a.action==="compress"?9:6}`);
  else if([".webp",".avif",".heic"].includes(extension))args.push("-quality",String(quality));
  else if(a.quality!==undefined)args.push("-quality",String(quality));
  return quality;
}

async function renderPhoto(ctx,command,args,output){const result=await runCli(ctx,command,[...args,output],{allowFailure:true,timeoutMs:PHOTO_TIMEOUT_MS,maxChars:250000,env:imageEnv()});if(result.exitCode!==0)throw new Error(`photo render failed: ${result.output.slice(-3000)}`);return result;}

// ------------------------------------------------------------- Supreme pixel engine
function supremeArguments(a,preset){
  const collected={};
  for(const key of SUPREME_KEYS){if(a[key]!==undefined&&a[key]!==null)collected[key]=a[key];}
  if(preset?.supreme)for(const[key,value]of Object.entries(preset.supreme))if(collected[key]===undefined||collected[key]===null)collected[key]=value;
  if(a.portraitBlur!==undefined&&a.portraitBlur!==null)collected.portraitBlur=a.portraitBlur;
  return collected;
}

async function readRawFrame(ctx,command,file,width,height,temp){
  const raw=path.join(temp,"supreme-frame.rgb");
  const result=await runCli(ctx,command,[firstFrame(file),"-auto-orient","-alpha","off","-background","white","-colorspace","sRGB","-depth","8","rgb:"+raw],{allowFailure:true,timeoutMs:PHOTO_TIMEOUT_MS,maxChars:120000,env:imageEnv()});
  if(result.exitCode!==0)throw new Error(`Supreme engine could not decode the photo: ${result.output.slice(-1600)}`);
  const bytes=await fs.readFile(raw);
  if(bytes.length!==width*height*3)throw new Error(`Supreme engine expected ${width*height*3} RGB bytes and received ${bytes.length}`);
  return bytes;
}

async function writeRawFrame(ctx,command,buffer,width,height,temp,output,quality=92){
  const raw=path.join(temp,"supreme-out.rgb");
  await fs.writeFile(raw,buffer.subarray(0,width*height*3));
  const extension=path.extname(output).toLowerCase();
  const args=["-size",`${width}x${height}`,"-depth","8",`rgb:${raw}`,"-colorspace","sRGB"];
  if([".jpg",".jpeg"].includes(extension))args.push("-sampling-factor","4:4:4","-interlace","Plane","-quality",String(Math.max(quality,88)));
  else if(extension===".png")args.push("-define","png:compression-level=6");
  else args.push("-quality",String(Math.max(quality,88)));
  await renderPhoto(ctx,command,args,output);
  return output;
}

async function writeGrayMask(ctx,command,plane,width,height,temp,name){
  const gray=path.join(temp,`${name}.gray`),file=path.join(temp,`${name}.png`);
  await fs.writeFile(gray,plane);
  await renderPhoto(ctx,command,["-size",`${width}x${height}`,"-depth","8",`gray:${gray}`],file);
  return file;
}

async function runSupremeStage(ctx,command,input,output,metadata,analysis,spec,temp,{skinMask=false,quality=92}={}){
  const raw=await readRawFrame(ctx,command,input,metadata.width,metadata.height,temp);
  const result=applySupremePipeline(raw,metadata.width,metadata.height,spec,{focus:analysis?.focus||null});
  let mask=null;
  if(skinMask){
    const built=buildSkinMask(raw,metadata.width,metadata.height,{});
    if(!(built.coverage>0.0008&&built.coverage<0.6))throw new Error(`skin-tone selection matched only ${(built.coverage*100).toFixed(2)}% of the photo (${built.coverage<0.0008?"this image carries almost no skin chroma; it looks monochrome or heavily stylised":"the chroma band covered nearly the whole frame"}); pass mask= with a real mask, use regionBoxes, or grade the full photo`);
    mask={file:await writeGrayMask(ctx,command,built.mask,metadata.width,metadata.height,temp,"supreme-skin-mask"),coverage:round(built.coverage,6),source:"measured Cb/Cr skin chroma band"};
  }
  await writeRawFrame(ctx,command,result.raw,metadata.width,metadata.height,temp,output,quality);
  return {applied:result.applied,mask};
}

function supremeKeystone(a,metadata){
  const width=metadata.width,height=metadata.height;
  const border=String(a.frame||"").trim().toLowerCase();
  if(!border||border==="none")return null;
  const named={white:"#ffffff",black:"#000000","off-white":"#f7f3ee",cream:"#f3e6c8",film:"#1a1a1c",polaroid:"#ffffff"}[border]||safeColor(border,"#ffffff");
  const edge=Math.max(1,Math.round(clamp(Number(a.frameWidth)||6,0.5,30)*Math.min(width,height)/100));
  const bottom=border==="polaroid"?Math.round(edge*3.6):edge;
  return {color:named,width:edge,top:edge,right:edge,bottom,left:edge,target:{width:width+edge*2,height:height+edge+bottom}};
}

async function applyFrame(ctx,command,file,frame,changes){
  if(!frame)return null;
  const framed=path.join(path.dirname(file),`.frame-${path.basename(file)}`);
  const gravities=[["North",`0x${frame.top}`],["South",`0x${frame.bottom}`],["West",`${frame.left}x0`],["East",`${frame.right}x0`]];
  const args=[firstFrame(file),"-background",frame.color];
  for(const[gravity,geometry]of gravities)if(geometry!=="0x0")args.push("-gravity",gravity,"-splice",geometry);
  await renderPhoto(ctx,command,args,framed);
  await fs.rename(framed,file);
  changes.push(`framed the photo with a ${frame.width}px ${frame.color} ${frame.bottom>frame.top?"polaroid ":""}keystone border`);
  return {color:frame.color,width:frame.width,top:frame.top,bottom:frame.bottom};
}

async function buildSkinSelection(ctx,command,input,metadata,a,temp){
  const raw=await readRawFrame(ctx,command,input,metadata.width,metadata.height,temp);
  const built=buildSkinMask(raw,metadata.width,metadata.height,{skinBand:a.skinBandTight===true?{cbMin:0.36,cbMax:0.50,crMin:0.56,crMax:0.71,lMin:0.12,lMax:0.90}:undefined});
  if(!(built.coverage>0.0008&&built.coverage<0.6))throw new Error(`the measured skin chroma band only matched ${(built.coverage*100).toFixed(2)}% of this photo (${built.coverage<0.0008?"it carries almost no skin colour, so it reads as monochrome or heavily stylised":"it covered nearly the whole frame"}). Pass a real mask image, use regionBoxes, or grade the full photo instead`);
  const feather=clamp(Number(a.maskFeather??6),0,32),expand=Math.round(clamp(Number(a.maskExpand??0),-32,32));
  const normalized=path.join(temp,"skin-selection.png"),args=[firstFrame(await writeGrayMask(ctx,command,built.mask,metadata.width,metadata.height,temp,"skin-raw")),"-alpha","off","-colorspace","Gray"];
  if(expand>0)args.push("-morphology","Dilate",`Disk:${expand}`);else if(expand<0)args.push("-morphology","Erode",`Disk:${Math.abs(expand)}`);
  if(feather>0)args.push("-blur",`0x${feather}`);
  args.push("-evaluate","multiply","1.35","-clamp");
  await renderPhoto(ctx,command,args,normalized);
  const probe=await runCli(ctx,command,[firstFrame(normalized),"-format","%[fx:mean]","info:"],{allowFailure:true,timeoutMs:120000,maxChars:8000,env:imageEnv()});
  const coverage=clamp(Number(probe.stdout)||built.coverage,0,1);
  if(!(coverage>0.002&&coverage<0.75))throw new Error(`the generated skin mask covers ${(coverage*100).toFixed(1)}% of the photo; use editScope=full or supply a manual mask`);
  return {file:normalized,coverage:round(coverage),feather,expand,source:"measured Cb/Cr skin chroma"};
}

async function requireRembg(){const commands=await available(["rembg"]);if(!commands.rembg)throw new Error("background operations require rembg; run: bash scripts/install-photo-ai.sh --mode rembg");return commands.rembg;}
async function runRembg(ctx,input,output){const model=await configuredRembgModel(),result=await runCli(ctx,"rembg",["i","-m",model,"-dc",input,output],{allowFailure:true,timeoutMs:20*60*1000,maxChars:160000});if(result.exitCode!==0)throw new Error(`rembg could not process the photo: ${result.output.slice(-2500)}`);return {model};}

async function executeBackgroundOperation(ctx,command,a,input,output,metadata,progress,changes){
  if(a.action==="remove_background"&&!/[.]png$|[.]webp$/i.test(output))throw new Error("remove_background requires a transparent PNG or WebP output");
  const rembg=await requireRembg(),temp=await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-photo-background-"));
  try{
    const cutout=path.join(temp,"subject.png");progress("masking",52,"creating a subject alpha mask with rembg",8);const model=await runRembg(ctx,input,cutout);
    if(a.action==="remove_background"){
      const args=[firstFrame(cutout),"-auto-orient"];addEncoding(args,a,output);await renderPhoto(ctx,command,args,output);changes.push(`removed the background with the ${model.model} local model and preserved transparent edges`);
    }else{
      const backgroundPath=expandHome(a.backgroundInput||"");if(!backgroundPath)throw new Error("replace_background requires backgroundInput with a second image");const background=await readable(ctx,backgroundPath),geometry=`${metadata.width}x${metadata.height}`,args=[firstFrame(background),"-auto-orient","-resize",`${geometry}^`,"-gravity","center","-extent",geometry,firstFrame(cutout),"-compose","over","-composite"];addEncoding(args,a,output);await renderPhoto(ctx,command,args,output);changes.push(`replaced the background with ${path.basename(background)} while keeping the subject cutout`);
    }
    const outputMetadata=await inspectPhoto(ctx,command,output);if(a.action==="remove_background"&&!/(?:alpha|a$)/i.test(String(outputMetadata.channels||"")))throw new Error("background removal did not produce a transparent output");
    const verification=await verifyPhoto(ctx,input,output,metadata,outputMetadata,{minimumDelta:0.00005});if(!verification.changed){await fs.rm(output,{force:true});throw new Error("background operation produced no measurable change; no fake edited copy was delivered");}
    return {outputMetadata,verification,model:model.model};
  }finally{await fs.rm(temp,{recursive:true,force:true});}
}

async function verifyPhoto(ctx,input,output,sourceMetadata,outputMetadata,{minimumDelta=0.00005}={}){
  const dimensionChanged=sourceMetadata.width!==outputMetadata.width||sourceMetadata.height!==outputMetadata.height,commands=await available(["compare"]);let normalizedRmse=null;
  if(!dimensionChanged&&commands.compare){const result=await runCli(ctx,"compare",["-metric","RMSE",firstFrame(input),firstFrame(output),"null:"],{allowFailure:true,timeoutMs:180000,maxChars:30000,env:imageEnv()}),match=result.output.match(/\(([0-9.eE+-]+)\)/);if(match)normalizedRmse=round(Number(match[1]),7);}
  return {changed:dimensionChanged||normalizedRmse===null||normalizedRmse>minimumDelta,dimensionChanged,normalizedRmse,minimumDelta};
}

function slimAnalysis(analysis){return {environment:{primary:analysis.environment.primary,tags:analysis.environment.tags,confidence:analysis.environment.confidence},light:analysis.light,color:analysis.color,detail:analysis.detail,focus:{x:analysis.focus.x,y:analysis.focus.y,confidence:analysis.focus.confidence}};}

export const photoEditorTool=defineTool({
  name:"photo_editor",
  description:"Supremo Photo Studio v4.0 for Termux/Android. analyze is a read-only consultation. supreme_edit runs the local BLACKCORE pixel engine: real tone curves (s-curve, cinematic, matte, punchy, elevated, crushed, reverse-s, filmic), exposure/blacks/whites, shadow and highlight zones, local clarity, vibrance with Cb/Cr skin-tone protection, per-hue-band HSL, automatic or illuminant white balance, duotone/gradient map, vignette, film grain, studio relight, neon glow, light leak, RGB glitch and portrait depth blur. photoPreset accepts every id and alias returned by list_effects, including polish-* and supremo-* finishes. Every natural edit request must be copied verbatim into request. Localized wording such as window, eyes, face, hair, clothing, sky, water, grass, mountain, subject or background is converted to a strict regional scope: it can use a semantic mask, manual mask, or normalized regionBoxes/regionPolygons, but can never silently fall back to the whole photo. editScope selects full, subject, background, detail or mask. list_effects exposes local reproducible finishes; photoPreset selects one for auto_edit. remove_background and replace_background use an installed rembg model and never pretend to work when it is unavailable. Cropping happens only when requested. The original is never overwritten, and both global and selected-area pixel gates reject fake, invisible or leaking edits.",
  mutates:true,
  planSafe:a=>["list_images","list_effects","inspect","analyze"].includes(a.action),
  parameters:{type:"object",additionalProperties:false,properties:{
    action:{type:"string",enum:ACTIONS},input:{type:"string",maxLength:4096},output:{type:"string",maxLength:4096},directory:{type:"string",maxLength:4096},query:{type:"string",maxLength:200},limit:{type:"integer",minimum:1,maximum:200},
    photoPreset:{type:"string",enum:photoEffectPresetTokens()},toneCurve:{type:"string",enum:TONE_CURVE_NAMES},toneCurvePoints:{type:"array",minItems:2,maxItems:12,items:{type:"object",additionalProperties:false,properties:{x:{type:"number",minimum:0,maximum:1},y:{type:"number",minimum:0,maximum:1}},required:["x","y"]}},toneCurveStrength:{type:"number",minimum:0,maximum:2},shadows:{type:"number",minimum:-100,maximum:100},highlights:{type:"number",minimum:-100,maximum:100},whites:{type:"number",minimum:-100,maximum:100},blacks:{type:"number",minimum:-100,maximum:100},clarity:{type:"number",minimum:-100,maximum:100},hsl:{type:"object",additionalProperties:false,properties:{hue:{type:"object",additionalProperties:false,properties:Object.fromEntries(HSL_BANDS.map(band=>[band,{type:"number",minimum:-100,maximum:100}]))},saturation:{type:"object",additionalProperties:false,properties:Object.fromEntries(HSL_BANDS.map(band=>[band,{type:"number",minimum:-100,maximum:100}]))},lightness:{type:"object",additionalProperties:false,properties:Object.fromEntries(HSL_BANDS.map(band=>[band,{type:"number",minimum:-100,maximum:100}]))},mix:{type:"number",minimum:0,maximum:100}}},skinToneProtection:{type:"number",minimum:0,maximum:100},duotone:{type:"object",additionalProperties:false,properties:{shadow:{type:"string",maxLength:24},highlight:{type:"string",maxLength:24},mix:{type:"number",minimum:0,maximum:100}}},vignette:{type:"number",minimum:-100,maximum:100},vignetteMidpoint:{type:"number",minimum:10,maximum:100},filmGrain:{type:"number",minimum:0,maximum:100},grainSize:{type:"string",enum:["fine","medium","coarse"]},studioRelight:{type:"number",minimum:-100,maximum:100},lightLeak:{type:"object",additionalProperties:false,properties:{intensity:{type:"number",minimum:0,maximum:100},color:{type:"string",maxLength:24},direction:{type:"string",enum:["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]}}},neonGlow:{type:"number",minimum:0,maximum:100},glitch:{type:"number",minimum:0,maximum:100},portraitBlur:{type:"number",minimum:0,maximum:100},whiteBalance:{type:"string",enum:["auto","tungsten","fluorescent","daylight","cloudy","shade","custom","none"]},whiteBalanceStrength:{type:"number",minimum:0,maximum:1},autoWhiteBalance:{type:"boolean"},frame:{type:"string",maxLength:24},frameWidth:{type:"number",minimum:0.5,maximum:30},editLevel:{type:"string",enum:["basic","medium","high"]},visualStyle:{type:"string",enum:["natural","cinematic","blackcore-dark"]},strength:{type:"number",minimum:0,maximum:1},enhanceLight:{type:"boolean"},enhanceColor:{type:"boolean"},enhanceDetails:{type:"boolean"},denoise:{type:"boolean"},
    editScope:{type:"string",enum:["full","subject","background","detail","mask","skin"]},baseGrade:{type:"boolean"},skinBandTight:{type:"boolean"},regionTarget:{type:"string",enum:["eyes","window","face","hair","clothing","sky","water","grass","mountain","background","subject","custom"]},regionPrompt:{type:"string",maxLength:300},regionBoxes:{type:"array",minItems:1,maxItems:16,items:{type:"object",additionalProperties:false,properties:{x:{type:"number",minimum:0,maximum:1},y:{type:"number",minimum:0,maximum:1},width:{type:"number",minimum:0.002,maximum:1},height:{type:"number",minimum:0.002,maximum:1},shape:{type:"string",enum:["rectangle","ellipse"]}},required:["x","y","width","height"]}},regionPolygons:{type:"array",minItems:1,maxItems:8,items:{type:"object",additionalProperties:false,properties:{points:{type:"array",minItems:3,maxItems:80,items:{type:"object",additionalProperties:false,properties:{x:{type:"number",minimum:0,maximum:1},y:{type:"number",minimum:0,maximum:1}},required:["x","y"]}}},required:["points"]}},maskFeather:{type:"number",minimum:0,maximum:32},maskExpand:{type:"integer",minimum:-32,maximum:32},invertMask:{type:"boolean"},segmentationEndpoint:{type:"string",maxLength:4096},segmentationEndpointEnv:{type:"string",maxLength:128},segmentationTokenEnv:{type:"string",maxLength:128},
    aspectRatio:{type:"string",enum:["original","square","portrait","story","landscape","classic-landscape"]},cropWidth:{type:"integer",minimum:1,maximum:32768},cropHeight:{type:"integer",minimum:1,maximum:32768},x:{type:"integer",minimum:0,maximum:32768},y:{type:"integer",minimum:0,maximum:32768},
    width:{type:"integer",minimum:1,maximum:32768},height:{type:"integer",minimum:1,maximum:32768},resizeMode:{type:"string",enum:["fit","fill","stretch"]},allowUpscale:{type:"boolean"},position:{type:"string",enum:["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]},
    degrees:{type:"number",minimum:-360,maximum:360},direction:{type:"string",enum:["horizontal","vertical"]},brightness:{type:"number",minimum:-100,maximum:100},contrast:{type:"number",minimum:-100,maximum:100},gamma:{type:"number",minimum:0.2,maximum:3},exposure:{type:"number",minimum:-3,maximum:3},
    saturation:{type:"number",minimum:-100,maximum:100},vibrance:{type:"number",minimum:-100,maximum:100},hue:{type:"number",minimum:-180,maximum:180},temperature:{type:"number",minimum:-1,maximum:1},tint:{type:"number",minimum:-1,maximum:1},monochrome:{type:"boolean"},detailAmount:{type:"number",minimum:0.1,maximum:3},denoiseStrength:{type:"number",minimum:1,maximum:3},blurRadius:{type:"number",minimum:0.1,maximum:50},
    text:{type:"string",maxLength:2000},font:{type:"string",maxLength:100},fontSize:{type:"integer",minimum:8,maximum:1000},fontColor:{type:"string",maxLength:40},strokeColor:{type:"string",maxLength:40},strokeWidth:{type:"number",minimum:0,maximum:20},textBox:{type:"boolean"},boxColor:{type:"string",maxLength:40},
    overlay:{type:"string",maxLength:4096},overlayWidth:{type:"integer",minimum:8,maximum:16384},opacity:{type:"number",minimum:0.05,maximum:1},margin:{type:"integer",minimum:0,maximum:4000},brandWatermark:{type:"boolean"},watermarkPosition:{type:"string",enum:["top-left","top-right","bottom-left","bottom-right","center"]},backgroundInput:{type:"string",maxLength:4096},
    format:{type:"string",enum:["jpg","jpeg","png","webp","avif","heic","tiff","bmp"]},quality:{type:"integer",minimum:1,maximum:100},stripMetadata:{type:"boolean"},backgroundColor:{type:"string",maxLength:40},
    garment:{type:"string",maxLength:4096},mask:{type:"string",maxLength:4096},request:{type:"string",maxLength:1200},garmentDescription:{type:"string",maxLength:1000},category:{type:"string",enum:["upper_body","lower_body","dress","full_body"]},outfitBackend:{type:"string",enum:["swifttry","catv2ton","catvton","generic"]},endpoint:{type:"string",maxLength:4096},endpointEnv:{type:"string",maxLength:128},tokenEnv:{type:"string",maxLength:128},allowRemote:{type:"boolean"},preserveIdentity:{type:"boolean"},preserveBackground:{type:"boolean"},generativeQuality:{type:"string",enum:["draft","medium","high"]},photoFormat:{type:"string",enum:["jpg","jpeg","png","webp"]},seed:{type:"integer",minimum:0,maximum:2147483647},timeoutMs:{type:"integer",minimum:60000,maximum:14400000},pollIntervalMs:{type:"integer",minimum:750,maximum:30000}
  },required:["action"]},
  async execute(a,ctx){
    if(a.action==="change_outfit")return outfitEditorTool.execute({action:"change_outfit_photo",input:a.input,garment:a.garment,mask:a.mask,output:a.output,request:a.request,garmentDescription:a.garmentDescription,category:a.category,backend:a.outfitBackend||"generic",endpoint:a.endpoint,endpointEnv:a.endpointEnv,tokenEnv:a.tokenEnv,allowRemote:a.allowRemote,preserveIdentity:a.preserveIdentity,preserveBackground:a.preserveBackground,quality:a.generativeQuality||"high",photoFormat:a.photoFormat,outputQuality:a.quality,seed:a.seed,timeoutMs:a.timeoutMs,pollIntervalMs:a.pollIntervalMs},ctx);
    const regional=preparePhotoRegionalArgs(a);a=regional.args;
    const totalSteps=14,progress=(stage,percent,detail,step)=>reportPhotoProgress(ctx,{stage,percent,detail,step,totalSteps});
    if(a.action==="list_images"){
      progress("loading",8,"scanning photo folders",1);const directory=await readable(ctx,expandHome(a.directory||"~/storage/downloads")),files=await listImages(directory,{query:a.query,limit:a.limit||80});progress("verifying",100,`${files.length} photo file${files.length===1?"":"s"} ready`,14);return JSON.stringify({ok:true,action:a.action,directory,count:files.length,files},null,2);
    }
    if(a.action==="list_effects"){
      progress("loading",25,"loading local photo finish catalog",3);const pack=photoEffectPack();progress("verifying",100,`${pack.presets.length} photo finishes ready`,14);return JSON.stringify({ok:true,action:a.action,pack},null,2);
    }
    if(!a.input)throw new Error("input required");const extension=path.extname(a.input).toLowerCase();if(!PHOTO_EXTS.has(extension))throw new Error(`unsupported photo format: ${extension||"missing extension"}`);
    const command=await imageCommand();progress("loading",3,"opening source photo",1);const input=await readable(ctx,expandHome(a.input)),sourceStat=await fs.stat(input);progress("loading",8,"reading image metadata and orientation",1);const metadata=await inspectPhoto(ctx,command,input);progress("analyzing",17,"measuring light, color, noise, detail and visual focus",2);const analysis=await analyzePhoto(ctx,command,input,metadata);
    if(a.action==="inspect"||a.action==="analyze"){
      const advice=a.action==="analyze"?buildPhotoAdvice(analysis,metadata,await inspectPhotoSelectionCapabilities(ctx,a,input,metadata,command)):null;progress("verifying",100,a.action==="analyze"?"diagnosis and selectable edit menu ready":"photo inspection ready",14);return JSON.stringify({ok:true,action:a.action,input,bytes:sourceStat.size,metadata,analysis:slimAnalysis(analysis),...(advice?{advice}:{})},null,2);
    }
    const preset=resolvePhotoEffectPreset(a.photoPreset);if(a.photoPreset&&!preset)throw new Error(`unknown photoPreset ${a.photoPreset}; run photo_editor with action=list_effects to see the available finishes`);
    const editScope=String(a.editScope||"full");if(editScope!=="full"&&!SELECTIVE_ACTIONS.has(a.action))throw new Error(`editScope=${editScope} is supported for auto_edit, supreme_edit, adjust_light, adjust_color, enhance_details, denoise and blur; ${a.action} changes the whole composition`);
    const supremeSpec=supremeArguments(a,preset);
    const supremeRequested=a.action==="supreme_edit"||hasSupremeArguments(a)||Boolean(preset?.supreme&&a.action==="auto_edit");
    if(supremeRequested&&metadata.width*metadata.height>MAX_ENGINE_PIXELS)throw new Error(`the Supreme pixel engine refuses ${metadata.width}×${metadata.height} on a phone (${(metadata.width*metadata.height/1e6).toFixed(1)}MP > ${MAX_ENGINE_PIXELS/1e6}MP); pass a width/height to resize first or use a smaller source`);
    if(a.action==="supreme_edit"&&!supremeRequested)throw new Error("supreme_edit needs at least one Supreme parameter or a photoPreset carrying a Supreme finish");
    const output=await resolveOutput(ctx,a.output,input,a),changes=[];let args=[firstFrame(input),"-auto-orient","-colorspace","sRGB"],plan=null,crop=null,resize=null,watermark=null,text=null,selection=null,selectionVerification=null,temp=null,supreme=null,frame=null;
    if(["remove_background","replace_background"].includes(a.action)){
      if(editScope!=="full")throw new Error(`${a.action} works on the complete photo; use subject/background scope for a localized color edit`);
      progress("scope",21,"subject/background operation selected",3);progress("composition",26,a.action==="remove_background"?"preparing transparent cutout":"preparing replacement background",4);
      const backgroundResult=await executeBackgroundOperation(ctx,command,a,input,output,metadata,progress,changes);progress("exporting",87,`rendering ${path.extname(output).slice(1).toUpperCase()}`,13);progress("verifying",100,"background operation verified and ready",14);return JSON.stringify({ok:true,action:a.action,input,output,bytes:(await fs.stat(output)).size,metadata:backgroundResult.outputMetadata,analysis:slimAnalysis(analysis),editScope,regionalIntent:regional.intent,changes,verification:backgroundResult.verification,backgroundModel:backgroundResult.model},null,2);
    }
    progress("scope",21,editScope==="full"?"full photo selected":`${editScope} selection requested`,3);progress("composition",26,"building a request-specific edit plan",4);
    try{
      if(a.action==="auto_edit"){
        plan=buildAutoPhotoPlan(analysis,a);progress("light",34,a.enhanceLight===false?"tonal curve disabled by request":`black ${plan.blackPoint}% · white ${plan.whitePoint}% · contrast ${plan.sigmoidContrast}`,5);progress("color",42,a.enhanceColor===false?"color treatment disabled by request":`context: ${analysis.environment.primary} · ${plan.style} · saturation ${plan.saturation}%`,6);progress("noise",49,plan.denoise?"reducing detected noise":"noise level does not need smoothing",7);progress("detail",56,"protecting fine texture inside the selected scope",8);addAutoPlan(args,plan);changes.push(...plan.reasons);
      }else if(a.action==="crop"){
        crop=explicitCrop(a,metadata,analysis);args.push("-crop",`${crop.width}x${crop.height}+${crop.x}+${crop.y}`,"+repage");changes.push(`cropped around the ${crop.focus?"detected focal region":"requested coordinates"} to ${crop.width}×${crop.height}`);
      }else if(a.action==="resize"){
        resize=addResize(args,a);if(!resize)throw new Error("resize requires width or height");changes.push(`resized the photo with ${resize.mode} composition to ${resize.width||"auto"}×${resize.height||"auto"}`);
      }else if(a.action==="supreme_edit"){
        if(a.baseGrade===true){plan=buildAutoPhotoPlan(analysis,a);addAutoPlan(args,plan);changes.push(...plan.reasons);}
      }else explicitEdits(args,a,changes);

      const strictGate=a.action==="auto_edit"||a.action==="supreme_edit";
      if(supremeRequested){
        temp=temp||await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-photo-scope-"));
        progress("supreme",58,"decoding the frame into the BLACKCORE pixel engine",8);
        let engineSource=input;
        if(args.length>3){const base=path.join(temp,"supreme-base.png");await renderPhoto(ctx,command,args,base);engineSource=base;}
        const stage=await runSupremeStage(ctx,command,engineSource,path.join(temp,"supreme-render.png"),metadata,analysis,supremeSpec,temp,{quality:96});
        supreme={applied:stage.applied,parameters:Object.fromEntries(SUPREME_KEYS.filter(key=>supremeSpec[key]!==undefined).map(key=>[key,supremeSpec[key]])),engine:"blackcore-pixel-v4"};
        args=[firstFrame(path.join(temp,"supreme-render.png")),"-colorspace","sRGB"];
        changes.push(...stage.applied);
        progress("supreme",59,`${stage.applied.length} Supreme stages rendered locally`,8);
      }else if(a.action==="supreme_edit")throw new Error("supreme_edit needs at least one Supreme parameter or a photoPreset that carries a Supreme finish");

      if(editScope!=="full"){
        temp=temp||await fs.mkdtemp(path.join(os.tmpdir(),"blackcore-photo-scope-"));selection=editScope==="skin"?await buildSkinSelection(ctx,command,input,metadata,a,temp):await resolvePhotoSelection(ctx,a,input,metadata,command,temp);progress("masking",61,`${editScope} mask · ${selection.source} · ${(selection.coverage*100).toFixed(1)}% selected`,9);
        const fullyEdited=path.join(temp,"fully-edited.png"),scopedBase=path.join(temp,"scoped-base.png");await renderPhoto(ctx,command,args,fullyEdited);await compositePhotoSelection(ctx,command,input,fullyEdited,selection.file,scopedBase);selectionVerification=await verifyPhotoSelection(ctx,command,input,scopedBase,selection.file,temp,{minimumInside:strictGate?{basic:0.006,medium:0.011,high:0.018}[a.editLevel||"medium"]:0.004});
        if(!selectionVerification.passed)throw new Error(`selected-area quality check rejected the render (inside ${selectionVerification.insideMean}, outside ${selectionVerification.outsideMean}); no leaking or fake edit was delivered`);
        args=[firstFrame(scopedBase),"-colorspace","sRGB"];const scopeName=editScope==="detail"?`detail '${String(a.regionPrompt||"mask").trim()}'`:editScope;changes.push(`limited the treatment to the selected ${scopeName}; pixels outside the mask were preserved`);
      }else progress("masking",61,"full-photo treatment; no selection mask needed",9);

      if(a.action==="auto_edit"||a.action==="supreme_edit"){
        crop=explicitCrop(a,metadata,analysis);if(crop){args.push("-crop",`${crop.width}x${crop.height}+${crop.x}+${crop.y}`,"+repage");changes.push(`smart-cropped around the detected focal region to ${crop.aspectRatio} (${crop.width}×${crop.height})`);}resize=addResize(args,a);if(resize)changes.push(`resized the photo with ${resize.mode} composition${resize.width||resize.height?` to ${resize.width||"auto"}×${resize.height||"auto"}`:""}`);
      }
      progress("cropping",68,crop?`${crop.width}×${crop.height}+${crop.x}+${crop.y}`:resize?"target dimensions prepared":"composition preserved; no crop was requested",10);
      const wantsText=a.action==="overlay_text"||!!a.text;if(a.action==="overlay_text"&&!a.text)throw new Error("text required");if(wantsText){text=addText(args,a,metadata);changes.push(`added text at ${text.position}`);}progress("text",74,text?"placing readable text":"no text requested",11);
      const watermarkRequest=await watermarkSpec(a,ctx);if(watermarkRequest){watermark=addWatermark(args,watermarkRequest,a,metadata);changes.push(`added the ${watermark.brand?"BLACKCORE signature (AI PHOTO STUDIO)":"requested"} watermark at ${watermark.position}`);}progress("branding",80,watermark?`placing ${watermark.brand?"BLACKCORE PHOTO":"custom"} watermark`:"watermark not requested",12);
      if(a.action==="convert")changes.push(`converted the photo to ${path.extname(output).slice(1).toUpperCase()}`);if(a.action==="compress")changes.push("compressed the photo for efficient phone sharing");
      const quality=addEncoding(args,a,output);progress("exporting",87,`rendering ${path.extname(output).slice(1).toUpperCase()} at quality ${quality}`,13);await renderPhoto(ctx,command,args,output);
      frame=await applyFrame(ctx,command,output,supremeKeystone(a,metadata),changes);
      progress("verifying",95,selection?"checking selected-area strength, boundary leakage and final texture":"checking dimensions, texture and level-aware visible pixel delta",14);const outputMetadata=await inspectPhoto(ctx,command,output),outputAnalysis=strictGate?await analyzePhoto(ctx,command,output,outputMetadata):null,minimumDelta=strictGate?(selection?0.00005:{basic:0.008,medium:0.015,high:0.025}[a.editLevel||"medium"]||0.015):0.00005,verification=await verifyPhoto(ctx,input,output,metadata,outputMetadata,{minimumDelta}),bytes=(await fs.stat(output)).size;
      if(strictGate&&!verification.changed){await fs.rm(output,{force:true});throw new Error("photo quality check rejected a no-change render; no fake edited copy was delivered");}
      if(strictGate&&outputAnalysis&&Number(outputAnalysis.detail.meanGradient)<Number(analysis.detail.meanGradient)*0.62){await fs.rm(output,{force:true});throw new Error("photo quality check rejected excessive fine-detail loss across the frame");}
      progress("verifying",100,selection?"selected-area edit verified and ready":"strong photo grade verified and ready",14);return JSON.stringify({ok:true,action:a.action,input,output,bytes,metadata:outputMetadata,analysis:slimAnalysis(analysis),editScope,regionalIntent:regional.intent,changes,verification:{...verification,...(outputAnalysis?{tone:{before:{p05:analysis.light.p05,p95:analysis.light.p95,stdDev:analysis.light.stdDev,saturation:analysis.color.meanSaturation,detail:analysis.detail.meanGradient},after:{p05:outputAnalysis.light.p05,p95:outputAnalysis.light.p95,stdDev:outputAnalysis.light.stdDev,saturation:outputAnalysis.color.meanSaturation,detail:outputAnalysis.detail.meanGradient}}}:{})},...(selection?{selection:{source:selection.source,coverage:selection.coverage,feather:selection.feather,expand:selection.expand},selectionVerification}:{}),...(supreme?{supreme}:{}),...(frame?{frame}:{}),...(plan?{editLevel:a.editLevel||"medium",visualStyle:plan.style,photoPreset:plan.presetId,plan:{strength:plan.strength,blackPoint:plan.blackPoint,whitePoint:plan.whitePoint,sigmoidContrast:plan.sigmoidContrast,sigmoidMidpoint:plan.sigmoidMidpoint,saturation:plan.saturation,denoise:plan.denoise,monochrome:plan.monochrome}}:{}),...(crop?{crop}:{}),...(resize?{resize}:{}),...(watermark?{watermark}:{}),...(text?{text}: {})},null,2);
    }finally{if(temp)await fs.rm(temp,{recursive:true,force:true});}
  }
});
