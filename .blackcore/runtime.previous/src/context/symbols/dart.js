import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractDart(text) {
  const out = [];
  out.push(...collectRegex(text,/(^|\n)\s*(?:abstract\s+|base\s+|final\s+|interface\s+|sealed\s+)?(class|enum|mixin|extension)\s+([A-Za-z_]\w*)/g,(m,line)=>makeSymbol({name:m[3],kind:m[2],line,signature:firstLine(m[0]),exported:!m[3].startsWith("_")})));
  out.push(...collectRegex(text,/(^|\n)\s*(?:[A-Za-z_<>,?]+\s+)+([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:async\*?|sync\*)?\s*\{/g,(m,line)=>makeSymbol({name:m[2],kind:"function",line,signature:firstLine(m[0]),exported:!m[2].startsWith("_")})));
  return dedupeSymbols(out);
}
