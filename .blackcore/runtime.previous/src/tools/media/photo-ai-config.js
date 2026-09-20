import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function validate(value){const model=String(value||"").trim();if(!/^[A-Za-z0-9_-]{2,80}$/.test(model))throw new Error("BLACKCORE_REMBG_MODEL must contain only letters, numbers, underscores or hyphens");return model;}

export async function configuredRembgModel(){
  if(process.env.BLACKCORE_REMBG_MODEL)return validate(process.env.BLACKCORE_REMBG_MODEL);
  const home=process.env.BLACKCORE_HOME||path.join(os.homedir(),".blackcore"),stored=await fs.readFile(path.join(home,"photo-ai","rembg-model"),"utf8").catch(()=>"");return validate(stored||"u2netp");
}
