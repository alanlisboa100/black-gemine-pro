import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractCpp(text) {
  const out = [];
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(?:template\s*<[^;{]+>\s*)?(class|struct|enum(?:\s+class)?)\s+([A-Za-z_]\w*)/g,
    (m,line)=>makeSymbol({name:m[3],kind:m[2].replace(/\s+/g,"_"),line,signature:firstLine(m[0])})
  ));
  out.push(...collectRegex(
    text,
    /(^|\n)\s*(?:inline\s+|static\s+|constexpr\s+|virtual\s+|extern\s+)*[\w:<>,*&\s]+\s+([A-Za-z_~]\w*)\s*\(([^;{}]*)\)\s*(?:const\s*)?(?:noexcept\s*)?\{/g,
    (m,line)=>makeSymbol({name:m[2],kind:"function",line,signature:firstLine(m[0])})
  ));
  return dedupeSymbols(out);
}
