import fs from "node:fs";
import path from "node:path";
import {escapeHtml} from "../tui/markdown.js";

export function exportJson(session,file){
  const data={session:session.info(),entries:session.entries};fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n","utf8");return file;
}
export function exportHtml(session,file){
  const rows=session.activePath().map(e=>{
    if(e.type==="message")return `<section class="${e.role}"><h3>${escapeHtml(e.role)}</h3><pre>${escapeHtml(e.content||"")}</pre></section>`;
    if(e.type==="compaction")return `<section class="compact"><h3>compaction</h3><pre>${escapeHtml(e.content||"")}</pre></section>`;
    return "";
  }).join("\n");
  const h=session.info();const html=`<!doctype html><meta charset="utf-8"><title>BLACKCORE Session</title><style>body{font-family:ui-monospace,monospace;max-width:1000px;margin:40px auto;padding:0 20px;background:#0a0a0d;color:#e8e8ee}section{border:1px solid #292934;border-radius:10px;padding:14px;margin:12px 0}.user{border-color:#5b4bc4}.assistant{border-color:#168b80}.tool{opacity:.85}pre{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#999}</style><h1>BLACKCORE Session</h1><small>${escapeHtml(h.id)} · ${escapeHtml(h.cwd)}</small>${rows}`;
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html,"utf8");return file;
}
