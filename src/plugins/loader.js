import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {GLOBAL_EXTENSIONS_DIR,isInside} from "../utils/paths.js";
import {readManifest,manifestResources} from "./manifest.js";
import {ExtensionAPI} from "./api.js";
import {ExtensionStateStore} from "./state.js";

function jsFiles(dir){
  if(!fs.existsSync(dir))return[];const st=fs.statSync(dir);if(st.isFile())return /\.(mjs|js)$/.test(dir)?[dir]:[];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?[]:/\.(mjs|js)$/.test(e.name)?[path.join(dir,e.name)]:[]);
}
export class ExtensionHost{
  constructor({cfg,registry,commands,hooks,providers,ui,packageManager,cwd}){Object.assign(this,{cfg,registry,commands,hooks,providers,ui,packageManager,cwd});this.loaded=new Map();this.errors=new Map();this.state=new ExtensionStateStore();}
  discovery(){
    const dirs=[GLOBAL_EXTENSIONS_DIR,path.join(this.cwd,".blackcore","extensions")],files=[];
    for(const d of dirs)files.push(...jsFiles(d));
    for(const pkg of this.packageManager.list()){const m=readManifest(pkg),r=manifestResources(pkg,m);for(const x of r.extensions)files.push(...jsFiles(x));}
    return [...new Set(files)];
  }
  projectTrusted(){return this.cfg.trustedProjects?.includes(path.resolve(this.cwd));}
  globalTrusted(file){return (this.cfg.trustedGlobalExtensions||[]).some(x=>path.resolve(x)===path.resolve(file));}
  packageTrusted(file){return this.packageManager.list().some(dir=>isInside(dir,file)&&this.packageManager.isTrusted(dir));}
  async loadAll(){
    this.errors.clear();for(const file of this.discovery()){
      const resolved=path.resolve(file),isProject=isInside(path.join(this.cwd,".blackcore","extensions"),resolved),isGlobal=isInside(GLOBAL_EXTENSIONS_DIR,resolved),isPackage=this.packageManager.list().some(dir=>isInside(dir,resolved));
      if(isProject&&!this.projectTrusted()){this.ui?.notify?.(`project extension skipped until /trust: ${path.basename(file)}`,"warn");continue;}
      if(isGlobal&&!this.globalTrusted(resolved)){this.ui?.notify?.(`global extension skipped until /trust extension <path>: ${path.basename(file)}`,"warn");continue;}
      if(isPackage&&!this.packageTrusted(resolved)){this.ui?.notify?.(`package extension skipped until the package is trusted: ${path.basename(file)}`,"warn");continue;}
      try{await this.load(file);}catch(e){this.errors.set(resolved,e);this.ui?.notify?.(`extension failed: ${path.basename(file)} · ${e.message}`,"warn");}
    }
    return this;
  }
  async load(file){
    const key=path.resolve(file),name=path.basename(file).replace(/\.(mjs|js)$/,"");const url=pathToFileURL(key).href+`?v=${Date.now()}`;const mod=await import(url);
    const fn=mod.default||mod.activate||mod.setup;if(typeof fn!=="function")throw new Error(`extension ${file} has no default/activate/setup function`);
    const api=new ExtensionAPI({name,registry:this.registry,commands:this.commands,hooks:this.hooks,providers:this.providers,ui:this.ui,state:this.state,cfg:this.cfg,cwd:this.cwd});
    try{const cleanup=await fn(api,{cwd:this.cwd,cfg:this.cfg});this.loaded.set(key,{name,file:key,cleanup,api});return name;}catch(e){api.dispose();throw e;}
  }
  async unloadAll(){
    for(const x of [...this.loaded.values()].reverse()){try{if(typeof x.cleanup==="function")await x.cleanup();}catch{}x.api?.dispose();this.hooks.clearOwner(x.name);for(const [k,v] of this.commands)if(v.owner===x.name)this.commands.delete(k);}this.loaded.clear();
  }
  async reload(){await this.unloadAll();return this.loadAll();}
}
