import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractGo(text) {
  const out = [];
  out.push(...collectRegex(
    text,
    /(^|\n)\s*func\s+(?:\(([^)]*)\)\s*)?([A-Za-z_]\w*)\s*\(([^)]*)\)\s*([^{\n]*)/g,
    (m,line)=>makeSymbol({name:m[3],kind:m[2]?"method":"function",line,signature:firstLine(m[0]),exported:/^[A-Z]/.test(m[3])})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*type\s+([A-Za-z_]\w*)\s+(struct|interface)\b/g,
    (m,line)=>makeSymbol({name:m[2],kind:m[3],line,signature:firstLine(m[0]),exported:/^[A-Z]/.test(m[2])})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(?:const|var)\s+([A-Za-z_]\w*)\b/g,
    (m,line)=>makeSymbol({name:m[2],kind:"variable",line,signature:firstLine(m[0]),exported:/^[A-Z]/.test(m[2])})
  ));
  return dedupeSymbols(out);
}
