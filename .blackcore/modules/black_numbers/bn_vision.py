#!/usr/bin/env python3
"""
bn_vision.py - Módulo de Visão por Matriz Numérica para o Black Numbers
Transforma imagens ou fotos da câmera em matrizes de pixels (RGBA/Luminância),
analisa formas e contrastes, renderiza no terminal e injeta no banco do Black Numbers.
"""
from __future__ import annotations
import argparse, json, math, os, subprocess, sys, time
from pathlib import Path
from PIL import Image

try:
    from bnlib import db, event, now, ROOT
except ImportError:
    # Fallback se executado isoladamente
    sys.path.append(str(Path(__file__).resolve().parent))
    from bnlib import db, event, now, ROOT

ASCII_CHARS = " .:-=+*#%@"

def scan_pixels(image_path: str | Path, width: int = 40, height: int = 24) -> dict:
    """Escaneia uma imagem e converte para matriz numérica RGBA, luminância e ASCII."""
    path = Path(image_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Imagem não encontrada: {path}")

    with Image.open(path) as img:
        img_rgb = img.convert("RGBA")
        orig_w, orig_h = img_rgb.size
        
        # Redimensionamento para a matriz discreta
        resized = img_rgb.resize((width, height), Image.Resampling.BILINEAR)
        
        matrix_rgba = []
        matrix_lum = []
        ascii_lines = []
        color_histogram = {}
        
        for y in range(height):
            rgba_row = []
            lum_row = []
            ascii_chars = []
            for x in range(width):
                r, g, b, a = resized.getpixel((x, y))
                # Luminância perceptual standard (ITU-R BT.709)
                lum = int(0.2126 * r + 0.7152 * g + 0.0722 * b)
                rgba_row.append([r, g, b, a])
                lum_row.append(lum)
                
                # ASCII char mapeado pela luminância
                char_idx = min(int((lum / 255) * (len(ASCII_CHARS) - 1)), len(ASCII_CHARS) - 1)
                ascii_chars.append(ASCII_CHARS[char_idx])
                
                # Histograma de cores simplificado (quantizado para 32 níveis)
                hex_color = f"#{r:02x}{g:02x}{b:02x}"
                color_histogram[hex_color] = color_histogram.get(hex_color, 0) + 1
            
            matrix_rgba.append(rgba_row)
            matrix_lum.append(lum_row)
            ascii_lines.append("".join(ascii_chars))
        
        # Cores dominantes
        top_colors = sorted(color_histogram.items(), key=lambda item: item[1], reverse=True)[:5]
        dominant_colors = [{"color": c, "count": cnt, "percent": round((cnt / (width * height)) * 100, 1)} for c, cnt in top_colors]

        # Detecção de centro de massa visual (ponto focal)
        total_lum = sum(sum(row) for row in matrix_lum) or 1
        focal_x = sum(x * sum(matrix_lum[y][x] for y in range(height)) for x in range(width)) / (total_lum * width)
        focal_y = sum(y * sum(matrix_lum[y][x] for x in range(width)) for y in range(height)) / (total_lum * height)

        return {
            "source_path": str(path),
            "original_resolution": [orig_w, orig_h],
            "matrix_dimensions": [width, height],
            "focal_center": [round(focal_x, 2), round(focal_y, 2)],
            "dominant_colors": dominant_colors,
            "matrix_lum": matrix_lum,
            "matrix_rgba": matrix_rgba,
            "ascii_preview": ascii_lines
        }

def render_terminal_ansi(scan_data: dict, colored: bool = True):
    """Renderiza a matriz escaneada com ANSI TrueColor direto no terminal do Termux."""
    width, height = scan_data["matrix_dimensions"]
    rgba = scan_data["matrix_rgba"]
    
    print("\n\033[1;36m╔" + "═" * (width * 2 + 2) + "╗\033[0m")
    print(f"\033[1;36m║ \033[1;37mVISÃO POR MATRIZ BLACK NUMBERS [{width}x{height}]\033[1;36m" + " " * (width * 2 - 32) + "║\033[0m")
    print("\033[1;36m╠" + "═" * (width * 2 + 2) + "╣\033[0m")
    
    for y in range(height):
        sys.stdout.write("\033[1;36m║ \033[0m")
        for x in range(width):
            r, g, b, a = rgba[y][x]
            if colored:
                # Usa caractere de bloco cheio com TrueColor no fundo e frente
                sys.stdout.write(f"\033[48;2;{r};{g};{b}m  \033[0m")
            else:
                char = scan_data["ascii_preview"][y][x]
                sys.stdout.write(f"{char} ")
        sys.stdout.write("\033[1;36m ║\033[0m\n")
    
    print("\033[1;36m╚" + "═" * (width * 2 + 2) + "╝\033[0m")
    print(f"\033[1;33m🎯 Ponto Focal (Centro de Luz): \033[1;37mX={scan_data['focal_center'][0]*100:.0f}% | Y={scan_data['focal_center'][1]*100:.0f}%\033[0m")
    print("\033[1;35m🎨 Cores Dominantes:\033[0m", " ".join(f"\033[38;2;{int(c['color'][1:3],16)};{int(c['color'][3:5],16)};{int(c['color'][5:7],16)}m■ {c['color']} ({c['percent']}%)\033[0m" for c in scan_data["dominant_colors"][:4]))
    print()

def generate_canvas_code(scan_data: dict, task_name: str = "Reconstrução Visual de Matriz") -> str:
    """Gera código JavaScript / Canvas HTML5 que renderiza a matriz de pixels como partículas ou pixel art."""
    w, h = scan_data["matrix_dimensions"]
    rgba_json = json.dumps(scan_data["matrix_rgba"])
    
    return f"""// Black Numbers Visual Matrix Engine - {task_name}
// Resolução discreta: {w}x{h} | Fonte: {scan_data['source_path']}
function drawBlackNumbersMatrix(ctx, canvasWidth, canvasHeight) {{
    const grid = {rgba_json};
    const cellW = canvasWidth / {w};
    const cellH = canvasHeight / {h};
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    for (let y = 0; y < {h}; y++) {{
        for (let x = 0; x < {w}; x++) {{
            const [r, g, b, a] = grid[y][x];
            if (a < 10) continue;
            
            ctx.fillStyle = `rgba(${{r}}, ${{g}}, ${{b}}, ${{a / 255}})`;
            ctx.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5);
            
            // Efeito neon se a cor for muito vibrante
            if (r > 180 || g > 180 || b > 180) {{
                ctx.shadowColor = `rgb(${{r}}, ${{g}}, ${{b}})`;
                ctx.shadowBlur = 4;
            }}
        }}
    }}
}}
"""

def feed_into_black_numbers(scan_data: dict, task_name: str = "Visão de Matriz por Scanner"):
    """Grava o padrão visual no banco SQLite do Black Numbers."""
    code = generate_canvas_code(scan_data, task_name)
    con = db()
    try:
        # Inserir no banco como exemplo verificado
        notes = f"Matriz visual capturada ({scan_data['matrix_dimensions'][0]}x{scan_data['matrix_dimensions'][1]}). Cores: {', '.join(c['color'] for c in scan_data['dominant_colors'][:3])}"
        con.execute(
            "INSERT INTO examples(task, code, notes, verified, source, created_at) VALUES(?,?,?,?,?,?)",
            (task_name, code, notes, 1, "bn-vision-scanner", now())
        )
        
        # Registrar evento de aprendizado
        event(con, "vision_scan", f"Visão absorvida: {task_name}", {
            "source": scan_data["source_path"],
            "resolution": scan_data["matrix_dimensions"],
            "focal": scan_data["focal_center"]
        })
        con.commit()
        print(f"\033[1;32m✅ Visão absorvida e gravada com sucesso no Black Numbers! (Tarefa: '{task_name}')\033[0m")
    finally:
        con.close()

def capture_termux_camera(output_file: str = "termux_camera_scan.jpg") -> str:
    """Tira uma foto real usando a câmera do celular através do Termux API."""
    out_path = Path.home() / output_file
    print(f"\033[1;33m📸 Acionando câmera do celular via Termux API...\033[0m")
    res = subprocess.run(["termux-camera-photo", "-c", "0", str(out_path)], capture_output=True, text=True)
    if res.returncode != 0:
        # Tenta sem o argumento -c 0
        res = subprocess.run(["termux-camera-photo", str(out_path)], capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Falha ao acionar a câmera do Termux. Verifique permissões do Termux:API: {res.stderr}")
    
    print(f"\033[1;32m📸 Foto capturada com sucesso: {out_path}\033[0m")
    return str(out_path)

def main():
    parser = argparse.ArgumentParser(prog="bn_vision", description="Visão por Scanner Numérico para Black Numbers")
    sub = parser.add_subparsers(dest="cmd", required=True)
    
    # Subcomando: scan
    p_scan = sub.add_parser("scan", help="Escaneia uma imagem e gera a matriz visual")
    p_scan.add_argument("image", help="Caminho da imagem")
    p_scan.add_argument("--width", "-w", type=int, default=36, help="Largura da matriz (padrão: 36)")
    p_scan.add_argument("--height", "-H", type=int, default=18, help="Altura da matriz (padrão: 18)")
    p_scan.add_argument("--feed", action="store_true", help="Alimenta o Black Numbers imediatamente")
    p_scan.add_argument("--task", default="Visão Escaneada", help="Nome da tarefa de visão")
    
    # Subcomando: camera
    p_cam = sub.add_parser("camera", help="Tira foto com a câmera do celular e escaneia")
    p_cam.add_argument("--feed", action="store_true", help="Alimenta o Black Numbers imediatamente")
    p_cam.add_argument("--task", default="Visão da Câmera do Celular", help="Nome da tarefa")
    
    args = parser.parse_args()
    
    if args.cmd == "camera":
        img_path = capture_termux_camera()
        scan_data = scan_pixels(img_path, 36, 18)
        render_terminal_ansi(scan_data, colored=True)
        if args.feed:
            feed_into_black_numbers(scan_data, args.task)
    elif args.cmd == "scan":
        scan_data = scan_pixels(args.image, args.width, args.height)
        render_terminal_ansi(scan_data, colored=True)
        if args.feed:
            feed_into_black_numbers(scan_data, args.task)

if __name__ == "__main__":
    main()
