import path from "node:path";
import {loadConfig,saveConfig,initConfig} from "./config/loader.js";
import {ProviderRegistry} from "./providers/registry.js";
import {ToolRegistry} from "./tools/registry.js";
import {registerBuiltins} from "./tools/builtins.js";
import {HookBus} from "./plugins/hooks.js";
import {PackageManager} from "./plugins/packages.js";
import {ExtensionHost} from "./plugins/loader.js";
import {readManifest,manifestResources} from "./plugins/manifest.js";
import {SkillStore} from "./skills/loader.js";
import {PromptStore} from "./prompts/loader.js";
import {MCPManager} from "./mcp/manager.js";
import {loadInstructions} from "./context/instructions.js";
import {renderRepoIndex} from "./context/repo-index.js";
import {cachedRepoIndex} from "./context/repo-cache.js";
import {UI} from "./tui/ui.js";

export async function createRuntime(cwd=process.cwd(),{ui=null}={}){
  initConfig();const cfg=loadConfig(cwd),providers=new ProviderRegistry(cfg),registry=registerBuiltins(new ToolRegistry()),hooks=new HookBus(),commands=new Map(),packageManager=new PackageManager(cfg),runtimeUI=ui||new UI(cfg);
  const packageResources=packageManager.list().map(dir=>manifestResources(dir,readManifest(dir))),skillDirs=packageResources.flatMap(x=>x.skills),promptDirs=packageResources.flatMap(x=>x.prompts);
  const skills=new SkillStore(cwd,skillDirs),prompts=new PromptStore(cwd,promptDirs),instructions=loadInstructions(cwd);
  let repoSummary="";try{repoSummary=renderRepoIndex(await cachedRepoIndex(cwd,{maxFiles:12000,maxDetailed:160}));}catch{}
  const extensions=new ExtensionHost({cfg,registry,commands,hooks,providers,ui:runtimeUI,packageManager,cwd});await extensions.loadAll();
  const mcp=new MCPManager(cfg,registry);await mcp.load();
  return {cwd:path.resolve(cwd),cfg,saveConfig:()=>saveConfig(cfg),providers,registry,hooks,commands,packageManager,skills,prompts,instructions,repoSummary,extensions,mcp,ui:runtimeUI,async reload(){skills.reload();prompts.reload();await extensions.reload();}};
}
