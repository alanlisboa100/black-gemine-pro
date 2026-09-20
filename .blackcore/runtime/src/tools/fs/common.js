import fs from "node:fs/promises";
import path from "node:path";
import {assertReadable,assertWritable} from "../../security/workspace.js";
export async function readable(ctx,p){return assertReadable(ctx,p);}
export async function writable(ctx,p){return assertWritable(ctx,p);}
export async function capture(ctx,p){await ctx.checkpoints?.capture(path.resolve(p));}
export async function ensureParent(p){await fs.mkdir(path.dirname(p),{recursive:true});}
export function lineSlice(text,offset=1,limit=1000){
  const rows=String(text).split(/\r?\n/),start=Math.max(0,offset-1),end=Math.min(rows.length,start+limit);
  return {text:rows.slice(start,end).map((x,i)=>`${start+i+1}: ${x}`).join("\n"),total:rows.length,start:start+1,end};
}
