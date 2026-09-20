import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractJavaScript(text) {
  const out = [];
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g,
    (m,line)=>makeSymbol({name:m[3],kind:"function",line,signature:firstLine(m[0]),exported:!!m[2]})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(export\s+)?class\s+([A-Za-z_$][\w$]*)\s*(?:extends\s+([A-Za-z_$][\w$.]*))?/g,
    (m,line)=>makeSymbol({name:m[3],kind:"class",line,signature:firstLine(m[0]),exported:!!m[2]})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    (m,line)=>makeSymbol({name:m[3],kind:"function",line,signature:firstLine(m[0]),exported:!!m[2]})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)\b/g,
    (m,line)=>makeSymbol({name:m[3],kind:"type",line,signature:firstLine(m[0]),exported:!!m[2]})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(export\s+)?enum\s+([A-Za-z_$][\w$]*)\b/g,
    (m,line)=>makeSymbol({name:m[3],kind:"enum",line,signature:firstLine(m[0]),exported:!!m[2]})
  ));
  return dedupeSymbols(out);
}
