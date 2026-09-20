import fs from "node:fs";
import crypto from "node:crypto";
import {defineTool} from "../registry.js";
import {readable} from "./common.js";
export const fileHashTool=defineTool({name:"file_hash",description:"Calculate a SHA-256/SHA-512/MD5 hash for a workspace file.",readOnly:true,parallelSafe:true,parameters:{type:"object",properties:{path:{type:"string"},algorithm:{type:"string",enum:["sha256","sha512","md5"]}},required:["path"],additionalProperties:false},async execute(a,ctx){const p=await readable(ctx,a.path),h=crypto.createHash(a.algorithm||"sha256");await new Promise((resolve,reject)=>{const s=fs.createReadStream(p);s.on("data",d=>h.update(d));s.on("end",resolve);s.on("error",reject);ctx.signal?.addEventListener("abort",()=>s.destroy(ctx.signal.reason||new Error("aborted")),{once:true});});return `${a.algorithm||"sha256"} ${h.digest("hex")}  ${p}`;}});
