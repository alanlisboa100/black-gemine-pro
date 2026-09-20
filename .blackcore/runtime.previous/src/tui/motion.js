import {visibleWidth,truncateToWidth} from "../utils/text.js";
import {c,esc,rgb256} from "./ansi.js";

/**
 * Professional motion system for BLACKCORE TUI (Termux-optimized).
 * Lightweight frames, braille, blocks and cyber sequences that stay smooth
 * on mobile terminals (≤60 FPS target, short total duration).
 */
export const MOTION = {
  // Classic fluid braille thinking spinner
  think: ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"],
  // Cyber neon loading pulse
  cyber: ["⣾","⣽","⣻","⢿","⡿","⣟","⣯","⣷"],
  // Dual-ring tool activity
  tool: ["◐","◓","◑","◒"],
  // Boot fill blocks
  boot: ["░","▒","▓","█","▓","▒"],
  // Soft pulse
  pulse: ["·","•","◆","●","◆","•"],
  // Link / connection wave
  link: ["╶","╾","━","╼","╴"," "],
  // Scan bar
  scan: ["▱","▰","▰","▱"],
  // Success sparkle
  success: ["◇","◈","◆","◈","◇"],
  // High-end braille wave (smoother perception)
  wave: ["⢀","⡀","⠄","⠂","⠁","⠈","⠐","⠠"],
  // Cyber orbit
  orbit: ["⠁","⠂","⠄","⡀","⢀","⠠","⠐","⠈"],
  // Progress ticks
  ticks: ["▏","▎","▍","▌","▋","▊","▉","█"],
  // Matrix-style rain drops (short)
  rain: ["·","∶","⁝","⁞","|","│","┃","║"],
  // Loading dots progressive
  dots: ["   ",".  ",".. ","..."],
  // Diamond morph
  diamond: ["◇","◈","◆","◈"],
  // Arrow cycle
  arrow: ["→","↗","↑","↖","←","↙","↓","↘"],
  // Heartbeat
  heart: ["·","•","●","•"],
  // Rising / ascending bars (Codex-style progressive reveal feel)
  rise: ["▁","▂","▃","▄","▅","▆","▇","█","▇","▆","▅","▄","▃","▂"],
  // Soft ascending dots
  ascend: ["⠁","⠉","⠋","⠛","⠟","⠿","⡿","⣿"]
};

export const TOOL_GLYPHS = {
  read: "▣", write: "✎", edit: "✎", patch: "✦", patch_set: "✦",
  grep: "⌕", find: "⌕", repo_map: "⌘", list: "≡", stat: "◌",
  bash: "$", shell: "$", process: "↻", git: "⑂", github: "⑂",
  web_fetch: "↗", web_scraper: "🕷", web_search: "⌕", web_research: "⌕", news_research: "◫",
  credibility_check: "◉", download: "⇣", delegate: "◇", verify: "✓",
  audit_report: "◈", vercel: "▲", netlify: "◇", supabase: "▤",
  resend: "✉", expo: "◉", eas: "◉", android: "◫", mcp: "⌁",
  sqlite: "🗄", postgres: "⛁", video_editor: "🎬", photo_editor: "🎨",
  outfit_editor: "👕", media: "🎞", browser: "🌐", security_scan: "🛡",
  agent_control: "⚙", task_graph: "☊"
};

export function toolGlyph(name = "") {
  const key = String(name).toLowerCase();
  for (const [prefix, glyph] of Object.entries(TOOL_GLYPHS)) {
    if (key === prefix || key.startsWith(prefix + "_")) return glyph;
  }
  return "◆";
}

export function scrubPreview(value, depth = 0) {
  if (depth > 3) return "…";
  if (Array.isArray(value)) return value.slice(0, 5).map(v => scrubPreview(v, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    let n = 0;
    for (const [k, v] of Object.entries(value)) {
      if (n++ >= 7) { out["…"] = "…"; break; }
      out[k] = /(api.?key|token|secret|password|authorization|cookie)/i.test(k)
        ? "[redacted]"
        : scrubPreview(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 90) return value.slice(0, 87) + "…";
  return value;
}

export function oneLine(value, max = 120) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return truncateToWidth(String(s ?? "").replace(/\s+/g, " ").trim(), Math.max(1, max));
}

export function padVisible(text, n) {
  const w = visibleWidth(text);
  return text + " ".repeat(Math.max(0, n - w));
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Classic discrete progress cells */
export function progressCells(step, total = 5) {
  const done = Math.max(0, Math.min(total, step));
  return "█".repeat(done) + "░".repeat(Math.max(0, total - done));
}

/**
 * Smooth continuous progress bar using block characters.
 * Returns a string of length `width` that visually fills to `ratio` (0-1).
 */
export function progressBar(ratio, width = 20, filled = "█", empty = "░") {
  const r = Math.max(0, Math.min(1, ratio));
  const filledCount = Math.round(r * width);
  return filled.repeat(filledCount) + empty.repeat(Math.max(0, width - filledCount));
}

/**
 * Gradient-ish progress using the ticks set for a more refined look.
 */
export function smoothProgress(ratio, width = 16) {
  const r = Math.max(0, Math.min(1, ratio));
  const exact = r * width;
  const full = Math.floor(exact);
  const partial = exact - full;
  const ticks = MOTION.ticks;
  let bar = "█".repeat(full);
  if (full < width && partial > 0.05) {
    const idx = Math.min(ticks.length - 1, Math.floor(partial * ticks.length));
    bar += ticks[idx];
  }
  bar += "░".repeat(Math.max(0, width - visibleWidth(bar)));
  return bar.slice(0, width);
}

/**
 * Professional multi-stage boot sequence frames for splash.
 * Each item: { text, color, delay }
 */
export function bootSequenceFrames() {
  return [
    { icon: "◆", label: "BLACKCORE CORE", color: 95, delay: 32 },
    { icon: "◈", label: "INITIALIZING HUD", color: 51, delay: 36 },
    { icon: "◇", label: "LOADING TOOLS", color: 111, delay: 32 },
    { icon: "◆", label: "CYBER LINK READY", color: 82, delay: 38 }
  ];
}

/**
 * Compact cyber logo frames (narrow for Termux 40-60 cols).
 * Progressive reveal of the brand.
 */
export function logoFrames() {
  return [
    "  ·",
    "  ◆",
    "  ◆ B",
    "  ◆ BL",
    "  ◆ BLA",
    "  ◆ BLAC",
    "  ◆ BLACK",
    "  ◆ BLACKC",
    "  ◆ BLACKCO",
    "  ◆ BLACKCOR",
    "  ◆ BLACKCORE",
    "  ◈ BLACKCORE",
    "  ◆ BLACKCORE"
  ];
}

/**
 * Animated status line builder used by splash and live phases.
 */
export function statusLine(icon, label, detail = "", iconColor = 95, labelColor = "1;255") {
  const d = detail ? ` ${c(244, "· " + detail)}` : "";
  return `${c(iconColor, icon)} ${c(labelColor, label)}${d}`;
}

/**
 * Run a short frame sequence on stdout (non-blocking friendly).
 * Caller should manage hide/show cursor.
 */
export async function playFrames(frames, { interval = 36, clear = true, write = process.stdout.write.bind(process.stdout) } = {}) {
  for (const frame of frames) {
    if (clear) write(`\r${esc.clearLine}`);
    write(typeof frame === "string" ? frame : frame.text || "");
    await sleep(typeof frame === "object" && frame.delay != null ? frame.delay : interval);
  }
}

/**
 * Cyber progress animation: fills a bar while cycling a label.
 * Returns when finished. Total duration ≈ steps * interval.
 */
export async function animateProgress({
  steps = 12,
  width = 18,
  interval = 30,
  labels = ["CORE", "HUD", "TOOLS", "LINK", "READY"],
  write = process.stdout.write.bind(process.stdout),
  color = 51
} = {}) {
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const bar = smoothProgress(ratio, width);
    const label = labels[Math.min(labels.length - 1, Math.floor(ratio * labels.length))];
    const pct = String(Math.round(ratio * 100)).padStart(3, " ");
    write(`\r${esc.clearLine}${c(color, "▶")} ${c(240, "[")}${c(color, bar)}${c(240, "]")} ${c("1;255", pct + "%")} ${c(244, label)}`);
    await sleep(interval);
  }
  write("\n");
}

/**
 * Quick diamond morph used for success / ready states.
 */
export async function sparkle(text = "READY", { cycles = 3, interval = 42, color = 82, write } = {}) {
  const frames = MOTION.success;
  const out = write || process.stdout.write.bind(process.stdout);
  for (let cyc = 0; cyc < cycles; cyc++) {
    for (const f of frames) {
      out(`\r${esc.clearLine}${c(color, f)} ${c("1;255", text)}`);
      await sleep(interval);
    }
  }
  out("\n");
}
