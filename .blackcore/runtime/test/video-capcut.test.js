import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {videoEditorTool} from '../src/tools/media/video-editor.js';
import {buildVideoAdvice} from '../src/tools/media/video-advisor.js';
import {listVideoEffectPacks} from '../src/tools/media/video-effects.js';

test('video_editor tool exports CapCut actions, transitions and style properties', () => {
  const actions = videoEditorTool.parameters.properties.action.enum;
  assert.ok(actions.includes('speed_curve'), 'action speed_curve must be registered');
  assert.ok(actions.includes('freeze_frame'), 'action freeze_frame must be registered');
  assert.ok(actions.includes('shake'), 'action shake must be registered');
  assert.ok(actions.includes('flash'), 'action flash must be registered');
  assert.ok(actions.includes('rgb_split'), 'action rgb_split must be registered');
  assert.ok(actions.includes('blur_in'), 'action blur_in must be registered');

  const transitions = videoEditorTool.parameters.properties.transition.enum;
  assert.ok(transitions.includes('fadewhite'), 'transition fadewhite must be registered');
  assert.ok(transitions.includes('whiteflash'), 'transition whiteflash must be registered');
  assert.ok(transitions.includes('fadefast'), 'transition fadefast must be registered');
  assert.ok(transitions.includes('hblur'), 'transition hblur must be registered');
  assert.ok(transitions.includes('pixelize'), 'transition pixelize must be registered');
  assert.ok(transitions.includes('zoomout'), 'transition zoomout must be registered');

  const styles = videoEditorTool.parameters.properties.style.enum;
  assert.ok(styles.includes('capcut'), 'style capcut must be registered');

  const captionStyles = videoEditorTool.parameters.properties.captionStyle.enum;
  assert.ok(captionStyles.includes('capcut'), 'captionStyle capcut must be registered');
  assert.ok(captionStyles.includes('tiktok'), 'captionStyle tiktok must be registered');

  const colorGrades = videoEditorTool.parameters.properties.colorGrade.enum;
  assert.ok(colorGrades.includes('capcut-teal-orange'), 'colorGrade capcut-teal-orange must be registered');
  assert.ok(colorGrades.includes('capcut-vibrant'), 'colorGrade capcut-vibrant must be registered');
});

test('video advisor presents capcut-viral preset', () => {
  const advice = buildVideoAdvice({
    summary: {duration: 15, video: {width: 1920, height: 1080}, audio: {channels: 2}},
    analysis: {silences: [], blackFrames: [], sceneTimes: [3, 7, 11]},
    capabilities: {}
  });
  const capcutPreset = advice.presets.find(p => p.id === 'capcut-viral');
  assert.ok(capcutPreset, 'preset capcut-viral should exist');
  assert.equal(capcutPreset.arguments.style, 'capcut');
  assert.equal(capcutPreset.arguments.colorGrade, 'capcut-teal-orange');
  assert.equal(capcutPreset.arguments.captionStyle, 'capcut');
});

test('blackcore-premium-lite pack lists CapCut transition additions', async () => {
  const packs = await listVideoEffectPacks();
  const lite = packs.find(p => p.name === 'blackcore-premium-lite');
  assert.ok(lite, 'pack blackcore-premium-lite must be present');
  const transIds = lite.transitions.map(t => t.id);
  assert.ok(transIds.includes('fadewhite'), 'fadewhite transition in pack');
  assert.ok(transIds.includes('hblur'), 'hblur transition in pack');
  assert.ok(transIds.includes('pixelize'), 'pixelize transition in pack');
  assert.ok(transIds.includes('zoomout'), 'zoomout transition in pack');
});

test('real FFmpeg rendering of CapCut features: flash, shake, rgb_split, blur_in, speed_curve, freeze_frame', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'capcut-test-'));
  const testInput = path.join(tmp, 'sample.mp4');
  try {
    // Gera vídeo sintético de 1.5s com padrão de teste e tom de áudio
    const gen = spawnSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', 'testsrc=duration=1.5:size=320x240:rate=25',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac',
      testInput
    ], {timeout: 30000});
    assert.equal(gen.status, 0, `failed to generate sample video: ${gen.stderr}`);

    const ctx = {
      cwd: tmp,
      cfg: { permissionProfile: 'yolo', maxToolOutputChars: 1000000 },
      security: { authorizeShell: async () => ({ allow: true }) },
      agent: { provider: 'google', model: 'google-free-pool' }
    };

    // 1. Flash
    const flashOut = path.join(tmp, 'flash.mp4');
    const flashRes = JSON.parse(await videoEditorTool.execute({
      action: 'flash',
      input: testInput,
      output: flashOut,
      duration: 0.2
    }, ctx));
    assert.ok(flashRes.ok, 'flash action should succeed');
    const flashStat = await fs.stat(flashOut);
    assert.ok(flashStat.size > 1000, 'flash output file should not be empty');

    // 2. Shake
    const shakeOut = path.join(tmp, 'shake.mp4');
    const shakeRes = JSON.parse(await videoEditorTool.execute({
      action: 'shake',
      input: testInput,
      output: shakeOut,
      shakeIntensity: 3,
      shakeFrequency: 15
    }, ctx));
    assert.ok(shakeRes.ok, 'shake action should succeed');
    const shakeStat = await fs.stat(shakeOut);
    assert.ok(shakeStat.size > 1000, 'shake output file should not be empty');

    // 3. RGB Split
    const rgbOut = path.join(tmp, 'rgb.mp4');
    const rgbRes = JSON.parse(await videoEditorTool.execute({
      action: 'rgb_split',
      input: testInput,
      output: rgbOut,
      rgbSplitOffset: 6
    }, ctx));
    assert.ok(rgbRes.ok, 'rgb_split action should succeed');
    const rgbStat = await fs.stat(rgbOut);
    assert.ok(rgbStat.size > 1000, 'rgb_split output file should not be empty');

    // 4. Blur In
    const blurOut = path.join(tmp, 'blur.mp4');
    const blurRes = JSON.parse(await videoEditorTool.execute({
      action: 'blur_in',
      input: testInput,
      output: blurOut,
      blurDuration: 0.5,
      blurRadius: 16
    }, ctx));
    assert.ok(blurRes.ok, 'blur_in action should succeed');
    const blurStat = await fs.stat(blurOut);
    assert.ok(blurStat.size > 1000, 'blur_in output file should not be empty');

    // 5. Speed Curve
    const curveOut = path.join(tmp, 'curve.mp4');
    const curveRes = JSON.parse(await videoEditorTool.execute({
      action: 'speed_curve',
      input: testInput,
      output: curveOut,
      curvePreset: 'hero'
    }, ctx));
    assert.ok(curveRes.ok, 'speed_curve action should succeed');
    const curveStat = await fs.stat(curveOut);
    assert.ok(curveStat.size > 1000, 'speed_curve output file should not be empty');

    // 6. Freeze Frame
    const freezeOut = path.join(tmp, 'freeze.mp4');
    const freezeRes = JSON.parse(await videoEditorTool.execute({
      action: 'freeze_frame',
      input: testInput,
      output: freezeOut,
      time: 0.5,
      freezeDuration: 0.5
    }, ctx));
    assert.ok(freezeRes.ok, 'freeze_frame action should succeed');
    const freezeStat = await fs.stat(freezeOut);
    assert.ok(freezeStat.size > 1000, 'freeze_frame output file should not be empty');

    // 7. Auto Edit with style 'capcut'
    const autoCapcutOut = path.join(tmp, 'autocapcut.mp4');
    const autoRes = JSON.parse(await videoEditorTool.execute({
      action: 'auto_edit',
      request: 'faz uma edição estilo capcut no vídeo com ritmo e cortes',
      input: testInput,
      output: autoCapcutOut,
      style: 'capcut',
      editLevel: 'basic',
      brandWatermark: false
    }, ctx));
    assert.ok(autoRes.ok, 'auto_edit style capcut should succeed');
    const autoStat = await fs.stat(autoCapcutOut);
    assert.ok(autoStat.size > 1000, 'auto_edit capcut output should exist and not be empty');

  } finally {
    await fs.rm(tmp, {recursive: true, force: true});
  }
});
