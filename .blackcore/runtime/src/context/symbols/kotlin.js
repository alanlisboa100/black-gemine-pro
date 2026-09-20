import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractKotlin(text) {
  const out = [];
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(public|private|internal|protected)?\s*(?:data\s+|sealed\s+|open\s+|abstract\s+)?(class|interface|object|enum\s+class)\s+([A-Za-z_]\w*)/g,
    (m,line)=>makeSymbol({name:m[4],kind:m[3].replace(/\s+/g,"_"),line,signature:firstLine(m[0]),exported:m[2]!=="private"})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(public|private|internal|protected)?\s*(?:suspend\s+|inline\s+|operator\s+|override\s+)*fun\s+(?:<[^>]+>\s*)?([A-Za-z_]\w*)\s*\(([^)]*)\)/g,
    (m,line)=>makeSymbol({name:m[3],kind:"function",line,signature:firstLine(m[0]),exported:m[2]!=="private"})
  ));
  return dedupeSymbols(out);
}
