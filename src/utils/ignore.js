import fs from "node:fs";
import path from "node:path";

const BUILTIN_DIRS=[".git","node_modules",".next","dist","build",".cache",".gradle",".expo","coverage","target",".turbo",".vercel",".idea",".vscode/.ropeproject"];

function escapeRegex(s){return s.replace(/[|\\{}()[\]^$+?.]/g,"\\$&");}
function globToRegex(pattern){
  let p=pattern.replace(/\\/g,"/");
  let out="";
  for(let i=0;i<p.length;i++){
    const ch=p[i];
    if(ch==="*"){
      if(p[i+1]==="*"){while(p[i+1]==="*")i++;if(p[i+1]==="/"){i++;out+="(?:.*/)?";}else out+=".*";}
      else out+="[^/]*";
    }else if(ch==="?")out+="[^/]";
    else out+=escapeRegex(ch);
  }
  return out;
}
function compileLine(raw){
  let line=raw.trim();if(!line||line.startsWith("#"))return null;
  let negated=false;if(line.startsWith("!")){negated=true;line=line.slice(1);}if(!line)return null;
  if(line.startsWith("\\#")||line.startsWith("\\!"))line=line.slice(1);
  const directory=line.endsWith("/");if(directory)line=line.slice(0,-1);
  const anchored=line.startsWith("/");if(anchored)line=line.slice(1);
  const hasSlash=line.includes("/");
  const body=globToRegex(line);
  const prefix=anchored?"^":hasSlash?"(?:^|/)":"(?:^|.*/)";
  const suffix=directory?"(?:/.*)?$":"$";
  return {negated,regex:new RegExp(prefix+body+suffix),raw};
}
export class IgnoreMatcher{
  constructor(root,{includeGitignore=true,extra=[]}={}){
    this.root=path.resolve(root);this.rules=[];
    for(const d of BUILTIN_DIRS)this.add(d+"/");
    if(includeGitignore)for(const file of [".gitignore",".blackcoreignore"]){try{for(const l of fs.readFileSync(path.join(this.root,file),"utf8").split(/\r?\n/))this.add(l);}catch{}}
    for(const p of extra)this.add(p);
  }
  add(pattern){const r=compileLine(pattern);if(r)this.rules.push(r);return this;}
  relative(p){return path.relative(this.root,path.resolve(p)).replace(/\\/g,"/");}
  ignores(p,{isDir=false}={}){
    const rel=this.relative(p);if(!rel||rel.startsWith("../")||path.isAbsolute(rel))return false;
    const candidate=isDir&&!rel.endsWith("/")?rel+"/":rel;let ignored=false;
    for(const r of this.rules)if(r.regex.test(candidate)||r.regex.test(rel))ignored=!r.negated;
    return ignored;
  }
}
export function loadIgnoreMatcher(root,opts){return new IgnoreMatcher(root,opts);}
