import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {which} from "../utils/exec.js";
import {BC_HOME} from "../utils/paths.js";

const DEVICE_API_COMMANDS=[
  "termux-battery-status","termux-camera-info","termux-location","termux-notification",
  "termux-open","termux-share","termux-wake-lock"
];

export function isTermuxEnvironment(env=process.env,home=os.homedir()){
  return String(env.PREFIX||"").includes("com.termux")||String(home).includes("com.termux")||!!env.TERMUX_VERSION;
}

function access(target){
  const result={path:target,realPath:null,exists:false,readable:false,writable:false,executable:false,type:null,symlink:false};
  try{const stat=fs.lstatSync(target);result.exists=true;result.type=stat.isDirectory()?"directory":stat.isFile()?"file":"other";result.symlink=stat.isSymbolicLink();}catch{return result;}
  try{result.realPath=fs.realpathSync(target);}catch{}
  for(const [key,mode] of [["readable",fs.constants.R_OK],["writable",fs.constants.W_OK],["executable",fs.constants.X_OK]]){try{fs.accessSync(target,mode);result[key]=true;}catch{}}
  return result;
}

function storagePaths(home){
  const storage=path.join(home,"storage");
  return ["shared","downloads","dcim","pictures","movies","music","external-1"].map(name=>({name,...access(path.join(storage,name))}));
}

export async function inspectPermissions({
  cwd=process.cwd(),home=os.homedir(),env=process.env,platform=process.platform,
  blackcoreHome=BC_HOME,whichFn=which
}={}){
  const termux=isTermuxEnvironment(env,home),workspace=access(path.resolve(cwd)),homeAccess=access(home),blackcore=access(blackcoreHome),tmp=access(os.tmpdir());
  const storage=termux?storagePaths(home):[];
  const apiPairs=await Promise.all(DEVICE_API_COMMANDS.map(async command=>[command,!!(await whichFn(command))]));
  const deviceApi=Object.fromEntries(apiPairs),deviceApiCount=Object.values(deviceApi).filter(Boolean).length;
  const setupStorage=!!(await whichFn("termux-setup-storage")),termuxInfo=!!(await whichFn("termux-info"));
  const shared=storage.find(x=>x.name==="shared"),actions=[],limits=[];
  if(termux&&(!shared?.exists||!shared.readable||!shared.writable))actions.push("Run termux-setup-storage, allow Files and media / All files access in Android settings, then restart Termux.");
  if(termux&&deviceApiCount===0)actions.push("For camera, location, battery and notification features, install the Termux:API app from the same source/signing family as Termux, then run: pkg install termux-api");
  if(!workspace.writable)actions.push(`Workspace is not writable: ${workspace.path}`);
  if(!blackcore.exists)actions.push("BLACKCORE home has not been created yet; the installer creates it with private configuration and logs.");
  const lexicalWorkspace=path.resolve(cwd),sharedAlias=path.join(path.resolve(home),"storage")+path.sep,externalWorkspace=lexicalWorkspace.startsWith(sharedAlias)||/^\/(?:sdcard|storage\/emulated)|\/storage\//.test(workspace.realPath||lexicalWorkspace);
  if(termux&&externalWorkspace)actions.push("Keep executable projects and node_modules under Termux $HOME; shared Android storage is best used for import/export files.");
  limits.push("BLACKCORE can read and write the active workspace; external paths remain protected by the selected BLACKCORE permission profile.");
  if(termux)limits.push("Android application permissions, scoped storage and device APIs cannot be granted silently by a Node.js process.");
  limits.push("Root access is not required and is never assumed.");
  return {
    environment:termux?"termux":platform,
    platform,arch:process.arch,termuxVersion:env.TERMUX_VERSION||null,prefix:env.PREFIX||null,
    identity:{uid:process.getuid?.()??null,gid:process.getgid?.()??null,root:(process.getuid?.()??-1)===0},
    filesystem:{workspace,home:homeAccess,blackcore,tmp,sharedStorage:shared||null,storage},
    termux:{detected:termux,setupStorageCommand:setupStorage,termuxInfoCommand:termuxInfo,deviceApi,deviceApiAvailable:deviceApiCount,deviceApiTotal:DEVICE_API_COMMANDS.length},
    ready:workspace.readable&&workspace.writable&&(!termux||(!!shared?.readable&&!!shared?.writable)),
    actions,limits
  };
}

export {DEVICE_API_COMMANDS};
