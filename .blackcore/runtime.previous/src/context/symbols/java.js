import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractJava(text) {
  const out = [];
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(public|protected|private)?\s*(?:abstract\s+|final\s+)?(class|interface|enum|record)\s+([A-Za-z_]\w*)\b/g,
    (m,line)=>makeSymbol({name:m[4],kind:m[3],line,signature:firstLine(m[0]),exported:m[2]==="public"})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(public|protected|private)?\s*(?:static\s+)?(?:final\s+)?(?:<[^>]+>\s*)?[\w<>\[\], ?.@]+\s+([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:throws[^{]+)?\{/g,
    (m,line)=>makeSymbol({name:m[3],kind:"method",line,signature:firstLine(m[0]),exported:m[2]==="public"})
  ));
  return dedupeSymbols(out);
}
