import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractRuby(text) {
  const out = [];
  out.push(...collectRegex(text,/(^|\n)\s*class\s+([A-Z]\w*(?:::\w+)*)/g,(m,line)=>makeSymbol({name:m[2],kind:"class",line,signature:firstLine(m[0])})));
  out.push(...collectRegex(text,/(^|\n)\s*module\s+([A-Z]\w*(?:::\w+)*)/g,(m,line)=>makeSymbol({name:m[2],kind:"module",line,signature:firstLine(m[0])})));
  out.push(...collectRegex(text,/(^|\n)\s*def\s+(?:self\.)?([A-Za-z_]\w*[!?=]?)\s*(?:\(([^)]*)\))?/g,(m,line)=>makeSymbol({name:m[2],kind:"method",line,signature:firstLine(m[0])})));
  return dedupeSymbols(out);
}
