import path from "node:path";
import fs from "node:fs/promises";
import {walk} from "../utils/fs.js";
import {extractSymbols} from "./symbols/index.js";

const IMPORTANT=/^(readme|package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|build\.gradle|settings\.gradle|gradle\.properties|dockerfile|compose\.ya?ml|vercel\.json|app\.json|app\.config\.(js|ts)|eas\.json|tsconfig\.json|vite\.config|next\.config)/i;
const CODE=/\.(mjs|cjs|js|jsx|ts|tsx|py|rs|go|java|kt|kts|c|cc|cpp|h|hpp|cs|rb|php|swift|dart|vue|svelte|sql|sh)$/i;

async function lineCount(file,maxBytes=400000){
  try{const st=await fs.stat(file);if(st.size>maxBytes)return null;const t=await fs.readFile(file,"utf8");return t.split(/\r?\n/).length;}catch{return null;}
}
export async function buildRepoIndex(cwd,{maxFiles=12000,maxDetailed=300}={}){
  const root=path.resolve(cwd),files=await walk(root,{maxFiles}),rows=[];
  for(const file of files){
    const rel=path.relative(root,file),base=path.basename(file);let score=0;
    if(IMPORTANT.test(base))score+=100;if(CODE.test(base))score+=25;score-=rel.split(path.sep).length*2;
    rows.push({rel,file,score,size:(await fs.stat(file).catch(()=>({size:0}))).size});
  }
  rows.sort((a,b)=>b.score-a.score||a.rel.localeCompare(b.rel));
  const detailed=[];for(const r of rows.slice(0,maxDetailed)){let symbols=[]; if(CODE.test(r.rel)&&r.size<300000){try{symbols=extractSymbols(r.file,await fs.readFile(r.file,"utf8")).slice(0,40);}catch{}} detailed.push({...r,lines:CODE.test(r.rel)?await lineCount(r.file):null,symbols});}
  return {root,totalFiles:files.length,important:detailed};
}
export function renderRepoIndex(idx){
  const rows=[`Repository: ${idx.root}`,`Files indexed: ${idx.totalFiles}`,"","High-signal files:"];
  for(const r of idx.important){rows.push(`- ${r.rel} (${r.size}b${r.lines?`, ${r.lines} lines`:""})`);if(r.symbols?.length)rows.push(`  symbols: ${r.symbols.slice(0,14).map(s=>s.name||s).join(", ")}`);}return rows.join("\n");
}
