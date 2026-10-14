import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { photoEditorTool } from '../src/tools/media/photo-editor.js';
import { buildPhotoAdvice } from '../src/tools/media/photo-advisor.js';
import { listPhotoEffectPresets, photoEffectPack, photoEffectPresetTokens, resolvePhotoEffectPreset } from '../src/tools/media/photo-effects.js';
import {
  applySupremePipeline, buildSkinMask, buildRadialFocusMask, hasSupremeArguments,
  skinChromaWeight, bandWeight, buildToneLut, TONE_CURVES, SUPREME_KEYS, MAX_ENGINE_PIXELS
} from '../src/tools/media/photo-supreme.js';

const command = spawnSync('magick', ['-version']).status === 0 ? 'magick' : 'convert';
const hasMagick = spawnSync(command, ['-version']).status === 0;

function gradientFrame(width, height) {
  // Deterministic synthetic photo with a warm "skin" region and a cool background.
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3, nx = x / (width - 1), ny = y / (height - 1);
      const inSkin = nx > 0.3 && nx < 0.7 && ny > 0.15 && ny < 0.55;
      if (inSkin) { raw[offset] = 208; raw[offset + 1] = 156; raw[offset + 2] = 128; }
      else { raw[offset] = Math.round(30 + nx * 70); raw[offset + 1] = Math.round(40 + ny * 90); raw[offset + 2] = Math.round(90 + nx * 120); }
      // deterministic texture so gradients/detail metrics exist
      const checker = ((x >> 2) + (y >> 2)) % 2 ? 8 : -8;
      raw[offset] = Math.max(0, Math.min(255, raw[offset] + checker));
      raw[offset + 1] = Math.max(0, Math.min(255, raw[offset + 1] + checker));
      raw[offset + 2] = Math.max(0, Math.min(255, raw[offset + 2] - checker));
    }
  }
  return raw;
}

test('Supreme tone curves are monotone, bounded and distinct', () => {
  const names = Object.keys(TONE_CURVES);
  assert.ok(names.length >= 6, 'at least six named tone curves must ship');
  for (const name of names) {
    const lut = buildToneLut(TONE_CURVES[name], 1);
    assert.equal(lut.length, 256);
    assert.equal(lut[0], Math.round(TONE_CURVES[name][0][1] * 255), `${name} must honour its black anchor`);
    for (let index = 1; index < 256; index += 1) assert.ok(lut[index] >= lut[index - 1], `${name} must never invert tonal order`);
  }
  const signatures = names.map(name => buildToneLut(TONE_CURVES[name], 1).join(','));
  assert.equal(new Set(signatures).size, names.length, 'every tone curve must be measurably different');
  const halfStrength = buildToneLut(TONE_CURVES['s-curve'], 0);
  assert.deepEqual(Array.from(halfStrength), Array.from({ length: 256 }, (_, index) => index), 'zero strength must be an exact identity');
});

test('Supreme skin chroma selection matches warm skin and rejects blue/grey', () => {
  assert.ok(skinChromaWeight(208, 156, 128) > 0.75, 'typical warm skin must score high');
  assert.ok(skinChromaWeight(40, 60, 150) < 0.05, 'a cool blue background must not be read as skin');
  assert.ok(skinChromaWeight(128, 128, 128) < 0.05, 'neutral grey must not be read as skin');
  assert.equal(skinChromaWeight(8, 8, 8), 0, 'near-black pixels are excluded from the chroma band');
  const wheel = [0, 60, 120, 180, 240, 300];
  wheel.forEach((centre, index) => {
    assert.ok(bandWeight(centre, index) > 0.99, `band ${index} must peak at its centre`);
    assert.ok(bandWeight((centre + 180) % 360, index) < 0.01, `band ${index} must ignore the opposite hue`);
  });
});

test('Supreme engine changes pixels that a plain contrast pass cannot reach', () => {
  const width = 96, height = 64, base = gradientFrame(width, height);
  const cases = [
    ['toneCurve', { toneCurve: 'cinematic' }],
    ['shadows/highlights', { shadows: 80, highlights: -80 }],
    ['clarity', { clarity: 70 }],
    ['vibrance', { vibrance: 60 }],
    ['hsl red saturation', { hsl: { saturation: { red: 90 } } }],
    ['duotone', { duotone: { shadow: '#160a24', highlight: '#ff3d9a', mix: 100 } }],
    ['vignette', { vignette: 70 }],
    ['filmGrain', { filmGrain: 70, seed: 5 }],
    ['studioRelight', { studioRelight: 70 }],
    ['neonGlow', { neonGlow: 80 }],
    ['lightLeak', { lightLeak: { intensity: 80, direction: 'top-left' } }],
    ['glitch', { glitch: 70, seed: 9 }],
    ['portraitBlur', { portraitBlur: 90 }],
    ['whiteBalance tungsten', { whiteBalance: 'tungsten' }]
  ];
  for (const [label, spec] of cases) {
    const buffer = Buffer.from(base);
    const result = applySupremePipeline(buffer, width, height, spec);
    assert.equal(result.raw, buffer, `${label} must edit in place`);
    assert.ok(result.applied.length > 0, `${label} must report what it did`);
    let delta = 0;
    for (let index = 0; index < base.length; index += 1) delta += Math.abs(base[index] - buffer[index]);
    assert.ok(delta / base.length > 0.4, `${label} produced no measurable pixel change (mean delta ${(delta / base.length).toFixed(3)})`);
  }
});

test('Supreme grain is deterministic per seed and skin/vignette masks are sane', () => {
  const width = 80, height = 60;
  const one = Buffer.from(gradientFrame(width, height)), two = Buffer.from(gradientFrame(width, height));
  applySupremePipeline(one, width, height, { filmGrain: 40, seed: 42 });
  applySupremePipeline(two, width, height, { filmGrain: 40, seed: 42 });
  assert.ok(one.equals(two), 'the same seed must reproduce identical grain');
  const other = Buffer.from(gradientFrame(width, height));
  applySupremePipeline(other, width, height, { filmGrain: 40, seed: 43 });
  assert.ok(!one.equals(other), 'a different seed must produce different grain');

  const frame = gradientFrame(width, height);
  const mask = buildSkinMask(frame, width, height, {});
  assert.ok(mask.coverage > 0.03 && mask.coverage < 0.6, `synthetic skin must be a partial area, got ${mask.coverage}`);
  const centre = mask.mask[Math.round(height * 0.35) * width + Math.round(width * 0.5)];
  const corner = mask.mask[Math.round(height * 0.9) * width + 2];
  assert.ok(centre > corner + 40, 'the mask must be much stronger on skin than on the cool background');

  const focus = buildRadialFocusMask(width, height, { focus: { x: 0.5, y: 0.5 }, radius: 0.5 });
  assert.equal(focus.length, width * height);
  assert.ok(focus[Math.round(height / 2) * width + Math.round(width / 2)] > 250, 'the focus centre must stay sharp');
  assert.ok(focus[0] < 40, 'the frame corner must fall inside the falloff');
});

test('photo_editor schema exposes the Supreme engine and every catalog preset token', () => {
  const properties = photoEditorTool.parameters.properties;
  assert.ok(properties.action.enum.includes('supreme_edit'), 'supreme_edit must be a real action');
  for (const key of SUPREME_KEYS) assert.ok(properties[key], `parameter ${key} must be declared`);
  for (const token of photoEffectPresetTokens()) assert.ok(properties.photoPreset.enum.includes(token), `${token} must be accepted by photoPreset`);
  assert.ok(properties.photoPreset.enum.includes('polish-teal-orange') && properties.photoPreset.enum.includes('supremo-studio'));
  assert.ok(properties.editScope.enum.includes('skin'), 'the measured skin scope must be selectable');
  assert.equal(MAX_ENGINE_PIXELS, 16_000_000);
  assert.ok(hasSupremeArguments({ toneCurve: 'matte' }) && !hasSupremeArguments({ brightness: 4 }), 'argument detection must track Supreme keys only');
});

test('Supreme presets resolve through ids and aliases', () => {
  const presets = listPhotoEffectPresets();
  assert.ok(presets.length >= 12, `the catalog must grow beyond the classic presets, got ${presets.length}`);
  for (const preset of presets) assert.ok(preset.supreme || ['clean-natural', 'cinematic-balanced', 'blackcore-dark', 'warm-vintage', 'social-pop', 'mono-noir', 'studio-neutral'].includes(preset.id), `${preset.id} must carry a Supreme finish`);
  assert.equal(resolvePhotoEffectPreset('teal orange').id, 'polish-teal-orange');
  assert.equal(resolvePhotoEffectPreset('SUPREMO PORTRAIT').id, 'supremo-portrait');
  assert.equal(resolvePhotoEffectPreset('não existe'), null);
  const pack = photoEffectPack();
  assert.equal(pack.version, '4.0.0');
  assert.ok(pack.toneCurves.length >= 6);
});

test('photo advisor surfaces Supreme options without touching pixels', () => {
  const analysis = {
    light: { exposure: 'underexposed', stdDev: 12, p05: 10, p95: 180, shadowClipRatio: 0.2, highlightClipRatio: 0.01 },
    color: { meanSaturation: 0.09, cast: { red: 0.02, green: 0.01, blue: 0.03 } },
    detail: { noiseScore: 0.05, level: 'soft', laplacianVariance: 25 },
    environment: { primary: 'neutral', tags: [], confidence: 0.4 },
    focus: { x: 0.5, y: 0.4, confidence: 0.9 }
  };
  const advice = buildPhotoAdvice(analysis, { width: 1086, height: 1448, format: 'JPEG' }, { automaticSubjectBackground: false, namedDetail: false, rembgInstalled: false });
  assert.ok(advice.presets.some(row => row.id === 'supreme-portrait'), 'a Supreme preset must appear in the menu');
  assert.ok(advice.supreme.toneCurves.length >= 6, 'the advisor must publish the tone-curve list');
  assert.ok(advice.supreme.parameters.includes('skinToneProtection'));
  assert.ok(advice.findings.some(row => row.id === 'low-chroma-source'), 'a near-monochrome source must be called out honestly');
  assert.equal(advice.noChangesApplied, true);
});

test('real phone render: supreme_edit visibly changes a photo and survives the quality gate', { skip: !hasMagick }, async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-supreme-'));
  const source = path.join(tmp, 'source.png');
  const raw = gradientFrame(320, 240);
  await fs.writeFile(path.join(tmp, 'source.rgb'), raw);
  const gen = spawnSync(command, ['-size', '320x240', '-depth', '8', `rgb:${path.join(tmp, 'source.rgb')}`, source], { timeout: 60_000 });
  assert.equal(gen.status, 0, `sample generation failed: ${gen.stderr}`);

  const ctx = {
    cwd: tmp,
    cfg: { permissionProfile: 'yolo', maxToolOutputChars: 2_000_000 },
    security: { authorizeShell: async () => ({ allow: true }) },
    agent: { provider: 'tokenharbor', model: 'tokenharbor-fast-pool' }
  };

  const plain = JSON.parse(await photoEditorTool.execute({
    action: 'supreme_edit',
    input: source,
    output: path.join(tmp, 'supreme.jpg'),
    photoPreset: 'supremo-studio',
    editLevel: 'high',
    vignette: 55,
    filmGrain: 35,
    clarity: 40
  }, ctx));
  assert.ok(plain.ok, 'supreme_edit must succeed');
  assert.ok(plain.verification.changed, 'the same-size render must clear the visible-delta gate');
  assert.ok(plain.verification.normalizedRmse > 0.01, `the change must be obvious, not a recompression (got ${plain.verification.normalizedRmse})`);

  const out = path.join(tmp, 'supreme-framed.jpg');
  const result = JSON.parse(await photoEditorTool.execute({
    action: 'supreme_edit',
    input: source,
    output: out,
    photoPreset: 'supremo-studio',
    editLevel: 'high',
    frame: 'polaroid',
    frameWidth: 6
  }, ctx));

  assert.ok(result.ok, 'supreme_edit must succeed');
  assert.ok(result.supreme.applied.length >= 5, `expected several Supreme stages, got ${result.supreme.applied.length}`);
  assert.ok(result.verification.changed, 'the framed render must clear the visible-delta gate');
  assert.ok(result.metadata.width > 320 && result.metadata.height > 240, 'the keystone frame must grow the canvas');
  assert.ok(result.frame && result.frame.bottom > result.frame.top, 'polaroid must add a deeper bottom border');
  const tone = plain.verification.tone;
  assert.ok(tone, 'supreme_edit must report before/after tone');
  assert.ok(Math.abs(tone.after.stdDev - tone.before.stdDev) > 0.4 || Math.abs(tone.after.saturation - tone.before.saturation) > 0.01, 'tone statistics must actually move');
  assert.ok((await fs.stat(out)).size > 2000, 'the file must exist and carry data');

  const refused = await photoEditorTool.execute({ action: 'supreme_edit', input: source, output: path.join(tmp, 'no.jpg'), editScope: 'skin', vibrance: 60 }, ctx).catch(error => error);
  assert.ok(refused instanceof Error || typeof refused === 'string', 'a skin scope with no skin chroma must be refused, never silently applied to the whole photo');
  assert.doesNotMatch(String(refused && refused.message || refused), /NaN/, 'a refusal must report a measured percentage, never NaN');

  await fs.rm(tmp, { recursive: true, force: true });
});

test('skin scope edits inside the measured chroma mask and refuses a chroma-free photo', { skip: !hasMagick }, async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-skin-'));
  const ctx = {
    cwd: tmp,
    cfg: { permissionProfile: 'yolo', maxToolOutputChars: 2_000_000 },
    security: { authorizeShell: async () => ({ allow: true }) },
    agent: { provider: 'tokenharbor', model: 'tokenharbor-fast-pool' }
  };
  const flat = Buffer.alloc(320 * 240 * 3);
  for (let y = 0; y < 240; y += 1) for (let x = 0; x < 320; x += 1) {
    const offset = (y * 320 + x) * 3, value = 90 + ((x >> 3) % 4) * 12 + ((y >> 3) % 3) * 9;
    flat[offset] = value; flat[offset + 1] = value; flat[offset + 2] = value;
  }
  const build = async (name, raw) => {
    const source = path.join(tmp, `${name}.rgb`), file = path.join(tmp, `${name}.png`);
    await fs.writeFile(source, raw);
    const gen = spawnSync(command, ['-size', '320x240', '-depth', '8', `rgb:${source}`, file], { timeout: 60_000 });
    assert.equal(gen.status, 0, `sample generation failed: ${gen.stderr}`);
    return file;
  };

  // a near-monochrome photo must be refused with an honest measured reason, never a broken pipeline
  const grey = await build('grey', flat);
  const refusal = await photoEditorTool.execute({ action: 'supreme_edit', input: grey, output: path.join(tmp, 'grey-out.jpg'), editScope: 'skin', vibrance: 60 }, ctx).catch(error => error);
  assert.ok(refusal instanceof Error || typeof refusal === 'string', 'a chroma-free photo must not silently receive a whole-frame skin grade');
  const message = String((refusal && refusal.message) || refusal);
  assert.match(message, /skin mask|chroma|mask/i, `the refusal must explain the chroma limitation, got: ${message.slice(0, 240)}`);
  assert.doesNotMatch(message, /unable to open image|No such file|photo render failed/i, 'the refusal must be a measured decision, not a broken pipeline');

  // a photo that really carries warm skin chroma must edit inside the mask and preserve the rest
  const warm = await build('warm', gradientFrame(320, 240));
  const scoped = JSON.parse(await photoEditorTool.execute({
    action: 'supreme_edit', input: warm, output: path.join(tmp, 'warm-skin.jpg'),
    editScope: 'skin', vibrance: 70, saturation: 60, skinToneProtection: 0, maskFeather: 4
  }, ctx));
  assert.ok(scoped.ok, 'a real skin-chroma photo must accept the skin scope');
  assert.match(scoped.selection.source, /chroma/, 'the selection must report the measured chroma source');
  assert.ok(scoped.selection.coverage > 0.002 && scoped.selection.coverage < 0.75, 'the skin mask must stay a region, not the whole frame');
  assert.ok(scoped.selectionVerification.passed, `the scoped render must clear the selection gate: ${JSON.stringify(scoped.selectionVerification)}`);
  assert.ok(scoped.selectionVerification.insideMean > scoped.selectionVerification.outsideMean * 4,
    `the edit must live inside the mask (inside ${scoped.selectionVerification.insideMean} vs outside ${scoped.selectionVerification.outsideMean})`);
  assert.equal(scoped.metadata.width, 320, 'a scoped edit must keep the original dimensions');

  await fs.rm(tmp, { recursive: true, force: true });
});
