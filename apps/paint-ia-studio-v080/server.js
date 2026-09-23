/**
 * Black Paint Studio local server — v0.8.0 scene-aware checkpoint core + smart photo engine.
 *
 * Security defaults:
 * - binds to 127.0.0.1 unless HOST is explicitly set;
 * - validates static paths;
 * - caps JSON/body sizes;
 * - never shells user-controlled strings;
 * - Python visual engine is isolated behind explicit API endpoints.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number.parseInt(process.env.PORT || '3333', 10);
const HOST = process.env.HOST || '127.0.0.1';
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const ENGINE_PATH = path.join(__dirname, 'engine_cli.py');
const PRESETS_PATH = path.join(__dirname, 'presets.json');
const VERSION = '0.8.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('payload muito grande'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req, maxBytes) {
  const raw = await readBody(req, maxBytes);
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw Object.assign(new Error('JSON inválido'), { statusCode: 400 });
  }
}

function safeFilename(name, fallback = `black_paint_${Date.now()}.png`) {
  const base = String(name || fallback).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
  return base || fallback;
}

function getTargetGalleryDir() {
  const configured = process.env.BLACK_PAINT_OUTPUT_DIR;
  const candidates = [configured, '/storage/emulated/0/Download', path.join(__dirname, 'gallery')].filter(Boolean);
  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch {
      // Try next location.
    }
  }
  const fallback = path.join(__dirname, 'gallery');
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

function mediaScan(filePath) {
  execFile('termux-media-scan', [filePath], () => {});
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(dataUrl || ''));
  if (!match) throw Object.assign(new Error('imagem base64 inválida'), { statusCode: 400 });
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function runEngine(payload, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [ENGINE_PATH], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(Object.assign(new Error('engine timeout'), { statusCode: 504 }));
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdoutBytes += chunk.length;
      if (stdoutBytes < 2 * 1024 * 1024) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      if (stderr.length < 64 * 1024) stderr += chunk.toString('utf8');
    });
    child.on('error', err => {
      clearTimeout(timer);
      reject(Object.assign(new Error(`não foi possível iniciar ${PYTHON_BIN}: ${err.message}`), { statusCode: 500 }));
    });
    child.on('close', code => {
      clearTimeout(timer);
      let parsed;
      try {
        const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) || '{}';
        parsed = JSON.parse(line);
      } catch {
        return reject(Object.assign(new Error(`resposta inválida do engine. ${stderr || stdout.slice(-500)}`), { statusCode: 500 }));
      }
      if (code !== 0 || !parsed.ok) {
        return reject(Object.assign(new Error(parsed.error || stderr || `engine saiu com código ${code}`), { statusCode: 500 }));
      }
      resolve(parsed);
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/status' && req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      name: 'Black Paint Studio',
      version: VERSION,
      engine: 'Black Core Visual + Smart Photo Engine',
      python: PYTHON_BIN,
      host: HOST,
      port: PORT
    });
  }

  if (pathname === '/api/presets' && req.method === 'GET') {
    const presets = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));
    return json(res, 200, { ok: true, ...presets });
  }

  if (pathname === '/api/generate' && req.method === 'POST') {
    const body = await readJson(req, 256 * 1024);
    const outputDir = getTargetGalleryDir();
    const result = await runEngine({
      action: 'generate',
      prompt: String(body.prompt || '').slice(0, 4000),
      preset: body.preset || 'D',
      mode: body.mode || 'auto',
      width: Math.max(256, Math.min(Number(body.width) || 1024, 2048)),
      height: Math.max(256, Math.min(Number(body.height) || 1024, 2048)),
      seed: body.seed ?? null,
      detail_level: body.detail_level ?? 0.8,
      asymmetry: body.asymmetry ?? null,
      scenario: String(body.scenario || 'auto').slice(0, 64),
      scene_strength: Math.max(0, Math.min(Number(body.scene_strength ?? 0.65), 1)),
      scene_enabled: body.scene_enabled !== false,
      save_stages: body.save_stages !== false,
      character_profile: String(body.character_profile || 'auto').slice(0, 64),
      auto_refine: body.auto_refine !== false,
      output_dir: outputDir,
      filename: safeFilename(body.filename, `blackcore_${Date.now()}.png`)
    });

    const generatedPath = path.resolve(result.path);
    const allowedDir = path.resolve(outputDir);
    if (!(generatedPath === allowedDir || generatedPath.startsWith(allowedDir + path.sep))) {
      throw Object.assign(new Error('engine retornou caminho fora do diretório permitido'), { statusCode: 500 });
    }
    const imageBuffer = fs.readFileSync(generatedPath);
    mediaScan(generatedPath);
    return json(res, 200, {
      ok: true,
      path: generatedPath,
      scene: result.scene,
      critic: result.critic,
      fidelity: result.fidelity || null,
      checkpoints: result.checkpoints || [],
      stage_paths: result.stage_paths || [],
      telemetry: result.telemetry || null,
      scenario_plan: result.scenario_plan || null,
      scenario_telemetry: result.scenario_telemetry || null,
      export_blocked: Boolean(result.export_blocked),
      blocked_at: result.blocked_at || null,
      paint_program_path: result.paint_program_path || null,
      paint_program: result.paint_program || null,
      engine_version: result.engine_version,
      imageBase64: `data:image/png;base64,${imageBuffer.toString('base64')}`
    });
  }

  if (pathname === '/api/analyze' && req.method === 'POST') {
    const body = await readJson(req, 16 * 1024 * 1024);
    if (!body.imageBase64) throw Object.assign(new Error('imageBase64 ausente'), { statusCode: 400 });
    const result = await runEngine({ action: 'analyze', imageBase64: body.imageBase64, mode: body.mode || 'character' }, 60000);
    return json(res, 200, result);
  }

  if (pathname === '/api/photo/analyze' && req.method === 'POST') {
    const body = await readJson(req, 24 * 1024 * 1024);
    if (!body.imageBase64) throw Object.assign(new Error('imageBase64 ausente'), { statusCode: 400 });
    const result = await runEngine({ action: 'photo_analyze', imageBase64: body.imageBase64 }, 60000);
    return json(res, 200, result);
  }

  if (pathname === '/api/photo/enhance' && req.method === 'POST') {
    const body = await readJson(req, 24 * 1024 * 1024);
    if (!body.imageBase64) throw Object.assign(new Error('imageBase64 ausente'), { statusCode: 400 });
    const outputDir = getTargetGalleryDir();
    const filename = safeFilename(body.filename, `blackcore_photo_${Date.now()}.png`);
    const result = await runEngine({
      action: 'photo_enhance',
      imageBase64: body.imageBase64,
      profile: String(body.profile || 'auto').slice(0, 32),
      strength: Math.max(0.35, Math.min(Number(body.strength) || 1.0, 1.5)),
      output_dir: outputDir,
      filename
    }, 120000);
    const enhancedPath = path.resolve(result.path);
    const allowedDir = path.resolve(outputDir);
    if (!(enhancedPath === allowedDir || enhancedPath.startsWith(allowedDir + path.sep))) {
      throw Object.assign(new Error('engine retornou caminho fora do diretório permitido'), { statusCode: 500 });
    }
    const imageBuffer = fs.readFileSync(enhancedPath);
    mediaScan(enhancedPath);
    return json(res, 200, {
      ...result,
      ok: true,
      imageBase64: `data:image/png;base64,${imageBuffer.toString('base64')}`
    });
  }

  if (pathname === '/api/misuki/status' && req.method === 'GET') {
    const result = await runEngine({ action: 'memory_status' }, 30000);
    return json(res, 200, {
      ok: true,
      engine_version: result.memory?.misuki_spec_loaded ? VERSION : VERSION,
      spec_loaded: Boolean(result.memory?.misuki_spec_loaded),
      spec_source: result.memory?.misuki_spec_source || null,
      pipeline: 'P01-P14 hard checkpoint core + S01-S08 scene core',
      fidelity_mode: 'structural_geometry_proxy'
    });
  }

  if (pathname === '/api/memory/status' && req.method === 'GET') {
    const result = await runEngine({ action: 'memory_status' }, 30000);
    return json(res, 200, result);
  }

  if (pathname === '/api/memory/feedback' && req.method === 'POST') {
    const body = await readJson(req, 64 * 1024);
    if (!body.event_id) throw Object.assign(new Error('event_id ausente'), { statusCode: 400 });
    const rating = Number(body.rating) > 0 ? 1 : Number(body.rating) < 0 ? -1 : 0;
    const result = await runEngine({ action: 'memory_feedback', event_id: String(body.event_id).slice(0, 128), rating }, 30000);
    return json(res, 200, result);
  }

  if (pathname === '/api/save' && req.method === 'POST') {
    const body = await readJson(req, 28 * 1024 * 1024);
    const { buffer } = parseDataUrl(body.imageBase64);
    if (buffer.length > 20 * 1024 * 1024) throw Object.assign(new Error('imagem excede 20 MB'), { statusCode: 413 });
    if (buffer.length < 32) throw Object.assign(new Error('imagem vazia ou inválida'), { statusCode: 400 });

    const outDir = getTargetGalleryDir();
    const filename = safeFilename(body.filename);
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, buffer);
    mediaScan(outPath);
    return json(res, 200, { ok: true, filename, path: outPath, sizeBytes: buffer.length });
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${PORT}`;
    const url = new URL(req.url || '/', `http://${host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') return json(res, 204, {});
      const handled = await handleApi(req, res, pathname);
      if (handled !== false) return;
      return json(res, 404, { ok: false, error: 'endpoint não encontrado' });
    }

    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(__dirname, relative);
    const root = path.resolve(__dirname);
    if (!(filePath === root || filePath.startsWith(root + path.sep))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 - Caminho inválido');
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        const status = err.code === 'ENOENT' ? 404 : 500;
        res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
        return res.end(status === 404 ? '404 - Arquivo não encontrado' : '500 - Erro interno');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      res.end(content);
    });
  } catch (err) {
    if (!res.headersSent) json(res, err.statusCode || 500, { ok: false, error: err.message || 'erro interno' });
    else res.end();
  }
});

export { server, PORT, HOST, runEngine };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`\n🖤 BLACK PAINT STUDIO v${VERSION}`);
    console.log(`👉 http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
    if (HOST === '127.0.0.1') console.log('🔒 Modo local seguro. Para LAN: HOST=0.0.0.0 node server.js');
    console.log('🧠 Visual Engine: Director → Builder/Stroke → Critic | Photo: Analyzer → Editor → Enhancement → Memory\n');
  });
}
