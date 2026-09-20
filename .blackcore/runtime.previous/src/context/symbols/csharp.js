import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractCSharp(text) {
  const out = [];
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(public|private|internal|protected)?\s*(?:static\s+|sealed\s+|abstract\s+|partial\s+)*(class|interface|struct|record|enum)\s+([A-Za-z_]\w*)/g,
    (m,line)=>makeSymbol({name:m[4],kind:m[3],line,signature:firstLine(m[0]),exported:m[2]==="public"})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(public|private|internal|protected)?\s*(?:static\s+|virtual\s+|override\s+|async\s+)*[\w<>\[\],?.]+\s+([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:where[^{]+)?\{/g,
    (m,line)=>makeSymbol({name:m[3],kind:"method",line,signature:firstLine(m[0]),exported:m[2]==="public"})
  ));
  return dedupeSymbols(out);
}
