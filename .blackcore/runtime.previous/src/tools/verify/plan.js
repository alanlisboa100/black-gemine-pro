import fs from "node:fs";
import path from "node:path";
import {detectProject} from "../../context/project/index.js";

function exists(cwd,p){return fs.existsSync(path.join(cwd,p));}
export function verificationPlan(cwd,{level="standard"}={}){
  const project=detectProject(cwd),commands=[...project.verification];
  if(project.primary==="node"){
    const node=project.ecosystems.find(x=>x.ecosystem==="node");const pm=node?.packageManager||"npm",scripts=node?.scripts||{};
    const install=pm==="npm"?(exists(cwd,"package-lock.json")?"npm ci":"npm install"):pm==="pnpm"?"pnpm install --frozen-lockfile":pm==="yarn"?"yarn install --immutable":"bun install --frozen-lockfile";
    if(level==="full")commands.unshift(install);
  }
  if(project.deploy.vercel&&level!=="fast")commands.push("vercel build");
  if(project.deploy.expoConfig&&level==="full")commands.push("npx expo-doctor");
  if(project.ecosystems.some(x=>x.ecosystem==="android")&&level==="full"){
    const a=project.ecosystems.find(x=>x.ecosystem==="android"),base=a.gradleRoot==="."?"./":"./android/";commands.push(`${base}gradlew assembleDebug`);
  }
  const unique=[...new Set(commands)];
  if(level==="fast")return {project,commands:unique.filter(c=>/lint|typecheck|check|test|fmt|vet/.test(c)).slice(0,4)};
  return {project,commands:unique};
}
