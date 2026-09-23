import fs from "node:fs/promises";
import path from "node:path";
import {isInside} from "../utils/paths.js";

const MIME={".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif"};

export function isImagePath(value=""){return !!MIME[path.extname(String(value)).toLowerCase()];}

export async function inspectImageInputs(cwd,values=[],cfg={}){
  const limits=cfg.imageInput||{},maxFiles=limits.maxFiles||5,maxFileBytes=limits.maxFileBytes||20*1024*1024;
  const unique=[...new Set(values.filter(Boolean).map(String))];
  if(unique.length>maxFiles)throw new Error(`At most ${maxFiles} images may be attached to one prompt.`);
  const root=await fs.realpath(path.resolve(cwd)),out=[];
  for(const value of unique){
    const requested=path.resolve(cwd,value),real=await fs.realpath(requested).catch(()=>{throw new Error(`Image not found: ${value}`);});
    if(!isInside(root,real))throw new Error(`Image outside workspace is blocked: ${value}`);
    const ext=path.extname(real).toLowerCase(),mimeType=MIME[ext];if(!mimeType)throw new Error(`Unsupported image format: ${value}`);
    const st=await fs.stat(real);if(!st.isFile())throw new Error(`Image is not a file: ${value}`);if(st.size>maxFileBytes)throw new Error(`Image exceeds ${Math.round(maxFileBytes/1024/1024)} MB: ${value}`);
    out.push({path:real,name:path.basename(real),mimeType,bytes:st.size});
  }
  return out;
}

export async function materializeMessageImages(messages=[],modelInfo={},cfg={}){
  const refs=messages.flatMap(m=>m.images||[]);if(!refs.length)return messages;
  if(modelInfo.vision!==true)throw new Error("The selected model does not declare image/vision support. Choose a vision-capable model explicitly; BLACKCORE will not change it automatically.");
  const maxTotal=cfg.imageInput?.maxTotalBytes||50*1024*1024,total=refs.reduce((n,x)=>n+Number(x.bytes||0),0);if(total>maxTotal)throw new Error(`Attached images exceed the ${Math.round(maxTotal/1024/1024)} MB prompt limit.`);
  const cache=new Map();
  return Promise.all(messages.map(async m=>{
    if(!m.images?.length)return m;const images=[];
    for(const image of m.images){let dataUrl=cache.get(image.path);if(!dataUrl){const body=await fs.readFile(image.path);dataUrl=`data:${image.mimeType};base64,${body.toString("base64")}`;cache.set(image.path,dataUrl);}images.push({...image,dataUrl});}
    return {...m,images};
  }));
}

export function toChatVisionMessages(messages=[]){
  return messages.map(m=>{
    if(m.role!=="user"||!m.images?.length)return m;
    return {...m,content:[{type:"text",text:String(m.content||"")},...m.images.map(x=>({type:"image_url",image_url:{url:x.dataUrl}}))],images:undefined};
  });
}
