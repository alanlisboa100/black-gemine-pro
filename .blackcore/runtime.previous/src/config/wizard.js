import readline from "node:readline/promises";
import {stdin as input,stdout as output} from "node:process";
import {loadConfig,saveConfig,setSecret,configPaths} from "./loader.js";
import {listModels} from "./models.js";
import {askSecret} from "../tui/secret-input.js";
import {currentReasoning,reasoningLevels,setReasoning,syncReasoningToCurrent} from "./reasoning.js";

export async function runConfigWizard(){
  const cfg=loadConfig();output.write("\nBLACKCORE // CONFIG\n\n");
  const oa=await askSecret("OpenAI API key (Enter to keep current): ");if(oa)setSecret("OPENAI_API_KEY",oa);
  const ds=await askSecret("DeepSeek API key (Enter to keep current): ");if(ds)setSecret("DEEPSEEK_API_KEY",ds);
  for(const [i,env] of ["GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4"].entries()){
    const gemini=await askSecret(`Google AI Studio / Gemini API key ${i+1} (Enter to keep current): `);if(gemini)setSecret(env,gemini);
  }
  const rl=readline.createInterface({input,output});try{
    const models=listModels(cfg);models.forEach((m,i)=>output.write(`${i+1}. ${m.provider}/${m.id}\n`));const pick=await rl.question(`Default model [${cfg.provider}/${cfg.model}]: `);
    let modelSelected=false;if(pick.trim()){const n=Number(pick)-1;if(Number.isInteger(n)&&models[n]){cfg.provider=models[n].provider;cfg.model=models[n].id;modelSelected=true;}else {const [p,...rest]=pick.trim().split("/");if(rest.length){cfg.provider=p;cfg.model=rest.join("/");modelSelected=true;}}}
    const levels=reasoningLevels(cfg.model),cur=currentReasoning(cfg,cfg.provider,cfg.model);
    if(levels.length){output.write("\nReasoning level:\n");levels.forEach((x,i)=>output.write(`${i+1}. ${x.label}${x.id===cur.id?" (current)":""} — ${x.description}\n`));const ep=await rl.question(`Reasoning [${cur.label}]: `);if(ep.trim()){const n=Number(ep)-1;if(Number.isInteger(n)&&levels[n])setReasoning(cfg,cfg.provider,cfg.model,levels[n].id);}}
    const language=await rl.question(`Assistant response language [${cfg.responseLanguage||"auto"}] (auto|en|pt-BR): `);if(language.trim()&&["auto","en","pt-br"].includes(language.trim().toLowerCase()))cfg.responseLanguage=language.trim().toLowerCase()==="pt-br"?"pt-BR":language.trim().toLowerCase();
    if(modelSelected){cfg.modelLock=true;cfg.autoRoute=false;cfg.autoFallback=false;}syncReasoningToCurrent(cfg,cfg.provider,cfg.model);saveConfig(cfg);const paths=configPaths();output.write(`\n✓ Configuration saved\nsettings: ${paths.settings}\nsecrets: ${paths.secrets}\n`);
  }finally{rl.close();}
}
