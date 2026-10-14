import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { photoEditorTool } from '../src/tools/media/photo-editor.js';
import { buildPhotoAdvice } from '../src/tools/media/photo-advisor.js';
import { listPhotoEffectPresets, photoEffectPack, resolvePhotoEffectPreset } from '../src/tools/media/photo-effects.js';

test('photo_editor tool exports Polish actions, presets and edit scopes', () => {
  const actions = photoEditorTool.parameters.properties.action.enum;
  assert.ok(actions.includes('auto_edit'), 'action auto_edit must be registered');
  assert.ok(actions.includes('adjust_light'), 'action adjust_light must be registered');
  assert.ok(actions.includes('adjust_color'), 'action adjust_color must be registered');
  assert.ok(actions.includes('enhance_details'), 'action enhance_details must be registered');
  assert.ok(actions.includes('denoise'), 'action denoise must be registered');
  assert.ok(actions.includes('watermark'), 'action watermark must be registered');
  assert.ok(actions.includes('list_effects'), 'action list_effects must be registered');

  const presets = photoEditorTool.parameters.properties.photoPreset.enum;
  assert.ok(presets.includes('blackcore-dark'), 'photoPreset blackcore-dark must be registered');
  assert.ok(presets.includes('cinematic-balanced'), 'photoPreset cinematic-balanced must be registered');
  assert.ok(presets.includes('warm-vintage'), 'photoPreset warm-vintage must be registered');
  assert.ok(presets.includes('social-pop'), 'photoPreset social-pop must be registered');
  assert.ok(presets.includes('mono-noir'), 'photoPreset mono-noir must be registered');
  assert.ok(presets.includes('studio-neutral'), 'photoPreset studio-neutral must be registered');

  const scopes = photoEditorTool.parameters.properties.editScope.enum;
  assert.ok(scopes.includes('full'), 'editScope full must be registered');
  assert.ok(scopes.includes('subject'), 'editScope subject must be registered');
  assert.ok(scopes.includes('background'), 'editScope background must be registered');
  assert.ok(scopes.includes('detail'), 'editScope detail must be registered');
  assert.ok(scopes.includes('mask'), 'editScope mask must be registered');
});

test('photo-effects exports Polish preset catalog and resolution', () => {
  const presets = listPhotoEffectPresets();
  assert.ok(presets.length >= 7, 'catalog should have at least 7 photo presets');
  
  const blackcore = resolvePhotoEffectPreset('blackcore');
  assert.ok(blackcore, 'alias blackcore should resolve');
  assert.equal(blackcore.id, 'blackcore-dark');

  const vintage = resolvePhotoEffectPreset('vintage');
  assert.ok(vintage, 'alias vintage should resolve');
  assert.equal(vintage.id, 'warm-vintage');

  const pack = photoEffectPack();
  assert.equal(pack.id, 'blackcore-photo-studio');
  assert.ok(pack.presets.length >= 7);
});

test('photo advisor builds complete Polish diagnostic and preset menu', () => {
  const mockAnalysis = {
    light: { exposure: 'underexposed', stdDev: 12, p05: 10, p95: 180, shadowClipRatio: 0.2, highlightClipRatio: 0.01 },
    color: { meanSaturation: 0.15, cast: { red: 0.08, green: 0.01, blue: -0.02 } },
    detail: { noiseScore: 0.15, level: 'soft', laplacianVariance: 25 },
    environment: { primary: 'sky', tags: ['sky'], confidence: 0.85 },
    focus: { x: 0.5, y: 0.5, confidence: 0.9 }
  };
  const mockMetadata = { width: 1920, height: 1080, format: 'JPEG' };
  const mockCapabilities = { automaticSubjectBackground: true, namedDetail: false, rembgInstalled: true };

  const advice = buildPhotoAdvice(mockAnalysis, mockMetadata, mockCapabilities);
  assert.ok(advice.findings.length > 0, 'advice should generate diagnostic findings');
  assert.ok(advice.suggestedChanges.length > 0, 'advice should generate suggested changes');
  assert.ok(advice.presets.length > 0, 'advice should contain preset options');
  
  const cinematic = advice.presets.find(p => p.id === 'cinematic-full');
  assert.ok(cinematic, 'cinematic-full preset must exist in advisor output');
  assert.equal(cinematic.arguments.visualStyle, 'cinematic');
});

test('real ImageMagick rendering of Polish photo operations: adjust_light, adjust_color, auto_edit', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-polish-test-'));
  const testInput = path.join(tmp, 'sample.jpg');
  try {
    const cmd = spawnSync('magick', ['-version']).status === 0 ? 'magick' : 'convert';
    const gen = spawnSync(cmd, [
      '-size', '320x240',
      'xc:gray',
      '-sparse-color', 'Barycentric', '0,0 black 320,240 white',
      testInput
    ], { timeout: 30000 });
    assert.equal(gen.status, 0, `failed to generate sample photo: ${gen.stderr}`);

    const ctx = {
      cwd: tmp,
      cfg: { permissionProfile: 'yolo', maxToolOutputChars: 1000000 },
      security: { authorizeShell: async () => ({ allow: true }) },
      agent: { provider: 'google', model: 'google-free-pool' }
    };

    // 1. Adjust Light
    const lightOut = path.join(tmp, 'light.jpg');
    const lightRes = JSON.parse(await photoEditorTool.execute({
      action: 'adjust_light',
      input: testInput,
      output: lightOut,
      brightness: 10,
      contrast: 15,
      editScope: 'full'
    }, ctx));
    assert.ok(lightRes.ok, 'adjust_light should succeed');
    const lightStat = await fs.stat(lightOut);
    assert.ok(lightStat.size > 500, 'light output should not be empty');

    // 2. Adjust Color
    const colorOut = path.join(tmp, 'color.jpg');
    const colorRes = JSON.parse(await photoEditorTool.execute({
      action: 'adjust_color',
      input: testInput,
      output: colorOut,
      saturation: 20,
      temperature: 0.2,
      editScope: 'full'
    }, ctx));
    assert.ok(colorRes.ok, 'adjust_color should succeed');
    const colorStat = await fs.stat(colorOut);
    assert.ok(colorStat.size > 500, 'color output should not be empty');

    // 3. Auto Edit with Preset
    const autoOut = path.join(tmp, 'auto_cinematic.jpg');
    const autoRes = JSON.parse(await photoEditorTool.execute({
      action: 'auto_edit',
      request: 'faz uma edição cinematográfica',
      input: testInput,
      output: autoOut,
      photoPreset: 'cinematic-balanced',
      editLevel: 'high',
      editScope: 'full'
    }, ctx));
    assert.ok(autoRes.ok, 'auto_edit with preset should succeed');
    const autoStat = await fs.stat(autoOut);
    assert.ok(autoStat.size > 500, 'auto_edit output should not be empty');
    assert.ok(autoRes.verification.changed, 'auto_edit should produce measurable pixel change');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
