import fs from "node:fs";
import path from "node:path";
export function readManifest(dir){
  const candidates=["blackcore.package.json","package.json"];for(const name of candidates){const f=path.join(dir,name);if(!fs.existsSync(f))continue;try{const j=JSON.parse(fs.readFileSync(f,"utf8"));return {file:f,name:j.name||path.basename(dir),version:j.version||"0.0.0",blackcore:j.blackcore||j.blackcorePackage||{},raw:j};}catch{}}
  return {file:null,name:path.basename(dir),version:"0.0.0",blackcore:{},raw:{}};
}
export function manifestResources(dir,manifest){
  const bc=manifest.blackcore||{},conv=(x,def)=>Array.isArray(x)?x.map(v=>path.resolve(dir,v)):fs.existsSync(path.join(dir,def))?[path.join(dir,def)]:[];
  return {extensions:conv(bc.extensions,"extensions"),skills:conv(bc.skills,"skills"),prompts:conv(bc.prompts,"prompts"),themes:conv(bc.themes,"themes")};
}
