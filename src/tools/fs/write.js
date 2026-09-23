import fs from "node:fs/promises";
import {defineTool} from "../registry.js";
import {writable,capture,ensureParent} from "./common.js";

export const writeTool=defineTool({
  name:"write",description:"Create or replace a UTF-8 text file atomically.",mutates:true,
  parameters:{type:"object",properties:{path:{type:"string"},content:{type:"string"}},required:["path","content"],additionalProperties:false},
  async execute(a,ctx){const p=await writable(ctx,a.path);await capture(ctx,p);await ensureParent(p);const tmp=p+`.blackcore-${process.pid}.tmp`;await fs.writeFile(tmp,a.content,"utf8");await fs.rename(tmp,p);return `wrote ${Buffer.byteLength(a.content)} bytes -> ${p}`;}
});
