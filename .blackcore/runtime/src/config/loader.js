import fs from "node:fs";
import path from "node:path";
import {DEFAULT_CONFIG} from "./defaults.js";
import {validateConfig} from "./schema.js";
import {BC_HOME,CONFIG_DIR,ensureHome} from "../utils/paths.js";
import {chmod600} from "../utils/fs.js";

export const CONFIG_FILE=path.join(CONFIG_DIR,"settings.json");
export const SECRETS_FILE=path.join(CONFIG_DIR,"secrets.json");
let secretsCache=null;

function merge(a,b){
  if(Array.isArray(a)||Array.isArray(b))return b??a;
  if(a&&b&&typeof a==="object"&&typeof b==="object"){
    const o={...a};for(const [k,v] of Object.entries(b))o[k]=k in a?merge(a[k],v):v;return o;
  }return b===undefined?a:b;
}
function readJson(file,fallback={}){
  try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return fallback;}
}
const GLOBAL_ONLY_KEYS=new Set([
  "permissionProfile","mode","confirmDangerous","confirmExternalReads","confirmExternalWrites",
  "trustedProjects","trustedGlobalExtensions","trustedPackages","trustedMcpServers",
  "providers","mcp","packages","hooks","deploy","editor",
  "browser",
  "modelLock","autoRoute","autoFallback","crossProviderFallback","fallbackModels"
]);
export function sanitizeProjectConfig(project={}){
  if(!project||typeof project!=="object"||Array.isArray(project))return {};
  return Object.fromEntries(Object.entries(project).filter(([key])=>!GLOBAL_ONLY_KEYS.has(key)));
}
export function initConfig(){
  ensureHome();
  if(!fs.existsSync(CONFIG_FILE))saveConfig(DEFAULT_CONFIG);
  if(!fs.existsSync(SECRETS_FILE)){fs.writeFileSync(SECRETS_FILE,"{}\n","utf8");chmod600(SECRETS_FILE);}
}
export function loadConfig(cwd=process.cwd()){
  initConfig();
  const global=readJson(CONFIG_FILE,{});
  const projectFile=path.join(cwd,".blackcore","settings.json");
  const project=sanitizeProjectConfig(readJson(projectFile,{}));
  const cfg=merge(DEFAULT_CONFIG,merge(global,project));
  // Focused provider build: keep cloud providers plus the optional local
  // llama.cpp endpoint. Existing API keys and provider overrides stay intact.
  // including when an older settings.json still contains legacy providers.
  const allowedProviders=new Set(["openai","deepseek","google","tokenharbor","wavespeed","local"]);
  cfg.providers=Object.fromEntries(Object.entries(cfg.providers||{}).filter(([name])=>allowedProviders.has(name)));
  // Provider catalogs are application-owned, not user-owned. Older settings.json
  // files contain a full snapshot of providers/models, so their model arrays
  // would otherwise override new catalogs from DEFAULT_CONFIG on upgrade.
  // Keep user/runtime overrides such as baseUrl/apiKey, but always refresh the
  // curated model list (and Google Free Pool membership) from this build.
  for(const name of allowedProviders){
    const current=cfg.providers?.[name],fresh=DEFAULT_CONFIG.providers?.[name];
    if(!fresh)continue;
    cfg.providers[name]={...(current||{}),models:structuredClone(fresh.models||[])};
    if(Array.isArray(fresh.freePoolModels))cfg.providers[name].freePoolModels=[...fresh.freePoolModels];
    if(Array.isArray(fresh.fastPoolModels))cfg.providers[name].fastPoolModels=[...fresh.fastPoolModels];
    if(Array.isArray(fresh.ecoPoolModels))cfg.providers[name].ecoPoolModels=[...fresh.ecoPoolModels];
  }
  // GOOGLE_KEY_POOL_MIGRATION_8: provider-owned key slot catalog must follow this build.
  // Older settings.json files may still contain a 4-slot snapshot and must not shrink the runtime pool.
  const googleFresh=DEFAULT_CONFIG.providers?.google;
  if(cfg.providers?.google&&googleFresh){
    cfg.providers.google.apiKeyEnv=googleFresh.apiKeyEnv;
    cfg.providers.google.apiKeyEnvs=[...(googleFresh.apiKeyEnvs||[])];
    cfg.providers.google.googleKeyPool={
      ...(cfg.providers.google.googleKeyPool||{}),
      maxKeys:Number(googleFresh.googleKeyPool?.maxKeys||googleFresh.apiKeyEnvs?.length||8)
    };
  }
  const modelExists=(provider,model)=>(cfg.providers?.[provider]?.models||[]).some(x=>x.id===model);
  if(!allowedProviders.has(cfg.provider)||!modelExists(cfg.provider,cfg.model)){
    cfg.provider=DEFAULT_CONFIG.provider;
    cfg.model=DEFAULT_CONFIG.model;
  }
  cfg.fallbackModels=(cfg.fallbackModels||[]).filter(ref=>{
    const i=String(ref).indexOf("/");if(i<1)return false;
    return modelExists(String(ref).slice(0,i),String(ref).slice(i+1));
  });
  if(!cfg.fallbackModels.length)cfg.fallbackModels=[...DEFAULT_CONFIG.fallbackModels];
  cfg.modelReasoning??={};
  cfg.modelReasoning=Object.fromEntries(Object.entries(cfg.modelReasoning).filter(([ref])=>{
    const i=ref.indexOf("/");if(i<1)return false;
    return modelExists(ref.slice(0,i),ref.slice(i+1));
  }));
  // v2 model ownership migration: old configurations could retain automatic
  // routing/fallback from an earlier build. Lock the user's chosen model once
  // on upgrade; future automation requires an explicit new choice.
  const policyVersion=Math.max(Number(global.modelSelectionPolicyVersion||0),Number(project.modelSelectionPolicyVersion||0));
  if(policyVersion<2){
    cfg.modelLock=true;
    cfg.modelSelectionPolicyVersion=2;
    cfg.autoRoute=false;
    cfg.autoFallback=false;
    cfg.crossProviderFallback=false;
  }
  // 3.7.2 video jobs can legitimately render for hours on a phone. Upgrade
  // only the old untouched 30-minute default in memory; explicit project
  // limits and every key/secret remain exactly as the user configured them.
  const videoPolicyVersion=Math.max(Number(global.videoStudioPolicyVersion||0),Number(project.videoStudioPolicyVersion||0));
  if(videoPolicyVersion<1&&project.maxAgentWallMs===undefined&&Number(global.maxAgentWallMs||1800000)===1800000)cfg.maxAgentWallMs=DEFAULT_CONFIG.maxAgentWallMs;
  cfg.videoStudioPolicyVersion=DEFAULT_CONFIG.videoStudioPolicyVersion;
  cfg.photoStudioPolicyVersion=DEFAULT_CONFIG.photoStudioPolicyVersion;
  // 2.8 language policy: UI stays in English, while model output can follow
  // the user. Older settings do not need a migration file rewrite.
  if(!["auto","en","pt-BR"].includes(cfg.responseLanguage))cfg.responseLanguage="auto";
  cfg.uiLanguage="en";
  cfg.translateUserInput=false;
  // Preserve the active 2.3 reasoning choice when upgrading to per-model settings.
  if(!global.modelReasoning&&!project.modelReasoning){
    const ref=`${cfg.provider}/${cfg.model}`;
    if(cfg.model?.startsWith("deepseek-v4-"))cfg.modelReasoning[ref]=cfg.thinking===false?"off":cfg.reasoningEffort==="max"?"max":"high";
  }
  const val=validateConfig(cfg);if(!val.ok)throw new Error("Invalid BLACKCORE config: "+val.issues.map(x=>`${x.path}: ${x.message}`).join("; "));
  return cfg;
}
export function saveConfig(cfg){
  ensureHome();fs.mkdirSync(path.dirname(CONFIG_FILE),{recursive:true});
  fs.writeFileSync(CONFIG_FILE,JSON.stringify(cfg,null,2)+"\n","utf8");
}
export function loadSecrets(){
  initConfig();if(secretsCache)return secretsCache;secretsCache=readJson(SECRETS_FILE,{});return secretsCache;
}
export function saveSecrets(obj){
  initConfig();fs.writeFileSync(SECRETS_FILE,JSON.stringify(obj,null,2)+"\n","utf8");chmod600(SECRETS_FILE);secretsCache={...obj};
}
export function setSecret(name,value){
  const s=loadSecrets();if(value)s[name]=value;else delete s[name];saveSecrets(s);
}
export function getSecret(name){
  return process.env[name]||loadSecrets()[name]||null;
}
export function getSecretSource(name){
  if(process.env[name])return "environment";
  const s=loadSecrets();return s[name]?"BLACKCORE secrets":null;
}
export function configPaths(){return {home:BC_HOME,settings:CONFIG_FILE,secrets:SECRETS_FILE};}
