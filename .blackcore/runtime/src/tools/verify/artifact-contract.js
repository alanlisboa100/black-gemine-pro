import fs from "node:fs";
import path from "node:path";

const CREATE=/\b(?:cria|crie|criar|faz|faca|fazer|gera|gere|gerar|desenvolve|desenvolva|desenvolver|construa|construir|quero|queria|gostaria|preciso|necessito|bota|bote|manda|mande|monta|monte|prepara|prepare|create|make|want|need|build|generate|develop|prepare)\w*/i;
const SITE=/\b(?:site|website|portal|painel|landing(?:\s+page)?|p[aá]gina|dashboard|web\s*app|(?:app|aplicativo)\s+web|pwa)\b/i;
const APP=/\b(?:app|aplicativo|application|android|expo|react\s*native|flutter)\b/i;
const DATABASE=/\b(?:supabase|sql|postgres(?:ql)?|rls|row\s+level\s+security|banco\s+de\s+dados)\b/i;
const SINGLE=/\b(?:arquivo\s+[uú]nico|[uú]nico\s+arquivo|single[ -]file|(?:somente|apenas|s[oó])\s+(?:(?:com|em|no|num)\s+)?(?:(?:um|o)\s+)?(?:arquivo\s+)?index(?:\.html)?|index(?:\.html)?\s+(?:[uú]nico|somente|apenas|puro))\b/i;
const SINGLE_WEB_TARGET=/\b(?:site|website|p[aá]gina|html|index|demo|anima(?:ç[aã]o|cao)|animation|jogo|game)\b/i;
const TEXT_EXT=/\.(?:html?|css|m?js|cjs|jsx|tsx?|json|toml|sql|md|ya?ml)$/i;
const fold=value=>String(value||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();

function exists(cwd,name){try{return fs.statSync(path.join(cwd,name)).isFile();}catch{return false;}}
function nonempty(cwd,name,min=1){try{return fs.statSync(path.join(cwd,name)).size>=min;}catch{return false;}}
function read(cwd,name,max=300000){try{return fs.readFileSync(path.join(cwd,name),"utf8").slice(0,max);}catch{return "";}}
function json(cwd,name){try{return JSON.parse(read(cwd,name)||"null");}catch{return null;}}
function any(cwd,names){return names.find(name=>exists(cwd,name))||null;}
function readme(cwd){try{return fs.readdirSync(cwd).find(name=>/^readme(?:\.|$)/i.test(name)&&nonempty(cwd,name,20))||null;}catch{return null;}}
function issue(check,message){check.issues.push(message);}
function finish(check){check.ok=check.issues.length===0;return check;}

function localReference(value=""){
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(String(value).trim());
}

function singleFileWeb(cwd,taskText=""){
  const check={kind:"website-single-file",ok:false,issues:[],evidence:[]},html=read(cwd,"index.html");
  if(!nonempty(cwd,"index.html",80))issue(check,"explicit index-only request needs a complete non-empty index.html");
  else check.evidence.push("index.html");
  if(!/<meta[^>]+name=["']viewport["']/i.test(html))issue(check,"mobile viewport metadata is missing from index.html");
  if(!/<title>[^<]+<\/title>/i.test(html))issue(check,"document title is missing from index.html");
  if(!/<style(?:\s[^>]*)?>[\s\S]*<\/style>/i.test(html))issue(check,"index-only delivery needs its CSS embedded in a <style> block");
  const localStyles=[...html.matchAll(/<link[^>]+href=["']([^"']+\.css(?:[?#][^"']*)?)["']/gi)].map(x=>x[1]).filter(localReference);
  const localScripts=[...html.matchAll(/<script[^>]+src=["']([^"']+\.(?:m?js|cjs)(?:[?#][^"']*)?)["']/gi)].map(x=>x[1]).filter(localReference);
  for(const file of [...localStyles,...localScripts])issue(check,`index-only delivery cannot depend on a local source file: ${file}`);
  if(/\b(?:jogo|game)\b/i.test(taskText)&&!/<script(?:\s[^>]*)?>[\s\S]*<\/script>/i.test(html))issue(check,"index-only game needs its JavaScript embedded in index.html");
  if(/\b(?:anima(?:ç[aã]o|cao)|animation)\b/i.test(taskText)&&!(/@keyframes\b/i.test(html)||/<script(?:\s[^>]*)?>[\s\S]*<\/script>/i.test(html)))issue(check,"index-only animation needs embedded CSS keyframes or JavaScript");
  return finish(check);
}

function staticWeb(cwd){
  const check={kind:"website",ok:false,issues:[],evidence:[]},html=read(cwd,"index.html");
  if(!nonempty(cwd,"index.html",80))issue(check,"index.html is missing or too small");
  const styles=[...html.matchAll(/<link[^>]+href=["']([^"']+\.css(?:[?#][^"']*)?)["']/gi)].map(x=>x[1].split(/[?#]/)[0].replace(/^\.\//,""));
  const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+\.(?:m?js|cjs)(?:[?#][^"']*)?)["']/gi)].map(x=>x[1].split(/[?#]/)[0].replace(/^\.\//,""));
  if(!styles.length)issue(check,"complete website needs a linked CSS file instead of index-only styling");
  if(!scripts.length)issue(check,"complete website needs a linked JavaScript file instead of index-only behavior");
  for(const file of [...styles,...scripts])if(!nonempty(cwd,file,20))issue(check,`referenced file is missing or empty: ${file}`);
  if(!/<meta[^>]+name=["']viewport["']/i.test(html))issue(check,"mobile viewport metadata is missing");
  if(!/<title>[^<]+<\/title>/i.test(html))issue(check,"document title is missing");
  const guide=readme(cwd);if(!guide)issue(check,"README is missing");
  check.evidence.push("index.html",...styles,...scripts,...(guide?[guide]:[]));return finish(check);
}

function nodeWeb(cwd,pkg){
  const check={kind:"website",ok:false,issues:[],evidence:["package.json"]},deps={...(pkg.dependencies||{}),...(pkg.devDependencies||{})},scripts=pkg.scripts||{};
  const source=any(cwd,["src/App.tsx","src/App.jsx","src/App.js","src/main.tsx","src/main.jsx","src/main.js","app/page.tsx","app/page.jsx","app/page.js","pages/index.tsx","pages/index.jsx","pages/index.js"]);
  if(!source)issue(check,"framework website has no application entry under src/, app/ or pages/");else check.evidence.push(source);
  const style=any(cwd,["src/index.css","src/App.css","app/globals.css","styles/globals.css","styles.css"]);if(!style)issue(check,"framework website has no stylesheet");else check.evidence.push(style);
  if(!scripts.build)issue(check,"package.json needs a production build script");
  if(!(scripts.test||scripts.check||scripts.typecheck||scripts.lint))issue(check,"package.json needs at least one test, check, typecheck or lint script");
  const guide=readme(cwd);if(!guide)issue(check,"README is missing");else check.evidence.push(guide);
  if(!Object.keys(deps).some(name=>/^(?:next|react|vue|svelte|astro|vite|nuxt)$/.test(name)))issue(check,"no supported web framework/build dependency was detected");
  return finish(check);
}

function website(cwd){
  const pkg=json(cwd,"package.json"),deps={...(pkg?.dependencies||{}),...(pkg?.devDependencies||{})};
  return pkg&&Object.keys(deps).some(name=>/^(?:next|react|vue|svelte|astro|vite|nuxt)$/.test(name))?nodeWeb(cwd,pkg):staticWeb(cwd);
}

function pwaWebsite(cwd){
  const check=website(cwd);check.kind="pwa";
  if(!exists(cwd,"manifest.webmanifest"))issue(check,"PWA manifest.webmanifest is missing");else check.evidence.push("manifest.webmanifest");
  if(!exists(cwd,"sw.js"))issue(check,"PWA service worker sw.js is missing");else check.evidence.push("sw.js");
  return finish(check);
}

function mobileApp(cwd){
  const check={kind:"application",ok:false,issues:[],evidence:[]},pkg=json(cwd,"package.json"),pubspec=exists(cwd,"pubspec.yaml"),gradle=exists(cwd,"gradlew")||exists(cwd,"android/gradlew");
  if(pkg){
    const deps={...(pkg.dependencies||{}),...(pkg.devDependencies||{})},scripts=pkg.scripts||{},expo=!!deps.expo,reactNative=!!deps["react-native"];
    if(expo||reactNative){
      check.evidence.push("package.json");const config=any(cwd,["app.json","app.config.js","app.config.ts"]);if(!config)issue(check,"Expo/React Native app configuration is missing");else check.evidence.push(config);
      if(config==="app.json"){const app=json(cwd,"app.json")?.expo;if(!app?.name||!app?.slug)issue(check,"app.json needs Expo name and slug");if(!app?.android?.package)issue(check,"app.json needs a unique expo.android.package identifier");}
      const source=any(cwd,["src/App.tsx","src/App.jsx","src/App.js","App.tsx","App.jsx","App.js","index.js","index.ts"]);if(!source)issue(check,"mobile application source entry is missing");else check.evidence.push(source);
      if(!scripts.start)issue(check,"mobile package needs a start script");if(!(scripts.android||scripts["build:android"]))issue(check,"mobile package needs an Android run or build script");
      if(!(scripts.test||scripts.check||scripts.typecheck||scripts.lint))issue(check,"mobile package needs at least one test, check, typecheck or lint script");
    }else issue(check,"application request produced a web/index package instead of Expo or React Native; use an explicit web app/PWA request for a browser application");
  }else if(pubspec){
    check.evidence.push("pubspec.yaml");if(!exists(cwd,"lib/main.dart"))issue(check,"Flutter entry lib/main.dart is missing");else check.evidence.push("lib/main.dart");
    try{if(!fs.statSync(path.join(cwd,"test")).isDirectory())issue(check,"Flutter test directory is missing");}catch{issue(check,"Flutter test directory is missing");}
  }else if(gradle){
    const files=["settings.gradle","settings.gradle.kts","build.gradle","build.gradle.kts"],root=any(cwd,files)||any(cwd,files.map(x=>`android/${x}`));if(!root)issue(check,"Android root Gradle configuration is missing");else check.evidence.push(root);
    const appBuild=any(cwd,["app/build.gradle","app/build.gradle.kts","android/app/build.gradle","android/app/build.gradle.kts"]);if(!appBuild)issue(check,"Android app module Gradle file is missing");else check.evidence.push(appBuild);
    const manifest=any(cwd,["app/src/main/AndroidManifest.xml","android/app/src/main/AndroidManifest.xml"]);if(!manifest)issue(check,"AndroidManifest.xml is missing");else check.evidence.push(manifest);
  }else issue(check,"application stack is incomplete: create an Expo/React Native, Flutter, Android or installable PWA structure");
  const guide=readme(cwd);if(!guide)issue(check,"README is missing");else check.evidence.push(guide);return finish(check);
}

function walk(root,relative="",out=[]){
  let entries=[];try{entries=fs.readdirSync(path.join(root,relative),{withFileTypes:true});}catch{return out;}
  for(const entry of entries){if([".git","node_modules","dist","build",".next"].includes(entry.name))continue;const rel=path.join(relative,entry.name);if(entry.isDirectory())walk(root,rel,out);else if(entry.isFile()&&TEXT_EXT.test(entry.name))out.push(rel);if(out.length>1200)break;}return out;
}
function supabase(cwd){
  const check={kind:"supabase-rls",ok:false,issues:[],evidence:[]};if(!exists(cwd,"supabase/config.toml"))issue(check,"supabase/config.toml is missing");else check.evidence.push("supabase/config.toml");
  let migrations=[];try{migrations=fs.readdirSync(path.join(cwd,"supabase","migrations")).filter(x=>x.endsWith(".sql")).map(x=>`supabase/migrations/${x}`);}catch{}
  if(!migrations.length)issue(check,"Supabase migration SQL is missing");const sql=migrations.map(file=>read(cwd,file)).join("\n");check.evidence.push(...migrations);
  if(!/create\s+table/i.test(sql))issue(check,"migration does not create a table");if(!/enable\s+row\s+level\s+security/i.test(sql))issue(check,"RLS is not enabled");if(!/force\s+row\s+level\s+security/i.test(sql))issue(check,"RLS is not forced");if(!/auth\.uid\s*\(\s*\)/i.test(sql))issue(check,"policies are not scoped with auth.uid()");
  for(const action of ["select","insert","update","delete"])if(!new RegExp(`for\\s+${action}\\b`,"i").test(sql))issue(check,`RLS policy for ${action.toUpperCase()} is missing`);
  if(!/for\s+insert[\s\S]{0,800}with\s+check/i.test(sql))issue(check,"INSERT policy needs WITH CHECK");if(!/for\s+update[\s\S]{0,1200}with\s+check/i.test(sql))issue(check,"UPDATE policy needs WITH CHECK");
  const leaked=walk(cwd).find(file=>/(?:sb_secret_[a-z0-9_-]{8,}|service[_-]?role(?:[_-]?key)?\s*[:=]\s*["'][^"']{8,})/i.test(read(cwd,file)));if(leaked)issue(check,`privileged Supabase credential pattern found in project file: ${leaked}`);
  return finish(check);
}

export function artifactContract(cwd,{taskText=""}={}){
  const text=fold(taskText),creating=CREATE.test(text),checks=[];
  if(creating&&SINGLE.test(text)&&SINGLE_WEB_TARGET.test(text))checks.push(singleFileWeb(cwd,text));
  else if(creating&&SITE.test(text))checks.push(/\bpwa\b/i.test(text)?pwaWebsite(cwd):website(cwd));
  if(creating&&APP.test(text)&&!SITE.test(text))checks.push(mobileApp(cwd));
  if((DATABASE.test(text)&&/\b(?:supabase|rls|row\s+level\s+security)\b/i.test(text))||exists(cwd,"supabase/config.toml"))checks.push(supabase(cwd));
  return {ok:checks.every(check=>check.ok),enforced:checks.length>0,checks};
}
