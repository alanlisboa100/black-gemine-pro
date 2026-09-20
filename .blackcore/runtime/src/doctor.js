import fs from "node:fs";
import os from "node:os";
import {execCapture,which} from "./utils/exec.js";
import {loadConfig,getSecret,getSecretSource,configPaths} from "./config/loader.js";
import {providerAuth} from "./config/models.js";
import {ProviderRegistry} from "./providers/registry.js";
import {c} from "./tui/ansi.js";
import path from "node:path";
import {BC_HOME} from "./utils/paths.js";
import {humanBytes} from "./utils/text.js";
import {inspectPermissions} from "./platform/permissions.js";

export const DEPENDENCY_GROUPS={
  runtime:[["git"],["npm"],["npx"]],
  search:[["rg"],["fd","fdfind"]],
  utilities:[["curl"],["wget"],["jq"],["ssh"],["unzip"],["zip"],["tar"]],
  build:[["python","python3"],["make"],["clang"],["cmake"],["pkg-config"]],
  media:[["ffmpeg"],["ffprobe"],["magick","convert"],["rembg"],["whisper-cli","whisper"],["pdftotext"],["tesseract"]],
  localAi:[["llama-server","llama"],["sqlite3"]],
  web:[["chromium","chromium-browser"]],
  android:[["java"],["gradle"],["aapt"],["apksigner"],["adb"]],
  database:[["sqlite3"],["psql"]],
  languages:[["go"],["cargo"],["php"],["composer"]],
  delivery:[["gh"],["vercel"],["netlify"],["eas"],["supabase"],["resend"]]
};

function directorySize(root){
  let total=0,files=0;const pending=[root];
  while(pending.length){const current=pending.pop();let entries;try{entries=fs.readdirSync(current,{withFileTypes:true});}catch{continue;}for(const entry of entries){const file=path.join(current,entry.name);if(entry.isDirectory())pending.push(file);else if(entry.isFile()){try{total+=fs.statSync(file).size;files++;}catch{}}}}
  return {bytes:total,files};
}

async function findCommand(names){for(const name of names){const found=await which(name);if(found)return {name,path:found};}return null;}
async function commandVersion(command){try{const r=await execCapture(command,["--version"],{timeoutMs:3000,maxChars:2000}),line=(r.stdout||r.stderr||"").split(/\r?\n/).find(Boolean);return line?.trim().slice(0,120)||"version unavailable";}catch{return "version unavailable";}}

async function row(name,status,detail=""){
  const icon=status===true?c(82,"✓"):status==="warn"?c(220,"◇"):c(196,"✗");
  process.stdout.write(`${icon} ${name}${detail?` · ${detail}`:""}\n`);
  return status!==false;
}
export async function doctor(cwd=process.cwd(),{api=false,full=false,permissions=false}={}){
  const cfg=loadConfig(cwd);let ok=true;process.stdout.write("\nBLACKCORE // DOCTOR\n\n");
  ok=(await row("Node.js",Number(process.versions.node.split(".")[0])>=20,process.version))&&ok;
  await row("platform",true,`${process.platform}/${process.arch} · ${os.release()}`);
  for(const cmd of ["git","rg","fd","curl","python","npm","npx","ffmpeg","ffprobe","magick","rembg","sqlite3","llama-server","whisper-cli"]){
    let p=await which(cmd);
    if(cmd==="fd"&&!p)p=await which("fdfind");
    if(cmd==="magick"&&!p)p=await which("convert");
    if(cmd==="llama-server"&&!p)p=await which("llama");
    const required=["git","npm","npx"].includes(cmd);
    if(required&&!p)ok=false;
    const install=cmd==="ffmpeg"||cmd==="ffprobe"?"pkg install ffmpeg":cmd==="magick"?"pkg install imagemagick":cmd==="rembg"?"bash scripts/install-photo-ai.sh":cmd==="llama-server"?"bash scripts/install-local-ai.sh":cmd==="sqlite3"?"pkg install sqlite":cmd==="whisper-cli"?"bash scripts/install-video-ai.sh --model tiny":null;
    const detail=p?`${p} · ${await commandVersion(p)}`:(install?`optional for media/outfit studio · install: ${install}`:"optional / fallback available");
    await row(cmd,p?true:required?false:"warn",detail);
  }
  for(const [name,env] of [["OpenAI key","OPENAI_API_KEY"],["DeepSeek key","DEEPSEEK_API_KEY"]]){const configured=!!getSecret(env),source=getSecretSource(env);await row(name,configured?true:"warn",configured?`configured · source=${source}`:"not configured");}
  const googleEnvs=cfg.providers?.google?.apiKeyEnvs||["GEMINI_API_KEY"],googleConfigured=googleEnvs.map((env,i)=>({env,slot:i+1,configured:!!getSecret(env),source:getSecretSource(env)})),googleCount=googleConfigured.filter(x=>x.configured).length;
  await row("Google AI Studio key pool",googleCount?true:"warn",`${googleCount}/${googleEnvs.length} configured${googleCount?` · slots ${googleConfigured.filter(x=>x.configured).map(x=>x.slot).join(", ")}`:""}`);
  const paths=configPaths();const configOk=fs.existsSync(paths.settings);ok=configOk&&ok;await row("config",configOk,paths.settings);
  const secretOk=fs.existsSync(paths.secrets)?(fs.statSync(paths.secrets).mode&0o077)===0:false;ok=secretOk&&ok;await row("secrets permissions",secretOk,paths.secrets);
  if(full){
    const profileFile=path.join(BC_HOME,"install-profile"),profile=fs.existsSync(profileFile)?fs.readFileSync(profileFile,"utf8").trim():"source / unknown";
    process.stdout.write("\nDEPENDENCIES // FULL PROFILE\n\n");
    await row("installed profile",true,profile);
    const chromium=await findCommand(["chromium","chromium-browser","google-chrome","google-chrome-stable"]),playwright=!!await import("playwright-core").catch(()=>null),display=!!(process.env.DISPLAY||process.env.WAYLAND_DISPLAY);
    await row("persistent browser",chromium&&playwright?true:"warn",chromium&&playwright?"Chromium + Playwright ready; private profiles remain under BLACKCORE home":"install with: bash INSTALAR-BLACKCORE.sh --with-browser");
    await row("visible browser login",chromium&&playwright&&display?true:"warn",display?"display available; enter password/MFA only in the browser window":"headless ready; Termux:X11/DISPLAY required for manual login");
    const [nodeMajor,nodeMinor]=process.versions.node.split(".").map(Number),deliveryNode=nodeMajor>22||nodeMajor===22&&nodeMinor>=13;
    await row("delivery CLI Node.js",deliveryNode?true:"warn",deliveryNode?`${process.version} · compatible with current Netlify/Resend CLIs`:`${process.version} · Netlify/Resend currently require >=22.13; core remains supported`);
    for(const [group,commands] of Object.entries(DEPENDENCY_GROUPS)){
      let available=0;const missing=[];
      for(const alternatives of commands){const found=await findCommand(alternatives);if(found)available++;else missing.push(alternatives[0]);}
      const complete=available===commands.length,required=group==="runtime";
      if(required&&!complete)ok=false;
      await row(group,complete?true:required?false:"warn",`${available}/${commands.length}${missing.length?` · missing: ${missing.join(", ")}`:""}`);
    }
    const runtime=path.join(BC_HOME,"runtime"),target=fs.existsSync(runtime)?runtime:path.resolve(cwd),size=directorySize(target);
    await row("runtime size",true,`${humanBytes(size.bytes)} · ${size.files} files · ${target}`);
  }
  if(full||permissions){
    const report=await inspectPermissions({cwd});
    process.stdout.write(`\nPERMISSIONS // ${report.environment.toUpperCase()}\n\n`);
    await row("workspace",report.filesystem.workspace.readable&&report.filesystem.workspace.writable,`${report.filesystem.workspace.readable?"read":"no read"} / ${report.filesystem.workspace.writable?"write":"no write"} · ${report.filesystem.workspace.path}`);
    await row("BLACKCORE home",report.filesystem.blackcore.exists?report.filesystem.blackcore.readable&&report.filesystem.blackcore.writable:"warn",report.filesystem.blackcore.exists?`${report.filesystem.blackcore.readable?"read":"no read"} / ${report.filesystem.blackcore.writable?"write":"no write"} · ${report.filesystem.blackcore.path}`:"created during installation");
    if(report.termux.detected){
      const shared=report.filesystem.sharedStorage;
      await row("shared storage",shared?.readable&&shared?.writable?true:"warn",shared?.exists?`${shared.readable?"read":"no read"} / ${shared.writable?"write":"no write"} · ${shared.path}`:"not configured");
      const available=report.filesystem.storage.filter(x=>x.exists&&x.readable).map(x=>x.name);
      await row("storage folders",available.length?true:"warn",available.length?available.join(", "):"none accessible");
      await row("Termux:API",report.termux.deviceApiAvailable?true:"warn",`${report.termux.deviceApiAvailable}/${report.termux.deviceApiTotal} command groups available`);
    }else await row("desktop filesystem",report.filesystem.home.readable&&report.filesystem.tmp.writable,"home read · temporary write");
    const policy=cfg.permissionProfile||"balanced",policyDetail=policy==="safe"?"workspace only; external access blocked":policy==="yolo"?"unrestricted BLACKCORE policy; OS permissions still apply":"workspace allowed; external and sensitive access asks first";
    await row("BLACKCORE policy",policy==="yolo"?"warn":true,`${policy} · ${policyDetail}`);
    await row("root",report.identity.root?"warn":true,report.identity.root?"running as root; not required":"not required · least privilege active");
    for(const action of report.actions)await row("action", "warn",action);
    for(const limit of report.limits)await row("boundary",true,limit);
    if(!report.filesystem.workspace.readable||!report.filesystem.workspace.writable)ok=false;
  }
  if(api){
    const providers=new ProviderRegistry(cfg);try{const p=providers.create(cfg.provider,cfg.model),r=await p.chat({messages:[{role:"user",content:"Reply only with OK"}],tools:[],stream:false});const apiOk=!!r.message?.content;ok=apiOk&&ok;await row("provider API",apiOk,`${cfg.provider}/${cfg.model}: ${String(r.message?.content||"").slice(0,80)}`);}catch(e){ok=false;await row("provider API",false,e.message.slice(0,200));}
  }
  const activeKey=providerAuth(cfg,cfg.provider),localReady=cfg.providers?.[cfg.provider]?.apiKeyOptional===true;
  const readyLabel=!ok?"BLACKCORE has issues":activeKey||localReady?"BLACKCORE READY":"BLACKCORE READY — configure an API key to chat";
  process.stdout.write(`\n${ok?c(activeKey||localReady?82:220,readyLabel):c(220,readyLabel)}\n`);return ok;
}
