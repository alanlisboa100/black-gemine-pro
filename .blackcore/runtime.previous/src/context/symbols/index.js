import path from "node:path";
import {extractJavaScript} from "./javascript.js";
import {extractPython} from "./python.js";
import {extractGo} from "./go.js";
import {extractRust} from "./rust.js";
import {extractJava} from "./java.js";
import {extractKotlin} from "./kotlin.js";
import {extractCSharp} from "./csharp.js";
import {extractCpp} from "./cpp.js";
import {extractRuby} from "./ruby.js";
import {extractPhp} from "./php.js";
import {extractSwift} from "./swift.js";
import {extractDart} from "./dart.js";

const HANDLERS = new Map([
  [".js", extractJavaScript],
  [".mjs", extractJavaScript],
  [".cjs", extractJavaScript],
  [".jsx", extractJavaScript],
  [".ts", extractJavaScript],
  [".tsx", extractJavaScript],
  [".vue", extractJavaScript],
  [".svelte", extractJavaScript],
  [".py", extractPython],
  [".go", extractGo],
  [".rs", extractRust],
  [".java", extractJava],
  [".kt", extractKotlin],
  [".kts", extractKotlin],
  [".cs", extractCSharp],
  [".c", extractCpp],
  [".cc", extractCpp],
  [".cpp", extractCpp],
  [".cxx", extractCpp],
  [".h", extractCpp],
  [".hpp", extractCpp],
  [".rb", extractRuby],
  [".php", extractPhp],
  [".swift", extractSwift],
  [".dart", extractDart],
]);

export function extractorFor(file) {
  return HANDLERS.get(path.extname(file).toLowerCase()) || null;
}

export function extractSymbols(file, text) {
  const fn = extractorFor(file);
  if (!fn) return [];
  try {
    return fn(text);
  } catch {
    return [];
  }
}
