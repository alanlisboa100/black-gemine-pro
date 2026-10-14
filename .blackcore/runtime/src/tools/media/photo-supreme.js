// BLACKCORE Supremo pixel engine.
// This build of ImageMagick has no -curve, -duotone or -modulus, and -function Polynomial is
// unreliable, so the tone/HSL/mask math below runs on decoded sRGB bytes in pure Node.
// Every function here is deterministic and unit-testable; nothing pretends to do face recognition.

export const MAX_ENGINE_PIXELS = 16_000_000;

export function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
export function round(value, digits = 4) { return Number((Number(value) || 0).toFixed(digits)); }

export function seededRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => { state ^= state << 13; state >>>= 0; state ^= state >> 17; state ^= state << 5; state >>>= 0; return state / 4294967296; };
}

// ---------------------------------------------------------------- tone curves
export const TONE_CURVES = Object.freeze({
  "s-curve": [[0, 0], [0.25, 0.19], [0.5, 0.5], [0.75, 0.83], [1, 1]],
  cinematic: [[0, 0.02], [0.22, 0.17], [0.5, 0.5], [0.78, 0.85], [1, 0.985]],
  matte: [[0, 0.085], [0.25, 0.25], [0.5, 0.5], [0.75, 0.79], [1, 0.965]],
  punchy: [[0, 0], [0.2, 0.11], [0.5, 0.52], [0.8, 0.9], [1, 1]],
  elevated: [[0, 0.055], [0.3, 0.31], [0.6, 0.62], [0.85, 0.88], [1, 1]],
  crushed: [[0, 0], [0.3, 0.16], [0.55, 0.46], [0.8, 0.86], [1, 1]],
  "reverse-s": [[0, 0], [0.25, 0.32], [0.5, 0.5], [0.75, 0.68], [1, 1]],
  filmic: [[0, 0.012], [0.18, 0.14], [0.5, 0.5], [0.82, 0.86], [1, 1]]
});

function monotoneSpline(points) {
  const rows = [...points].map(([x, y]) => [clamp(Number(x)), clamp(Number(y))]).sort((a, b) => a[0] - b[0]);
  const clean = [];
  for (const row of rows) {
    const last = clean[clean.length - 1];
    if (!last || row[0] - last[0] > 1e-4) clean.push(row);
    else if (row[1] > last[1]) clean[clean.length - 1] = row;
  }
  if (clean[0][0] > 0) clean.unshift([0, clean[0][1]]);
  if (clean[clean.length - 1][0] < 1) clean.push([1, clean[clean.length - 1][1]]);
  const segments = [];
  for (let index = 0; index < clean.length - 1; index += 1) {
    const [x0, y0] = clean[index], [x1, y1] = clean[index + 1], width = x1 - x0;
    segments.push({ x0, x1, y0, y1, width, slope: (y1 - y0) / Math.max(width, 1e-6) });
  }
  let peak = -Infinity;
  return x => {
    const value = clamp(x);
    let segment = segments[segments.length - 1];
    for (const row of segments) if (value <= row.x1) { segment = row; break; }
    const t = segment.width > 1e-6 ? (value - segment.x0) / segment.width : 0;
    const ease = t * t * (3 - 2 * t);
    peak = Math.max(peak, clamp(segment.y0 + (segment.y1 - segment.y0) * ease));
    return peak;
  };
}

export function buildToneLut(points, strength = 1) {
  const source = Array.isArray(points) && points.length >= 2 ? points : TONE_CURVES["s-curve"];
  const curve = monotoneSpline(source.map(row => Array.isArray(row) ? row : [row.x, row.y]));
  const amount = clamp(Number(strength), 0, 2), lut = new Uint8Array(256);
  for (let index = 0; index < 256; index += 1) {
    const base = index / 255, shaped = base + (curve(base) - base) * amount;
    lut[index] = Math.round(clamp(shaped) * 255);
  }
  return lut;
}

function colorToRgb(value, fallback) {
  const text = String(value || "").trim();
  const hex = text.replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  if (/^[0-9a-fA-F]{3}$/.test(hex)) return hex.split("").map(row => parseInt(row + row, 16));
  return fallback;
}

export function buildGradientMapLut(shadow, highlight) {
  const from = colorToRgb(shadow, [20, 12, 32]), to = colorToRgb(highlight, [255, 140, 60]), lut = new Uint8Array(256 * 3);
  for (let index = 0; index < 256; index += 1) {
    const t = index / 255;
    for (let channel = 0; channel < 3; channel += 1) lut[index * 3 + channel] = Math.round(from[channel] + (to[channel] - from[channel]) * t);
  }
  return lut;
}

// ---------------------------------------------------------------- colour math
export function rgbToHsl(r, g, b) {
  const red = r / 255, green = g / 255, blue = b / 255;
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue), delta = max - min;
  const lightness = (max + min) / 2;
  if (delta < 1e-6) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (max === green) hue = 60 * ((blue - red) / delta + 2);
  else hue = 60 * ((red - green) / delta + 4);
  if (hue < 0) hue += 360;
  return [hue, clamp(saturation), clamp(lightness)];
}

export function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360 / 60, s = clamp(saturation), l = clamp(lightness);
  const chroma = (1 - Math.abs(2 * l - 1)) * s, x = chroma * (1 - Math.abs((h % 2) - 1));
  let rgb;
  if (h < 1) rgb = [chroma, x, 0]; else if (h < 2) rgb = [x, chroma, 0]; else if (h < 3) rgb = [0, chroma, x];
  else if (h < 4) rgb = [0, x, chroma]; else if (h < 5) rgb = [x, 0, chroma]; else rgb = [chroma, 0, x];
  const match = l - chroma / 2;
  return [(rgb[0] + match) * 255, (rgb[1] + match) * 255, (rgb[2] + match) * 255];
}

export const HSL_BANDS = Object.freeze(["red", "yellow", "green", "cyan", "blue", "magenta"]);
const BAND_CENTRES = [0, 60, 120, 180, 240, 300];

// Triangular weight over the hue wheel: 1.0 at the band centre, 0.5 at the neighbour centre.
export function bandWeight(hue, bandIndex) {
  let distance = Math.abs(hue - BAND_CENTRES[bandIndex]);
  if (distance > 180) distance = 360 - distance;
  return clamp(1 - distance / 60);
}

// ---------------------------------------------------------------- skin chroma
// Real Rec.601 Cb/Cr band selection. It is colour-range masking, not face detection.
export const SKIN_BAND = Object.freeze({ cbMin: 0.335, cbMax: 0.515, crMin: 0.545, crMax: 0.735, lMin: 0.10, lMax: 0.94 });

export function luma601(r, g, b) { return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
export function cbCr(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return [clamp(0.564 * (b - y) / 255 + 0.5), clamp(0.713 * (r - y) / 255 + 0.5)];
}

export function skinChromaWeight(r, g, b, band = SKIN_BAND) {
  const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (light < band.lMin || light > band.lMax) return 0;
  const [cb, cr] = cbCr(r, g, b);
  const edge = 0.035;
  const ramp = (value, low, high) => Math.min(clamp((value - low) / edge), clamp((high - value) / edge));
  return clamp(ramp(cb, band.cbMin, band.cbMax) * ramp(cr, band.crMin, band.crMax) * clamp((light - band.lMin) / 0.08) * clamp((band.lMax - light) / 0.10));
}

// ---------------------------------------------------------------- blurs
export function downsampleLuma(raw, width, height, factor) {
  const step = Math.max(1, Math.round(factor)), sw = Math.max(1, Math.round(width / step)), sh = Math.max(1, Math.round(height / step));
  const out = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y += 1) {
    const sy = Math.min(height - 1, y * step);
    for (let x = 0; x < sw; x += 1) {
      const sx = Math.min(width - 1, x * step), offset = (sy * width + sx) * 3;
      out[y * sw + x] = (0.299 * raw[offset] + 0.587 * raw[offset + 1] + 0.114 * raw[offset + 2]) / 255;
    }
  }
  return { data: out, width: sw, height: sh };
}

function boxBlurPlane(plane, width, height, radius, passes = 3) {
  const r = Math.max(1, Math.round(radius)), horizontal = new Float32Array(plane), vertical = new Float32Array(plane);
  for (let pass = 0; pass < passes; pass += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let x = -r; x <= r; x += 1) sum += plane[y * width + clamp(x, 0, width - 1)];
      for (let x = 0; x < width; x += 1) {
        horizontal[y * width + x] = sum / (2 * r + 1);
        sum += plane[y * width + clamp(x + r + 1, 0, width - 1)] - plane[y * width + clamp(x - r, 0, width - 1)];
      }
    }
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = -r; y <= r; y += 1) sum += horizontal[clamp(y, 0, height - 1) * width + x];
      for (let y = 0; y < height; y += 1) {
        vertical[y * width + x] = sum / (2 * r + 1);
        sum += horizontal[clamp(y + r + 1, 0, height - 1) * width + x] - horizontal[clamp(y - r, 0, height - 1) * width + x];
      }
    }
    plane.set(vertical);
  }
  return plane;
}

function samplePlaneBilinear(plane, width, height, x, y) {
  const fx = clamp(x, 0, width - 1), fy = clamp(y, 0, height - 1);
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const top = plane[y0 * width + x0] * (1 - tx) + plane[y0 * width + x1] * tx;
  const bottom = plane[y1 * width + x0] * (1 - tx) + plane[y1 * width + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

// ---------------------------------------------------------------- spec builder
export const SUPREME_KEYS = ["toneCurve", "toneCurvePoints", "toneCurveStrength", "exposure", "shadows", "highlights", "whites", "blacks", "clarity", "vibrance", "hsl", "skinToneProtection", "duotone", "vignette", "vignetteMidpoint", "filmGrain", "grainSize", "studioRelight", "lightLeak", "neonGlow", "glitch", "portraitBlur", "whiteBalance", "whiteBalanceStrength", "autoWhiteBalance", "seed"];

export const SUPREME_DEFAULTS = Object.freeze({ toneCurve: "cinematic", autoWhiteBalance: true, shadows: 28, highlights: -20, clarity: 24, vibrance: 26, skinToneProtection: 75, vignette: 22, filmGrain: 10, grainSize: "fine", studioRelight: 18 });

export function hasSupremeArguments(args = {}) { return SUPREME_KEYS.some(key => args[key] !== undefined && args[key] !== null && args[key] !== "none" && args[key] !== false && !(typeof args[key] === "number" && args[key] === 0)); }

const GRAIN_SIZE = { fine: 1.25, medium: 2.2, coarse: 4 };
const WHITE_BALANCE_PRESETS = Object.freeze({
  tungsten: { scale: [0.86, 1.0, 1.22] }, fluorescent: { scale: [1.14, 0.95, 0.98] }, daylight: { scale: [0.99, 1.0, 1.03] },
  cloudy: { scale: [0.94, 1.0, 1.08] }, shade: { scale: [0.9, 1.0, 1.14] }, custom: { scale: [1, 1, 1] }
});

function parseVignette(value) {
  if (value === undefined || value === null) return null;
  const amount = typeof value === "object" ? Number(value.amount) : Number(value);
  if (!Number.isFinite(amount) || amount === 0) return null;
  return { amount: clamp(amount, -100, 100) / 100, midpoint: clamp(typeof value === "object" ? Number(value.midpoint ?? 60) : 60, 10, 100) / 100 };
}

function readBandSet(row) {
  if (!row || typeof row !== "object") return null;
  const entries = HSL_BANDS.filter(band => Number.isFinite(Number(row[band])) && Number(row[band]) !== 0).map(band => [band, clamp(Number(row[band]), -100, 100) / 100]);
  return entries.length ? Object.fromEntries(entries) : null;
}

function parseChannelSet(value) {
  if (!value || typeof value !== "object") return null;
  const hue = readBandSet(value.hue) || readBandSet(value), saturation = readBandSet(value.saturation), lightness = readBandSet(value.lightness);
  if (!hue && !saturation && !lightness) return null;
  return { hue, saturation, lightness, mix: value.mix === undefined ? 1 : clamp(Number(value.mix), 0, 100) / 100 };
}

// ---------------------------------------------------------------- main engine
export function applySupremePipeline(raw, width, height, args = {}, options = {}) {
  const pixels = width * height;
  if (!raw || raw.length < pixels * 3) throw new Error("supreme engine requires a decoded 8-bit RGB buffer");
  if (pixels > MAX_ENGINE_PIXELS) throw new Error(`supreme engine refuses ${width}x${height}; images above ${MAX_ENGINE_PIXELS} pixels must be resized first`);
  const applied = [], log = name => applied.push(name);
  const curvePoints = Array.isArray(args.toneCurvePoints) && args.toneCurvePoints.length >= 2 ? args.toneCurvePoints : TONE_CURVES[String(args.toneCurve || "")];
  const curveStrength = clamp(Number(args.toneCurveStrength ?? 1), 0, 2);

  // 1. white balance: gray-world measurement or a named illuminant.
  const balanceName = String(args.whiteBalance || "").trim().toLowerCase();
  const balanceRequested = (balanceName && balanceName !== "none") || args.autoWhiteBalance === true;
  if (balanceRequested) {
    const strength = clamp(Number(args.whiteBalanceStrength ?? 1), 0, 1);
    let gains = [1, 1, 1];
    const useMeasured = args.autoWhiteBalance !== false && (balanceName === "" || balanceName === "auto" || !WHITE_BALANCE_PRESETS[balanceName]);
    if (useMeasured) {
      const sums = [0, 0, 0]; let counted = 0;
      for (let index = 0; index < pixels; index += 1) {
        const offset = index * 3, light = 0.299 * raw[offset] + 0.587 * raw[offset + 1] + 0.114 * raw[offset + 2];
        if (light < 18 || light > 243) continue;
        sums[0] += raw[offset]; sums[1] += raw[offset + 1]; sums[2] += raw[offset + 2]; counted += 1;
      }
      if (counted > pixels * 0.02) {
        const mean = (sums[0] + sums[1] + sums[2]) / (counted * 3);
        gains = sums.map(sum => clamp(mean / (sum / counted), 0.72, 1.38));
        log(`balanced white automatically to ${gains.map(value => round(value, 3)).join(", ")}`);
      } else log("left white balance alone: too few neutral pixels to measure");
    } else if (WHITE_BALANCE_PRESETS[balanceName]) {
      gains = WHITE_BALANCE_PRESETS[balanceName].scale;
      log(`matched the ${balanceName} illuminant`);
    }
    for (let channel = 0; channel < 3; channel += 1) {
      const gain = 1 + (gains[channel] - 1) * strength;
      if (Math.abs(gain - 1) < 0.002) continue;
      const lut = new Uint8Array(256);
      for (let index = 0; index < 256; index += 1) lut[index] = Math.round(clamp(index * gain / 255) * 255);
      for (let offset = channel; offset < pixels * 3; offset += 3) raw[offset] = lut[raw[offset]];
    }
  }

  // 2. exposure, blacks and whites as scalar levels.
  const exposure = clamp(Number(args.exposure) || 0, -3, 3);
  if (exposure) {
    const gain = 2 ** exposure, lut = new Uint8Array(256);
    for (let index = 0; index < 256; index += 1) lut[index] = Math.round(clamp(index * gain / 255) * 255);
    for (let offset = 0; offset < pixels * 3; offset += 1) raw[offset] = lut[raw[offset]];
    log(`exposed the frame by ${round(exposure, 2)} stops`);
  }
  for (const [key, factor] of [["blacks", 1], ["whites", 1]]) {
    const amount = clamp(Number(args[key]) || 0, -100, 100) / 100;
    if (!amount) continue;
    const lut = new Uint8Array(256);
    for (let index = 0; index < 256; index += 1) {
      const value = index / 255;
      const anchor = key === "blacks" ? value < 0.25 ? 1 - value / 0.25 * 0.6 : 0 : value > 0.75 ? 1 - (1 - value) / 0.25 * 0.6 : 0;
      lut[index] = Math.round(clamp(value + amount * anchor * (key === "blacks" ? -1 : 1) * 0.55) * 255);
    }
    for (let offset = 0; offset < pixels * 3; offset += 1) raw[offset] = lut[raw[offset]];
    log(`${key === "blacks" ? "deepened the blacks" : "expanded the whites"} by ${round(amount * 100, 1)}%`);
  }

  // 3. shadows / highlights recovery on the tonal zones.
  const shadows = clamp(Number(args.shadows) || 0, -100, 100) / 100, highlights = clamp(Number(args.highlights) || 0, -100, 100) / 100;
  if (shadows || highlights) {
    const lut = new Uint8Array(256);
    for (let index = 0; index < 256; index += 1) {
      const value = index / 255;
      const shadowWeight = value < 0.5 ? (1 - value / 0.5) ** 1.6 : 0, highlightWeight = value > 0.55 ? ((value - 0.55) / 0.45) ** 1.6 : 0;
      lut[index] = Math.round(clamp(value + shadows * shadowWeight * 0.42 - highlights * highlightWeight * 0.42) * 255);
    }
    for (let offset = 0; offset < pixels * 3; offset += 1) raw[offset] = lut[raw[offset]];
    if (shadows) log(`recovered shadow detail by ${round(shadows * 100, 1)}%`);
    if (highlights) log(`controlled highlights by ${round(highlights * 100, 1)}%`);
  }

  // 4. clarity: local contrast against a blurred luminance field.
  const clarity = clamp(Number(args.clarity) || 0, -100, 100) / 100;
  if (clarity) {
    const small = downsampleLuma(raw, width, height, Math.max(2, width / 160));
    boxBlurPlane(small.data, small.width, small.height, Math.max(1, Math.round(Math.min(small.width, small.height) * 0.03)), 2);
    const scale = clarity * 0.55;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const blurred = samplePlaneBilinear(small.data, small.width, small.height, x * small.width / width, y * small.height / height);
        const offset = (y * width + x) * 3;
        for (let channel = 0; channel < 3; channel += 1) {
          const value = raw[offset + channel] / 255;
          raw[offset + channel] = Math.round(clamp(value + (value - blurred) * scale) * 255);
        }
      }
    }
    log(`${clarity > 0 ? "added" : "removed"} ${Math.abs(round(clarity * 100, 1))}% local clarity`);
  }

  // 5. tone curve (per channel LUT).
  if (curvePoints && curveStrength) {
    const lut = buildToneLut(curvePoints, curveStrength);
    for (let offset = 0; offset < pixels * 3; offset += 1) raw[offset] = lut[raw[offset]];
    log(`applied the ${String(args.toneCurve || "custom")} tone curve at ${Math.round(curveStrength * 100)}%`);
  }

  // 6. vibrance with optional skin protection, then per-band HSL.
  const vibrance = clamp(Number(args.vibrance) || 0, -100, 100) / 100;
  const protection = clamp(Number(args.skinToneProtection) || 0, 0, 100) / 100;
  const hsl = parseChannelSet(args.hsl);
  const hslActive = Boolean(hsl && (hsl.hue || hsl.saturation || hsl.lightness));
  if (vibrance || hslActive) {
    const bands = [];
    if (hslActive) {
      for (const key of ["hue", "saturation", "lightness"]) if (hsl[key]) for (const [band, value] of Object.entries(hsl[key])) bands.push({ key, index: HSL_BANDS.indexOf(band), value, weight: hsl.mix === undefined ? 1 : hsl.mix });
    }
    for (let index = 0; index < pixels; index += 1) {
      const offset = index * 3;
      let [hue, saturation, lightness] = rgbToHsl(raw[offset], raw[offset + 1], raw[offset + 2]);
      let weight = 1;
      if (protection && saturation > 0.04) weight = 1 - protection * skinChromaWeight(raw[offset], raw[offset + 1], raw[offset + 2], options.skinBand || SKIN_BAND);
      if (vibrance) {
        const boost = clamp(saturation + vibrance * (1 - saturation) * (vibrance > 0 ? 1.5 : 1) * weight, 0, 1);
        saturation = saturation + (boost - saturation);
      }
      for (const band of bands) {
        const influence = bandWeight(hue, band.index) * band.weight * (band.key === "saturation" ? 1 : 1);
        if (!influence) continue;
        if (band.key === "hue") hue += band.value * 30 * influence;
        else if (band.key === "saturation") saturation = clamp(saturation + band.value * 0.6 * saturation * influence);
        else lightness = clamp(lightness + band.value * 0.4 * influence);
      }
      const [red, green, blue] = hslToRgb(hue, saturation, lightness);
      raw[offset] = Math.round(clamp(red / 255) * 255); raw[offset + 1] = Math.round(clamp(green / 255) * 255); raw[offset + 2] = Math.round(clamp(blue / 255) * 255);
    }
    if (vibrance) log(`shaped vibrance by ${round(vibrance * 100, 1)}%`);
    if (protection) log(`protected skin tones at ${Math.round(protection * 100)}% while grading`);
    if (hslActive) log(`tuned ${[...new Set(bands.map(row => `${row.key} ${HSL_BANDS[row.index]}`))].length} HSL channels`);
  }

  // 7. studio relight: soft radial key light around the measured focus.
  const relight = clamp(Number(args.studioRelight) || 0, -100, 100) / 100;
  if (relight) {
    const focus = options.focus || { x: 0.5, y: 0.45 }, radius = clamp(Number(options.relightRadius) || 0.62, 0.1, 1.4);
    for (let y = 0; y < height; y += 1) {
      const ny = (y / Math.max(1, height - 1) - focus.y) / radius;
      for (let x = 0; x < width; x += 1) {
        const nx = (x / Math.max(1, width - 1) - focus.x) / (radius * (width / Math.max(1, height)));
        const falloff = Math.max(0, 1 - nx * nx - ny * ny) ** 1.4, offset = (y * width + x) * 3;
        const lift = relight * falloff * 0.45;
        for (let channel = 0; channel < 3; channel += 1) raw[offset + channel] = Math.round(clamp(raw[offset + channel] / 255 + lift * (channel === 0 ? 1 : channel === 2 ? 0.82 : 0.94)) * 255);
      }
    }
    log(`relit the frame with a ${relight > 0 ? "key" : "negative"} light at ${Math.round(relight * 100)}%`);
  }

  // 7b. portrait blur: radial depth falloff around the measured focus (geometry, not face detection).
  const portraitBlur = clamp(Number(args.portraitBlur) || 0, 0, 100) / 100;
  if (portraitBlur) {
    const factor = Math.max(3, Math.round(width / 220)), sw = Math.max(2, Math.ceil(width / factor)), sh = Math.max(2, Math.ceil(height / factor));
    const planes = [new Float32Array(sw * sh), new Float32Array(sw * sh), new Float32Array(sw * sh)];
    for (let y = 0; y < sh; y += 1) for (let x = 0; x < sw; x += 1) {
      const sx = Math.min(width - 1, x * factor), sy = Math.min(height - 1, y * factor), offset = (sy * width + sx) * 3;
      planes[0][y * sw + x] = raw[offset]; planes[1][y * sw + x] = raw[offset + 1]; planes[2][y * sw + x] = raw[offset + 2];
    }
    const radius = Math.max(1, Math.round(Math.min(sw, sh) * 0.06 * (0.5 + portraitBlur)));
    for (const plane of planes) boxBlurPlane(plane, sw, sh, radius, 3);
    const focus = options.focus || { x: 0.5, y: 0.45 }, sharp = options.focusRadius || 0.34, aspect = Math.max(0.2, width / Math.max(1, height));
    for (let y = 0; y < height; y += 1) {
      const ny = (y / Math.max(1, height - 1) - focus.y) / sharp;
      for (let x = 0; x < width; x += 1) {
        const nx = (x / Math.max(1, width - 1) - focus.x) / (sharp * aspect);
        const distance = Math.sqrt(nx * nx + ny * ny), mix = clamp((distance - 1) / 0.75) * portraitBlur;
        if (mix <= 0.002) continue;
        const offset = (y * width + x) * 3, fx = x / factor, fy = y / factor;
        for (let channel = 0; channel < 3; channel += 1) {
          const blurred = samplePlaneBilinear(planes[channel], sw, sh, fx, fy);
          raw[offset + channel] = Math.round(clamp((raw[offset + channel] * (1 - mix) + blurred * mix) / 255) * 255);
        }
      }
    }
    log(`separated the subject with a ${Math.round(portraitBlur * 100)}% radial portrait blur around the measured focus`);
  }

  // 8. duotone gradient map.
  const duotone = args.duotone && typeof args.duotone === "object" ? args.duotone : null;
  if (duotone) {
    const mix = clamp(Number(duotone.mix ?? 100), 0, 100) / 100;
    if (mix) {
      const lut = buildGradientMapLut(duotone.shadow || duotone.shadows, duotone.highlight || duotone.highlights);
      for (let index = 0; index < pixels; index += 1) {
        const offset = index * 3;
        const gray = Math.round(luma601(raw[offset], raw[offset + 1], raw[offset + 2]) * 255), base = (raw[offset] + raw[offset + 1] + raw[offset + 2]) / 3;
        const tint = base > 232 || base < 12 ? 1 : 0.86;
        raw[offset] = Math.round(clamp((raw[offset] * (1 - mix * tint) + lut[gray * 3] * mix * tint) / 255) * 255);
        raw[offset + 1] = Math.round(clamp((raw[offset + 1] * (1 - mix * tint) + lut[gray * 3 + 1] * mix * tint) / 255) * 255);
        raw[offset + 2] = Math.round(clamp((raw[offset + 2] * (1 - mix * tint) + lut[gray * 3 + 2] * mix * tint) / 255) * 255);
      }
      log(`mapped ${duotone.shadow || duotone.shadows} → ${duotone.highlight || duotone.highlights} at ${Math.round(mix * 100)}%`);
    }
  }

  // 9. neon glow from the bright band, light leak and RGB-split glitch.
  const glow = clamp(Number(args.neonGlow) || 0, 0, 100) / 100;
  if (glow) {
    const small = downsampleLuma(raw, width, height, Math.max(2, width / 120));
    const bright = new Float32Array(small.width * small.height);
    for (let index = 0; index < bright.length; index += 1) bright[index] = clamp((small.data[index] - 0.62) / 0.38) ** 1.4;
    boxBlurPlane(bright, small.width, small.height, Math.max(1, Math.round(Math.min(small.width, small.height) * 0.05)), 2);
    const tint = options.glowTint || [1.0, 0.42, 0.95];
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const bloom = samplePlaneBilinear(bright, small.width, small.height, x * small.width / width, y * small.height / height) * glow;
      if (bloom <= 0.001) continue;
      const offset = (y * width + x) * 3;
      raw[offset] = Math.round(clamp(raw[offset] / 255 + bloom * tint[0] * 0.6) * 255);
      raw[offset + 1] = Math.round(clamp(raw[offset + 1] / 255 + bloom * tint[1] * 0.45) * 255);
      raw[offset + 2] = Math.round(clamp(raw[offset + 2] / 255 + bloom * tint[2] * 0.6) * 255);
    }
    log(`bloomed the highlights with a ${Math.round(glow * 100)}% neon glow`);
  }
  const leak = args.lightLeak && typeof args.lightLeak === "object" ? args.lightLeak : null;
  if (leak) {
    const intensity = clamp(Number(leak.intensity ?? 45), 0, 100) / 100;
    if (intensity) {
      const [lr, lg, lb] = colorToRgb(leak.color || "#ff8a3d", [255, 138, 61]);
      const corners = { "top-left": [0, 0], top: [0.5, 0], "top-right": [1, 0], left: [0, 0.5], center: [0.5, 0.5], right: [1, 0.5], "bottom-left": [0, 1], bottom: [0.5, 1], "bottom-right": [1, 1] };
      const [ax, ay] = corners[String(leak.direction || "top-right")] || corners["top-right"];
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
        const dx = x / Math.max(1, width - 1) - ax, dy = y / Math.max(1, height - 1) - ay;
        const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 0.85) ** 2 * intensity;
        if (falloff <= 0.002) continue;
        const offset = (y * width + x) * 3, screen = (a, b) => 255 - ((255 - a) * (255 - b)) / 255;
        raw[offset] = Math.round(clamp(screen(raw[offset], lr * falloff) / 255) * 255);
        raw[offset + 1] = Math.round(clamp(screen(raw[offset + 1], lg * falloff) / 255) * 255);
        raw[offset + 2] = Math.round(clamp(screen(raw[offset + 2], lb * falloff) / 255) * 255);
      }
      log(`swept a ${Math.round(intensity * 100)}% ${leak.direction || "top-right"} light leak`);
    }
  }
  const glitch = clamp(Number(args.glitch) || 0, 0, 100) / 100;
  if (glitch) {
    const random = seededRandom(Number(args.seed) || 77), reach = Math.max(1, Math.round(glitch * width * 0.03)), sliceCount = Math.max(3, Math.round(4 + glitch * 22));
    const red = Buffer.from(raw.subarray(0, pixels * 3)), blue = Buffer.from(raw.subarray(0, pixels * 3));
    for (let slice = 0; slice < sliceCount; slice += 1) {
      const y0 = Math.floor(random() * height), bandHeight = Math.max(1, Math.floor(random() * height * 0.045) + 1), shift = Math.round((random() - 0.5) * 2 * reach);
      for (let y = y0; y < Math.min(height, y0 + bandHeight); y += 1) for (let x = 0; x < width; x += 1) {
        const row = y * width;
        red[(row + x) * 3] = red[row * 3 + 0 + clamp(x + shift, 0, width - 1) * 3] ?? red[(row + x) * 3];
        const fromBlue = (row + clamp(x - shift, 0, width - 1)) * 3 + 2;
        blue[(row + x) * 3 + 2] = blue[fromBlue] ?? blue[(row + x) * 3 + 2];
      }
    }
    for (let index = 0; index < pixels; index += 1) {
      const offset = index * 3;
      raw[offset] = Math.round(clamp((raw[offset] * 0.35 + red[offset] * 0.65) / 255) * 255);
      raw[offset + 2] = Math.round(clamp((raw[offset + 2] * 0.35 + blue[offset + 2] * 0.65) / 255) * 255);
    }
    log(`fractured ${sliceCount} slices with a ${Math.round(glitch * 100)}% RGB-split glitch`);
  }

  // 10. vignette then grain, which must sit on top of the finished pixels.
  const vignette = parseVignette(args.vignette);
  if (vignette) {
    const { amount, midpoint } = vignette, aspect = Math.max(0.2, width / Math.max(1, height));
    const focusX = Number(options.focus?.x ?? 0.5), focusY = Number(options.focus?.y ?? 0.5);
    for (let y = 0; y < height; y += 1) {
      const ny = (y / Math.max(1, height - 1) - focusY) * 2;
      for (let x = 0; x < width; x += 1) {
        const nx = (x / Math.max(1, width - 1) - focusX) * 2;
        const distance = clamp(Math.sqrt(nx * nx + ny * ny) / Math.sqrt(1 + 1 / (aspect * aspect)), 0, 1.4);
        const spread = Math.max(0, (distance - midpoint) / Math.max(0.08, 1 - midpoint));
        const factor = clamp(1 - amount * Math.min(1, spread) ** 1.5 * 0.88, 0.05, 1.8);
        const offset = (y * width + x) * 3;
        raw[offset] = Math.round(clamp(raw[offset] * factor / 255) * 255);
        raw[offset + 1] = Math.round(clamp(raw[offset + 1] * factor / 255) * 255);
        raw[offset + 2] = Math.round(clamp(raw[offset + 2] * factor / 255) * 255);
      }
    }
    log(`${amount < 0 ? "lifted" : "darkened"} the edges by ${Math.abs(round(amount * 100, 1))}% with a ${Math.round(midpoint * 100)} vignette midpoint`);
  }
  const grain = clamp(Number(args.filmGrain) || 0, 0, 100) / 100;
  if (grain) {
    const size = GRAIN_SIZE[String(args.grainSize)] || GRAIN_SIZE.medium, random = seededRandom(Number(args.seed) || 20260927);
    const gw = Math.max(2, Math.ceil(width / size)), gh = Math.max(2, Math.ceil(height / size)), field = new Float32Array(gw * gh);
    for (let index = 0; index < field.length; index += 1) field[index] = (random() - 0.5) * 2;
    const strength = grain * 26;
    for (let y = 0; y < height; y += 1) {
      const gy = Math.min(gh - 1, Math.floor(y / size));
      for (let x = 0; x < width; x += 1) {
        const noise = field[gy * gw + Math.min(gw - 1, Math.floor(x / size))], offset = (y * width + x) * 3;
        const luma = luma601(raw[offset], raw[offset + 1], raw[offset + 2]);
        const chroma = 1 - clamp(Math.abs(luma - 0.5) * 1.5);
        for (let channel = 0; channel < 3; channel += 1) raw[offset + channel] = Math.round(clamp((raw[offset + channel] + noise * strength * (0.55 + chroma * 0.45)) / 255) * 255);
      }
    }
    log(`laid ${Math.round(grain * 100)}% ${args.grainSize || "medium"} film grain`);
  }
  return { raw, applied };
}

// ---------------------------------------------------------------- focus mask
// Soft radial falloff used by portrait/depth blur. Geometry only, no object detection.
export function buildRadialFocusMask(width, height, options = {}) {
  const focus = { x: clamp(Number(options.focus?.x ?? 0.5)), y: clamp(Number(options.focus?.y ?? 0.45)) };
  const radius = clamp(Number(options.radius ?? 0.55), 0.05, 2), feather = clamp(Number(options.feather ?? 0.45), 0.02, 1.5);
  const aspect = Math.max(0.2, width / Math.max(1, height)), mask = Buffer.allocUnsafe(width * height);
  for (let y = 0; y < height; y += 1) {
    const ny = (y / Math.max(1, height - 1) - focus.y) / radius;
    for (let x = 0; x < width; x += 1) {
      const nx = (x / Math.max(1, width - 1) - focus.x) / (radius * aspect);
      const distance = Math.sqrt(nx * nx + ny * ny);
      const inside = clamp(1 - Math.max(0, distance - (1 - feather)) / Math.max(0.05, feather));
      const value = options.invert === true ? 1 - inside : inside;
      mask[y * width + x] = Math.round(clamp(value) * 255);
    }
  }
  return mask;
}

// ---------------------------------------------------------------- skin mask
export function buildSkinMask(raw, width, height, options = {}) {
  const band = options.skinBand || SKIN_BAND, step = Math.max(1, Math.round(options.factor || Math.max(1, width / 320)));
  const sw = Math.max(2, Math.ceil(width / step)), sh = Math.max(2, Math.ceil(height / step)), small = new Float32Array(sw * sh);
  let counted = 0;
  for (let y = 0; y < sh; y += 1) for (let x = 0; x < sw; x += 1) {
    const sx = Math.min(width - 1, x * step), sy = Math.min(height - 1, y * step), offset = (sy * width + sx) * 3;
    const weight = skinChromaWeight(raw[offset], raw[offset + 1], raw[offset + 2], band);
    small[y * sw + x] = weight; if (weight > 0.35) counted += 1;
  }
  for (let pass = 0; pass < 2; pass += 1) boxBlurPlane(small, sw, sh, Math.max(1, Math.round(options.smooth ?? 2)), 1);
  const contrast = Number(options.contrast ?? 2.2);
  const full = Buffer.allocUnsafe(width * height);
  let total = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const value = clamp(samplePlaneBilinear(small, sw, sh, x / step, y / step) * contrast);
    const byte = Math.round(value * 255);
    full[y * width + x] = byte; total += byte;
  }
  return { mask: full, width, height, coverage: total / (width * height * 255), detectedPixels: counted * step * step };
}
