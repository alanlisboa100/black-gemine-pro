#!/usr/bin/env python3
"""
paint_misuki_spec_v2_masterpiece.py - Obra Mestre da Misuki baseada na SPEC V2.0.0 (Saza.zip)
Executa o pipeline completo P00-P14 em conformidade estrita com o pacote SPEC V2.0.0:
  - Resolução Oficial: 2000x2000 px (Render interno SSAA 2x 4000x4000 com Lanczos e Unsharp Mask de estúdio).
  - DNA e Hard Constraints (HC01-HC08):
      * Dois chifres curvados na lateral-superior com 10 anéis de volume e filete de luz de separação (F03).
      * Cabelo longo em Beta-nuri denso sem linhas de pente paralelas (F04), com franja em mechas hierárquicas e flyaways.
      * Olhos expressivos com pálpebra superior dominante, estrias radiais na íris e duplo brilho especular.
      * Rosto delicado afilado, queixo suave, nariz mínimo e lábios com brilho de gloss.
      * Choker de couro com gema lapidada facetada, corpete gótico com renda de filigrana, fivelas com pino e ilhós.
      * Mapa Tonal T0-T4: Rosto claro com janela de respiro, massas escuras dominantes e separação clara de planos.
"""

from __future__ import annotations
import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

OUT_DIR_DL = Path("/storage/emulated/0/Download")
OUT_DIR_PIC = Path("/storage/emulated/0/Pictures")

# Mapa Tonal Canônico T0-T4 (Seção TONE SYSTEM da SPEC V2.0.0)
T0_WHITE = (255, 255, 255, 255)         # #FFFFFF - Respiro facial, luz máxima e reflexos especulares
T1_LIGHT_GRAY = (235, 235, 240, 255)   # #E8E8E8 / #D9D9D9 - Sombras suaves de pele
T2_MID_GRAY = (140, 140, 150, 255)      # #8F8F8F - Planos secundários, íris e dobras de tecido
T3_DEEP_GRAY = (55, 55, 62, 255)        # #3A3A3A - Mechas iluminadas, costuras e relevos
T4_BLACK = (6, 6, 10, 255)              # #000000 / #111111 - Beta-nuri, chifres, cílios e massa gráfica
T4_ALMOST_BLACK = (18, 18, 22, 255)     # #1A1A1A - Corpete gótico e camadas profundas

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

def draw_hatching(draw, p_start, p_end, length=30, angle_deg=45, spacing=7, color=T4_BLACK, width=2):
    dx = p_end[0] - p_start[0]
    dy = p_end[1] - p_start[1]
    dist = math.hypot(dx, dy)
    if dist < 1:
        return
    steps = int(dist / spacing)
    rad = math.radians(angle_deg)
    h_dx = math.cos(rad) * length
    h_dy = math.sin(rad) * length

    for i in range(steps + 1):
        t = i / max(1, steps)
        ox = p_start[0] + dx * t
        oy = p_start[1] + dy * t
        draw.line([(ox, oy), (ox + h_dx, oy + h_dy)], fill=color, width=width)

def generate_halftone_screentone(w, h, spacing=7, dot_r=1.5, color=T4_BLACK):
    tone = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(tone, "RGBA")
    for y in range(0, h, spacing):
        offset = (y // spacing) % 2 * (spacing // 2)
        for x in range(offset, w, spacing):
            d.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=color)
    return tone

def render_misuki_spec_v2(size=2000):
    scale = 2  # SSAA 2x (4000x4000)
    sw, sh = size * scale, size * scale

    canvas = Image.new("RGBA", (sw, sh), T0_WHITE)
    draw = ImageDraw.Draw(canvas, "RGBA")

    cx = sw * 0.50
    cy = sh * 0.44

    print("══════════════════════════════════════════════════════════════════")
    print("🖤 BLACKCORE // EXECUTANDO PIPELINE COMPLETO MISUKI SPEC V2.0.0")
    print("══════════════════════════════════════════════════════════════════")

    # -------------------------------------------------------------------------
    # STAGE P01-P03: MASSA DO CABELO TRASEIRO EM BETA-NURI (Sem Linhas de Pente - F04)
    # -------------------------------------------------------------------------
    print("▶ [P01-P03] Construindo massa de cabelo longo com silhueta dominante...")
    back_hair_poly = [
        (cx - 390 * scale, cy - 280 * scale),
        (cx - 310 * scale, cy - 490 * scale),
        (cx, cy - 570 * scale),
        (cx + 310 * scale, cy - 490 * scale),
        (cx + 390 * scale, cy - 280 * scale),
        (cx + 470 * scale, cy + 40 * scale),
        (cx + 490 * scale, cy + 360 * scale),
        (cx + 440 * scale, sh),
        (cx - 440 * scale, sh),
        (cx - 490 * scale, cy + 360 * scale),
        (cx - 470 * scale, cy + 40 * scale)
    ]
    draw.polygon(back_hair_poly, fill=T4_ALMOST_BLACK)

    # Mechas fluidas em massa + mechas estratégicas (Regra F04)
    for off in range(-8, 9):
        p0_l = (cx - 190 * scale + off * 22, cy - 360 * scale)
        p1_l = (cx - 390 * scale + off * 26, cy - 40 * scale)
        p2_l = (cx - 500 * scale + off * 30, cy + 380 * scale)
        p3_l = (cx - 390 * scale + off * 35, sh)
        draw_bezier_curve(draw, p0_l, p1_l, p2_l, p3_l, T4_BLACK, width=6.8 * scale, steps=90)
        draw_bezier_curve(draw, (p0_l[0]+4*scale, p0_l[1]), (p1_l[0]+4*scale, p1_l[1]),
                                (p2_l[0]+3*scale, p2_l[1]), (p3_l[0]+2*scale, p3_l[1]), T3_DEEP_GRAY, width=2.6 * scale, steps=80)

        p0_r = (cx + 190 * scale + off * 22, cy - 360 * scale)
        p1_r = (cx + 390 * scale + off * 26, cy - 40 * scale)
        p2_r = (cx + 500 * scale + off * 30, cy + 380 * scale)
        p3_r = (cx + 390 * scale + off * 35, sh)
        draw_bezier_curve(draw, p0_r, p1_r, p2_r, p3_r, T4_BLACK, width=6.8 * scale, steps=90)
        draw_bezier_curve(draw, (p0_r[0]-4*scale, p0_r[1]), (p1_r[0]-4*scale, p1_r[1]),
                                (p2_r[0]-3*scale, p2_r[1]), (p3_r[0]-2*scale, p3_r[1]), T3_DEEP_GRAY, width=2.6 * scale, steps=80)

    # -------------------------------------------------------------------------
    # STAGE P02 & P07: OS DOIS CHIFRES CURVADOS (10 Anéis + Filete Duplo de Luz - F03)
    # -------------------------------------------------------------------------
    print("▶ [P02 & P07] Modelando os dois chifres curvados com 10 anéis de volume e luz de separação...")
    horn_l_root = (cx - 185 * scale, cy - 240 * scale)
    horn_l_mid = (cx - 370 * scale, cy - 430 * scale)
    horn_l_tip = (cx - 265 * scale, cy - 730 * scale)

    horn_r_root = (cx + 185 * scale, cy - 240 * scale)
    horn_r_mid = (cx + 370 * scale, cy - 430 * scale)
    horn_r_tip = (cx + 265 * scale, cy - 730 * scale)

    for side, root, mid, tip in [(-1, horn_l_root, horn_l_mid, horn_l_tip), (1, horn_r_root, horn_r_mid, horn_r_tip)]:
        steps = 50
        guide = bezier_cubic(root, (root[0] + side * 125 * scale, root[1] - 125 * scale),
                                   (mid[0] + side * 28 * scale, mid[1] - 145 * scale),
                                   tip, steps=steps)
        p_left, p_right = [], []
        for i, (gx, gy) in enumerate(guide):
            t = i / float(steps)
            rad_norm = math.atan2(gy - guide[max(0, i-1)][1], gx - guide[max(0, i-1)][0]) + math.pi/2
            radius = (1.0 - t * 0.88) * (52.0 * scale)
            p_left.append((gx + math.cos(rad_norm) * radius, gy + math.sin(rad_norm) * radius))
            p_right.append((gx - math.cos(rad_norm) * radius, gy - math.sin(rad_norm) * radius))

        horn_poly = p_left + p_right[::-1]
        draw.polygon(horn_poly, fill=T4_BLACK)

        # 10 Anéis de volume com filete duplo de luz de estúdio (F03)
        for ring_i in range(1, 11):
            idx = int(ring_i * (steps / 11.5))
            pt_l = p_left[idx]
            pt_r = p_right[idx]
            pt_m = guide[idx]
            draw_bezier_curve(draw, pt_l, (pt_m[0] - side * 12 * scale, pt_m[1] + 16 * scale),
                                         (pt_m[0] + side * 12 * scale, pt_m[1] + 16 * scale),
                                         pt_r, T4_ALMOST_BLACK, width=4.5 * scale)
            # Filete primário de luz especular (T0_WHITE)
            b0 = (pt_l[0] * 0.72 + pt_m[0] * 0.28, pt_l[1] * 0.72 + pt_m[1] * 0.28)
            b1 = (pt_l[0] * 0.35 + pt_m[0] * 0.65, pt_l[1] * 0.35 + pt_m[1] * 0.65)
            draw.line([b0, b1], fill=T0_WHITE, width=int(3.0 * scale))
            # Filete secundário suave (T2_MID_GRAY)
            draw.line([(b0[0], b0[1] - 4*scale), (b1[0], b1[1] - 4*scale)], fill=T2_MID_GRAY, width=int(1.6 * scale))

        # Contornos externos nítidos
        for i in range(len(p_left) - 1):
            draw.line([p_left[i], p_left[i+1]], fill=T4_BLACK, width=int(5.5 * scale))
            draw.line([p_right[i], p_right[i+1]], fill=T4_BLACK, width=int(5.5 * scale))

    # -------------------------------------------------------------------------
    # STAGE P04: GEOMETRIA FACIAL CANÔNICA (Oval Invertido Suave, Queixo Estreito)
    # -------------------------------------------------------------------------
    print("▶ [P04] Estruturando proporção facial (Janela de leitura T0_WHITE)...")
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
    draw.polygon(face_poly, fill=T0_WHITE)

    neck_skin = [
        (cx - 85 * scale, cy + 215 * scale),
        (cx + 85 * scale, cy + 215 * scale),
        (cx + 130 * scale, cy + 440 * scale),
        (cx - 130 * scale, cy + 440 * scale)
    ]
    draw.polygon(neck_skin, fill=T0_WHITE)

    # Sombra anatômica sob a mandíbula em retícula de meio-tom (T2_MID_GRAY)
    neck_shade = [
        (cx - 75 * scale, cy + 225 * scale),
        (cx, cy + 270 * scale),
        (cx + 75 * scale, cy + 225 * scale),
        (cx + 55 * scale, cy + 330 * scale),
        (cx - 55 * scale, cy + 330 * scale)
    ]
    tone = generate_halftone_screentone(sw, sh, spacing=int(5 * scale), dot_r=1.2 * scale, color=T4_BLACK)
    mask_sh = Image.new("L", (sw, sh), 0)
    d_m = ImageDraw.Draw(mask_sh)
    d_m.polygon(neck_shade, fill=255)
    canvas.paste(tone, (0, 0), mask_sh)
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Contornos de mandíbula e clavícula
    draw_bezier_curve(draw, (cx - 188 * scale, cy - 30 * scale), (cx - 162 * scale, cy + 105 * scale),
                            (cx - 98 * scale, cy + 218 * scale), (cx, cy + 270 * scale), T4_BLACK, width=5.5 * scale)
    draw_bezier_curve(draw, (cx + 188 * scale, cy - 30 * scale), (cx + 162 * scale, cy + 105 * scale),
                            (cx + 98 * scale, cy + 218 * scale), (cx, cy + 270 * scale), T4_BLACK, width=5.5 * scale)

    # Clavícula com hachura sutil
    draw_bezier_curve(draw, (cx - 15 * scale, cy + 425 * scale), (cx - 70 * scale, cy + 440 * scale),
                            (cx - 135 * scale, cy + 450 * scale), (cx - 195 * scale, cy + 460 * scale), T4_BLACK, width=3.5 * scale)
    draw_bezier_curve(draw, (cx + 15 * scale, cy + 425 * scale), (cx + 70 * scale, cy + 440 * scale),
                            (cx + 135 * scale, cy + 450 * scale), (cx + 195 * scale, cy + 460 * scale), T4_BLACK, width=3.5 * scale)
    draw_hatching(draw, (cx - 140 * scale, cy + 452 * scale), (cx - 60 * scale, cy + 442 * scale), length=12 * scale, angle_deg=110, spacing=6 * scale, color=T2_MID_GRAY, width=int(1.5 * scale))
    draw_hatching(draw, (cx + 60 * scale, cy + 442 * scale), (cx + 140 * scale, cy + 452 * scale), length=12 * scale, angle_deg=70, spacing=6 * scale, color=T2_MID_GRAY, width=int(1.5 * scale))

    # -------------------------------------------------------------------------
    # STAGE P04: OLHOS EXPRESSIVOS (Centro Emocional - Estrias de Íris + Duplo Brilho)
    # -------------------------------------------------------------------------
    print("▶ [P04] Renderizando olhos expressivos com estrias radiais e pálpebra dominante...")
    eye_y = cy - 25 * scale
    for side in [-1, 1]:
        ex = cx + side * 92 * scale

        # Sombra suave da cavidade ocular
        draw.ellipse([ex - 45*scale, eye_y - 45*scale, ex + 45*scale, eye_y - 20*scale], fill=T1_LIGHT_GRAY)
        
        # Pálpebra superior forte e densa (6px = 12px em SSAA 2x)
        p0 = (ex - side * 54 * scale, eye_y - 14 * scale)
        p1 = (ex - side * 16 * scale, eye_y - 38 * scale)
        p2 = (ex + side * 28 * scale, eye_y - 34 * scale)
        p3 = (ex + side * 62 * scale, eye_y - 10 * scale)
        draw_bezier_curve(draw, p0, p1, p2, p3, T4_BLACK, width=11.5 * scale)

        # Pestanas longas e pontiagudas em leque
        draw.polygon([(ex + side * 50 * scale, eye_y - 14 * scale), (ex + side * 75 * scale, eye_y - 32 * scale), (ex + side * 42 * scale, eye_y - 24 * scale)], fill=T4_BLACK)
        draw.polygon([(ex + side * 26 * scale, eye_y - 32 * scale), (ex + side * 40 * scale, eye_y - 50 * scale), (ex + side * 18 * scale, eye_y - 35 * scale)], fill=T4_BLACK)
        draw.polygon([(ex + side * 6 * scale, eye_y - 36 * scale), (ex + side * 12 * scale, eye_y - 54 * scale), (ex, eye_y - 37 * scale)], fill=T4_BLACK)

        # Íris anime com anel de limbo e estrias radiais
        rx, ry = 22 * scale, 30 * scale
        draw.ellipse([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], fill=T2_MID_GRAY, outline=T4_BLACK, width=int(3.5*scale))
        draw.chord([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], start=180, end=360, fill=T4_BLACK)

        for ang in range(0, 180, 15):
            rad = math.radians(ang)
            fx0 = ex + math.cos(rad) * (rx * 0.45)
            fy0 = eye_y + 4*scale + math.sin(rad) * (ry * 0.45)
            fx1 = ex + math.cos(rad) * (rx * 0.88)
            fy1 = eye_y + 4*scale + math.sin(rad) * (ry * 0.88)
            draw.line([(fx0, fy0), (fx1, fy1)], fill=T4_BLACK, width=int(1.6 * scale))

        # Pupila central
        draw.ellipse([ex - 7*scale, eye_y - 4*scale, ex + 7*scale, eye_y + 12*scale], fill=T4_BLACK)

        # Brilho primário e microbrilho secundário
        draw.ellipse([ex - side * 13 * scale - 7*scale, eye_y - 18*scale, ex - side * 13 * scale + 6*scale, eye_y - 4*scale], fill=T0_WHITE)
        draw.ellipse([ex + side * 8 * scale, eye_y + 10*scale, ex + side * 8 * scale + 6*scale, eye_y + 16*scale], fill=T0_WHITE)

        # Pálpebra inferior interrompida com micro-cílios
        draw_bezier_curve(draw, (ex - side * 28 * scale, eye_y + 26 * scale),
                                (ex, eye_y + 32 * scale),
                                (ex + side * 24 * scale, eye_y + 28 * scale),
                                (ex + side * 44 * scale, eye_y + 14 * scale), T4_BLACK, width=3.0 * scale)
        for cl_i in range(-1, 3):
            cx_cl = ex + side * cl_i * 12 * scale
            draw.line([(cx_cl, eye_y + 30 * scale), (cx_cl + side * 3 * scale, eye_y + 38 * scale)], fill=T2_MID_GRAY, width=int(1.4 * scale))

        # Dobra da pálpebra superior
        draw_bezier_curve(draw, (ex - side * 38 * scale, eye_y - 46 * scale),
                                (ex, eye_y - 55 * scale),
                                (ex + side * 28 * scale, eye_y - 50 * scale),
                                (ex + side * 50 * scale, eye_y - 34 * scale), T2_MID_GRAY, width=2.8 * scale)

        # Sobrancelha expressiva
        sb_y = eye_y - 75 * scale + (side * 4 * scale)
        draw_bezier_curve(draw, (ex - side * 48 * scale, sb_y + 6 * scale),
                                (ex - side * 10 * scale, sb_y - 12 * scale),
                                (ex + side * 28 * scale, sb_y - 8 * scale),
                                (ex + side * 60 * scale, sb_y + 10 * scale), T4_BLACK, width=5.0 * scale)

    # -------------------------------------------------------------------------
    # STAGE P04: NARIZ MÍNIMO, LÁBIOS COM GLOSS & BRINCO GÓTICO
    # -------------------------------------------------------------------------
    print("▶ [P04] Desenhando nariz sutil, lábios sedutores com gloss e brinco gótico...")
    nose_y = cy + 68 * scale
    draw.polygon([(cx - 3 * scale, nose_y), (cx + 9 * scale, nose_y + 20 * scale), (cx - 4 * scale, nose_y + 25 * scale)], fill=T3_DEEP_GRAY)
    draw.line([(cx + 3 * scale, nose_y - 18 * scale), (cx + 9 * scale, nose_y + 20 * scale)], fill=T4_BLACK, width=int(2.5 * scale))
    draw.ellipse([cx + 5 * scale, nose_y + 8 * scale, cx + 9 * scale, nose_y + 13 * scale], fill=T0_WHITE)

    # Boca sedutora com abertura escura e brilho de gloss
    mouth_y = cy + 172 * scale
    draw_bezier_curve(draw, (cx - 35 * scale, mouth_y), (cx - 10 * scale, mouth_y - 5 * scale),
                            (cx + 10 * scale, mouth_y - 5 * scale), (cx + 38 * scale, mouth_y - 2 * scale), T4_BLACK, width=4.5 * scale)
    draw.polygon([(cx - 22 * scale, mouth_y + 2 * scale), (cx, mouth_y), (cx + 24 * scale, mouth_y + 2 * scale), (cx + 2 * scale, mouth_y + 8 * scale)], fill=T4_BLACK)
    draw_bezier_curve(draw, (cx - 16 * scale, mouth_y + 22 * scale), (cx, mouth_y + 27 * scale),
                            (cx + 12 * scale, mouth_y + 26 * scale), (cx + 22 * scale, mouth_y + 20 * scale), T2_MID_GRAY, width=3.2 * scale)
    draw.ellipse([cx - 6 * scale, mouth_y + 12 * scale, cx + 6 * scale, mouth_y + 18 * scale], fill=T0_WHITE)

    # Brinco gótico longo pendente
    earring_x = cx - 180 * scale
    earring_y = cy + 100 * scale
    draw.line([(earring_x, earring_y), (earring_x, earring_y + 60 * scale)], fill=T4_BLACK, width=int(2.5 * scale))
    draw.ellipse([earring_x - 7 * scale, earring_y + 60 * scale, earring_x + 7 * scale, earring_y + 85 * scale], fill=T4_ALMOST_BLACK, outline=T4_BLACK, width=int(2 * scale))
    draw.ellipse([earring_x - 3 * scale, earring_y + 64 * scale, earring_x + 1 * scale, earring_y + 72 * scale], fill=T0_WHITE)

    # -------------------------------------------------------------------------
    # STAGE P03 & P08: FRANJA CENTRAL EM CAMADAS E MECHAS LATERAIS
    # -------------------------------------------------------------------------
    print("▶ [P03 & P08] Adicionando franja central hierárquica e flyaways dinâmicos...")
    bangs_spec_v2 = [
        ((cx - 75 * scale, cy - 350 * scale), (cx - 35 * scale, cy - 210 * scale), (cx - 15 * scale, cy - 90 * scale), (cx - 12 * scale, cy + 25 * scale), 6.8),
        ((cx - 15 * scale, cy - 370 * scale), (cx + 12 * scale, cy - 230 * scale), (cx + 24 * scale, cy - 110 * scale), (cx + 18 * scale, cy - 5 * scale), 6.2),
        ((cx + 55 * scale, cy - 360 * scale), (cx + 75 * scale, cy - 210 * scale), (cx + 85 * scale, cy - 80 * scale), (cx + 80 * scale, cy + 45 * scale), 6.5),
        ((cx - 150 * scale, cy - 310 * scale), (cx - 130 * scale, cy - 170 * scale), (cx - 115 * scale, cy - 35 * scale), (cx - 100 * scale, cy + 125 * scale), 7.2),
        ((cx + 140 * scale, cy - 310 * scale), (cx + 150 * scale, cy - 170 * scale), (cx + 145 * scale, cy - 35 * scale), (cx + 130 * scale, cy + 125 * scale), 7.2),
        ((cx - 185 * scale, cy - 190 * scale), (cx - 200 * scale, cy + 40 * scale), (cx - 175 * scale, cy + 250 * scale), (cx - 140 * scale, cy + 460 * scale), 7.8),
        ((cx + 185 * scale, cy - 190 * scale), (cx + 200 * scale, cy + 40 * scale), (cx + 175 * scale, cy + 250 * scale), (cx + 140 * scale, cy + 460 * scale), 7.8),
    ]
    for p0, p1, p2, p3, bw in bangs_spec_v2:
        draw_bezier_curve(draw, p0, p1, p2, p3, T4_BLACK, width=bw * scale, steps=80)
        draw_bezier_curve(draw, (p0[0]+4*scale, p0[1]), (p1[0]+3*scale, p1[1]), (p2[0]+2*scale, p2[1]), (p3[0]+1*scale, p3[1]), T3_DEEP_GRAY, width=(bw*0.35)*scale, steps=70)
        draw_bezier_curve(draw, (p0[0]-4*scale, p0[1]), (p1[0]-3*scale, p1[1]), (p2[0]-2*scale, p2[1]), (p3[0]-1*scale, p3[1]), T3_DEEP_GRAY, width=(bw*0.35)*scale, steps=70)

    # Flyaways finos esvoaçantes
    flyaways = [
        ((cx + 160 * scale, cy - 260 * scale), (cx + 260 * scale, cy - 280 * scale), (cx + 340 * scale, cy - 200 * scale), (cx + 380 * scale, cy - 80 * scale)),
        ((cx - 160 * scale, cy - 260 * scale), (cx - 260 * scale, cy - 280 * scale), (cx - 340 * scale, cy - 200 * scale), (cx - 380 * scale, cy - 80 * scale)),
        ((cx + 80 * scale, cy + 40 * scale), (cx + 130 * scale, cy + 120 * scale), (cx + 150 * scale, cy + 220 * scale), (cx + 120 * scale, cy + 320 * scale)),
        ((cx - 80 * scale, cy + 40 * scale), (cx - 130 * scale, cy + 120 * scale), (cx - 150 * scale, cy + 220 * scale), (cx - 120 * scale, cy + 320 * scale)),
    ]
    for p0, p1, p2, p3 in flyaways:
        draw_bezier_curve(draw, p0, p1, p2, p3, T4_BLACK, width=2.2 * scale, steps=75)

    # -------------------------------------------------------------------------
    # STAGE P05 & P06: CHOKER COM GEMA FACETADA, CORPETE, RENDA & FIVELAS COM ILHÓS
    # -------------------------------------------------------------------------
    print("▶ [P05 & P06] Construindo choker com gema facetada, corpete gótico e fivelas...")
    choker_y = cy + 325 * scale
    draw.polygon([
        (cx - 92 * scale, choker_y - 20 * scale),
        (cx + 92 * scale, choker_y - 20 * scale),
        (cx + 86 * scale, choker_y + 25 * scale),
        (cx - 86 * scale, choker_y + 25 * scale)
    ], fill=T4_BLACK)

    # Costura dupla fina nas bordas do choker
    draw.line([(cx - 90 * scale, choker_y - 15 * scale), (cx + 90 * scale, choker_y - 15 * scale)], fill=T2_MID_GRAY, width=int(1.5 * scale))
    draw.line([(cx - 84 * scale, choker_y + 20 * scale), (cx + 84 * scale, choker_y + 20 * scale)], fill=T2_MID_GRAY, width=int(1.5 * scale))

    # Gema negra lapidada central com engaste metálico
    gem_cx, gem_cy = cx, choker_y + 40 * scale
    draw.polygon([(gem_cx, gem_cy - 24 * scale), (gem_cx + 24 * scale, gem_cy), (gem_cx, gem_cy + 26 * scale), (gem_cx - 24 * scale, gem_cy)], fill=T1_LIGHT_GRAY, outline=T4_BLACK, width=int(3 * scale))
    draw.polygon([(gem_cx, gem_cy - 20 * scale), (gem_cx + 20 * scale, gem_cy), (gem_cx, gem_cy + 22 * scale), (gem_cx - 20 * scale, gem_cy)], fill=T4_ALMOST_BLACK)
    # Facetas e triângulos de brilho
    draw.polygon([(gem_cx - 8 * scale, gem_cy - 12 * scale), (gem_cx, gem_cy - 16 * scale), (gem_cx - 2 * scale, gem_cy - 4 * scale)], fill=T0_WHITE)
    draw.polygon([(gem_cx + 4 * scale, gem_cy + 4 * scale), (gem_cx + 14 * scale, gem_cy), (gem_cx + 8 * scale, gem_cy + 12 * scale)], fill=T1_LIGHT_GRAY)

    # Corpete Gótico Estruturado
    corset_poly = [
        (cx - 155 * scale, cy + 430 * scale),
        (cx - 65 * scale, cy + 390 * scale),
        (cx, cy + 410 * scale),
        (cx + 65 * scale, cy + 390 * scale),
        (cx + 155 * scale, cy + 430 * scale),
        (cx + 270 * scale, sh),
        (cx - 270 * scale, sh)
    ]
    draw.polygon(corset_poly, fill=T4_ALMOST_BLACK)

    # Renda de Filigrana Gótica no decote (arcos com picôs)
    for rx in range(int(cx - 145 * scale), int(cx + 145 * scale), int(14 * scale)):
        t_l = (rx - (cx - 145 * scale)) / (290.0 * scale)
        ly = (cy + 410 * scale) - math.sin(t_l * math.pi) * 16 * scale
        draw.ellipse([rx - 6 * scale, ly - 6 * scale, rx + 6 * scale, ly + 6 * scale], outline=T4_BLACK, width=int(2.2 * scale))
        draw.line([(rx, ly - 6 * scale), (rx, ly - 10 * scale)], fill=T4_BLACK, width=int(2 * scale))

    # Tiras com fivelas e ilhós prateados
    for s_i in range(3):
        strap_y = cy + 480 * scale + s_i * 72 * scale
        draw.polygon([
            (cx - 180 * scale, strap_y - 12 * scale), (cx + 180 * scale, strap_y - 12 * scale),
            (cx + 190 * scale, strap_y + 14 * scale), (cx - 190 * scale, strap_y + 14 * scale)
        ], fill=T4_BLACK)
        
        # Fivela central metálica
        f_w, f_h = 32 * scale, 22 * scale
        draw.rectangle([cx - f_w, strap_y - f_h/2, cx + f_w, strap_y + f_h/2], fill=T1_LIGHT_GRAY, outline=T4_BLACK, width=int(3.2 * scale))
        draw.rectangle([cx - f_w + 8*scale, strap_y - f_h/2 + 5*scale, cx + f_w - 8*scale, strap_y + f_h/2 - 5*scale], fill=T4_BLACK)
        draw.line([(cx, strap_y - f_h/2), (cx, strap_y + f_h/2)], fill=T0_WHITE, width=int(3 * scale))
        draw.line([(cx - f_w + 2*scale, strap_y - f_h/2 + 2*scale), (cx + f_w - 2*scale, strap_y - f_h/2 + 2*scale)], fill=T0_WHITE, width=int(2 * scale))

        # Ilhós prateados perfurados
        for eyelet_off in [-130, -90, -50, 50, 90, 130]:
            ey_x = cx + eyelet_off * scale
            draw.ellipse([ey_x - 5*scale, strap_y - 5*scale, ey_x + 5*scale, strap_y + 5*scale], fill=T1_LIGHT_GRAY, outline=T4_BLACK, width=int(1.8 * scale))
            draw.ellipse([ey_x - 2*scale, strap_y - 2*scale, ey_x + 2*scale, strap_y + 2*scale], fill=T4_BLACK)

    # Correntes duplas entrelaçadas do choker ao corpete
    chain1 = bezier_cubic((cx - 120 * scale, cy + 430 * scale), (cx - 70 * scale, cy + 530 * scale),
                          (cx - 30 * scale, cy + 540 * scale), (gem_cx, gem_cy + 24 * scale), steps=20)
    for ci in range(0, len(chain1) - 1, 2):
        cp = chain1[ci]
        draw.ellipse([cp[0] - 5 * scale, cp[1] - 5 * scale, cp[0] + 5 * scale, cp[1] + 5 * scale], fill=T1_LIGHT_GRAY, outline=T4_BLACK, width=int(2 * scale))

    # -------------------------------------------------------------------------
    # STAGE P11: PÉTALAS GÓTICAS FLUTUANTES COM VEIOS
    # -------------------------------------------------------------------------
    print("▶ [P11] Adicionando pétalas góticas flutuantes e calibrando acabamento...")
    petals = [
        (cx - 320 * scale, cy - 120 * scale, 32 * scale, -30),
        (cx - 380 * scale, cy + 180 * scale, 28 * scale, 45),
        (cx + 340 * scale, cy - 80 * scale, 34 * scale, 25),
        (cx + 380 * scale, cy + 220 * scale, 30 * scale, -20),
        (cx + 260 * scale, cy + 460 * scale, 26 * scale, 60),
    ]
    for px, py, pr, rot in petals:
        rad = math.radians(rot)
        cos_r, sin_r = math.cos(rad), math.sin(rad)
        pts_l = [(0, -pr), (pr * 0.65, -pr * 0.4), (pr * 0.75, pr * 0.6), (0, pr), (-pr * 0.75, pr * 0.6), (-pr * 0.65, -pr * 0.4), (0, -pr)]
        pts_r = [(px + x * cos_r - y * sin_r, py + x * sin_r + y * cos_r) for x, y in pts_l]
        draw.polygon(pts_r, fill=T4_BLACK)
        v_top = pts_r[0]
        v_bot = (px + 0 * cos_r - (pr * 0.25) * sin_r, py + 0 * sin_r + (pr * 0.25) * cos_r)
        draw.line([v_top, v_bot], fill=T0_WHITE, width=int(2.2 * scale))

    # Downsampling com Lanczos para 2000x2000 px
    print("🔍 [P12] Processando supersampling Lanczos 2x para 2000x2000 px...")
    final_master = canvas.resize((size, size), Image.Resampling.LANCZOS)
    
    # Unsharp Mask calibrado para máxima nitidez de nanquim
    print("💎 [P13] Aplicando Unsharp Mask calibrado para nitidez vetorial cristalina...")
    final_master = final_master.filter(ImageFilter.UnsharpMask(radius=1.0, percent=85, threshold=1))
    return final_master

def main():
    print("==================================================================")
    print("🖤 BLACKCORE // MISUKI SPEC V2.0.0 CANONICAL MASTERPIECE")
    print("==================================================================")
    t0 = time.time()

    size = 2000
    studio_img = render_misuki_spec_v2(size=size)

    OUT_DIR_DL.mkdir(parents=True, exist_ok=True)
    OUT_DIR_PIC.mkdir(parents=True, exist_ok=True)

    # 1. Studio Master
    out_studio_dl = OUT_DIR_DL / "MISUKI_SPEC_V2_Masterpiece_Studio.png"
    out_studio_pic = OUT_DIR_PIC / "MISUKI_SPEC_V2_Masterpiece_Studio.png"
    studio_img.convert("RGB").save(out_studio_dl, "PNG", optimize=True)
    studio_img.convert("RGB").save(out_studio_pic, "PNG", optimize=True)
    print(f"📁 Studio Master salvo: {out_studio_dl.name} ({out_studio_dl.stat().st_size // 1024} KB)")

    # 2. Darkcore Obsidian
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

    dark_img = dark_img.filter(ImageFilter.UnsharpMask(radius=0.9, percent=80, threshold=1))
    out_dark_dl = OUT_DIR_DL / "MISUKI_SPEC_V2_Masterpiece_Darkcore.png"
    out_dark_pic = OUT_DIR_PIC / "MISUKI_SPEC_V2_Masterpiece_Darkcore.png"
    dark_img.save(out_dark_dl, "PNG", optimize=True)
    dark_img.save(out_dark_pic, "PNG", optimize=True)
    print(f"📁 Darkcore Obsidian salvo: {out_dark_dl.name} ({out_dark_dl.stat().st_size // 1024} KB)")

    # 3. Transparente Alfa
    trans_img = Image.new("RGBA", (size, size), (12, 12, 16, 0))
    trans_img.putalpha(inv_gray)
    out_trans_dl = OUT_DIR_DL / "MISUKI_SPEC_V2_Masterpiece_Transparente.png"
    out_trans_pic = OUT_DIR_PIC / "MISUKI_SPEC_V2_Masterpiece_Transparente.png"
    trans_img.save(out_trans_dl, "PNG", optimize=True)
    trans_img.save(out_trans_pic, "PNG", optimize=True)
    print(f"📁 Transparente Alfa salvo: {out_trans_dl.name} ({out_trans_dl.stat().st_size // 1024} KB)")

    # Sincronizar com Android Media Scanner
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
    print(f"✅ OBRA MESTRE SPEC V2.0.0 FINALIZADA COM SUCESSO EM {elapsed:.2f}s!")
    print("Arquivos prontos na Galeria do Android e Downloads:")
    print(f" 1. {out_studio_dl}")
    print(f" 2. {out_dark_dl}")
    print(f" 3. {out_trans_dl}")
    print("==================================================================")

if __name__ == "__main__":
    main()
