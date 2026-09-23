import {collectRegex,dedupeSymbols,makeSymbol,firstLine} from "./common.js";

export function extractRust(text) {
  const out = [];
  const patterns = [
    {re:/(^|\n)\s*(pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g,kind:"function",name:3,pub:2},
    {re:/(^|\n)\s*(pub(?:\([^)]*\))?\s+)?struct\s+([A-Za-z_]\w*)\b/g,kind:"struct",name:3,pub:2},
    {re:/(^|\n)\s*(pub(?:\([^)]*\))?\s+)?enum\s+([A-Za-z_]\w*)\b/g,kind:"enum",name:3,pub:2},
    {re:/(^|\n)\s*(pub(?:\([^)]*\))?\s+)?trait\s+([A-Za-z_]\w*)\b/g,kind:"trait",name:3,pub:2},
    {re:/(^|\n)\s*impl(?:<[^>]*>)?\s+([A-Za-z_][\w:]*)/g,kind:"impl",name:2,pub:null},
  ];
  for (const p of patterns) {
    out.push(...collectRegex(text,p.re,(m,line)=>makeSymbol({
      name:m[p.name],
      kind:p.kind,
      line,
      signature:firstLine(m[0]),
      exported:p.pub ? !!m[p.pub] : false,
    })));
  }
  return dedupeSymbols(out);
}
