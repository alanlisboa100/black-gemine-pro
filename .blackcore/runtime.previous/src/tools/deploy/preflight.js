import fs from "node:fs";
import path from "node:path";
import {defineTool} from "../registry.js";
import {which,execCapture} from "../../utils/exec.js";
import {detectProject} from "../../context/project/index.js";

async function commandCheck(cmd,args,cwd,timeoutMs=30000){const local=path.join(cwd,"node_modules",".bin",cmd),p=cmd.includes("/")?(fs.existsSync(path.resolve(cwd,cmd))?path.resolve(cwd,cmd):null):(await which(cmd)||fs.existsSync(local)&&local);if(!p)return {ok:false,command:cmd,detail:"not installed"};const r=await execCapture(p,args,{cwd,timeoutMs,maxChars:12000});return {ok:r.code===0,command:[cmd,...args].join(" "),source:p===local?"project":"system",exitCode:r.code,detail:r.combined.slice(-8000)};}
function fileCheck(cwd,name){const p=path.join(cwd,name);return {name,exists:fs.existsSync(p),path:p};}
export const deployPreflightTool=defineTool({
  name:"deploy_preflight",description:"Run non-destructive Vercel, Netlify, Supabase, Resend, Expo/EAS or Android release preflight checks before build or deployment.",readOnly:true,
  parameters:{type:"object",properties:{target:{type:"string",enum:["auto","vercel","netlify","supabase","resend","expo","android","all"]}},additionalProperties:false},
  async execute(a,ctx){const project=detectProject(ctx.cwd),target=a.target||"auto",checks=[],files=[];checks.push(await commandCheck("git",["status","--short"],ctx.cwd));checks.push(await commandCheck("node",["--version"],ctx.cwd));checks.push(await commandCheck("npm",["--version"],ctx.cwd));
    const wants=t=>target==="all"||target===t||target==="auto"&&((t==="vercel"&&project.deploy.vercel)||(t==="netlify"&&project.deploy.netlify)||(t==="supabase"&&project.deploy.supabase)||(t==="resend"&&project.deploy.resend)||(t==="expo"&&project.deploy.expoConfig)||(t==="android"&&project.ecosystems.some(x=>x.ecosystem==="android")));
    if(wants("vercel")){checks.push(await commandCheck("vercel",["whoami"],ctx.cwd));files.push(fileCheck(ctx.cwd,"vercel.json"));}
    if(wants("netlify")){checks.push(await commandCheck("netlify",["status"],ctx.cwd));files.push(fileCheck(ctx.cwd,"netlify.toml"));}
    if(wants("supabase")){checks.push(await commandCheck("supabase",["--version"],ctx.cwd));files.push(fileCheck(ctx.cwd,"supabase/config.toml"));}
    if(wants("resend")){checks.push(await commandCheck("resend",["doctor"],ctx.cwd));}
    if(wants("expo")){checks.push(await commandCheck("npx",["expo-doctor"],ctx.cwd,120000));checks.push(await commandCheck("eas",["whoami"],ctx.cwd));files.push(fileCheck(ctx.cwd,"app.json"),fileCheck(ctx.cwd,"eas.json"));}
    if(wants("android")){const gradle=fs.existsSync(path.join(ctx.cwd,"gradlew"))?"./gradlew":fs.existsSync(path.join(ctx.cwd,"android","gradlew"))?"./android/gradlew":null;if(gradle)checks.push(await commandCheck(gradle,["tasks","--quiet"],ctx.cwd,120000));}
    const blocking=checks.filter(x=>!x.ok&&!["git status --short"].includes(x.command));return JSON.stringify({ok:blocking.length===0,target,project,files,checks,blocking:blocking.map(x=>x.command)},null,2);}
});
