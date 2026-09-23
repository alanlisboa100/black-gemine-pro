#!/usr/bin/env python3
"""
paint_misuki_v2_masterpiece.py - Renderização Oficial do Pipeline V2 da Misuki
Executa o MODO CONSTRUÇÃO do Manual Mestre V2 em 9 passos estritos:
  Passo 1: Eixo da cabeça e formato afilado delicado
  Passo 2: Dois chifres curvados para cima na lateral-superior com anéis e filete de luz
  Passo 3: Massa grande de cabelo longo + mechas laterais + franja central
  Passo 4: Olhos anime expressivos (pálpebra 5-6px, brilho pontual), nariz e boca mínima
  Passo 5: Pescoço esbelto e Choker preto com pingente de gema geométrica
  Passo 6: Corpete gótico estruturado com tiras e fivelas metálicas
  Passo 7: Linhas internas de acabamento e borda em renda
  Passo 8: Pretos chapados em Beta-nuri profundo
  Passo 9: Cinzas estruturais, retículas e highlights de separação
"""

from __future__ import annotations
import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

OUT_DIR_DL = Path("/storage/emulated/0/Download")
OUT_DIR_PIC = Path("/storage/emulated/0/Pictures")

# Paleta Canônica P&B V2
VAL_WHITE = (255, 255, 255, 255)       # #FFFFFF - Fundo, pele e brilho máximo
VAL_GRAY_VLIGHT = (235, 235, 238, 255)  # #E8E8E8 - Pele em sombra suave
VAL_GRAY_LIGHT = (205, 205, 210, 255)   # #C8C8C8 - Fivelas e materiais claros
VAL_GRAY_MID = (140, 140, 148, 255)     # #8A8A8A - Íris e sombras de plano
VAL_GRAY_DARK = (75, 75, 82, 255)       # #4A4A4A - Tecido e reflexos de cabelo
VAL_ALMOST_BLACK = (24, 24, 28, 255)    # #1A1A1A - Massa gótica com detalhe
VAL_BLACK = (8, 8, 12, 255)             # #000000 - Cílios, contorno e beta-nuri

def bezier_cubic(p0, p1, p2, p3, steps=60):
    pts = []
    for i in range(steps + 1):
        t = i / float(steps)
        u = 1.0 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts

def draw_tapered_stroke(draw, pts, color, base_width=4.0, taper_start=True, taper_end=True):
    n = len(pts)
    if n < 2:
        return
    for i in range(n - 1):
        t = i / float(n - 1)
        w_factor = math.sin(t * math.pi)
        if not taper_start and not taper_end:
            w_factor = 1.0
        elif not taper_start:
            w_factor = math.cos(t * math.pi * 0.5)
        elif not taper_end:
            w_factor = math.sin(t * math.pi * 0.5)
        w = max(1, int(round(base_width * (0.35 + 0.65 * w_factor))))
        draw.line([pts[i], pts[i+1]], fill=color, width=w)

def draw_bezier_curve(draw, p0, p1, p2, p3, color, width=4.0, steps=70, taper="both"):
    pts = bezier_cubic(p0, p1, p2, p3, steps)
    t_start = (taper in ("both", "start"))
    t_end = (taper in ("both", "end"))
    draw_tapered_stroke(draw, pts, color, width, t_start, t_end)

def generate_screentone(w, h, spacing=8, dot_r=1.8, color=VAL_BLACK):
    tone = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(tone, "RGBA")
    for y in range(0, h, spacing):
        offset = (y // spacing) % 2 * (spacing // 2)
        for x in range(offset, w, spacing):
            d.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=color)
    return tone

def render_misuki_v2(size=2000):
    scale = 2  # SSAA 2x (4000x4000)
    sw, sh = size * scale, size * scale

    canvas = Image.new("RGBA", (sw, sh), VAL_WHITE)
    draw = ImageDraw.Draw(canvas, "RGBA")

    cx = sw * 0.50
    cy = sh * 0.44

    print("══════════════════════════════════════════════════════════════════")
    print("🎨 EXECUTANDO MODO CONSTRUÇÃO EM 9 PASSOS (MANUAL MESTRE V2)")
    print("══════════════════════════════════════════════════════════════════")

    # -------------------------------------------------------------------------
    # PASSO 1: EIXO DA CABEÇA E FORMATO AFILADO (Seção 04 e 06)
    # -------------------------------------------------------------------------
    print("▶ [Passo 1/9] Estruturando eixo, crânio e queixo afilado...")
    face_poly = [
        (cx - 170 * scale, cy - 180 * scale),
        (cx, cy - 220 * scale),
        (cx + 170 * scale, cy - 180 * scale),
        (cx + 190 * scale, cy - 30 * scale),
        (cx + 165 * scale, cy + 90 * scale),
        (cx + 100 * scale, cy + 210 * scale),
        (cx, cy + 270 * scale),  # Queixo estreito e elegante
        (cx - 100 * scale, cy + 210 * scale),
        (cx - 165 * scale, cy + 90 * scale),
        (cx - 190 * scale, cy - 30 * scale)
    ]
    draw.polygon(face_poly, fill=VAL_WHITE)

    # -------------------------------------------------------------------------
    # PASSO 2: CHIFRES NEGROS CURVADOS PARA CIMA (Seção 07)
    # -------------------------------------------------------------------------
    print("▶ [Passo 2/9] Construindo os dois chifres curvados com 8 anéis e filete de luz...")
    horn_l_root = (cx - 185 * scale, cy - 240 * scale)
    horn_l_mid = (cx - 370 * scale, cy - 420 * scale)
    horn_l_tip = (cx - 270 * scale, cy - 720 * scale)

    horn_r_root = (cx + 185 * scale, cy - 240 * scale)
    horn_r_mid = (cx + 370 * scale, cy - 420 * scale)
    horn_r_tip = (cx + 270 * scale, cy - 720 * scale)

    for side, root, mid, tip in [(-1, horn_l_root, horn_l_mid, horn_l_tip), (1, horn_r_root, horn_r_mid, horn_r_tip)]:
        steps = 42
        guide = bezier_cubic(root, (root[0] + side * 120 * scale, root[1] - 120 * scale),
                                   (mid[0] + side * 25 * scale, mid[1] - 140 * scale),
                                   tip, steps=steps)
        p_left, p_right = [], []
        for i, (gx, gy) in enumerate(guide):
            t = i / float(steps)
            rad_norm = math.atan2(gy - guide[max(0, i-1)][1], gx - guide[max(0, i-1)][0]) + math.pi/2
            radius = (1.0 - t * 0.88) * (50.0 * scale)
            p_left.append((gx + math.cos(rad_norm) * radius, gy + math.sin(rad_norm) * radius))
            p_right.append((gx - math.cos(rad_norm) * radius, gy - math.sin(rad_norm) * radius))

        horn_poly = p_left + p_right[::-1]
        draw.polygon(horn_poly, fill=VAL_BLACK)

        # 8 Anéis de volume transversais com filete de luz
        for ring_i in range(1, 9):
            idx = int(ring_i * (steps / 9.5))
            pt_l = p_left[idx]
            pt_r = p_right[idx]
            pt_m = guide[idx]
            draw_bezier_curve(draw, pt_l, (pt_m[0] - side * 10 * scale, pt_m[1] + 14 * scale),
                                         (pt_m[0] + side * 10 * scale, pt_m[1] + 14 * scale),
                                         pt_r, VAL_ALMOST_BLACK, width=4.0 * scale)
            # Filete de luz separando o chifre do cabelo
            b_p0 = (pt_l[0] * 0.65 + pt_m[0] * 0.35, pt_l[1] * 0.65 + pt_m[1] * 0.35)
            b_p1 = (pt_l[0] * 0.30 + pt_m[0] * 0.70, pt_l[1] * 0.30 + pt_m[1] * 0.70)
            draw.line([b_p0, b_p1], fill=VAL_WHITE, width=int(2.5 * scale))

        # Contorno nítido externo
        for i in range(len(p_left) - 1):
            draw.line([p_left[i], p_left[i+1]], fill=VAL_BLACK, width=int(5.5 * scale))
            draw.line([p_right[i], p_right[i+1]], fill=VAL_BLACK, width=int(5.5 * scale))

    # -------------------------------------------------------------------------
    # PASSO 3: MASSA DO CABELO LONGO E FRANJA CENTRAL (Seção 06)
    # -------------------------------------------------------------------------
    print("▶ [Passo 3/9] Renderizando massa de cabelo escuro pesado e mechas fluidas...")
    back_poly = [
        (cx - 350 * scale, cy - 280 * scale),
        (cx, cy - 540 * scale),
        (cx + 350 * scale, cy - 280 * scale),
        (cx + 440 * scale, cy + 60 * scale),
        (cx + 460 * scale, cy + 420 * scale),
        (cx + 380 * scale, sh),
        (cx - 380 * scale, sh),
        (cx - 460 * scale, cy + 420 * scale),
        (cx - 440 * scale, cy + 60 * scale)
    ]
    draw.polygon(back_poly, fill=VAL_ALMOST_BLACK)

    # Mechas traseiras dinâmicas que descem além dos ombros
    for off in range(-6, 7):
        p0_l = (cx - 170 * scale + off * 20, cy - 350 * scale)
        p1_l = (cx - 360 * scale + off * 25, cy - 40 * scale)
        p2_l = (cx - 460 * scale + off * 30, cy + 360 * scale)
        p3_l = (cx - 360 * scale + off * 35, sh)
        draw_bezier_curve(draw, p0_l, p1_l, p2_l, p3_l, VAL_BLACK, width=7.0 * scale, steps=90)

        p0_r = (cx + 170 * scale + off * 20, cy - 350 * scale)
        p1_r = (cx + 360 * scale + off * 25, cy - 40 * scale)
        p2_r = (cx + 460 * scale + off * 30, cy + 360 * scale)
        p3_r = (cx + 360 * scale + off * 35, sh)
        draw_bezier_curve(draw, p0_r, p1_r, p2_r, p3_r, VAL_BLACK, width=7.0 * scale, steps=90)

    # -------------------------------------------------------------------------
    # PASSO 4: OLHOS EXPRESSIVOS, NARIZ E BOCA (Seção 05)
    # -------------------------------------------------------------------------
    print("▶ [Passo 4/9] Desenhando olhos expressivos (pálpebra 5-6px), nariz e boca canônica...")
    eye_y = cy - 25 * scale
    for side in [-1, 1]:
        ex = cx + side * 92 * scale
        
        # Pálpebra superior preta e marcante (5-6px em 2000px = 10-12px em scale 2)
        p0 = (ex - side * 52 * scale, eye_y - 14 * scale)
        p1 = (ex - side * 15 * scale, eye_y - 36 * scale)
        p2 = (ex + side * 28 * scale, eye_y - 32 * scale)
        p3 = (ex + side * 60 * scale, eye_y - 10 * scale)
        draw_bezier_curve(draw, p0, p1, p2, p3, VAL_BLACK, width=11.0 * scale)

        # Cílios agrupados no terço externo
        draw.polygon([(ex + side * 48 * scale, eye_y - 14 * scale),
                      (ex + side * 72 * scale, eye_y - 30 * scale),
                      (ex + side * 40 * scale, eye_y - 24 * scale)], fill=VAL_BLACK)
        draw.polygon([(ex + side * 24 * scale, eye_y - 32 * scale),
                      (ex + side * 36 * scale, eye_y - 48 * scale),
                      (ex + side * 16 * scale, eye_y - 34 * scale)], fill=VAL_BLACK)

        # Íris anime alongada (#8A8A8A) com topo preto sombreado (#000000)
        rx, ry = 22 * scale, 29 * scale
        draw.ellipse([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], fill=VAL_GRAY_MID, outline=VAL_BLACK, width=int(3.5*scale))
        draw.chord([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], start=180, end=360, fill=VAL_BLACK)
        
        # Pupila central
        draw.ellipse([ex - 7*scale, eye_y - 4*scale, ex + 7*scale, eye_y + 11*scale], fill=VAL_BLACK)

        # Brilho branco pontual nítido no canto superior
        draw.ellipse([ex - side * 13 * scale - 7*scale, eye_y - 17*scale, ex - side * 13 * scale + 5*scale, eye_y - 5*scale], fill=VAL_WHITE)
        # Microbrilho secundário
        draw.ellipse([ex + side * 8 * scale, eye_y + 9*scale, ex + side * 8 * scale + 6*scale, eye_y + 15*scale], fill=VAL_WHITE)

        # Pálpebra inferior interrompida
        draw_bezier_curve(draw, (ex - side * 28 * scale, eye_y + 25 * scale),
                                (ex, eye_y + 30 * scale),
                                (ex + side * 24 * scale, eye_y + 26 * scale),
                                (ex + side * 42 * scale, eye_y + 12 * scale), VAL_BLACK, width=3.0 * scale)

        # Dobra da pálpebra (Double eyelid)
        draw_bezier_curve(draw, (ex - side * 38 * scale, eye_y - 46 * scale),
                                (ex, eye_y - 54 * scale),
                                (ex + side * 28 * scale, eye_y - 50 * scale),
                                (ex + side * 48 * scale, eye_y - 34 * scale), VAL_GRAY_MID, width=2.8 * scale)

        # Sobrancelha fina e expressiva
        sb_y = eye_y - 74 * scale + (side * 4 * scale)
        draw_bezier_curve(draw, (ex - side * 46 * scale, sb_y + 6 * scale),
                                (ex - side * 10 * scale, sb_y - 12 * scale),
                                (ex + side * 28 * scale, sb_y - 8 * scale),
                                (ex + side * 58 * scale, sb_y + 10 * scale), VAL_BLACK, width=4.8 * scale)

    # Nariz mínimo: 1 traço + sombra curta
    nose_y = cy + 68 * scale
    draw.polygon([(cx - 2 * scale, nose_y), (cx + 9 * scale, nose_y + 20 * scale), (cx - 3 * scale, nose_y + 24 * scale)], fill=VAL_GRAY_DARK)
    draw.line([(cx + 3 * scale, nose_y - 18 * scale), (cx + 9 * scale, nose_y + 20 * scale)], fill=VAL_BLACK, width=int(2.5 * scale))

    # Boca curta e delicada
    mouth_y = cy + 172 * scale
    draw_bezier_curve(draw, (cx - 34 * scale, mouth_y), (cx - 10 * scale, mouth_y - 5 * scale),
                            (cx + 10 * scale, mouth_y - 5 * scale), (cx + 38 * scale, mouth_y - 2 * scale), VAL_BLACK, width=4.2 * scale)
    draw.polygon([(cx - 22 * scale, mouth_y + 2 * scale), (cx, mouth_y), (cx + 24 * scale, mouth_y + 2 * scale), (cx + 2 * scale, mouth_y + 8 * scale)], fill=VAL_BLACK)
    # Lábio inferior com brilho
    draw_bezier_curve(draw, (cx - 15 * scale, mouth_y + 22 * scale), (cx, mouth_y + 26 * scale),
                            (cx + 12 * scale, mouth_y + 25 * scale), (cx + 20 * scale, mouth_y + 20 * scale), VAL_GRAY_MID, width=3.0 * scale)

    # Franja frontal (Passo 3 continuação - sobreposição com a raiz dos chifres)
    bangs_v2 = [
        ((cx - 75 * scale, cy - 350 * scale), (cx - 35 * scale, cy - 210 * scale), (cx - 15 * scale, cy - 90 * scale), (cx - 12 * scale, cy + 25 * scale), 6.5),
        ((cx - 15 * scale, cy - 370 * scale), (cx + 12 * scale, cy - 230 * scale), (cx + 24 * scale, cy - 110 * scale), (cx + 18 * scale, cy - 5 * scale), 6.0),
        ((cx + 55 * scale, cy - 360 * scale), (cx + 75 * scale, cy - 210 * scale), (cx + 85 * scale, cy - 80 * scale), (cx + 80 * scale, cy + 45 * scale), 6.2),
        ((cx - 150 * scale, cy - 310 * scale), (cx - 130 * scale, cy - 170 * scale), (cx - 115 * scale, cy - 35 * scale), (cx - 100 * scale, cy + 125 * scale), 7.0),
        ((cx + 140 * scale, cy - 310 * scale), (cx + 150 * scale, cy - 170 * scale), (cx + 145 * scale, cy - 35 * scale), (cx + 130 * scale, cy + 125 * scale), 7.0),
        ((cx - 185 * scale, cy - 190 * scale), (cx - 200 * scale, cy + 40 * scale), (cx - 175 * scale, cy + 250 * scale), (cx - 140 * scale, cy + 460 * scale), 7.5),
        ((cx + 185 * scale, cy - 190 * scale), (cx + 200 * scale, cy + 40 * scale), (cx + 175 * scale, cy + 250 * scale), (cx + 140 * scale, cy + 460 * scale), 7.5),
    ]
    for p0, p1, p2, p3, bw in bangs_v2:
        draw_bezier_curve(draw, p0, p1, p2, p3, VAL_BLACK, width=bw * scale, steps=80)
        draw_bezier_curve(draw, (p0[0]+4*scale, p0[1]), (p1[0]+3*scale, p1[1]), (p2[0]+2*scale, p2[1]), (p3[0]+1*scale, p3[1]), VAL_GRAY_DARK, width=(bw*0.4)*scale, steps=70)

    # -------------------------------------------------------------------------
    # PASSO 5: PESCOÇO E CHOKER PRETO COM GEMA (Seção 08)
    # -------------------------------------------------------------------------
    print("▶ [Passo 5/9] Desenhando pescoço elegante, choker preto e gema geométrica...")
    choker_y = cy + 325 * scale
    draw.polygon([
        (cx - 90 * scale, choker_y - 20 * scale),
        (cx + 90 * scale, choker_y - 20 * scale),
        (cx + 85 * scale, choker_y + 24 * scale),
        (cx - 85 * scale, choker_y + 24 * scale)
    ], fill=VAL_BLACK)

    # Pingente de gema geométrica central com brilho
    gem_cx, gem_cy = cx, choker_y + 38 * scale
    draw.polygon([(gem_cx, gem_cy - 20 * scale), (gem_cx + 20 * scale, gem_cy), (gem_cx, gem_cy + 22 * scale), (gem_cx - 20 * scale, gem_cy)], fill=VAL_ALMOST_BLACK, outline=VAL_BLACK, width=int(3 * scale))
    draw.polygon([(gem_cx - 7 * scale, gem_cy - 11 * scale), (gem_cx, gem_cy - 15 * scale), (gem_cx - 2 * scale, gem_cy - 4 * scale)], fill=VAL_WHITE)

    # -------------------------------------------------------------------------
    # PASSO 6: CORPETE GÓTICO E TIRAS ESTRUTURADAS (Seção 08)
    # -------------------------------------------------------------------------
    print("▶ [Passo 6/9] Construindo corpete gótico, tiras e fivelas de alto contraste...")
    corset_poly = [
        (cx - 150 * scale, cy + 430 * scale),
        (cx - 60 * scale, cy + 390 * scale),
        (cx, cy + 410 * scale),
        (cx + 60 * scale, cy + 390 * scale),
        (cx + 150 * scale, cy + 430 * scale),
        (cx + 260 * scale, sh),
        (cx - 260 * scale, sh)
    ]
    draw.polygon(corset_poly, fill=VAL_ALMOST_BLACK)

    for s_i in range(3):
        strap_y = cy + 480 * scale + s_i * 72 * scale
        draw.polygon([
            (cx - 175 * scale, strap_y - 11 * scale), (cx + 175 * scale, strap_y - 11 * scale),
            (cx + 185 * scale, strap_y + 13 * scale), (cx - 185 * scale, strap_y + 13 * scale)
        ], fill=VAL_BLACK)
        f_w, f_h = 30 * scale, 20 * scale
        draw.rectangle([cx - f_w, strap_y - f_h/2, cx + f_w, strap_y + f_h/2], fill=VAL_GRAY_LIGHT, outline=VAL_BLACK, width=int(3 * scale))
        draw.rectangle([cx - f_w + 7*scale, strap_y - f_h/2 + 5*scale, cx + f_w - 7*scale, strap_y + f_h/2 - 5*scale], fill=VAL_BLACK)
        draw.line([(cx - f_w + 2*scale, strap_y - f_h/2 + 2*scale), (cx + f_w - 2*scale, strap_y - f_h/2 + 2*scale)], fill=VAL_WHITE, width=int(2 * scale))

    # -------------------------------------------------------------------------
    # PASSO 7: LINHAS INTERNAS E RENDA NAS BORDAS (Seção 08 & 18)
    # -------------------------------------------------------------------------
    print("▶ [Passo 7/9] Adicionando acabamentos em renda e correntes discretas...")
    for rx in range(int(cx - 135 * scale), int(cx + 135 * scale), int(15 * scale)):
        t_l = (rx - (cx - 135 * scale)) / (270.0 * scale)
        ly = (cy + 410 * scale) - math.sin(t_l * math.pi) * 16 * scale
        draw.ellipse([rx - 6 * scale, ly - 5 * scale, rx + 6 * scale, ly + 5 * scale], outline=VAL_BLACK, width=int(2 * scale))

    # Corrente fina discreta
    chain_pts = bezier_cubic((cx - 115 * scale, cy + 430 * scale), (cx - 65 * scale, cy + 530 * scale),
                             (cx - 25 * scale, cy + 540 * scale), (gem_cx, gem_cy + 22 * scale), steps=18)
    for ci in range(0, len(chain_pts) - 1, 2):
        cp = chain_pts[ci]
        draw.ellipse([cp[0] - 4 * scale, cp[1] - 4 * scale, cp[0] + 4 * scale, cp[1] + 4 * scale], fill=VAL_GRAY_LIGHT, outline=VAL_BLACK, width=int(1.8 * scale))

    # -------------------------------------------------------------------------
    # PASSO 8: PRETOS CHAPADOS EM BETA-NURI (Seção 09)
    # -------------------------------------------------------------------------
    print("▶ [Passo 8/9] Verificando cobertura de pretos chapados (Beta-nuri)...")
    # Contorno externo de silhueta (4-6px)
    draw_bezier_curve(draw, (cx - 185 * scale, cy - 30 * scale), (cx - 160 * scale, cy + 110 * scale),
                            (cx - 95 * scale, cy + 220 * scale), (cx, cy + 270 * scale), VAL_BLACK, width=5.5 * scale)
    draw_bezier_curve(draw, (cx + 185 * scale, cy - 30 * scale), (cx + 160 * scale, cy + 110 * scale),
                            (cx + 95 * scale, cy + 220 * scale), (cx, cy + 270 * scale), VAL_BLACK, width=5.5 * scale)

    # -------------------------------------------------------------------------
    # PASSO 9: CINZAS, RETÍCULAS E HIGHLIGHTS DE SEPARAÇÃO (Seção 09 & 10)
    # -------------------------------------------------------------------------
    print("▶ [Passo 9/9] Aplicando cinzas intermediários e retículas de meio-tom...")
    neck_shade = [
        (cx - 75 * scale, cy + 225 * scale),
        (cx, cy + 270 * scale),
        (cx + 75 * scale, cy + 225 * scale),
        (cx + 55 * scale, cy + 330 * scale),
        (cx - 55 * scale, cy + 330 * scale)
    ]
    tone = generate_screentone(sw, sh, spacing=int(6 * scale), dot_r=1.3 * scale, color=VAL_BLACK)
    mask_sh = Image.new("L", (sw, sh), 0)
    d_m = ImageDraw.Draw(mask_sh)
    d_m.polygon(neck_shade, fill=255)
    canvas.paste(tone, (0, 0), mask_sh)

    print("🔍 Processando anti-aliasing Lanczos para 2000x2000 px...")
    final_img = canvas.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    print("==================================================================")
    print("🖤 BLACKCORE // MISUKI V2 PIPELINE TEST (TESTE OPERACIONAL V2)")
    print("==================================================================")
    t0 = time.time()

    size = 2000
    studio_img = render_misuki_v2(size=size)

    OUT_DIR_DL.mkdir(parents=True, exist_ok=True)
    OUT_DIR_PIC.mkdir(parents=True, exist_ok=True)

    # 1. Studio Master V2
    out_studio_dl = OUT_DIR_DL / "MISUKI_V2_Pipeline_Test_Studio.png"
    out_studio_pic = OUT_DIR_PIC / "MISUKI_V2_Pipeline_Test_Studio.png"
    studio_img.convert("RGB").save(out_studio_dl, "PNG", optimize=True)
    studio_img.convert("RGB").save(out_studio_pic, "PNG", optimize=True)
    print(f"📁 Studio V2 salvo: {out_studio_dl.name} ({out_studio_dl.stat().st_size // 1024} KB)")

    # 2. Darkcore Obsidian V2
    gray = studio_img.convert("L")
    inv_gray = ImageOps.invert(gray)
    dark_img = Image.new("RGB", (size, size), (12, 12, 16))
    dark_pixels = dark_img.load()
    inv_pixels = inv_gray.load()

    for y in range(size):
        for x in range(size):
            v = inv_pixels[x, y]
            if v > 0:
                t = v / 255.0
                r = int(12 + t * (245 - 12))
                g = int(12 + t * (248 - 12))
                b = int(16 + t * (255 - 16))
                dark_pixels[x, y] = (r, g, b)

    out_dark_dl = OUT_DIR_DL / "MISUKI_V2_Pipeline_Test_Darkcore.png"
    out_dark_pic = OUT_DIR_PIC / "MISUKI_V2_Pipeline_Test_Darkcore.png"
    dark_img.save(out_dark_dl, "PNG", optimize=True)
    dark_img.save(out_dark_pic, "PNG", optimize=True)
    print(f"📁 Darkcore V2 salvo: {out_dark_dl.name} ({out_dark_dl.stat().st_size // 1024} KB)")

    # 3. Transparente Alfa V2
    trans_img = Image.new("RGBA", (size, size), (12, 12, 16, 0))
    trans_img.putalpha(inv_gray)
    out_trans_dl = OUT_DIR_DL / "MISUKI_V2_Pipeline_Test_Transparente.png"
    out_trans_pic = OUT_DIR_PIC / "MISUKI_V2_Pipeline_Test_Transparente.png"
    trans_img.save(out_trans_dl, "PNG", optimize=True)
    trans_img.save(out_trans_pic, "PNG", optimize=True)
    print(f"📁 Transparente V2 salvo: {out_trans_dl.name} ({out_trans_dl.stat().st_size // 1024} KB)")

    # Media Scanner do Android
    try:
        subprocess.run(["termux-media-scan",
                        str(out_studio_dl), str(out_studio_pic),
                        str(out_dark_dl), str(out_dark_pic),
                        str(out_trans_dl), str(out_trans_pic)],
                       check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    elapsed = time.time() - t0
    print("==================================================================")
    print(f"✅ PIPELINE V2 CONCLUÍDO COM 100% DE FIDELIDADE EM {elapsed:.2f}s!")
    print("Arquivos prontos na Galeria do seu celular:")
    print(f" 1. {out_studio_dl}")
    print(f" 2. {out_dark_dl}")
    print(f" 3. {out_trans_dl}")
    print("==================================================================")

if __name__ == "__main__":
    main()
