/**
 * Black Paint Studio UI controller — v0.8.0
 * Integrates the browser paint surface with the local Python Visual Engine.
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('paint-canvas');
    const overlay = document.getElementById('overlay-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const overlayCtx = overlay.getContext('2d');
    const container = document.querySelector('.canvas-container');
    const engineStatus = document.getElementById('engine-status');
    const photoStatus = document.getElementById('photo-status');

    const state = {
        currentTool: 'brush',
        currentColor: '#00ffcc',
        brushSize: 8,
        glowSize: 15,
        isDrawing: false,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        logicalWidth: 900,
        logicalHeight: 900,
        dpr: 1,
        history: [],
        historyIndex: -1,
        maxHistory: 10,
        restoring: false,
        busy: false,
        photoSourceDataUrl: null,
        lastPhotoEventId: null
    };

    const brushEngine = new BrushEngine(ctx, overlayCtx);

    function setEngineStatus(message, kind = '') {
        engineStatus.textContent = message;
        engineStatus.className = `engine-status ${kind}`.trim();
    }

    function setPhotoStatus(message, kind = '') {
        if (!photoStatus) return;
        photoStatus.textContent = message;
        photoStatus.className = `engine-status ${kind}`.trim();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    }

    function setCtxLogicalTransform() {
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        overlayCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }

    function initCanvas() {
        const rect = container.getBoundingClientRect();
        const size = Math.max(320, Math.min(rect.width - 32, rect.height - 32, 900));
        state.dpr = Math.min(window.devicePixelRatio || 1, 2); // mobile memory protection
        state.logicalWidth = Math.floor(size);
        state.logicalHeight = Math.floor(size);

        canvas.width = Math.floor(size * state.dpr);
        canvas.height = Math.floor(size * state.dpr);
        overlay.width = canvas.width;
        overlay.height = canvas.height;
        canvas.style.width = `${state.logicalWidth}px`;
        canvas.style.height = `${state.logicalHeight}px`;
        overlay.style.width = `${state.logicalWidth}px`;
        overlay.style.height = `${state.logicalHeight}px`;
        setCtxLogicalTransform();

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, state.logicalWidth, state.logicalHeight);
        document.getElementById('res-display').textContent = `${canvas.width} x ${canvas.height}`;
        saveState(true);
    }

    function snapshot() {
        // WebP drastically reduces undo memory compared with raw ImageData; browser may fall back to PNG.
        return canvas.toDataURL('image/webp', 0.88);
    }

    function saveState(force = false) {
        if (state.restoring || (state.busy && !force)) return;
        const data = snapshot();
        if (!force && state.history[state.historyIndex] === data) return;
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }
        state.history.push(data);
        if (state.history.length > state.maxHistory) state.history.shift();
        state.historyIndex = state.history.length - 1;
    }

    async function restoreSnapshot(dataUrl) {
        if (!dataUrl) return;
        state.restoring = true;
        try {
            const img = await loadImage(dataUrl);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setCtxLogicalTransform();
        } finally {
            state.restoring = false;
        }
    }

    async function undo() {
        if (state.historyIndex <= 0 || state.restoring) return;
        state.historyIndex--;
        await restoreSnapshot(state.history[state.historyIndex]);
        state.photoSourceDataUrl = null;
    }

    async function redo() {
        if (state.historyIndex >= state.history.length - 1 || state.restoring) return;
        state.historyIndex++;
        await restoreSnapshot(state.history[state.historyIndex]);
        state.photoSourceDataUrl = null;
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async function drawImageToCanvas(src) {
        const img = await loadImage(src);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (canvas.width - dw) / 2;
        const dy = (canvas.height - dh) / 2;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#05050b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, dx, dy, dw, dh);
        setCtxLogicalTransform();
        saveState(true);
    }

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (state.logicalWidth / rect.width),
            y: (e.clientY - rect.top) * (state.logicalHeight / rect.height)
        };
    }

    function drawStep(x0, y0, x1, y1) {
        switch (state.currentTool) {
            case 'brush': brushEngine.drawBasic(x0, y0, x1, y1, state.currentColor, state.brushSize); break;
            case 'human': brushEngine.drawHuman(x0, y0, x1, y1, state.currentColor, state.brushSize); break;
            case 'ink': brushEngine.drawCalligraphy(x0, y0, x1, y1, state.currentColor, state.brushSize); break;
            case 'smudge': brushEngine.drawSmudge(x0, y0, x1, y1, state.brushSize); break;
            case 'neon': brushEngine.drawNeon(x0, y0, x1, y1, state.currentColor, state.brushSize, state.glowSize); break;
            case 'eraser': brushEngine.drawEraser(x0, y0, x1, y1, state.brushSize); break;
            case 'symmetry': brushEngine.drawSymmetry(x0, y0, x1, y1, state.logicalWidth / 2, state.logicalHeight / 2, state.currentColor, state.brushSize, state.glowSize); break;
        }
    }

    function handlePointerDown(e) {
        if (state.busy) return;
        state.photoSourceDataUrl = null;
        state.isDrawing = true;
        canvas.setPointerCapture?.(e.pointerId);
        const { x, y } = getCanvasCoords(e);
        state.startX = state.lastX = x;
        state.startY = state.lastY = y;

        if (state.currentTool === 'fill') {
            PaintGenerators.floodFill(ctx, x * state.dpr, y * state.dpr, state.currentColor, canvas.width, canvas.height);
            state.isDrawing = false;
            saveState();
            return;
        }
        if (['brush','human','ink','smudge','neon','eraser','symmetry'].includes(state.currentTool)) drawStep(x, y, x + 0.01, y + 0.01);
        else if (state.currentTool === 'matrix') brushEngine.drawMatrix(x, y, state.currentColor, state.brushSize);
        else if (state.currentTool === 'particles') brushEngine.drawParticles(x, y, state.currentColor, state.brushSize);
        else if (state.currentTool === 'spray') brushEngine.drawSpray(x, y, state.currentColor, state.brushSize);
    }

    function handlePointerMove(e) {
        const { x, y } = getCanvasCoords(e);
        document.getElementById('coords-display').textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
        if (!state.isDrawing || state.busy) return;
        e.preventDefault();

        if (['brush','human','ink','smudge','neon','eraser','symmetry'].includes(state.currentTool)) {
            drawStep(state.lastX, state.lastY, x, y);
            state.lastX = x; state.lastY = y;
        } else if (state.currentTool === 'matrix') brushEngine.drawMatrix(x, y, state.currentColor, state.brushSize);
        else if (state.currentTool === 'particles') brushEngine.drawParticles(x, y, state.currentColor, state.brushSize);
        else if (state.currentTool === 'spray') brushEngine.drawSpray(x, y, state.currentColor, state.brushSize);
        else if (['line','rect','circle','star'].includes(state.currentTool)) {
            overlayCtx.clearRect(0, 0, state.logicalWidth, state.logicalHeight);
            brushEngine.drawShape(overlayCtx, state.currentTool, state.startX, state.startY, x, y, state.currentColor, state.brushSize, state.glowSize);
        }
    }

    function handlePointerUp(e) {
        if (!state.isDrawing) return;
        state.isDrawing = false;
        overlayCtx.clearRect(0, 0, state.logicalWidth, state.logicalHeight);
        const { x, y } = getCanvasCoords(e);
        if (['line','rect','circle','star'].includes(state.currentTool)) {
            brushEngine.drawShape(ctx, state.currentTool, state.startX, state.startY, x, y, state.currentColor, state.brushSize, state.glowSize);
        }
        saveState();
    }

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentTool = btn.dataset.tool;
            document.getElementById('active-tool-display').textContent = `FERRAMENTA: ${btn.textContent.trim()}`;
        });
    });

    const sizeInput = document.getElementById('brush-size');
    const glowInput = document.getElementById('glow-size');
    sizeInput.addEventListener('input', e => {
        state.brushSize = Number.parseInt(e.target.value, 10);
        document.getElementById('size-val').textContent = `${state.brushSize}px`;
    });
    glowInput.addEventListener('input', e => {
        state.glowSize = Number.parseInt(e.target.value, 10);
        document.getElementById('glow-val').textContent = state.glowSize;
    });
    document.getElementById('detail-input').addEventListener('input', e => {
        document.getElementById('detail-val').textContent = `${e.target.value}%`;
    });
    document.getElementById('photo-strength')?.addEventListener('input', e => {
        document.getElementById('photo-strength-val').textContent = `${e.target.value}%`;
    });

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            state.currentColor = swatch.dataset.color;
            document.getElementById('color-picker').value = state.currentColor;
        });
    });
    document.getElementById('color-picker').addEventListener('input', e => {
        state.currentColor = e.target.value;
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    });

    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-redo').addEventListener('click', redo);
    document.getElementById('btn-clear').addEventListener('click', () => {
        if (!confirm('Deseja limpar todo o desenho?')) return;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, state.logicalWidth, state.logicalHeight);
        state.photoSourceDataUrl = null;
        state.lastPhotoEventId = null;
        saveState();
    });

    const runLocalGenerator = fn => {
        fn(ctx, state.logicalWidth, state.logicalHeight);
        saveState();
    };
    document.getElementById('btn-gen-city').addEventListener('click', () => runLocalGenerator(PaintGenerators.generateCyberCity));
    document.getElementById('btn-gen-neural').addEventListener('click', () => runLocalGenerator(PaintGenerators.generateNeuralNet));
    document.getElementById('btn-gen-fractal').addEventListener('click', () => runLocalGenerator(PaintGenerators.generateFractal));
    document.getElementById('btn-gen-matrix').addEventListener('click', () => runLocalGenerator(PaintGenerators.generateFullMatrix));

    const sceneStrengthInput = document.getElementById('scene-strength-input');
    const sceneStrengthVal = document.getElementById('scene-strength-val');
    if (sceneStrengthInput && sceneStrengthVal) {
        const refreshSceneStrength = () => { sceneStrengthVal.textContent = `${sceneStrengthInput.value}%`; };
        sceneStrengthInput.addEventListener('input', refreshSceneStrength);
        refreshSceneStrength();
    }

    async function generateWithEngine() {
        if (state.busy) return;
        state.busy = true;
        const button = document.getElementById('btn-gen-pro');
        button.disabled = true;
        setEngineStatus('Director analisando o pedido…', 'busy');
        try {
            const prompt = document.getElementById('ai-prompt').value.trim() || 'garota gótica anime com cabelo longo, chifres e atmosfera cinematográfica';
            const preset = document.getElementById('preset-selector').value;
            const mode = document.getElementById('mode-selector').value;
            const seedRaw = document.getElementById('seed-input').value.trim();
            const detail = Number(document.getElementById('detail-input').value) / 100;
            const scenario = document.getElementById('scenario-selector')?.value || 'auto';
            const sceneStrength = Number(document.getElementById('scene-strength-input')?.value || 65) / 100;
            const requestSize = Math.max(512, Math.min(1024, Math.round(state.logicalWidth * state.dpr)));

            setEngineStatus('Structure/Stroke Agent construindo a imagem…', 'busy');
            const resp = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt, preset, mode,
                    seed: seedRaw === '' ? null : Number(seedRaw),
                    width: requestSize, height: requestSize,
                    detail_level: detail,
                    scenario,
                    scene_strength: sceneStrength,
                    scene_enabled: true,
                    auto_refine: true,
                    save_stages: true
                })
            });
            const result = await resp.json();
            if (!resp.ok || !result.ok) throw new Error(result.error || `HTTP ${resp.status}`);

            setEngineStatus('Critic Agent refinando e validando…', 'busy');
            state.photoSourceDataUrl = null;
            state.lastPhotoEventId = null;
            await drawImageToCanvas(result.imageBase64);
            const warnings = result.critic?.warnings || [];
            const score = result.critic?.technical_score;
            const fidelity = result.fidelity?.score;
            const checkpoints = result.checkpoints || [];
            const failedStages = checkpoints.filter(x => !x.passed);
            const seed = result.scene?.seed;
            const scenarioName = result.scene?.scenario || scenario;
            const fidelityText = fidelity == null ? '' : ` • estrutura ${fidelity}/100`;
            const stageText = checkpoints.length ? ` • ${checkpoints.length} checkpoints${failedStages.length ? ` (${failedStages.length} falha)` : ''}` : '';
            const blockedText = result.export_blocked ? ` • BLOQUEADO em ${result.blocked_at || 'gate estrutural'}` : '';
            const statusIcon = result.export_blocked ? '⛔' : '✅';
            setEngineStatus(`${statusIcon} ${result.scene?.mode || mode} • ${scenarioName} • seed ${seed} • técnico ${score ?? '—'}${fidelityText}${stageText}${blockedText}${warnings.length ? ` • ${warnings.length} alerta(s)` : ''}`, result.export_blocked || failedStages.length ? 'busy' : 'ok');
            document.getElementById('seed-input').value = String(seed ?? '');
        } catch (err) {
            console.error(err);
            setEngineStatus(`Erro: ${err.message}`, 'error');
        } finally {
            state.busy = false;
            button.disabled = false;
        }
    }
    document.getElementById('btn-gen-pro').addEventListener('click', generateWithEngine);

    async function analyzeCanvas() {
        if (state.busy) return;
        state.busy = true;
        setEngineStatus('Critic Agent analisando o canvas…', 'busy');
        try {
            const resp = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: canvas.toDataURL('image/jpeg', 0.88),
                    mode: document.getElementById('mode-selector').value === 'environment' ? 'environment' : 'character'
                })
            });
            const result = await resp.json();
            if (!resp.ok || !result.ok) throw new Error(result.error || `HTTP ${resp.status}`);
            const c = result.critic;
            const warningList = (c.warnings || []).map(w => `<li>${escapeHtml(w)}</li>`).join('') || '<li>Nenhum alerta técnico forte.</li>';
            document.getElementById('modal-title').textContent = '🔎 Critic Agent';
            document.getElementById('modal-body').innerHTML = `
                <p><b>Score técnico:</b> ${escapeHtml(c.technical_score)}</p>
                <p>Luminância: ${escapeHtml(c.luminance)} • Contraste: ${escapeHtml(c.contrast)} • Simetria: ${escapeHtml(c.symmetry)} • Densidade de borda: ${escapeHtml(c.edge_density)}</p>
                <ul>${warningList}</ul>`;
            document.getElementById('modal').classList.remove('hidden');
            setEngineStatus(`Critic concluído • score ${c.technical_score}`, 'ok');
        } catch (err) {
            setEngineStatus(`Erro na análise: ${err.message}`, 'error');
        } finally {
            state.busy = false;
        }
    }
    document.getElementById('btn-analyze').addEventListener('click', analyzeCanvas);

    function currentPhotoDataUrl() {
        return state.photoSourceDataUrl || canvas.toDataURL('image/jpeg', 0.92);
    }

    const photoFile = document.getElementById('photo-file');
    document.getElementById('btn-photo-open')?.addEventListener('click', () => photoFile?.click());
    photoFile?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            setPhotoStatus('Formato não suportado. Use PNG, JPEG ou WebP.', 'error');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setPhotoStatus('Imagem maior que 20 MB.', 'error');
            return;
        }
        setPhotoStatus('Carregando foto…', 'busy');
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            state.photoSourceDataUrl = String(dataUrl);
            state.lastPhotoEventId = null;
            document.getElementById('btn-photo-like').disabled = true;
            document.getElementById('btn-photo-dislike').disabled = true;
            await drawImageToCanvas(state.photoSourceDataUrl);
            // drawImageToCanvas saves history; restore source afterwards because drawing helper is generic.
            state.photoSourceDataUrl = String(dataUrl);
            setPhotoStatus(`Foto aberta: ${file.name} • pronta para análise/auto melhoria`, 'ok');
        } catch (err) {
            setPhotoStatus(`Erro ao abrir foto: ${err.message}`, 'error');
        }
    });

    async function analyzePhoto() {
        if (state.busy) return;
        state.busy = true;
        setPhotoStatus('PhotoAnalyzer medindo luz, contraste, cor, ruído e nitidez…', 'busy');
        try {
            const resp = await fetch('/api/photo/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: currentPhotoDataUrl() })
            });
            const result = await resp.json();
            if (!resp.ok || !result.ok) throw new Error(result.error || `HTTP ${resp.status}`);
            const a = result.analysis;
            const recs = (a.recommendations || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>Nenhuma correção forte necessária.</li>';
            const warns = (a.warnings || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>Sem alertas técnicos fortes.</li>';
            document.getElementById('modal-title').textContent = '🧠 Smart Photo Analyzer';
            document.getElementById('modal-body').innerHTML = `
                <p><b>Score técnico:</b> ${escapeHtml(a.technical_score)}</p>
                <p>Luz: ${escapeHtml(a.luminance)} • Contraste: ${escapeHtml(a.contrast)} • Saturação: ${escapeHtml(a.saturation)}</p>
                <p>Nitidez: ${escapeHtml(a.sharpness)} • Ruído: ${escapeHtml(a.noise)} • Faixa tonal: ${escapeHtml(a.dynamic_range)}</p>
                <p><b>Alertas</b></p><ul>${warns}</ul>
                <p><b>Plano sugerido</b></p><ul>${recs}</ul>`;
            document.getElementById('modal').classList.remove('hidden');
            setPhotoStatus(`Análise concluída • score ${a.technical_score}`, 'ok');
        } catch (err) {
            setPhotoStatus(`Erro na análise: ${err.message}`, 'error');
        } finally {
            state.busy = false;
        }
    }
    document.getElementById('btn-photo-analyze')?.addEventListener('click', analyzePhoto);

    async function autoEnhancePhoto() {
        if (state.busy) return;
        state.busy = true;
        const button = document.getElementById('btn-photo-auto');
        button.disabled = true;
        setPhotoStatus('Analyzer → Editor planejando correções adaptativas…', 'busy');
        try {
            const profile = document.getElementById('photo-profile').value;
            const strength = Number(document.getElementById('photo-strength').value) / 100;
            const resp = await fetch('/api/photo/enhance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: currentPhotoDataUrl(),
                    profile, strength,
                    filename: `blackcore_photo_${Date.now()}.png`
                })
            });
            const result = await resp.json();
            if (!resp.ok || !result.ok) throw new Error(result.error || `HTTP ${resp.status}`);
            setPhotoStatus('Enhancement + Critic validando o resultado…', 'busy');
            await drawImageToCanvas(result.imageBase64);
            state.photoSourceDataUrl = result.imageBase64;
            state.lastPhotoEventId = result.event_id || null;
            document.getElementById('btn-photo-like').disabled = !state.lastPhotoEventId;
            document.getElementById('btn-photo-dislike').disabled = !state.lastPhotoEventId;
            const before = result.before?.technical_score ?? '—';
            const after = result.after?.technical_score ?? '—';
            const delta = Number(result.quality_delta || 0);
            setPhotoStatus(`✅ Auto melhoria concluída • ${before} → ${after} • Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} • memória ${result.plan?.memory_samples ?? 0} amostras`, 'ok');
        } catch (err) {
            console.error(err);
            setPhotoStatus(`Erro no editor inteligente: ${err.message}`, 'error');
        } finally {
            state.busy = false;
            button.disabled = false;
        }
    }
    document.getElementById('btn-photo-auto')?.addEventListener('click', autoEnhancePhoto);

    async function sendPhotoFeedback(rating) {
        if (!state.lastPhotoEventId) return;
        try {
            const resp = await fetch('/api/memory/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: state.lastPhotoEventId, rating })
            });
            const result = await resp.json();
            if (!resp.ok || !result.ok) throw new Error(result.error || `HTTP ${resp.status}`);
            setPhotoStatus(rating > 0 ? '👍 Feedback salvo na Visual Memory.' : '👎 Feedback negativo salvo; essa decisão não será favorecida.', 'ok');
            document.getElementById('btn-photo-like').disabled = true;
            document.getElementById('btn-photo-dislike').disabled = true;
        } catch (err) {
            setPhotoStatus(`Erro ao salvar feedback: ${err.message}`, 'error');
        }
    }
    document.getElementById('btn-photo-like')?.addEventListener('click', () => sendPhotoFeedback(1));
    document.getElementById('btn-photo-dislike')?.addEventListener('click', () => sendPhotoFeedback(-1));

    document.getElementById('btn-memory-status')?.addEventListener('click', async () => {
        try {
            const resp = await fetch('/api/memory/status');
            const result = await resp.json();
            if (!resp.ok || !result.ok) throw new Error(result.error || `HTTP ${resp.status}`);
            const m = result.memory;
            document.getElementById('modal-title').textContent = '🧠 Visual Memory';
            document.getElementById('modal-body').innerHTML = `
                <p>Eventos: <b>${escapeHtml(m.events)}</b></p>
                <p>Gerações: ${escapeHtml(m.generations)} • Edições de foto: ${escapeHtml(m.photo_edits)} • Edições técnicas positivas: ${escapeHtml(m.successful_photo_edits)}</p>
                <pre>${escapeHtml(JSON.stringify(m.photo_policy, null, 2))}</pre>
                <p><small>A memória é adaptativa e transparente: guarda decisões e resultados; não modifica o próprio código.</small></p>`;
            document.getElementById('modal').classList.remove('hidden');
        } catch (err) {
            setPhotoStatus(`Erro ao ler memória: ${err.message}`, 'error');
        }
    });

    document.getElementById('btn-save-phone').addEventListener('click', async () => {
        const dataUrl = canvas.toDataURL('image/png');
        const filename = `black_paint_${Date.now()}.png`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        try {
            const resp = await fetch('/api/save', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, imageBase64: dataUrl })
            });
            const result = await resp.json();
            if (result.ok) setEngineStatus(`Imagem salva: ${result.path}`, 'ok');
        } catch {
            setEngineStatus('Download do navegador concluído.', 'ok');
        }
    });

    document.getElementById('btn-export-bn').addEventListener('click', () => {
        const sampleW = 24, sampleH = 12;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = sampleW; offCanvas.height = sampleH;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
        const data = offCtx.getImageData(0, 0, sampleW, sampleH).data;
        const matrix = [];
        for (let y = 0; y < sampleH; y++) {
            const row = [];
            for (let x = 0; x < sampleW; x++) {
                const i = (y * sampleW + x) * 4;
                row.push([data[i], data[i+1], data[i+2], data[i+3]]);
            }
            matrix.push(row);
        }
        document.getElementById('modal-title').textContent = '⚡ Black Numbers Vision Feed';
        document.getElementById('modal-body').innerHTML = `<p>Matriz RGBA [${sampleW}x${sampleH}] gerada.</p><pre>${escapeHtml(JSON.stringify(matrix.slice(0,3), null, 2))}\n... [mais ${sampleH-3} linhas]</pre>`;
        document.getElementById('modal').classList.remove('hidden');
    });

    document.getElementById('modal-close').addEventListener('click', () => document.getElementById('modal').classList.add('hidden'));

    window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
    });

    async function bootstrap() {
        initCanvas();
        try {
            const [statusResp, presetsResp] = await Promise.all([fetch('/api/status'), fetch('/api/presets')]);
            const status = await statusResp.json();
            const presetData = await presetsResp.json();
            if (presetData.ok && presetData.presets) {
                const selector = document.getElementById('preset-selector');
                const current = selector.value || 'D';
                selector.innerHTML = '';
                Object.values(presetData.presets)
                    .sort((a, b) => String(a.code).localeCompare(String(b.code)))
                    .forEach(preset => {
                        const option = document.createElement('option');
                        option.value = preset.code;
                        option.textContent = `${preset.code} — ${preset.label.replace(/^Versão [A-F] — /, '')}`;
                        option.title = preset.description || '';
                        selector.appendChild(option);
                    });
                selector.value = [...selector.options].some(o => o.value === current) ? current : 'D';
            }
            if (status.ok) {
                setEngineStatus(`Director → Stroke/Builder → Critic • engine ${status.version}`, 'ok');
                setPhotoStatus(`Analyzer → Editor → Enhancement → Memory • engine ${status.version}`, 'ok');
            }
        } catch {
            setEngineStatus('Modo canvas local. API Python não detectada.', 'error');
        }
    }
    bootstrap();
});
