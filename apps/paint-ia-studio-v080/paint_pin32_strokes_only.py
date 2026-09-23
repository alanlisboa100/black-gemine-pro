#!/usr/bin/env python3
"""
paint_pin32_strokes_only.py - Extração e Renderização Perfeita dos Traços de PIN32.png
Focado 100% EXCLUSIVAMENTE nos traços originais da imagem PIN32.png:
  - Zero adições artificiais (sem olhos adicionais, sem formas inventadas, sem poluição).
  - Remoção completa de ruído de escaneamento/fundo cinzento.
  - Maximização da nitidez e preservação da espessura e sensibilidade do traço original.
  - Gera versões:
      1) Studio Ink (Nanquim profundo sobre papel de arte puro)
      2) Transparent Alpha (Traços isolados com canal alfa para pintura/composição)
      3) Darkcore Obsidian (Traços em prata pura sobre fundo negro acetinado)
"""

from __future__ import annotations
import os, sys, time
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageEnhance

INPUT_PATH = Path("/storage/emulated/0/Pictures/PIN32.png")
OUT_DIR_DL = Path("/storage/emulated/0/Download")
OUT_DIR_PIC = Path("/storage/emulated/0/Pictures")

def main():
    print("==================================================================")
    print("🖤 BLACKCORE // TRAÇOS PUROS DE PIN32.png (SOMENTE OS TRAÇOS)")
    print("==================================================================")
    t0 = time.time()

    if not INPUT_PATH.exists():
        print(f"❌ Imagem de entrada não encontrada: {INPUT_PATH}")
        sys.exit(1)

    orig = Image.open(INPUT_PATH)
    w, h = orig.size
    print(f"📖 Imagem original carregada: {INPUT_PATH} ({w}x{h}, {orig.mode})")

    # 1. Conversão em Escala de Cinza e Tratamento Tonal de Alta Fidelidade
    print("🔍 [1/4] Isolando os traços originais e filtrando ruídos de fundo...")
    gray = orig.convert("L")

    # Curva de mapeamento tonal de alta precisão
    # Limpa o fundo sem devorar traços finos (cabelo, pestanas, detalhes)
    def clean_stroke_curve(val: int) -> int:
        if val >= 236:
            return 255
        elif val <= 45:
            return 0
        else:
            t = (val - 45) / (236 - 45)
            # Curva gama ligeiramente suave para preservar transição analógica
            return int((t ** 1.30) * 255)

    cleaned_gray = gray.point(clean_stroke_curve)
    
    # Nitidez seletiva de traço (unsharp mask calibrado para lineart)
    ink_stroke_gray = cleaned_gray.filter(ImageFilter.UnsharpMask(radius=0.9, percent=75, threshold=1))

    # -------------------------------------------------------------------------
    # 2. VERSÃO 1: STUDIO INK (Nanquim de Alta Definição sobre Papel Branco Puro)
    # -------------------------------------------------------------------------
    print("✒️  [2/4] Gerando Versão 1: Studio Ink (Nanquim clássico refinado)...")
    # Traços em preto carvão profundo (18, 18, 20) sobre fundo branco puro (255, 255, 255)
    studio_ink = Image.new("RGB", (w, h), (255, 255, 255))
    studio_pixels = studio_ink.load()
    gray_pixels = ink_stroke_gray.load()

    for y in range(h):
        for x in range(w):
            val = gray_pixels[x, y]
            if val < 255:
                # Interpolação suave entre o nanquim e o fundo
                t = val / 255.0
                r = int(14 + t * (255 - 14))
                g = int(14 + t * (255 - 14))
                b = int(16 + t * (255 - 16))
                studio_pixels[x, y] = (r, g, b)

    out_studio_dl = OUT_DIR_DL / "PIN32_tracos_studio_ink.png"
    out_studio_pic = OUT_DIR_PIC / "PIN32_tracos_studio_ink.png"
    studio_ink.save(out_studio_dl, "PNG", optimize=True)
    studio_ink.save(out_studio_pic, "PNG", optimize=True)
    print(f"   -> Salvo em: {out_studio_dl.name}")

    # -------------------------------------------------------------------------
    # 3. VERSÃO 2: TRANSPARENT LINEART (Canal Alfa Isolado para Pintura)
    # -------------------------------------------------------------------------
    print("✨ [3/4] Gerando Versão 2: Traços Transparentes (Canal Alfa puro)...")
    alpha_mask = ImageOps.invert(ink_stroke_gray)
    transparent_strokes = Image.new("RGBA", (w, h), (16, 15, 20, 0))
    transparent_strokes.putalpha(alpha_mask)

    out_trans_dl = OUT_DIR_DL / "PIN32_tracos_transparentes.png"
    out_trans_pic = OUT_DIR_PIC / "PIN32_tracos_transparentes.png"
    transparent_strokes.save(out_trans_dl, "PNG", optimize=True)
    transparent_strokes.save(out_trans_pic, "PNG", optimize=True)
    print(f"   -> Salvo em: {out_trans_dl.name}")

    # -------------------------------------------------------------------------
    # 4. VERSÃO 3: DARKCORE OBSIDIAN (Traços em Prata/Luz sobre Fundo Preto)
    # -------------------------------------------------------------------------
    print("🖤 [4/4] Gerando Versão 3: Darkcore Obsidian (Traços em contraste escuro)...")
    dark_obsidian = Image.new("RGB", (w, h), (12, 12, 16))
    dark_pixels = dark_obsidian.load()

    for y in range(h):
        for x in range(w):
            alpha_val = alpha_mask.getpixel((x, y))
            if alpha_val > 0:
                t = alpha_val / 255.0
                r = int(12 + t * (240 - 12))
                g = int(12 + t * (242 - 12))
                b = int(16 + t * (252 - 16))
                dark_pixels[x, y] = (r, g, b)

    out_dark_dl = OUT_DIR_DL / "PIN32_tracos_darkcore_obsidian.png"
    out_dark_pic = OUT_DIR_PIC / "PIN32_tracos_darkcore_obsidian.png"
    dark_obsidian.save(out_dark_dl, "PNG", optimize=True)
    dark_obsidian.save(out_dark_pic, "PNG", optimize=True)
    print(f"   -> Salvo em: {out_dark_dl.name}")

    # Notificar Android Media Scanner para atualizar a galeria
    try:
        import subprocess
        subprocess.run(["termux-media-scan", 
                        str(out_studio_dl), str(out_studio_pic),
                        str(out_trans_dl), str(out_trans_pic),
                        str(out_dark_dl), str(out_dark_pic)], 
                       check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    elapsed = time.time() - t0
    print("==================================================================")
    print(f"✅ CONCLUÍDO COM PERFEIÇÃO EM {elapsed:.2f}s!")
    print("Arquivos prontos na Galeria do Android e Downloads:")
    print(f" 1. {out_studio_dl}")
    print(f" 2. {out_trans_dl}")
    print(f" 3. {out_dark_dl}")
    print("==================================================================")

if __name__ == "__main__":
    main()
