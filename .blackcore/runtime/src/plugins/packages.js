import fs from "node:fs";
import path from "node:path";
import {execCapture} from "../utils/exec.js";
import {BC_HOME,ensureDir} from "../utils/paths.js";
import {slugify} from "../utils/text.js";

export const PACKAGES_DIR=path.join(BC_HOME,"packages");
export class PackageManager{
  constructor(cfg){this.cfg=cfg;ensureDir(PACKAGES_DIR);}
  list(){return fs.readdirSync(PACKAGES_DIR,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>path.join(PACKAGES_DIR,x.name));}
  trust(dir){const resolved=path.resolve(dir);this.cfg.trustedPackages??=[];if(!this.cfg.trustedPackages.includes(resolved))this.cfg.trustedPackages.push(resolved);return resolved;}
  untrust(dir){const resolved=path.resolve(dir);this.cfg.trustedPackages=(this.cfg.trustedPackages||[]).filter(x=>path.resolve(x)!==resolved);}
  isTrusted(dir){const resolved=path.resolve(dir);return (this.cfg.trustedPackages||[]).some(x=>path.resolve(x)===resolved);}
  async install(source){
    if(/^https?:\/\/|^git@|^git\+|github\.com/.test(source)){const name=slugify(source.split("/").at(-1).replace(/\.git$/,"")),dest=path.join(PACKAGES_DIR,name);if(fs.existsSync(dest))throw new Error(`package exists: ${name}`);const r=await execCapture("git",["clone","--depth","1",source,dest],{timeoutMs:180000});if(r.code!==0)throw new Error(r.combined);return this.trust(dest);}
    const src=path.resolve(source);if(!fs.existsSync(src))throw new Error("package source not found");const name=slugify(path.basename(src)),dest=path.join(PACKAGES_DIR,name);fs.cpSync(src,dest,{recursive:true,errorOnExist:true});return this.trust(dest);
  }
  async update(name){const dir=path.join(PACKAGES_DIR,name);if(!fs.existsSync(dir))throw new Error("package not found");const r=await execCapture("git",["pull","--ff-only"],{cwd:dir,timeoutMs:120000});return r.combined;}
  remove(name){const dir=path.join(PACKAGES_DIR,name);if(!fs.existsSync(dir))return false;fs.rmSync(dir,{recursive:true,force:true});this.untrust(dir);return true;}
}
