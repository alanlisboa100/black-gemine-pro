import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractSwift(text) {
  const out = [];
  out.push(...collectRegex(text,/(^|\n)\s*(?:public|open|internal|private|fileprivate)?\s*(class|struct|enum|protocol|actor)\s+([A-Za-z_]\w*)/g,(m,line)=>makeSymbol({name:m[3],kind:m[2],line,signature:firstLine(m[0]),exported:/public|open/.test(m[0])})));
  out.push(...collectRegex(text,/(^|\n)\s*(?:public|open|internal|private|fileprivate)?\s*(?:static\s+|class\s+)?func\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g,(m,line)=>makeSymbol({name:m[2],kind:"function",line,signature:firstLine(m[0]),exported:/public|open/.test(m[0])})));
  return dedupeSymbols(out);
}
