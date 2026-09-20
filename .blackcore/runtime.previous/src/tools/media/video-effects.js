import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const EFFECTS_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../assets/video-effects");
const SAFE_NAME=/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

function safePackName(value="blackcore-premium-lite"){
  const name=String(value||"blackcore-premium-lite").trim();
  if(!SAFE_NAME.test(name))throw new Error("invalid video effects pack name");
  return name;
}

async function readPack(name){
  const packName=safePackName(name),root=path.join(EFFECTS_ROOT,packName),manifestPath=path.join(root,"pack.json");
  let manifest;
  try{manifest=JSON.parse(await fs.readFile(manifestPath,"utf8"));}
  catch(error){throw new Error(`video effects pack '${packName}' is unavailable: ${error.message}`);}
  const overlays=Array.isArray(manifest.overlays)?manifest.overlays:[];
  if(!overlays.length)throw new Error(`video effects pack '${packName}' has no overlay presets`);
  const checked=[];
  for(const preset of overlays){
    if(!preset?.id||!preset.asset)throw new Error(`video effects pack '${packName}' contains an invalid preset`);
    const asset=path.resolve(root,preset.asset);
    if(!asset.startsWith(`${root}${path.sep}`))throw new Error(`video effects preset '${preset.id}' escapes the pack`);
    try{await fs.access(asset);}catch{throw new Error(`video effects asset is missing: ${preset.asset}`);}
    checked.push({...preset,asset});
  }
  return {...manifest,name:packName,root,overlays:checked};
}

export async function listVideoEffectPacks(){
  let entries=[];try{entries=await fs.readdir(EFFECTS_ROOT,{withFileTypes:true});}catch{return [];}
  const packs=[];
  for(const entry of entries.filter(row=>row.isDirectory()&&SAFE_NAME.test(row.name))){
    try{const pack=await readPack(entry.name);packs.push({name:pack.name,title:pack.title||pack.name,version:pack.version||null,license:pack.license||null,source:pack.source||null,transitions:pack.transitions||[],overlayCount:pack.overlays.length,overlays:pack.overlays.map(row=>({id:row.id,label:row.label||row.id,category:row.category||"overlay",defaultDuration:row.defaultDuration||null}))});}
    catch{}
  }
  return packs;
}

export async function loadVideoEffectPack(name="blackcore-premium-lite"){return readPack(name);}

export async function resolveVideoEffectPreset(pack,name){
  const preset=pack?.overlays?.find(row=>row.id===name);
  if(!preset)throw new Error(`unknown video overlay preset '${name}' in pack '${pack?.name||"unknown"}'`);
  return preset;
}

export const videoEffectsRoot=EFFECTS_ROOT;
