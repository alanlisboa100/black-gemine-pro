export function makeSymbol({
  name,
  kind,
  line,
  signature = "",
  exported = false,
  container = null,
}) {
  return {
    name,
    kind,
    line,
    signature: signature.trim(),
    exported,
    container,
  };
}

export function lineNumber(text, index) {
  let count = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

export function collectRegex(text, regex, mapper) {
  const out = [];
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text))) {
    const symbol = mapper(match, lineNumber(text, match.index));
    if (symbol) out.push(symbol);
    if (match[0].length === 0) regex.lastIndex++;
  }
  return out;
}

export function dedupeSymbols(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.kind}:${item.name}:${item.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
}

export function firstLine(signature) {
  return String(signature || "").split(/\r?\n/, 1)[0].trim();
}
