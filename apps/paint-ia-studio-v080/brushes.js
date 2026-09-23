/**
 * Brushes.js - Motores de Pincéis Especiais para Black Paint Studio
 */

const MatrixChars = "0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ";

class BrushEngine {
    constructor(ctx, overlayCtx) {
        this.ctx = ctx;
        this.overlayCtx = overlayCtx;
        this.particles = [];
    }

    // Pincel Básico
    drawBasic(x0, y0, x1, y1, color, size) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 0;

        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
        this.ctx.restore();
    }


    // Pincel Humanizado: micro-jitter, pressão e repetição leve
    drawHuman(x0, y0, x1, y1, color, size) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 0;
        const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
        const steps = Math.max(2, Math.ceil(dist / Math.max(1.5, size * 0.45)));
        let px = x0;
        let py = y0;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const envelope = Math.sin(Math.PI * t);
            const jitter = Math.min(2.4, size * 0.12) * envelope;
            const nx = x0 + (x1 - x0) * t + (Math.random() - 0.5) * jitter;
            const ny = y0 + (y1 - y0) * t + (Math.random() - 0.5) * jitter;
            const pressure = 0.86 + 0.18 * Math.sin(Math.PI * t) + (Math.random() - 0.5) * 0.08;
            this.ctx.globalAlpha = 0.88 + Math.random() * 0.12;
            this.ctx.lineWidth = Math.max(1, size * pressure);
            this.ctx.beginPath();
            this.ctx.moveTo(px, py);
            this.ctx.lineTo(nx, ny);
            this.ctx.stroke();
            px = nx; py = ny;
        }
        this.ctx.restore();
    }

    // Pincel de Mistura / Smudge (Blend de Cores)
    drawSmudge(x0, y0, x1, y1, size) {
        this.ctx.save();
        const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
        const steps = Math.max(1, Math.floor(dist / (size * 0.3)));
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curX = x0 + (x1 - x0) * t;
            const curY = y0 + (y1 - y0) * t;
            
            // Amostra a área anterior e espalha com desfoque
            try {
                const sampleSize = Math.max(4, Math.floor(size * 0.8));
                const sx = Math.max(0, curX - sampleSize / 2);
                const sy = Math.max(0, curY - sampleSize / 2);
                
                this.ctx.globalAlpha = 0.35;
                this.ctx.drawImage(this.ctx.canvas, sx, sy, sampleSize, sampleSize, sx - 1, sy - 1, sampleSize + 2, sampleSize + 2);
            } catch (e) {}
        }
        this.ctx.restore();
    }

    // Pincel Caligráfico / Ink
    drawCalligraphy(x0, y0, x1, y1, color, size) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        const dist = Math.hypot(x1 - x0, y1 - y0) || 1;
        const speed = Math.min(10, dist);
        const dynamicSize = Math.max(2, size * (1 - speed * 0.06));
        
        this.ctx.lineWidth = dynamicSize;
        this.ctx.lineCap = 'square';
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Pincel Neon com Glow
    drawNeon(x0, y0, x1, y1, color, size, glow) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = glow || 15;

        // Passada central brilhante
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();

        // Passada interna branca para efeito de filamento
        if (size > 4) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = Math.max(1, size * 0.3);
            this.ctx.shadowBlur = glow * 0.5;
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    // Pincel Matrix Rain (deixa rastro de glifos orientais/binários)
    drawMatrix(x, y, color, size) {
        this.ctx.save();
        this.ctx.font = `${Math.max(12, size * 1.8)}px monospace`;
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;
        
        const count = Math.max(1, Math.floor(size / 6));
        for (let i = 0; i < count; i++) {
            const char = MatrixChars[Math.floor(Math.random() * MatrixChars.length)];
            const offsetX = (Math.random() - 0.5) * size * 2;
            const offsetY = (Math.random() - 0.5) * size * 2;
            this.ctx.fillText(char, x + offsetX, y + offsetY);
        }
        this.ctx.restore();
    }

    // Pincel de Partículas Estelares
    drawParticles(x, y, color, size) {
        const count = Math.floor(size * 1.5) + 3;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * size * 1.8;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const radius = Math.random() * (size * 0.25) + 1;

            this.ctx.save();
            this.ctx.fillStyle = color;
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(px, py, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    // Caleidoscópio / Simetria Radial 8x
    drawSymmetry(x0, y0, x1, y1, cx, cy, color, size, glow) {
        const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
        
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.lineCap = 'round';
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = glow;

        angles.forEach(angle => {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const rx0 = (x0 - cx) * cos - (y0 - cy) * sin + cx;
            const ry0 = (x0 - cx) * sin + (y0 - cy) * cos + cy;
            const rx1 = (x1 - cx) * cos - (y1 - cy) * sin + cx;
            const ry1 = (x1 - cx) * sin + (y1 - cy) * cos + cy;

            this.ctx.beginPath();
            this.ctx.moveTo(rx0, ry0);
            this.ctx.lineTo(rx1, ry1);
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    // Spray / Aerógrafo
    drawSpray(x, y, color, size) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        const density = size * 3;
        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * size * 1.5;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            
            this.ctx.fillRect(px, py, 1.5, 1.5);
        }
        this.ctx.restore();
    }

    // Borracha
    drawEraser(x0, y0, x1, y1, size) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineWidth = size * 1.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Formas Geométricas (desenhadas no overlay ou direto)
    drawShape(ctx, shape, x0, y0, x1, y1, color, size, glow, fill = false) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = size;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;

        ctx.beginPath();
        if (shape === 'line') {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
        } else if (shape === 'rect') {
            const w = x1 - x0;
            const h = y1 - y0;
            if (fill) ctx.fillRect(x0, y0, w, h);
            else ctx.strokeRect(x0, y0, w, h);
            ctx.restore();
            return;
        } else if (shape === 'circle') {
            const radius = Math.hypot(x1 - x0, y1 - y0);
            ctx.arc(x0, y0, radius, 0, Math.PI * 2);
        } else if (shape === 'star') {
            const radius = Math.hypot(x1 - x0, y1 - y0);
            const spikes = 5;
            let rot = Math.PI / 2 * 3;
            let step = Math.PI / spikes;

            ctx.moveTo(x0, y0 - radius);
            for (let i = 0; i < spikes; i++) {
                let x = x0 + Math.cos(rot) * radius;
                let y = y0 + Math.sin(rot) * radius;
                ctx.lineTo(x, y);
                rot += step;

                x = x0 + Math.cos(rot) * (radius * 0.4);
                y = y0 + Math.sin(rot) * (radius * 0.4);
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(x0, y0 - radius);
            ctx.closePath();
        }

        if (fill) ctx.fill();
        else ctx.stroke();
        ctx.restore();
    }
}
