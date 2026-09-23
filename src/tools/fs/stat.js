import fs from "node:fs/promises";
import {defineTool} from "../registry.js";
import {readable} from "./common.js";
export const statTool=defineTool({name:"stat",description:"Return metadata for a filesystem path.",readOnly:true,parameters:{type:"object",properties:{path:{type:"string"}},required:["path"],additionalProperties:false},async execute(a,ctx){const p=await readable(ctx,a.path),s=await fs.stat(p);return JSON.stringify({path:p,type:s.isFile()?"file":s.isDirectory()?"directory":s.isSymbolicLink()?"symlink":"other",size:s.size,mode:(s.mode&0o777).toString(8),mtime:s.mtime.toISOString(),ctime:s.ctime.toISOString()},null,2);}});
