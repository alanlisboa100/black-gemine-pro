import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export const HOME = os.homedir();
export const BC_HOME = process.env.BLACKCORE_HOME || path.join(HOME, ".blackcore");
export const CONFIG_DIR = path.join(BC_HOME, "config");
export const SESSION_DIR = path.join(BC_HOME, "sessions");
export const CACHE_DIR = path.join(BC_HOME, "cache");
export const LOG_DIR = path.join(BC_HOME, "logs");
export const GLOBAL_SKILLS_DIR = path.join(BC_HOME, "skills");
export const GLOBAL_EXTENSIONS_DIR = path.join(BC_HOME, "extensions");
export const GLOBAL_PROMPTS_DIR = path.join(BC_HOME, "prompts");
export const GLOBAL_THEMES_DIR = path.join(BC_HOME, "themes");
export const MCP_DIR = path.join(BC_HOME, "mcp");
export const CHECKPOINT_DIR = path.join(BC_HOME, "checkpoints");
export const AGENT_MEMORY_DIR = path.join(BC_HOME, "project-memory");
export const TASK_RECOVERY_DIR = path.join(BC_HOME, "task-recovery");

export function ensureDir(p){fs.mkdirSync(p,{recursive:true});return p;}
export function ensureHome(){
  for(const p of [BC_HOME,CONFIG_DIR,SESSION_DIR,CACHE_DIR,LOG_DIR,GLOBAL_SKILLS_DIR,GLOBAL_EXTENSIONS_DIR,GLOBAL_PROMPTS_DIR,GLOBAL_THEMES_DIR,MCP_DIR,CHECKPOINT_DIR,AGENT_MEMORY_DIR,TASK_RECOVERY_DIR]) ensureDir(p);
}
export function safeProjectKey(cwd){
  return path.resolve(cwd).replace(/^[A-Za-z]:/,"").replace(/[\\/]+/g,"_").replace(/[^A-Za-z0-9_.-]/g,"_").slice(0,180) || "root";
}
export function projectStateDir(base,cwd){return ensureDir(path.join(base,safeProjectKey(cwd)));}
export function isInside(root,target){
  const r=path.resolve(root),t=path.resolve(target),rel=path.relative(r,t);
  return rel==="" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
export function resolveFrom(cwd,p="."){return path.resolve(cwd,p);}
export function projectFile(cwd,...names){return path.join(path.resolve(cwd),...names);}
export function homeFile(...names){return path.join(BC_HOME,...names);}
