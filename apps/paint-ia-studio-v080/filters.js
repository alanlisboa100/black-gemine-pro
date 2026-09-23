/**
 * Filters.js - Geradores Procedurais e Algoritmos de Imagem para o Black Paint Studio
 */

class PaintGenerators {
    // Balde de Tinta (Flood Fill em Canvas)
    static floodFill(ctx, startX, startY, fillColor, width, height) {
        startX = Math.floor(startX);
        startY = Math.floor(startY);
        if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Converte hex/rgb para RGBA
        const tempElem = document.createElement('div');
        tempElem.style.color = fillColor;
        document.body.appendChild(tempElem);
        const rgbMatch = window.getComputedStyle(tempElem).color.match(/\d+/g);
        document.body.removeChild(tempElem);

        const targetR = parseInt(rgbMatch[0]);
        const targetG = parseInt(rgbMatch[1]);
        const targetB = parseInt(rgbMatch[2]);
        const targetA = 255;

        const startIndex = (startY * width + startX) * 4;
        const startR = data[startIndex];
        const startG = data[startIndex + 1];
        const startB = data[startIndex + 2];
        const startA = data[startIndex + 3];

        if (startR === targetR && startG === targetG && startB === targetB && startA === targetA) {
            return;
        }

        const matchColor = (idx) => {
            return data[idx] === startR &&
                   data[idx + 1] === startG &&
                   data[idx + 2] === startB &&
                   data[idx + 3] === startA;
        };

        const colorPixel = (idx) => {
            data[idx] = targetR;
            data[idx + 1] = targetG;
            data[idx + 2] = targetB;
            data[idx + 3] = targetA;
        };

        const queue = [[startX, startY]];
        const visited = new Uint8Array(width * height);
        visited[startY * width + startX] = 1;

        while (queue.length > 0) {
            const [x, y] = queue.pop();
            const idx = (y * width + x) * 4;

            if (matchColor(idx)) {
                colorPixel(idx);

                const neighbors = [
                    [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
                ];

                for (const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const vIdx = ny * width + nx;
                        if (!visited[vIdx]) {
                            visited[vIdx] = 1;
                            queue.push([nx, ny]);
                        }
                    }
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    // Gerador Procedural: Cyber City Skyline
    static generateCyberCity(ctx, width, height) {
        ctx.save();
        // Céu escuro gradiente
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#04040a');
        grad.addColorStop(0.7, '#120428');
        grad.addColorStop(1, '#001a24');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Grade de fundo (Synthwave Grid)
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
        ctx.lineWidth = 1;
        const horizon = height * 0.72;
        for (let x = 0; x < width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, horizon);
            ctx.lineTo((x - width/2) * 3 + width/2, height);
            ctx.stroke();
        }
        for (let y = horizon; y < height; y += (height - y) * 0.25 + 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Sol Neon Cyberpunk
        ctx.beginPath();
        ctx.arc(width * 0.5, horizon - 30, Math.min(width, height) * 0.18, 0, Math.PI * 2);
        const sunGrad = ctx.createLinearGradient(0, horizon - 120, 0, horizon);
        sunGrad.addColorStop(0, '#ffff00');
        sunGrad.addColorStop(1, '#ff007f');
        ctx.fillStyle = sunGrad;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 30;
        ctx.fill();

        // Prédios / Skyline
        let curX = 0;
        ctx.shadowBlur = 15;
        while (curX < width) {
            const bWidth = Math.random() * 45 + 25;
            const bHeight = Math.random() * (height * 0.45) + 60;
            const bY = horizon - bHeight;

            // Corpo do prédio
            ctx.fillStyle = '#060714';
            ctx.shadowColor = Math.random() > 0.5 ? '#00ffcc' : '#9d00ff';
            ctx.fillRect(curX, bY, bWidth, bHeight + 40);

            // Borda neon no topo
            ctx.fillStyle = ctx.shadowColor;
            ctx.fillRect(curX, bY, bWidth, 2);

            // Janelas acesas
            for (let wy = bY + 10; wy < horizon - 10; wy += 12) {
                for (let wx = curX + 4; wx < curX + bWidth - 4; wx += 8) {
                    if (Math.random() > 0.45) {
                        ctx.fillStyle = Math.random() > 0.3 ? '#00ffcc' : '#ffff00';
                        ctx.shadowBlur = 4;
                        ctx.fillRect(wx, wy, 3, 5);
                    }
                }
            }
            curX += bWidth + 2;
        }
        ctx.restore();
    }

    // Gerador Procedural: Neural Network Graph
    static generateNeuralNet(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = '#05050b';
        ctx.fillRect(0, 0, width, height);

        const nodeCount = 35;
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * (width - 60) + 30,
                y: Math.random() * (height - 60) + 30,
                radius: Math.random() * 4 + 3,
                color: ['#00ffcc', '#ff007f', '#00f0ff', '#9d00ff'][Math.floor(Math.random() * 4)]
            });
        }

        // Conexões (Sinapses)
        ctx.lineWidth = 1;
        for (let i = 0; i < nodeCount; i++) {
            for (let j = i + 1; j < nodeCount; j++) {
                const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                if (dist < Math.min(width, height) * 0.3) {
                    const alpha = 1 - (dist / (Math.min(width, height) * 0.3));
                    ctx.strokeStyle = `rgba(0, 255, 204, ${alpha * 0.5})`;
                    ctx.shadowColor = '#00ffcc';
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }

        // Nós neurais
        nodes.forEach(n => {
            ctx.fillStyle = n.color;
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();

            // Ponto central branco
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 2;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    // Gerador Procedural: Fractal Neon
    static generateFractal(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = '#030308';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const arms = 6;
        const depth = 5;

        const drawBranch = (x, y, length, angle, currentDepth) => {
            if (currentDepth > depth) return;

            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;

            const colors = ['#ff007f', '#9d00ff', '#00ffcc', '#00f0ff', '#ffff00'];
            const color = colors[currentDepth % colors.length];

            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, (depth - currentDepth) * 1.5);
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            drawBranch(endX, endY, length * 0.7, angle - 0.45, currentDepth + 1);
            drawBranch(endX, endY, length * 0.7, angle + 0.45, currentDepth + 1);
        };

        for (let i = 0; i < arms; i++) {
            const angle = (i / arms) * Math.PI * 2;
            drawBranch(cx, cy, Math.min(width, height) * 0.18, angle, 0);
        }
        ctx.restore();
    }

    // Gerador Procedural: Chuva Matrix Completa
    static generateFullMatrix(ctx, width, height) {
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        const fontSize = 14;
        const cols = Math.floor(width / fontSize);
        ctx.font = `${fontSize}px monospace`;

        for (let c = 0; c < cols; c++) {
            const colX = c * fontSize;
            const dropLen = Math.floor(Math.random() * 25) + 10;
            const startY = Math.random() * height;

            for (let r = 0; r < dropLen; r++) {
                const charY = startY + r * fontSize;
                if (charY > height) continue;

                const char = MatrixChars[Math.floor(Math.random() * MatrixChars.length)];
                if (r === dropLen - 1) {
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#00ffcc';
                    ctx.shadowBlur = 12;
                } else {
                    const alpha = (r / dropLen);
                    ctx.fillStyle = `rgba(0, 255, 120, ${alpha})`;
                    ctx.shadowBlur = 4;
                }
                ctx.fillText(char, colX, charY);
            }
        }
        ctx.restore();
    }
}
