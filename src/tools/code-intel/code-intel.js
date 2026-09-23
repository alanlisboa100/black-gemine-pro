import fs from "node:fs/promises";
import path from "node:path";
import {defineTool} from "../registry.js";
import {readable,writable,capture} from "../fs/common.js";
import {walk,readText,writeTextAtomic} from "../../utils/fs.js";
import {extractSymbols,extractorFor} from "../../context/symbols/index.js";
import {detectProject} from "../../context/project/index.js";
import {available,runCli} from "../common/cli.js";

const CODE=/\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|kts|cs|cpp|c|h|hpp|rb|php|swift|dart|vue|svelte)$/i;
function word(value){const s=String(value||"");if(!/^[A-Za-z_$][\w$]{0,199}$/.test(s))throw new Error("symbol must be an identifier");return s;}
function escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
async function sourceFiles(ctx,maxFiles=2000){const root=await readable(ctx,".");return (await walk(root,{maxFiles})).filter(x=>CODE.test(x));}
async function diagnostics(ctx){
  const project=detectProject(ctx.cwd),commands=[];
  for(const eco of project.ecosystems){
    if(eco.ecosystem==="node"){if(eco.scripts?.typecheck)commands.push([eco.packageManager,["run","typecheck"]]);else if(await fs.access(path.join(ctx.cwd,"tsconfig.json")).then(()=>true).catch(()=>false))commands.push(["npx",["tsc","--noEmit","--pretty","false"]]);}
    if(eco.ecosystem==="python")commands.push(["python",["-m","compileall","-q","."]]);
    if(eco.ecosystem==="rust")commands.push(["cargo",["check","--message-format","short"]]);
    if(eco.ecosystem==="go")commands.push(["go",["vet","./..."]]);
    if(eco.ecosystem==="android")commands.push([eco.gradleRoot==="."?"./gradlew":"./android/gradlew",["compileDebugSources"]]);
  }
  const tools=await available([...new Set(commands.map(x=>x[0]).filter(x=>!x.includes("/")))]),results=[];
  for(const [cmd,args] of commands){if(!cmd.includes("/")&&!tools[cmd]){results.push({command:cmd,skipped:true,reason:"not installed"});continue;}try{const r=await runCli(ctx,cmd,args,{timeoutMs:300000,allowFailure:true});results.push({command:r.command,exitCode:r.exitCode,output:r.output.slice(-20000)});}catch(e){results.push({command:[cmd,...args].join(" "),skipped:true,reason:e.message});}}
  return {project,results,ok:results.filter(x=>!x.skipped).every(x=>x.exitCode===0)};
}
async function symbols(a,ctx){const file=await readable(ctx,a.path),text=await readText(file,a.maxBytes||800000);return {path:path.relative(ctx.cwd,file),symbols:extractSymbols(file,text).slice(0,a.limit||500)};}
async function references(a,ctx){const name=word(a.symbol),re=new RegExp(`\\b${escapeRe(name)}\\b`,"g"),files=await sourceFiles(ctx,a.maxFiles||2000),matches=[];for(const file of files){let text;try{text=await readText(file,a.maxBytes||500000);}catch{continue;}const lines=text.split(/\r?\n/);for(let i=0;i<lines.length;i++){if(re.test(lines[i]))matches.push({path:path.relative(ctx.cwd,file),line:i+1,preview:lines[i].trim().slice(0,300)});re.lastIndex=0;if(matches.length>=(a.limit||500))break;}if(matches.length>=(a.limit||500))break;}return {symbol:name,count:matches.length,matches};}
async function rename(a,ctx){const from=word(a.symbol),to=word(a.newName),refs=await references({...a,limit:a.limit||2000},ctx),files=[...new Set(refs.matches.map(x=>x.path))];if(!a.apply)return {apply:false,from,to,files,references:refs.count,preview:refs.matches.slice(0,100)};if(ctx.cfg.permissionProfile!=="yolo"){const ok=await ctx.confirm(`Rename ${from} to ${to} in ${files.length} files? This is identifier-token replacement; inspect the diff afterwards.`,false);if(!ok)return{apply:false,denied:true};}const re=new RegExp(`\\b${escapeRe(from)}\\b`,"g"),changed=[];for(const rel of files){const file=await writable(ctx,rel),text=await readText(file,a.maxBytes||500000),next=text.replace(re,to);if(next!==text){await capture(ctx,file);await writeTextAtomic(file,next);changed.push(rel);}}return {apply:true,from,to,changed,references:refs.count,warning:"Token-aware rename completed; run diagnostics and review the diff."};}
async function format(a,ctx){if(!a.path)throw new Error("path required");const file=await writable(ctx,a.path),ext=path.extname(file).toLowerCase();await capture(ctx,file);let command,args;if(/[.](?:js|mjs|cjs|jsx|ts|tsx|json|css|scss|md|html)$/.test(ext)){command="npx";args=["prettier","--write",file];}else if(ext===".py"){command=(await available(["ruff"])).ruff?"ruff":"python";args=command==="ruff"?["format",file]:["-m","black",file];}else if(ext===".rs"){command="rustfmt";args=[file];}else if(ext===".go"){command="gofmt";args=["-w",file];}else if(/[.](?:c|cc|cpp|cxx|h|hpp|java|kt|kts)$/.test(ext)){command="clang-format";args=["-i",file];}else throw new Error(`no formatter adapter for ${ext||"this file"}`);const r=await runCli(ctx,command,args,{timeoutMs:180000});return {path:path.relative(ctx.cwd,file),command:r.command,exitCode:r.exitCode,output:r.output};}

export const codeIntelTool=defineTool({
  name:"code_intel",description:"Structured code intelligence across supported languages: detect adapters, run compiler diagnostics, extract symbols, find references, preview/apply identifier renames, and format files. Rename is always reviewable and diagnostics should follow it.",planSafe:a=>["detect","diagnostics","symbols","references"].includes(a.action),
  parameters:{type:"object",properties:{action:{type:"string",enum:["detect","diagnostics","symbols","references","rename","format"]},path:{type:"string"},symbol:{type:"string"},newName:{type:"string"},apply:{type:"boolean"},limit:{type:"integer",minimum:1,maximum:5000},maxFiles:{type:"integer",minimum:10,maximum:10000},maxBytes:{type:"integer",minimum:10000,maximum:2000000}},required:["action"],additionalProperties:false},
  async execute(a,ctx){if(a.action==="detect"){const commands=await available(["npx","tsc","python","ruff","pyright","cargo","rustfmt","go","gofmt","clang-format","java","dart"]);return JSON.stringify({commands,symbolExtensions:[...new Set((await sourceFiles(ctx,100)).map(x=>path.extname(x)))],project:detectProject(ctx.cwd)},null,2);}if(a.action==="diagnostics")return JSON.stringify(await diagnostics(ctx),null,2);if(a.action==="symbols")return JSON.stringify(await symbols(a,ctx),null,2);if(a.action==="references")return JSON.stringify(await references(a,ctx),null,2);if(a.action==="rename")return JSON.stringify(await rename(a,ctx),null,2);return JSON.stringify(await format(a,ctx),null,2);}
});
