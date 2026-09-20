import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractPython(text) {
  const out = [];
  out.push(...collectRegex(
    text,
    /(^|\n)([ \t]*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*([^:\n]+))?\s*:/g,
    (m,line)=>makeSymbol({name:m[3],kind:m[2]?"method":"function",line,signature:firstLine(m[0])})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)([ \t]*)class\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s*:/g,
    (m,line)=>makeSymbol({name:m[3],kind:"class",line,signature:firstLine(m[0])})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)([A-Z][A-Z0-9_]*)\s*=\s*/g,
    (m,line)=>makeSymbol({name:m[2],kind:"constant",line,signature:firstLine(m[0])})
  ));
  return dedupeSymbols(out);
}
