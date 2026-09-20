import fs from "node:fs";
import path from "node:path";
import {parseCli,parseSlash} from "./commands/parser.js";
import {BlackcoreApp} from "./app.js";
import {runConfigWizard} from "./config/wizard.js";
import {doctor} from "./doctor.js";
import {initProject} from "./project-init.js";
import {initConfig,setSecret,loadConfig,saveConfig} from "./config/loader.js";
import {VERSION} from "./config/defaults.js";
import {SessionStore} from "./sessions/store.js";
import {rpcServer} from "./rpc/server.js";
import {PackageManager} from "./plugins/packages.js";
import {askSecret} from "./tui/secret-input.js";
import {completion} from "./completion/index.js";
import {providerAuth} from "./config/models.js";
import {applyNaturalIntent} from "./natural/intent.js";
import {UI} from "./tui/ui.js";
import {HELP} from "./commands/help.js";

const GOOGLE_KEY_ENVS=["GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4"];
export function credentialSpec(provider,slotArg){
  const raw=String(provider||"").toLowerCase(),m=raw.match(/^(google|gemini|aistudio|google-ai)(?:[-_]?([1-4]))?$/);
  if(m){const slot=Number(slotArg||m[2]||1);if(!Number.isInteger(slot)||slot<1||slot>4)throw new Error("Google key slot must be 1, 2, 3 or 4");return {provider:"google",slot,env:GOOGLE_KEY_ENVS[slot-1],label:`Google AI Studio / Gemini key ${slot}`};}
  const env=({openai:"OPENAI_API_KEY",deepseek:"DEEPSEEK_API_KEY"})[raw]||null;return env?{provider:raw,slot:1,env,label:provider}:null;
}
async function login(provider,slot){
  const spec=credentialSpec(provider,slot);if(!spec)throw new Error("login supports openai, deepseek or google/gemini");
  const key=await askSecret(`${spec.label}: `,{allowEmpty:false});setSecret(spec.env,key);process.stdout.write(`✓ saved ${spec.env}\n`);
}
export async function main(argv=process.argv.slice(2)){
  const sub=argv[0];
  // Pure informational commands must work even when the user's home is
  // intentionally read-only or has not been initialized yet.
  if(["version","--version","-v"].includes(sub)){process.stdout.write(`BLACKCORE Native ${VERSION}\n`);return;}
  if(["help","--help","-h"].includes(sub)){process.stdout.write(HELP+"\n");return;}
  if(sub==="completion"){process.stdout.write(completion(argv[1]||"bash"));return;}
  initConfig();
  if(sub==="config")return runConfigWizard();
  if(sub==="doctor"){const ok=await doctor(process.cwd(),{api:argv.includes("--api"),full:argv.includes("--full"),permissions:argv.includes("--permissions")});if(!ok)process.exitCode=1;return ok;}
  if(sub==="permissions"){const ok=await doctor(process.cwd(),{permissions:true});if(!ok)process.exitCode=1;return ok;}
  if(sub==="init"){process.stdout.write(`✓ ${initProject(process.cwd())}\n`);return;}
  if(sub==="login")return login(argv[1],argv[2]);
  if(sub==="logout"){const spec=credentialSpec(argv[1],argv[2]);if(!spec)throw new Error("provider required");setSecret(spec.env,null);process.stdout.write(`✓ credential removed · ${spec.env}\n`);return;}
  if(sub==="package"){const cfg=loadConfig(),pm=new PackageManager(cfg),action=argv[1],name=argv[2];if(action==="install"){process.stdout.write((await pm.install(name))+"\n");saveConfig(cfg);}else if(action==="remove"){const removed=pm.remove(name);if(removed)saveConfig(cfg);process.stdout.write(removed?"removed\n":"not found\n");}else if(action==="update")process.stdout.write((await pm.update(name))+"\n");else pm.list().forEach(x=>process.stdout.write(x+"\n"));return;}
  const opt=parseCli(argv);if(opt.rpc)return rpcServer(process.cwd(),{events:!!opt.events});
  // First interactive launch configures credentials automatically. Normal use should be just `blackcore` + conversation.
  if(!opt.print&&process.stdin.isTTY){const startup=loadConfig(process.cwd()),wanted=opt.provider||startup.provider;if(!providerAuth(startup,wanted)){new UI(startup).setupIntro();await runConfigWizard();}}
  let file=opt.session?SessionStore.find(process.cwd(),opt.session):opt.cont?SessionStore.latest(process.cwd()):null;
  if(opt.resume&&!file)file=SessionStore.latest(process.cwd());
  const app=await BlackcoreApp.create(process.cwd(),{sessionFile:file,ephemeral:!!opt.noSession,provider:opt.provider,model:opt.model,mode:opt.mode});
  if(opt.name)app.session.name(opt.name);
  if(opt.provider||opt.model){
    const provider=opt.provider||app.agent.provider,configured=app.runtime.cfg.providers?.[provider]?.models||[],current=app.agent.model;
    const model=opt.model||(configured.some(x=>x.id===current)?current:configured[0]?.id||current);app.agent.pinModel(provider,model);
  }
  if(opt.mode)app.agent.mode=opt.mode;
  async function runNaturalOnce(text){
    const slash=parseSlash(text);if(slash){await app.dispatchCommand(slash);return null;}
    const intent=await applyNaturalIntent(app,text);
    if(intent.exit||intent.handled)return null;
    return app.agent.prompt(intent.text||text,{quiet:true,images:opt.images});
  }
  if(opt.print){try{const r=await runNaturalOnce(opt.print);if(r!=null)process.stdout.write(r+"\n");}finally{await app.close();}return;}
  const positional=opt._.filter(x=>!["config","doctor","init"].includes(x));if(positional.length){try{const r=await runNaturalOnce(positional.join(" "));if(r!=null)process.stdout.write(r+"\n");}finally{await app.close();}return;}
  return app.interactive();
}
