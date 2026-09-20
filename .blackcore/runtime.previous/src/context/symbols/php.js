import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractPhp(text) {
  const out = [];
  out.push(...collectRegex(text,/(^|\n)\s*(?:final\s+|abstract\s+)?(class|interface|trait|enum)\s+([A-Za-z_]\w*)/g,(m,line)=>makeSymbol({name:m[3],kind:m[2],line,signature:firstLine(m[0])})));
  out.push(...collectRegex(text,/(^|\n)\s*(public|protected|private)?\s*(?:static\s+)?function\s+&?\s*([A-Za-z_]\w*)\s*\(([^)]*)\)/g,(m,line)=>makeSymbol({name:m[3],kind:"function",line,signature:firstLine(m[0]),exported:m[2]==="public"})));
  return dedupeSymbols(out);
}
