// BLACKCORE Supreme · real object recolouring engine (no overlays).
//
// Why this file exists: the previous hair/clothing route used rectangle geometry masks and a
// luminance-replacing gradient map, so the result looked like a sticker dropped on the photo.
// Here the mask is grown along the object's own colour/contour, protected chroma is subtracted
// before any colour is applied, and colour is injected in YCbCr while the original luminance
// structure is preserved. A hard gate then rejects rectangles, loose blobs, leaking colour,
// flattened texture and any drift of the object's own shading.
import { clamp, round, luma601, cbCr, skinChromaWeight } from "./photo-supreme.js";

export const MAX_RECOLOUR_PIXELS = 16_000_000;
export const RECOLOUR_ENGINE = "blackcore-recolour-v1";

// Named colours in PT/EN so "troque o cabelo para vermelho" needs no hex code.
export const RECOLOUR_COLORS = Object.freeze({
  red: "#e11d2f", vermelho: "#e11d2f", wine: "#7b1030", "vinho": "#7b1030",
  blue: "#1f5fe0", azul: "#1f5fe0", cyan: "#12b6d8", ciano: "#12b6d8",
  green: "#22b04a", verde: "#22b04a", teal: "#12a08a",
  yellow: "#e5c512", amarelo: "#e5c512", orange: "#ef7d16", laranja: "#ef7d16",
  pink: "#e8438f", rosa: "#e8438f", magenta: "#d0189e",
  purple: "#8c34d6", roxo: "#8c34d6", violet: "#6f2fc4", violeta: "#6f2fc4", indigo: "#3a2fb0",
  brown: "#7a4423", castanho: "#7a4423", marrom: "#7a4423", auburn: "#8f3a1e", copper: "#c4611f",
  blonde: "#d9a94e", loiro: "#d9a94e", gray: "#8b8b92", cinza: "#8b8b92", silver: "#b8bcc4",
  black: "#0d0d12", preto: "#0d0d12", white: "#efe9df", branco: "#efe9df",
});

// Structural priors per semantic target. They bias where a seed may start and how far the
// region may grow. They are colour/luminance signatures, never an object-detection claim.
export const RECOLOUR_TARGETS = Object.freeze({
  hair: {
    label: "hair mass", lumaMin: 0.015, lumaMax: 0.62, chromaMax: 0.22,
    seedBias: (nx, ny) => (ny < 0.12 ? 0.30 : ny > 0.74 ? -0.30 : 0) + (nx < 0.18 || nx > 0.82 ? 0.14 : 0),
    centrePenalty: 0.45, minCoverage: 0.004, maxCoverage: 0.60, reach: 0.45,
    minFillRatio: 0.34, minimumChromaGain: 0.02, seedYMax: 0.55,
  },
  clothing: {
    label: "garment", lumaMin: 0.02, lumaMax: 0.92, chromaMax: 0.34,
    seedBias: (nx, ny) => (ny < 0.14 ? -0.34 : ny > 0.46 ? 0.26 : 0) + (nx < 0.14 || nx > 0.86 ? 0.08 : 0),
    centrePenalty: 0.20, minCoverage: 0.005, maxCoverage: 0.70, reach: 0.50,
    minFillRatio: 0.40, minimumChromaGain: 0.02, seedYMin: 0.30,
  },
});

export const RECOLOUR_KEYS = ["recolourColour", "recolourTarget", "recolourStrength", "recolourSaturation", "recolourLightness", "recolourSeeds", "recolourSearch", "recolourReach", "recolourEdge", "recolourTolerance", "recolourFeather", "recolourGrow", "recolourShrink", "protectSkin", "protectRegions"];

export function hasRecolourArguments(args = {}) {
  return RECOLOUR_KEYS.some((key) => args[key] !== undefined && args[key] !== null && args[key] !== "" && !(typeof args[key] === "number" && args[key] === 0));
}

export function normalizeColourName(value = "") {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
}

export function hexToRgb(value, fallback = null) {
  const text = String(value || "").trim().toLowerCase();
  const named = RECOLOUR_COLORS[text] || RECOLOUR_COLORS[normalizeColourName(text)];
  const hex = named ? named.slice(1) : text.startsWith("#") ? text.slice(1) : "";
  if (/^[0-9a-f]{6}$/.test(hex)) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  if (/^[0-9a-f]{3}$/.test(hex)) return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  return fallback;
}

function rgbToHex(rgb) { return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`; }

// ---------------------------------------------------------------- planes
function measurePlanes(raw, width, height, factor) {
  const step = Math.max(1, Math.round(factor)), sw = Math.max(4, Math.ceil(width / step)), sh = Math.max(4, Math.ceil(height / step));
  const luma = new Float32Array(sw * sh), cb = new Float32Array(sw * sh), cr = new Float32Array(sw * sh), edge = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y += 1) for (let x = 0; x < sw; x += 1) {
    const sx = Math.min(width - 1, x * step), sy = Math.min(height - 1, y * step), offset = (sy * width + sx) * 3;
    const r = raw[offset], g = raw[offset + 1], b = raw[offset + 2];
    const index = y * sw + x;
    luma[index] = luma601(r, g, b);
    const [u, v] = cbCr(r, g, b); cb[index] = u; cr[index] = v;
  }
  for (let y = 0; y < sh; y += 1) for (let x = 0; x < sw; x += 1) {
    const index = y * sw + x, right = y * sw + Math.min(sw - 1, x + 1), down = Math.min(sh - 1, y + 1) * sw + x;
    edge[index] = Math.abs(luma[right] - luma[index]) + Math.abs(luma[down] - luma[index]);
  }
  return { luma, cb, cr, edge, width: sw, height: sh, step };
}

function blurPlane(plane, width, height, radius, passes = 1) {
  const r = Math.max(1, Math.round(radius)), temp = new Float32Array(plane.length);
  for (let pass = 0; pass < passes; pass += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0;
      for (let x = -r; x <= r; x += 1) sum += plane[y * width + clamp(x, 0, width - 1)];
      for (let x = 0; x < width; x += 1) {
        temp[y * width + x] = sum / (2 * r + 1);
        sum += plane[y * width + clamp(x + r + 1, 0, width - 1)] - plane[y * width + clamp(x - r, 0, width - 1)];
      }
    }
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = -r; y <= r; y += 1) sum += temp[clamp(y, 0, height - 1) * width + x];
      for (let y = 0; y < height; y += 1) {
        plane[y * width + x] = sum / (2 * r + 1);
        sum += temp[clamp(y + r + 1, 0, height - 1) * width + x] - temp[clamp(y - r, 0, height - 1) * width + x];
      }
    }
  }
  return plane;
}

function morphPlane(plane, width, height, radius, mode) {
  const r = Math.max(1, Math.round(radius)), temp = new Float32Array(plane.length), pick = mode === "erode" ? Math.min : Math.max;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let best = plane[y * width + clamp(x - r, 0, width - 1)];
    for (let dx = -r; dx <= r; dx += 1) best = pick(best, plane[y * width + clamp(x + dx, 0, width - 1)]);
    temp[y * width + x] = best;
  }
  for (let x = 0; x < width; x += 1) for (let y = 0; y < height; y += 1) {
    let best = temp[clamp(y - r, 0, height - 1) * width + x];
    for (let dy = -r; dy <= r; dy += 1) best = pick(best, temp[clamp(y + dy, 0, height - 1) * width + x]);
    plane[y * width + x] = best;
  }
  return plane;
}

function samplePlane(plane, width, height, x, y) {
  const fx = clamp(x, 0, width - 1), fy = clamp(y, 0, height - 1);
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  return (plane[y0 * width + x0] * (1 - tx) + plane[y0 * width + x1] * tx) * (1 - ty) + (plane[y1 * width + x0] * (1 - tx) + plane[y1 * width + x1] * tx) * ty;
}

// ---------------------------------------------------------------- protection
// Measured Cb/Cr skin chroma band. Colour-range masking, never face recognition.
export function buildSkinProtection(raw, width, height, strength = 1, tight = false) {
  const band = tight ? { cbMin: 0.34, cbMax: 0.51, crMin: 0.55, crMax: 0.73, lMin: 0.06, lMax: 0.96 } : undefined;
  const plane = new Float32Array(width * height);
  let counted = 0;
  for (let index = 0, offset = 0; index < plane.length; index += 1, offset += 3) {
    const weight = skinChromaWeight(raw[offset], raw[offset + 1], raw[offset + 2], band) * clamp(strength, 0, 1);
    plane[index] = weight;
    if (weight > 0.4) counted += 1;
  }
  return { plane, coverage: counted / plane.length };
}

export function shapeProtection(width, height, regions = []) {
  const plane = new Float32Array(width * height);
  for (const region of Array.isArray(regions) ? regions : []) {
    if (!region || typeof region !== "object") continue;
    const left = Math.round(clamp(Number(region.x) || 0, 0, 1) * width), top = Math.round(clamp(Number(region.y) || 0, 0, 1) * height);
    const right = Math.round(clamp((Number(region.x) || 0) + (Number(region.width) || 0), 0, 1) * width), bottom = Math.round(clamp((Number(region.y) || 0) + (Number(region.height) || 0), 0, 1) * height);
    for (let y = Math.max(0, top); y < Math.min(height, bottom); y += 1) for (let x = Math.max(0, left); x < Math.min(width, right); x += 1) plane[y * width + x] = Math.max(plane[y * width + x], Number(region.strength) || 1);
  }
  return plane;
}

function searchDomain(width, height, regions = []) {
  if (!Array.isArray(regions) || !regions.length) return null;
  const plane = new Uint8Array(width * height);
  for (const region of regions) {
    const left = Math.round(clamp(Number(region.x) || 0, 0, 1) * width), top = Math.round(clamp(Number(region.y) || 0, 0, 1) * height);
    const right = Math.round(clamp((Number(region.x) || 0) + (Number(region.width) || 0), 0, 1) * width), bottom = Math.round(clamp((Number(region.y) || 0) + (Number(region.height) || 0), 0, 1) * height);
    for (let y = Math.max(0, top); y < Math.min(height, bottom); y += 1) for (let x = Math.max(0, left); x < Math.min(width, right); x += 1) plane[y * width + x] = 1;
  }
  let total = 0; for (let index = 0; index < plane.length; index += 1) total += plane[index];
  if (total < plane.length * 0.002) throw new Error("recolourSearch boxes cover almost nothing; widen them or leave them out");
  return plane;
}

// ---------------------------------------------------------------- geometry truth
// A hair mass is legitimately multi-lobed (two side falls plus fringe), so one bounding box over
// the union would call a real contour a rectangle. Metrics are therefore measured per connected
// component and weighted by area: a rectangle scores ~1.0 per component, a contour scores lower,
// and a loose blob scattered across the frame fails the border test.
export function lumaGradient(raw, width, height) {
  const plane = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const index = (row + x) * 3, right = (row + Math.min(width - 1, x + 1)) * 3, down = (Math.min(height - 1, y + 1) * width + x) * 3;
      const light = luma601(raw[index], raw[index + 1], raw[index + 2]);
      plane[row + x] = Math.abs(luma601(raw[right], raw[right + 1], raw[right + 2]) - light) + Math.abs(luma601(raw[down], raw[down + 1], raw[down + 2]) - light);
    }
  }
  return plane;
}

// A boundary that followed a real contour stops one pixel short of the steepest gradient, so the
// gradient must be read through a small neighbourhood or a correct mask looks flat. This is a
// separable max filter: cheapest honest way to ask "is there an edge right here, within 2 px?".
function dilateMax(plane, width, height, radius) {
  const r = Math.max(1, Math.round(radius)), horizontal = new Float32Array(plane.length);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let best = 0;
      for (let dx = -r; dx <= r; dx += 1) { const value = plane[row + clamp(x + dx, 0, width - 1)]; if (value > best) best = value; }
      horizontal[row + x] = best;
    }
  }
  const out = new Float32Array(plane.length);
  for (let x = 0; x < width; x += 1) for (let y = 0; y < height; y += 1) {
    let best = 0;
    for (let dy = -r; dy <= r; dy += 1) { const value = horizontal[clamp(y + dy, 0, height - 1) * width + x]; if (value > best) best = value; }
    out[y * width + x] = best;
  }
  return out;
}

export function maskGeometry(mask, width, height, options = {}) {
  const pixels = width * height, threshold = clamp(Number(options.threshold ?? 0.5), 0.05, 0.95);
  const hard = new Uint8Array(pixels);
  let inside = 0;
  for (let index = 0; index < pixels; index += 1) { if (mask[index] > threshold) { hard[index] = 1; inside += 1; } }
  const labels = new Int32Array(pixels).fill(-1), stack = new Int32Array(pixels);
  const components = [];
  let next = 0;
  for (let start = 0; start < pixels; start += 1) {
    if (!hard[start] || labels[start] >= 0) continue;
    const id = next++;
    let top = 0, area = 0, minX = width, maxX = -1, minY = height, maxY = -1;
    stack[top++] = start; labels[start] = id;
    while (top > 0) {
      const index = stack[--top], x = index % width, y = Math.floor(index / width);
      area += 1;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      const neighbours = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const neighbour of neighbours) if (neighbour >= 0 && hard[neighbour] && labels[neighbour] < 0) { labels[neighbour] = id; stack[top++] = neighbour; }
    }
    components.push({ id, area, minX, maxX, minY, maxY, bbox: { x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height } });
  }
  let edge = options.edge || null;
  const sampled = edge ? dilateMax(edge, width, height, Number(options.edgeRadius) || 2) : null;
  let borderSum = 0, borderCount = 0, planeSum = 0;
  if (sampled) {
    for (let index = 0; index < pixels; index += 1) planeSum += edge[index];
    for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!hard[index]) continue;
      if (!hard[index - 1] || !hard[index + 1] || !hard[index - width] || !hard[index + width]) { borderSum += sampled[index]; borderCount += 1; }
    }
  }
  const meanEdge = sampled ? planeSum / Math.max(1, pixels) : 0;
  const borderEdge = sampled ? borderSum / Math.max(1, borderCount) : 0;
  // The primary contour truth: what share of the boundary actually sits on a measurable luminance
  // step. A rectangle dropped on flat background or a loose blob scores near zero here, while a
  // mask grown along the object's own edge scores high.
  const edgeMinimum = Number(options.edgeMinimum) || 0.05;
  let onEdge = 0, onEdgeTotal = 0;
  if (sampled) for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const index = y * width + x;
    if (!hard[index]) continue;
    // A mask cut off by the photo frame has no contour to verify there, so it is not counted.
    if (!hard[index - 1] || !hard[index + 1] || !hard[index - width] || !hard[index + width]) { onEdgeTotal += 1; if (sampled[index] >= edgeMinimum) onEdge += 1; }
  }
  const major = components.filter((component) => component.area >= Math.max(64, pixels * 0.0004));
  let fillNumerator = 0, fillDenominator = 0;
  for (const component of major.length ? major : components) {
    const boxArea = Math.max(1, (component.maxX - component.minX + 1) * (component.maxY - component.minY + 1));
    fillNumerator += component.area; fillDenominator += boxArea;
  }
  const coverage = inside / pixels;
  return {
    coverage: round(coverage, 6),
    fillRatio: fillDenominator ? round(clamp(fillNumerator / fillDenominator, 0, 1), 4) : 0,
    borderRatio: edge ? round(borderEdge / Math.max(0.0005, meanEdge), 3) : 0,
    edgeOnBoundary: onEdgeTotal ? round(clamp(onEdge / onEdgeTotal, 0, 1), 4) : 0,
    boundaryPixels: onEdgeTotal,
    components: components.length, majorComponents: major.length,
    largestComponentArea: major.length ? Math.max(...major.map((component) => component.area)) : 0,
    bbox: major.length ? major.reduce((best, component) => (component.area > best.area ? component : best), major[0]).bbox : null,
    pixels: inside,
  };
}

// ---------------------------------------------------------------- contour mask
export function buildRecolourMask(raw, width, height, options = {}) {
  const pixels = width * height;
  if (!raw || raw.length < pixels * 3) throw new Error("recolour engine requires a decoded 8-bit RGB buffer");
  if (pixels > MAX_RECOLOUR_PIXELS) throw new Error(`recolour engine refuses ${width}x${height}; images above ${MAX_RECOLOUR_PIXELS / 1e6}MP must be resized first`);
  const target = RECOLOUR_TARGETS[String(options.target || "hair")] || RECOLOUR_TARGETS.hair;
  const reach = clamp(Number(options.reach ?? target.reach), 0.04, 1.6);
  const edgeThreshold = clamp(Number(options.edge ?? 0.05), 0.004, 0.4);
  const tolerance = clamp(Number(options.tolerance ?? 0.24), 0.02, 0.9);
  const feather = Math.round(clamp(Number(options.feather ?? 1), 0, 12));
  const grow = Math.round(clamp(Number(options.grow ?? 0), -6, 8));
  const shrink = Math.round(clamp(Number(options.shrink ?? 0), -6, 8));
  const minimumCoverage = clamp(Number(options.minCoverage ?? target.minCoverage), 0.0005, 0.5);
  const maximumCoverage = clamp(Number(options.maxCoverage ?? target.maxCoverage), minimumCoverage + 0.002, 0.92);
  const protect = options.protect || null;
  const domain = searchDomain(width, height, options.search || []);
  // The flood runs at full resolution whenever the frame can afford it. Growing on a coarse plane
  // and upscaling bilinearly displaces the delivered boundary by several pixels, which is precisely
  // the misalignment this engine exists to prevent.
  const factor = Number(options.factor) > 0 ? Math.max(1, Math.round(Number(options.factor))) : (pixels > 2_600_000 ? Math.max(1, Math.round(Math.max(width, height) / 900)) : 1);
  const planes = measurePlanes(raw, width, height, factor);
  const { luma, cb, cr, edge } = planes, sw = planes.width, sh = planes.height, nodeCount = sw * sh;
  const at = (nx, ny) => Math.min(height - 1, ny * factor) * width + Math.min(width - 1, nx * factor);

  // Eligibility is the object's own colour signature: inside the target luma band, close to
  // achromatic for hair (or below the garment chroma ceiling), sitting on a flat area rather than
  // on a contour, outside protected skin, and inside any caller-supplied search area.
  const eligible = new Uint8Array(nodeCount), prior = new Float32Array(nodeCount);
  for (let y = 0; y < sh; y += 1) {
    const ny = y / Math.max(1, sh - 1);
    for (let x = 0; x < sw; x += 1) {
      const index = y * sw + x, nx = x / Math.max(1, sw - 1);
      const light = luma[index], chroma = Math.hypot(cb[index] - 0.5, cr[index] - 0.5);
      const full = at(x, y), protection = protect ? protect[full] : 0;
      let value = 0;
      value += clamp(1 - Math.abs(light - (target.lumaMin + target.lumaMax) / 2) / Math.max(0.05, (target.lumaMax - target.lumaMin) / 2)) * 0.34;
      value += clamp(1 - chroma / target.chromaMax) * 0.30;
      value += clamp(1 - edge[index] / Math.max(0.01, edgeThreshold * 2.4)) * 0.22;
      value += clamp(target.seedBias(nx, ny), -0.4, 0.4);
      if (nx > 0.3 && nx < 0.7 && ny > 0.1 && ny < 0.6) value -= target.centrePenalty * 0.5 * clamp(1 - Math.abs(ny - 0.35) / 0.3);
      if (protection > 0.3) value -= protection * 0.7;
      prior[index] = value;
      eligible[index] = (!domain || domain[full]) && light >= target.lumaMin && light <= target.lumaMax && chroma <= target.chromaMax * 1.3 && edge[index] < edgeThreshold && protection < 0.5 ? 1 : 0;
    }
  }

  const seeds = [];
  for (const seed of Array.isArray(options.seeds) ? options.seeds : []) {
    const sx = Math.round(clamp(Number(seed.x), 0, 1) * (sw - 1)), sy = Math.round(clamp(Number(seed.y), 0, 1) * (sh - 1)), index = sy * sw + sx;
    if (!eligible[index]) throw new Error(`recolour seed ${round(Number(seed.x), 3)},${round(Number(seed.y), 3)} is not inside the ${target.label} signature (luma ${round(luma[index], 3)}, chroma ${round(Math.hypot(cb[index] - 0.5, cr[index] - 0.5), 3)}); move the seed or pass recolourTarget=clothing`);
    seeds.push(index);
  }
  if (!seeds.length) {
    const wanted = clamp(Math.round(Number(options.seedCount) || 3), 1, 8), used = [];
    const spread = Math.max(5, Math.round(sw * 0.16));
    // Automatic seeding uses a structural prior, not a detection claim: hair roots in the upper
    // part of the frame, a garment sits lower. When colour alone cannot separate two dark objects
    // (black hair against a black cloak) this is the honest discriminator available offline.
    const seedYMin = Number(target.seedYMin) || 0, seedYMax = Number(target.seedYMax) || 1;
    for (let attempt = 0; attempt < 12 && seeds.length < wanted; attempt += 1) {
      let best = -1, bestValue = -Infinity;
      for (let index = 0; index < nodeCount; index += 1) {
        if (!eligible[index] || seeds.includes(index)) continue;
        const row = Math.floor(index / sw) / Math.max(1, sh - 1);
        if (row < seedYMin || row > seedYMax) continue;
        let suppressed = false;
        for (const point of used) if (Math.hypot((point % sw) - (index % sw), Math.floor(point / sw) - Math.floor(index / sw)) < spread) { suppressed = true; break; }
        if (suppressed) continue;
        if (prior[index] > bestValue) { bestValue = prior[index]; best = index; }
      }
      if (best < 0) break;
      seeds.push(best); used.push(best);
    }
  }
  if (!seeds.length) throw new Error(`no ${target.label} signature was measured in this photo (needs luma ${target.lumaMin}-${target.lumaMax}, chroma under ${target.chromaMax}${domain ? ", inside the search area" : ""}); pick another recolourTarget or supply a real mask`);

  // Seed colour statistics. A flood that only compares a pixel with its neighbour allows cumulative
  // drift (26 -> 34 -> 45 -> 60 -> 74 passes every local test), which is how hair bleeds into a dark
  // cloak. Each seed measures its own neighbourhood and the flood is anchored to that mean: a pixel
  // must match the OBJECT, not merely its neighbour.
  const statRadius = Math.max(2, Math.round(Math.min(sw, sh) * (factor > 1 ? 0.03 : 0.012)));
  const seedStats = seeds.map((index) => {
    const baseRow = Math.floor(index / sw), baseCol = index % sw;
    const y0 = Math.max(0, baseRow - statRadius), y1 = Math.min(sh - 1, baseRow + statRadius);
    const x0 = Math.max(0, baseCol - statRadius), x1 = Math.min(sw - 1, baseCol + statRadius);
    let count = 0, lumaSum = 0, cbSum = 0, crSum = 0;
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const point = y * sw + x;
      if (!eligible[point]) continue;
      count += 1; lumaSum += luma[point]; cbSum += cb[point]; crSum += cr[point];
    }
    if (!count) { count = 1; lumaSum = luma[index]; cbSum = cb[index]; crSum = cr[index]; }
    const meanLuma = lumaSum / count, meanCb = cbSum / count, meanCr = crSum / count;
    let variance = 0, chromaVariance = 0, samples = 0;
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const point = y * sw + x;
      if (!eligible[point]) continue;
      samples += 1;
      variance += (luma[point] - meanLuma) ** 2;
      chromaVariance += Math.hypot(cb[point] - meanCb, cr[point] - meanCr) ** 2;
    }
    if (!samples) samples = 1;
    return { meanLuma, meanCb, meanCr, spread: Math.sqrt(variance / samples), chromaSpread: Math.sqrt(chromaVariance / samples) };
  });
  const spreadPeak = Math.max(...seedStats.map((stat) => stat.spread));
  const chromaSpreadPeak = Math.max(...seedStats.map((stat) => stat.chromaSpread));
  // The allowance scales with the variation the object itself shows at the seed, so real highlights
  // and shadow bands are kept, while reaching a different object stays out of bounds.
  const anchorMax = clamp(spreadPeak * 1.8 + 0.02 + (reach - target.reach) * 0.06, 0.02, tolerance);
  const chromaAnchorMax = clamp(chromaSpreadPeak * 1.8 + 0.015, 0.015, target.chromaMax);

  // Membership flood. Two independent tests gate every pixel: the local step (keeps the frontier
  // responsive inside the object, including strand lines and folds) and the seed anchor (forbids
  // cumulative drift). A real contour stops the flood because the colour step there exceeds both.
  const mask = new Uint8Array(nodeCount), owner = new Int32Array(nodeCount).fill(-1), queue = new Int32Array(nodeCount);
  let head = 0, tail = 0, claimed = 0;
  const maxNodes = Math.max(seeds.length + 1, Math.round(maximumCoverage * nodeCount));
  const steps = [1, -1, sw, -sw, sw + 1, sw - 1, -sw + 1, -sw - 1];
  for (const [seedId, index] of seeds.entries()) { mask[index] = 1; owner[index] = seedId; queue[tail++] = index; }
  while (head < tail && claimed < maxNodes) {
    const index = queue[head++]; claimed += 1;
    const baseRow = Math.floor(index / sw), baseCol = index % sw;
    const baseLuma = luma[index], baseCb = cb[index], baseCr = cr[index];
    const stat = seedStats[Math.max(0, owner[index])] || seedStats[0];
    for (const step of steps) {
      const next = index + step;
      if (next < 0 || next >= nodeCount || mask[next]) continue;
      const nx = next % sw, ny = Math.floor(next / sw);
      if (Math.abs(nx - baseCol) > 1 || Math.abs(ny - baseRow) > 1) continue;
      const light = luma[next];
      if (light < target.lumaMin || light > target.lumaMax) continue;
      if (Math.hypot(cb[next] - 0.5, cr[next] - 0.5) > target.chromaMax * 1.4) continue;
      const full = at(nx, ny);
      if (domain && !domain[full]) continue;
      if (protect && protect[full] > 0.35) continue;
      const local = Math.abs(light - baseLuma) * 0.75 + Math.hypot(cb[next] - baseCb, cr[next] - baseCr) * 2.2;
      if (local > tolerance) continue;
      const anchor = Math.abs(light - stat.meanLuma) + Math.hypot(cb[next] - stat.meanCb, cr[next] - stat.meanCr);
      if (anchor > anchorMax + chromaAnchorMax) continue;
      mask[next] = 1; owner[next] = Math.max(0, owner[index]);
      if (tail < nodeCount) queue[tail++] = next;
    }
  }

  // Boundary refinement: a closing pass bridges lineart gaps and broken strands, then optional
  // caller nudges. Radii are expressed in output pixels and converted to the working plane.
  const binary = new Float32Array(nodeCount);
  for (let index = 0; index < nodeCount; index += 1) binary[index] = mask[index];
  const close = Math.max(1, Math.round(Math.min(sw, sh) * (factor > 1 ? 0.012 : 0.004)));
  morphPlane(binary, sw, sh, close, "dilate");
  morphPlane(binary, sw, sh, close, "erode");
  if (shrink > 0) morphPlane(binary, sw, sh, Math.max(1, Math.round(shrink / factor)), "erode");
  if (grow > 0) morphPlane(binary, sw, sh, Math.max(1, Math.round(grow / factor)), "dilate");

  const confidence = new Float32Array(pixels);
  if (factor === 1) {
    for (let index = 0; index < nodeCount; index += 1) confidence[index] = binary[index] > 0.5 ? 1 : 0;
  } else {
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) confidence[y * width + x] = clamp(samplePlane(binary, sw, sh, x / factor, y / factor) * 2.2 - 0.6);
  }

  // Protected skin is a veto applied before any colour exists, and the weight tapers towards it so
  // an ambiguous hair/skin border errs on not touching skin.
  let protectedTouch = 0, weightTotal = 0;
  if (protect) {
    for (let index = 0; index < pixels; index += 1) {
      const skin = protect[index];
      if (skin > 0.35) confidence[index] = 0;
      else if (confidence[index] > 0) confidence[index] *= 1 - clamp(skin * 1.8);
    }
  }
  for (let index = 0; index < pixels; index += 1) { weightTotal += confidence[index]; protectedTouch += confidence[index] * (protect ? protect[index] : 0); }
  const leakRatio = weightTotal > 0 ? protectedTouch / weightTotal : 0;

  // Feather is integration only. The ramp is centred on the existing boundary instead of shifted,
  // so softening the edge never moves the mask.
  let final = confidence;
  if (feather > 0) {
    const soft = Float32Array.from(confidence);
    blurPlane(soft, width, height, Math.max(1, feather), 1);
    final = new Float32Array(pixels);
    for (let index = 0; index < pixels; index += 1) final[index] = clamp((soft[index] - 0.5) * 0.85 + 0.5);
    if (protect) for (let index = 0; index < pixels; index += 1) if (protect[index] > 0.35) final[index] = 0;
  }

  // Geometry truth, measured per connected component on the finished mask. This is what rejects a
  // rectangle, a loose patch, or a boundary that never sat on the object's own contour.
  const gradient = lumaGradient(raw, width, height);
  const geometry = maskGeometry(final, width, height, { edge: gradient, edgeRadius: Math.max(2, factor * 2) });
  // diagnostics is for tests and offline inspection only: it returns the measured metrics without
  // enforcing them. photo_editor never sets it, so a real render can never bypass the gate.
  const strict = options.diagnostics !== true;
  if (strict && !(geometry.coverage >= minimumCoverage)) throw new Error(`the refined ${target.label} mask only reached ${(geometry.coverage * 100).toFixed(2)}% of the photo (needs ${(minimumCoverage * 100).toFixed(2)}%): the object is too small or indistinguishable from its background here, so a real contour cannot be built — supply a manual mask`);
  if (strict && !(geometry.coverage <= maximumCoverage)) throw new Error(`the ${target.label} mask spread over ${(geometry.coverage * 100).toFixed(1)}% of the photo (limit ${round(maximumCoverage * 100, 1)}%): that is background bleed, not a recolour — lower recolourReach/recolourTolerance or supply a manual mask`);
  if (strict && !(geometry.fillRatio >= target.minFillRatio)) throw new Error(`the ${target.label} mask fills only ${round(geometry.fillRatio * 100, 1)}% of its own parts (needs ${round(target.minFillRatio * 100, 1)}%): it is scattered noise, not a solid object — the render is refused`);
  if (strict && !(geometry.edgeOnBoundary >= 0.8)) throw new Error(`only ${round(geometry.edgeOnBoundary * 100, 1)}% of the ${target.label} boundary sits on a real luminance step (needs 80%); the mask did not follow the object's own contour, so the render is refused`);
  if (leakRatio > 0.14) throw new Error(`the ${target.label} mask overlaps protected skin by ${round(leakRatio * 100, 1)}%: colour would land on skin, so the render is refused — narrow the search area or lower recolourReach`);
  return {
    mask: final, ...geometry, leakRatio: round(leakRatio, 4),
    seeds: seeds.map((index) => ({ x: round((index % sw) / sw, 4), y: round(Math.floor(index / sw) / sh, 4) })),
    method: "seed-anchored membership flood on real colour steps",
    target: target.label, minimumFillRatio: target.minFillRatio, minimumChromaGain: target.minimumChromaGain,
    params: { reach, edgeThreshold, tolerance, anchorMax: round(anchorMax, 4), chromaAnchorMax: round(chromaAnchorMax, 4), feather, grow, shrink, factor, minimumCoverage, maximumCoverage, search: domain ? "constrained" : "whole photo" },
  };
}

// ---------------------------------------------------------------- recolour
// Hue and chroma change; luminance keeps its exact local structure (low frequency scaled,
// high-frequency detail carried through untouched), so shadows, highlights, folds, strands and
// lineart survive by construction instead of being repainted.
export function recolourFrame(raw, width, height, mask, options = {}) {
  const pixels = width * height;
  if (!raw || raw.length < pixels * 3) throw new Error("recolour requires a decoded 8-bit RGB buffer");
  if (!mask || mask.length !== pixels) throw new Error("recolour requires one confidence value per pixel");
  const colour = hexToRgb(options.colour, null);
  if (!colour) throw new Error(`unknown recolour colour "${options.colour || ""}"; use a name such as vermelho, azul, roxo, preto, loiro or a #rrggbb value`);
  const strength = clamp(Number(options.strength ?? 90), 0, 100) / 100;
  const saturation = clamp(Number(options.saturation ?? 92), 0, 100) / 100;
  const lightness = clamp(Number(options.lightness ?? 0), -100, 100) / 100;
  const shadowFloor = clamp(Number(options.shadowFloor ?? 0.05), 0, 0.5);
  const shadowCeil = clamp(Number(options.shadowCeil ?? 0.55), shadowFloor + 0.05, 1);
  const maxChroma = clamp(Number(options.maxChroma ?? 0.30), 0.02, 0.42);
  const [cbTarget, crTarget] = cbCr(colour[0], colour[1], colour[2]);
  const targetChroma = clamp(Math.hypot(cbTarget - 0.5, crTarget - 0.5) * (0.5 + saturation * 0.9), 0, maxChroma);
  const targetAngle = Math.atan2(crTarget - 0.5, cbTarget - 0.5);
  const gain = 1 + lightness * 0.72;

  const lumaPlane = new Float32Array(pixels);
  for (let index = 0, offset = 0; index < pixels; index += 1, offset += 3) lumaPlane[index] = luma601(raw[offset], raw[offset + 1], raw[offset + 2]);
  const factor = Math.max(1, Math.round(Math.max(width, height) / 220));
  const sw = Math.max(4, Math.ceil(width / factor)), sh = Math.max(4, Math.ceil(height / factor)), low = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y += 1) for (let x = 0; x < sw; x += 1) {
    const sx = Math.min(width - 1, x * factor), sy = Math.min(height - 1, y * factor);
    low[y * sw + x] = lumaPlane[sy * width + sx];
  }
  blurPlane(low, sw, sh, Math.max(1, Math.round(Math.min(sw, sh) * 0.05)), 3);

  const before = Buffer.from(raw.subarray(0, pixels * 3));
  let touched = 0;
  for (let index = 0, offset = 0; index < pixels; index += 1, offset += 3) {
    const weight = clamp(mask[index]) * strength;
    if (weight <= 0.004) continue;
    const r = before[offset], g = before[offset + 1], b = before[offset + 2];
    const light = lumaPlane[index];
    const detail = light - samplePlane(low, sw, sh, index % width / factor, Math.floor(index / width) / factor);
    const [u, v] = cbCr(r, g, b);
    const chroma = Math.hypot(u - 0.5, v - 0.5);
    const angle = chroma > 0.004 ? Math.atan2(v - 0.5, u - 0.5) : targetAngle;
    const shadowKeep = clamp((light - shadowFloor) / Math.max(0.04, shadowCeil - shadowFloor), 0.07, 1) ** 0.72;
    const nextChroma = clamp(targetChroma * (0.22 + weight * 0.78) * shadowKeep, 0, maxChroma);
    const nextAngle = angle + (targetAngle - angle) * weight;
    const nextCb = 0.5 + Math.cos(nextAngle) * nextChroma, nextCr = 0.5 + Math.sin(nextAngle) * nextChroma;
    let nextLight = light;
    if (Math.abs(gain - 1) > 0.002) nextLight = clamp(samplePlane(low, sw, sh, index % width / factor, Math.floor(index / width) / factor) * gain + detail * Math.pow(Math.max(0.05, gain), 0.4), 0, 1);
    const y255 = nextLight * 255;
    const outR = clamp(y255 + 1.4025 * (nextCr - 0.5) * 255, 0, 255);
    const outG = clamp(y255 - 0.34432 * (nextCb - 0.5) * 255 - 0.71441 * (nextCr - 0.5) * 255, 0, 255);
    const outB = clamp(y255 + 1.773 * (nextCb - 0.5) * 255, 0, 255);
    raw[offset] = Math.round(r * (1 - weight) + outR * weight);
    raw[offset + 1] = Math.round(g * (1 - weight) + outG * weight);
    raw[offset + 2] = Math.round(b * (1 - weight) + outB * weight);
    if (weight > 0.5) touched += 1;
  }
  if (!touched) throw new Error("the recolour mask carried no solid area; nothing would change, so no fake edited copy was produced");
  return { raw, touchedPixels: touched, colour: rgbToHex(colour), targetChroma: round(targetChroma, 4), gain: round(gain, 4) };
}

// ---------------------------------------------------------------- gate
// Independent measurement of the finished pixels. This is the check that was missing when the
// rectangle + gradient-map version passed with a visible sticker result.
export function assessRecolour(before, after, mask, width, height, options = {}) {
  const pixels = width * height;
  const step = Math.max(1, Math.round(Math.sqrt(pixels / 300000)));
  const target = RECOLOUR_TARGETS[String(options.target || "")] || null;
  const minInside = Number(options.minimumInsideDelta) || 0.012;
  const maxOutside = Number(options.maximumOutsideDelta) || 0.003;
  const minChroma = Number(options.minimumChromaGain ?? target?.minimumChromaGain ?? 0.02);
  const minFill = Number(options.minimumFillRatio ?? target?.minFillRatio ?? 0.34);
  const minEdge = Number(options.minimumEdgeFraction) || 0.8;
  const expectChroma = options.expectChroma !== false;
  let insideWeight = 0, outsideWeight = 0, insideDelta = 0, outsideDelta = 0, changed = 0, count = 0;
  let chromaBefore = 0, chromaAfter = 0, lumaBefore = 0, lumaAfter = 0;
  let sumB = 0, sumA = 0, sumBB = 0, sumAA = 0, sumBA = 0, corr = 0;
  let detailBefore = 0, detailAfter = 0, detailSamples = 0;
  const lap = (buffer, index, offset) => {
    const c = (i) => luma601(buffer[i], buffer[i + 1], buffer[i + 2]);
    return Math.abs(4 * c(offset) - c(offset - 3) - c(offset + 3) - c(offset - index) - c(offset + index));
  };
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const index = y * width + x, offset = index * 3, weight = clamp(mask[index]), outside = 1 - weight;
    const delta = (Math.abs(before[offset] - after[offset]) + Math.abs(before[offset + 1] - after[offset + 1]) + Math.abs(before[offset + 2] - after[offset + 2])) / (3 * 255);
    insideDelta += delta * weight; outsideDelta += delta * outside;
    insideWeight += weight; outsideWeight += outside;
    if (weight <= 0.5) continue;
    count += 1;
    if (delta > 0.02) changed += 1;
    const bLuma = luma601(before[offset], before[offset + 1], before[offset + 2]), aLuma = luma601(after[offset], after[offset + 1], after[offset + 2]);
    const [bu, bv] = cbCr(before[offset], before[offset + 1], before[offset + 2]), [au, av] = cbCr(after[offset], after[offset + 1], after[offset + 2]);
    chromaBefore += Math.hypot(bu - 0.5, bv - 0.5); chromaAfter += Math.hypot(au - 0.5, av - 0.5);
    lumaBefore += bLuma; lumaAfter += aLuma;
    sumB += bLuma; sumA += aLuma; sumBB += bLuma * bLuma; sumAA += aLuma * aLuma; sumBA += bLuma * aLuma; corr += 1;
    if (x > 1 && y > 1 && x + 1 < width && y + 1 < height) { detailBefore += lap(before, index, offset); detailAfter += lap(after, index, offset); detailSamples += 1; }
  }
  const insideMean = insideDelta / Math.max(1e-6, insideWeight), outsideMean = outsideDelta / Math.max(1e-6, outsideWeight);
  const outsideLimit = Math.max(maxOutside, insideMean * 0.04);
  const chromaGain = (chromaAfter - chromaBefore) / Math.max(1, count);
  const meanBL = lumaBefore / Math.max(1, count), meanAL = lumaAfter / Math.max(1, count);
  const detailRatio = detailSamples ? (detailAfter / Math.max(0.01, detailSamples)) / Math.max(0.01, detailBefore / Math.max(0.01, detailSamples)) : 1;
  const covariance = sumBA / Math.max(1, corr) - (sumB / Math.max(1, corr)) * (sumA / Math.max(1, corr));
  const varianceB = sumBB / Math.max(1, corr) - (sumB / Math.max(1, corr)) ** 2, varianceA = sumAA / Math.max(1, corr) - (sumA / Math.max(1, corr)) ** 2;
  const lumaCorrelation = covariance / Math.max(1e-9, Math.sqrt(Math.max(0, varianceB) * Math.max(0, varianceA)));
  const coverage = count * step * step / pixels;
  const reasons = [];
  if (!(coverage > 0.0008)) reasons.push("the mask carried no measurable area");
  if (!(insideMean >= minInside)) reasons.push(`colour never landed inside the mask (inside delta ${round(insideMean, 5)} < ${minInside})`);
  if (outsideMean > outsideLimit) reasons.push(`colour leaked outside the mask (outside delta ${round(outsideMean, 5)} > ${round(outsideLimit, 5)})`);
  if (expectChroma && minChroma > 0 && Math.abs(chromaGain) < minChroma) reasons.push(`the recoloured area never shifted chroma (change ${round(chromaGain, 4)}, needed ${minChroma}); that would read as a flat overlay`);
  if (expectChroma && minChroma > 0 && Math.sign(chromaGain) !== Math.sign(Number(options.chromaDirection ?? 1))) reasons.push(`chroma moved the wrong way (${round(chromaGain, 4)})`);
  if (!(lumaCorrelation >= 0.965)) reasons.push(`luminance structure drifted inside the object (correlation ${round(lumaCorrelation, 4)} < 0.965); shadows and texture were not preserved`);
  if (!(detailRatio >= 0.86)) reasons.push(`fine detail was flattened inside the object (relative detail ${round(detailRatio, 3)} < 0.86); lineart, folds or strands were destroyed`);
  if (!(Number(options.fillRatio) >= minFill)) reasons.push(`the mask fills ${round(Number(options.fillRatio) * 100, 1)}% of its own bounding box (needs ${round(minFill * 100, 1)}%); that is a rectangle or a loose blob, not the real contour`);
  if (!(Number(options.edgeOnBoundary) >= minEdge)) reasons.push(`only ${round(Number(options.edgeOnBoundary) * 100, 1)}% of the mask boundary sits on a real luminance step (needs ${round(minEdge * 100, 1)}%); that is a rectangle or a loose patch, not the object's contour`);
  return {
    passed: reasons.length === 0, reasons,
    coverage: round(coverage, 5), insideDelta: round(insideMean, 6), outsideDelta: round(outsideMean, 6), outsideLimit: round(outsideLimit, 6),
    changedFraction: round(changed / Math.max(1, count), 4),
    chromaBefore: round(chromaBefore / Math.max(1, count), 4), chromaAfter: round(chromaAfter / Math.max(1, count), 4), chromaGain: round(chromaGain, 4),
    lumaBefore: round(meanBL, 4), lumaAfter: round(meanAL, 4), lumaCorrelation: round(lumaCorrelation, 4),
    detailRatio: round(detailRatio, 3), fillRatio: round(Number(options.fillRatio), 4), borderRatio: round(Number(options.borderRatio), 3), samples: count,
  };
}

export function recolourSummary(options = {}) {
  const colour = hexToRgb(options.colour, null);
  return {
    engine: RECOLOUR_ENGINE, colour: colour ? rgbToHex(colour) : null, target: String(options.target || "hair"),
    method: "edge-aware region growing + YCbCr recolour with preserved luminance",
    protects: ["measured Cb/Cr skin band", "every pixel outside the mask", "local luminance, shadow and lineart structure"],
    colourNames: Object.keys(RECOLOUR_COLORS),
  };
}
