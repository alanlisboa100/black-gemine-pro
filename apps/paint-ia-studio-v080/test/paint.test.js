import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const testOut = path.join(projectRoot, 'runtime', 'test-output');
process.env.BLACK_PAINT_OUTPUT_DIR = testOut;
process.env.BLACKCORE_MEMORY_DIR = path.join(testOut, 'memory');

const { server } = await import('../server.js');
const PORT = 3399;

function request(method, route, payload = null) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const req = http.request({
      hostname: '127.0.0.1', port: PORT, path: route, method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data = raw;
        if ((res.headers['content-type'] || '').includes('application/json')) {
          try { data = JSON.parse(raw); } catch { /* keep raw */ }
        }
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

before(async () => {
  fs.mkdirSync(testOut, { recursive: true });
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
});

after(async () => {
  if (server.listening) await new Promise(resolve => server.close(resolve));
  fs.rmSync(testOut, { recursive: true, force: true });
});

test('arquivos essenciais e arquitetura integrada existem', () => {
  const required = [
    'index.html', 'style.css', 'app.js', 'brushes.js', 'filters.js', 'server.js',
    'package.json', 'engine_cli.py', 'presets.json',
    'blackcore_visual/renderer.py', 'blackcore_visual/agents/director.py',
    'blackcore_visual/agents/stroke.py', 'blackcore_visual/agents/critic.py',
    'blackcore_visual/builders/character.py', 'blackcore_visual/builders/environment.py',
    'blackcore_visual/agents/photo_analyzer.py', 'blackcore_visual/agents/photo_editor.py',
    'blackcore_visual/agents/enhancement.py', 'blackcore_visual/memory/visual_memory.py',
    'blackcore_visual/scenarios.py', 'blackcore_visual/builders/scenario.py',
    'blackcore_visual/builders/misuki.py', 'blackcore_visual/agents/stage_critic.py',
    'blackcore_visual/paint_program.py', 'runtime/misuki_core/MISUKI_RUNTIME_MEMORY_V4.json'
  ];
  for (const file of required) assert.ok(fs.existsSync(path.join(projectRoot, file)), `ausente: ${file}`);
});

test('status expõe versão e engine', async () => {
  const r = await request('GET', '/api/status');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.version, '0.8.0');
  assert.match(r.data.engine, /Visual.*Photo Engine/);
});

test('presets A-F são servidos pela API', async () => {
  const r = await request('GET', '/api/presets');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  const codes = Object.values(r.data.presets).map(p => p.code).sort();
  assert.deepEqual(codes, ['A','B','C','D','E','F']);
  assert.equal(typeof r.data.presets.gothic_pastel_fusion.line_weight, 'number');
});

test('index contém controles do engine de 3 agentes', async () => {
  const r = await request('GET', '/');
  assert.equal(r.status, 200);
  assert.match(r.data, /Gerar com 3 Agentes/);
  assert.match(r.data, /btn-analyze/);
  assert.doesNotMatch(r.data, /fonts\.googleapis\.com/);
  assert.match(r.data, /SMART PHOTO EDITOR/);
  assert.match(r.data, /btn-photo-auto/);
  assert.match(r.data, /scenario-selector/);
  assert.match(r.data, /gothic_bedroom/);
});

test('bloqueia traversal de arquivo estático', async () => {
  const r = await request('GET', '/%2e%2e/%2e%2e/etc/passwd');
  assert.ok([403, 404].includes(r.status));
  assert.doesNotMatch(String(r.data), /root:x:/);
});

test('engine Python gera imagem e retorna relatório do Critic', async () => {
  const r = await request('POST', '/api/generate', {
    prompt: 'garota gótica anime com cabelo longo e chifres',
    preset: 'D', mode: 'character', seed: 777,
    width: 256, height: 256, detail_level: 0.55
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.scene.seed, 777);
  assert.equal(r.data.scene.mode, 'character');
  assert.equal(typeof r.data.critic.technical_score, 'number');
  assert.match(r.data.imageBase64, /^data:image\/png;base64,/);
});


test('Visual Memory status está conectado', async () => {
  const r = await request('GET', '/api/memory/status');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(typeof r.data.memory.photo_policy, 'object');
});


test('Smart Photo Editor analisa e melhora imagem local', async () => {
  const png = fs.readFileSync(path.join(projectRoot, 'test', 'fixtures', 'dark_photo.png'));
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  const a = await request('POST', '/api/photo/analyze', { imageBase64: dataUrl });
  assert.equal(a.status, 200);
  assert.equal(a.data.ok, true);
  assert.equal(typeof a.data.analysis.technical_score, 'number');

  const e = await request('POST', '/api/photo/enhance', {
    imageBase64: dataUrl, profile: 'auto', strength: 1.0, filename: 'test_photo_enhanced.png'
  });
  assert.equal(e.status, 200);
  assert.equal(e.data.ok, true);
  assert.match(e.data.imageBase64, /^data:image\/png;base64,/);
  assert.equal(typeof e.data.quality_delta, 'number');
  assert.ok(e.data.event_id);
});


test('API transmite cenário, checkpoints e gate de exportação', async () => {
  const r = await request('POST', '/api/generate', {
    prompt: 'Misuki no quarto gótico com janela e velas',
    character_profile: 'misuki', preset: 'D', mode: 'character', seed: 880,
    scenario: 'gothic_bedroom', scene_strength: 0.7, scene_enabled: true,
    save_stages: false, width: 256, height: 256, detail_level: 0.65
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.scene.scenario, 'gothic_bedroom');
  assert.equal(r.data.scenario_plan.scenario.id, 'gothic_bedroom');
  assert.equal(typeof r.data.export_blocked, 'boolean');
  assert.ok(Array.isArray(r.data.checkpoints));
  assert.ok(r.data.paint_program.operation_count >= 45);
  assert.ok(r.data.paint_program.scene_operation_count >= 12);
  assert.ok(r.data.paint_program.total_operation_count >= 60);
});
