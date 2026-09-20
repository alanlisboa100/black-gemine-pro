import {exists,readText} from "./common.js";

export function detectWeb(cwd){
  if(!exists(cwd,"index.html")||exists(cwd,"package.json"))return null;
  const html=readText(cwd,"index.html"),scripts=[];
  for(const match of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)){
    const source=match[1].split(/[?#]/)[0];
    if(/^[A-Za-z0-9_./-]+\.m?js$/.test(source)&&!source.startsWith("//")&&!/^https?:/i.test(source))scripts.push(source.replace(/^\.\//,""));
  }
  const styles=[...html.matchAll(/<link[^>]+href=["']([^"']+\.css(?:[?#][^"']*)?)["']/gi)].map(x=>x[1].split(/[?#]/)[0]).filter(x=>/^[A-Za-z0-9_./-]+\.css$/.test(x));
  return {ecosystem:"web",entry:"index.html",scripts:[...new Set(scripts)],styles:[...new Set(styles)],frameworks:[],verification:[...new Set(scripts)].map(file=>`node --check ${JSON.stringify(file)}`)};
}
