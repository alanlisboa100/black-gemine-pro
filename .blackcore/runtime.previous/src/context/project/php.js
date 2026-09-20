import {exists,readJson} from "./common.js";

export function detectPhp(cwd){
  if(!exists(cwd,"composer.json"))return null;
  const composer=readJson(cwd,"composer.json")||{},packages={...(composer.require||{}),...(composer["require-dev"]||{})},frameworks=[];
  if(packages["laravel/framework"])frameworks.push("laravel");if(packages["symfony/framework-bundle"])frameworks.push("symfony");if(packages["slim/slim"])frameworks.push("slim");
  const scripts=composer.scripts||{},verification=[];
  for(const name of ["lint","test","analyse","analyze","build"])if(scripts[name])verification.push(`composer ${name}`);
  return {ecosystem:"php",packageManager:"composer",packageName:composer.name||null,frameworks,scripts:Object.keys(scripts),verification};
}
