import {fit} from "./layout.js";
import {esc,c} from "./ansi.js";
import {MOTION} from "./motion.js";
import {humanDuration} from "../utils/text.js";

/**
 * Professional, lightweight spinner for Termux / Linux TUI.
 * Supports frame sets, color cycling, elapsed time and clean stop.
 */
export class Spinner {
  constructor(text, {
    enabled = true,
    interval = 60,
    frames = MOTION.cyber,
    color = 39,
    colors = [39, 45, 51, 87, 123],          // vibrant neon cyan/blue color cycling
    showElapsed = true,
    prefix = "",
    suffix = ""
  } = {}) {
    this.text = text;
    this.enabled = enabled && process.stdout.isTTY;
    this.interval = interval;
    this.frames = frames;
    this.color = color;
    this.colors = colors;
    this.showElapsed = showElapsed;
    this.prefix = prefix;
    this.suffix = suffix;
    this.i = 0;
    this.timer = null;
    this.active = false;
    this.started = 0;
  }

  start() {
    if (!this.enabled || this.active) return this;
    this.active = true;
    this.started = Date.now();
    process.stdout.write(esc.hideCursor);
    this.draw();
    this.timer = setInterval(() => this.draw(), this.interval);
    return this;
  }

  draw() {
    const elapsed = this.showElapsed && this.started
      ? ` ${c(240, "· " + humanDuration(Date.now() - this.started))}`
      : "";
    const frameIdx = this.i++ % this.frames.length;
    const frameColor = this.colors
      ? this.colors[frameIdx % this.colors.length]
      : this.color;
    const frame = c(frameColor, this.frames[frameIdx]);
    const line = `${this.prefix}${frame} ${this.text}${this.suffix}${elapsed}`;
    process.stdout.write(`\r${esc.clearLine}${fit(line)}`);
  }

  update(text) {
    this.text = text;
    if (this.active) this.draw();
    return this;
  }

  setFrames(frames, color) {
    if (frames) this.frames = frames;
    if (color != null) this.color = color;
    return this;
  }

  stop(final = "") {
    if (!this.active) return this;
    clearInterval(this.timer);
    this.timer = null;
    this.active = false;
    process.stdout.write(`\r${esc.clearLine}${final ? fit(final) + "\n" : ""}${esc.showCursor}`);
    return this;
  }
}
