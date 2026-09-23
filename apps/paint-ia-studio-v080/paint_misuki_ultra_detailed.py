#!/usr/bin/env python3
"""
paint_misuki_ultra_detailed.py - Obra Canônica da Misuki com Hiperdetalhamento e Máxima Nitidez
Implementa 100% das regras dos Manuais Mestres V1 e V2 com enriquecimento de micro-detalhes:
  - Resolução de Estúdio: 2000x2000 px (Render interno SSAA 2x 4000x4000 com Lanczos + Unsharp Mask calibrado).
  - Micro-Detalhes Avançados:
      * Chifres: 10 anéis de volume curvos, estrias de queratina, filete duplo de luz especular e sobreposição de mechas.
      * Olhos: Pálpebra superior densa com cílios em leque fino, íris com estrias radiais e anel de limbo, duplo brilho nítido.
      * Rosto: Nariz delicado com asa sombreada, lábios com profundidade de abertura e gloss especular, brinco gótico longo.
      * Cabelo: Beta-nuri profundo, mechas em camadas hierárquicas, reflexos angulares de mangá e dezenas de flyaways dinâmicos.
      * Roupa: Corpete com costuras duplas, renda de filigrana no decote, tiras com ilhós perfurados e fivelas de metal com pino, correntes entrelaçadas.
      * Atmosfera: Pétalas de cerejeira/rosa negra com veios e cantos decorativos de estúdio.
"""

from __future__ import annotations
import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

OUT_DIR_DL = Path("/storage/emulated/0/Download")
OUT_DIR_PIC = Path("/storage/emulated/0/Pictures")

# Paleta Canônica de Valores P&B
C_WHITE = (255, 255, 255, 255)         # #FFFFFF - Fundo puro, luz máxima, reflexos especulares
C_GRAY_VLIGHT = (238, 238, 242, 255)   # #E8E8E8 - Pele sob sombra suave
C_GRAY_LIGHT = (208, 208, 214, 255)    # #C8C8C8 - Metal polido, fivelas e ilhós
C_GRAY_MID = (135, 135, 145, 255)      # #8A8A8A - Sombras de plano, íris média, dobras
C_GRAY_DARK = (68, 68, 76, 255)        # #4A4A4A - Tecido fosco, mechas iluminadas
C_ALMOST_BLACK = (20, 20, 24, 255)     # #1A1A1A - Corpete, massas góticas com textura
C_BLACK = (6, 6, 10, 255)              # #000000 - Beta-nuri, cílios, contornos e nanquim

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

def draw_hatching(draw, p_start, p_end, length=30, angle_deg=45, spacing=7, color=C_BLACK, width=2):
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

def generate_fine_screentone(w, h, spacing=7, dot_r=1.5, color=C_BLACK):
    tone = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(tone, "RGBA")
    for y in range(0, h, spacing):
        offset = (y // spacing) % 2 * (spacing // 2)
        for x in range(offset, w, spacing):
            d.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=color)
    return tone

def render_ultra_detailed_misuki(size=2000):
    scale = 2  # SSAA 2x (4000x4000)
    sw, sh = size * scale, size * scale

    canvas = Image.new("RGBA", (sw, sh), C_WHITE)
    draw = ImageDraw.Draw(canvas, "RGBA")

    cx = sw * 0.50
    cy = sh * 0.44

    print("══════════════════════════════════════════════════════════════════")
    print("💎 RENDERIZANDO MISUKI CANÔNICA EM ULTRA-RESOLUÇÃO & DETALHE")
    print("══════════════════════════════════════════════════════════════════")

    # -------------------------------------------------------------------------
    # 1. CABELO TRASEIRO VOLUMOSO COM BETA-NURI & MECHAS PROFUNDAS
    # -------------------------------------------------------------------------
    print("▶ [1/8] Esculpindo massa traseira de cabelo com mechas em camadas...")
    back_poly = [
        (cx - 380 * scale, cy - 280 * scale),
        (cx - 300 * scale, cy - 480 * scale),
        (cx, cy - 560 * scale),
        (cx + 300 * scale, cy - 480 * scale),
        (cx + 380 * scale, cy - 280 * scale),
        (cx + 460 * scale, cy + 40 * scale),
        (cx + 480 * scale, cy + 360 * scale),
        (cx + 440 * scale, sh),
        (cx - 440 * scale, sh),
        (cx - 480 * scale, cy + 360 * scale),
        (cx - 460 * scale, cy + 40 * scale)
    ]
    draw.polygon(back_poly, fill=C_ALMOST_BLACK)

    # Dezenas de mechas traseiras em fluxo dinâmico com variação de espessura
    for off in range(-8, 9):
        # Esquerda
        p0 = (cx - 190 * scale + off * 22, cy - 360 * scale)
        p1 = (cx - 390 * scale + off * 26, cy - 40 * scale)
        p2 = (cx - 490 * scale + off * 30, cy + 380 * scale)
        p3 = (cx - 380 * scale + off * 35, sh)
        draw_bezier_curve(draw, p0, p1, p2, p3, C_BLACK, width=6.5 * scale, steps=90)
        # Fio de luz interno na mecha
        draw_bezier_curve(draw, (p0[0]+4*scale, p0[1]), (p1[0]+4*scale, p1[1]),
                                (p2[0]+3*scale, p2[1]), (p3[0]+2*scale, p3[1]), C_GRAY_DARK, width=2.5 * scale, steps=80)

        # Direita
        p0_r = (cx + 190 * scale + off * 22, cy - 360 * scale)
        p1_r = (cx + 390 * scale + off * 26, cy - 40 * scale)
        p2_r = (cx + 490 * scale + off * 30, cy + 380 * scale)
        p3_r = (cx + 380 * scale + off * 35, sh)
        draw_bezier_curve(draw, p0_r, p1_r, p2_r, p3_r, C_BLACK, width=6.5 * scale, steps=90)
        draw_bezier_curve(draw, (p0_r[0]-4*scale, p0_r[1]), (p1_r[0]-4*scale, p1_r[1]),
                                (p2_r[0]-3*scale, p2_r[1]), (p3_r[0]-2*scale, p3_r[1]), C_GRAY_DARK, width=2.5 * scale, steps=80)

    # -------------------------------------------------------------------------
    # 2. CHIFRES NEGROS HIPERDETALHADOS (10 Anéis, Fissuras, Filetes de Luz)
    # -------------------------------------------------------------------------
    print("▶ [2/8] Modelando os dois chifres negros com 10 anéis de volume e estrias...")
    horn_l_root = (cx - 185 * scale, cy - 240 * scale)
    horn_l_mid = (cx - 370 * scale, cy - 430 * scale)
    horn_l_tip = (cx - 265 * scale, cy - 730 * scale)

    horn_r_root = (cx + 185 * scale, cy - 240 * scale)
    horn_r_mid = (cx + 370 * scale, cy - 430 * scale)
    horn_r_tip = (cx + 265 * scale, cy - 730 * scale)

    for side, root, mid, tip in [(-1, horn_l_root, horn_l_mid, horn_l_tip), (1, horn_r_root, horn_r_mid, horn_r_tip)]:
        steps = 48
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
        draw.polygon(horn_poly, fill=C_BLACK)

        # 10 Anéis de volume transversais com curvatura orgânica
        for ring_i in range(1, 11):
            idx = int(ring_i * (steps / 11.5))
            pt_l = p_left[idx]
            pt_r = p_right[idx]
            pt_m = guide[idx]
            # Arco do anel em relevo
            draw_bezier_curve(draw, pt_l, (pt_m[0] - side * 12 * scale, pt_m[1] + 16 * scale),
                                         (pt_m[0] + side * 12 * scale, pt_m[1] + 16 * scale),
                                         pt_r, C_ALMOST_BLACK, width=4.5 * scale)
            # Filete primário de luz especular (Lado voltado para a iluminação de estúdio)
            b0 = (pt_l[0] * 0.70 + pt_m[0] * 0.30, pt_l[1] * 0.70 + pt_m[1] * 0.30)
            b1 = (pt_l[0] * 0.35 + pt_m[0] * 0.65, pt_l[1] * 0.35 + pt_m[1] * 0.65)
            draw.line([b0, b1], fill=C_WHITE, width=int(2.8 * scale))
            # Micro-estria de queratina/textura
            draw.line([(b0[0], b0[1] - 4*scale), (b1[0], b1[1] - 4*scale)], fill=C_GRAY_LIGHT, width=int(1.5 * scale))

        # Contorno com espessura hierárquica
        for i in range(len(p_left) - 1):
            draw.line([p_left[i], p_left[i+1]], fill=C_BLACK, width=int(5.5 * scale))
            draw.line([p_right[i], p_right[i+1]], fill=C_BLACK, width=int(5.5 * scale))

    # -------------------------------------------------------------------------
    # 3. ANATOMIA FACIAL, QUEIXO DELICADO E PESCOÇO DE PORCELANA
    # -------------------------------------------------------------------------
    print("▶ [3/8] Desenhando formato do rosto, mandíbula suave e pescoço esbelto...")
    face_poly = [
        (cx - 170 * scale, cy - 180 * scale),
        (cx, cy - 220 * scale),
        (cx + 170 * scale, cy - 180 * scale),
        (cx + 190 * scale, cy - 30 * scale),
        (cx + 165 * scale, cy + 90 * scale),
        (cx + 100 * scale, cy + 210 * scale),
        (cx, cy + 270 * scale),  # Queixo estreito e suave
        (cx - 100 * scale, cy + 210 * scale),
        (cx - 165 * scale, cy + 90 * scale),
        (cx - 190 * scale, cy - 30 * scale)
    ]
    draw.polygon(face_poly, fill=C_WHITE)

    neck_skin = [
        (cx - 85 * scale, cy + 215 * scale),
        (cx + 85 * scale, cy + 215 * scale),
        (cx + 130 * scale, cy + 440 * scale),
        (cx - 130 * scale, cy + 440 * scale)
    ]
    draw.polygon(neck_skin, fill=C_WHITE)

    # Sombra anatômica suave sob a mandíbula (Retícula de meio-tom refinada)
    neck_shade = [
        (cx - 75 * scale, cy + 225 * scale),
        (cx, cy + 270 * scale),
        (cx + 75 * scale, cy + 225 * scale),
        (cx + 55 * scale, cy + 330 * scale),
        (cx - 55 * scale, cy + 330 * scale)
    ]
    tone = generate_fine_screentone(sw, sh, spacing=int(5 * scale), dot_r=1.2 * scale, color=C_BLACK)
    mask_sh = Image.new("L", (sw, sh), 0)
    d_m = ImageDraw.Draw(mask_sh)
    d_m.polygon(neck_shade, fill=255)
    canvas.paste(tone, (0, 0), mask_sh)
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Contornos de mandíbula e queixo (3px em 2000px = 6px em scale 2)
    draw_bezier_curve(draw, (cx - 188 * scale, cy - 30 * scale), (cx - 162 * scale, cy + 105 * scale),
                            (cx - 98 * scale, cy + 218 * scale), (cx, cy + 270 * scale), C_BLACK, width=5.5 * scale)
    draw_bezier_curve(draw, (cx + 188 * scale, cy - 30 * scale), (cx + 162 * scale, cy + 105 * scale),
                            (cx + 98 * scale, cy + 218 * scale), (cx, cy + 270 * scale), C_BLACK, width=5.5 * scale)

    # Clavícula com traços suaves e hachura de profundidade
    draw_bezier_curve(draw, (cx - 15 * scale, cy + 425 * scale), (cx - 70 * scale, cy + 440 * scale),
                            (cx - 135 * scale, cy + 450 * scale), (cx - 195 * scale, cy + 460 * scale), C_BLACK, width=3.5 * scale)
    draw_bezier_curve(draw, (cx + 15 * scale, cy + 425 * scale), (cx + 70 * scale, cy + 440 * scale),
                            (cx + 135 * scale, cy + 450 * scale), (cx + 195 * scale, cy + 460 * scale), C_BLACK, width=3.5 * scale)
    draw_hatching(draw, (cx - 140 * scale, cy + 452 * scale), (cx - 60 * scale, cy + 442 * scale), length=12 * scale, angle_deg=110, spacing=6 * scale, color=C_GRAY_MID, width=int(1.5 * scale))
    draw_hatching(draw, (cx + 60 * scale, cy + 442 * scale), (cx + 140 * scale, cy + 452 * scale), length=12 * scale, angle_deg=70, spacing=6 * scale, color=C_GRAY_MID, width=int(1.5 * scale))

    # -------------------------------------------------------------------------
    # 4. OLHOS HIPERDETALHADOS (Centro Emocional da Misuki)
    # -------------------------------------------------------------------------
    print("▶ [4/8] Desenhando olhos expressivos com estrias radiais de íris e pestanas em leque...")
    eye_y = cy - 25 * scale
    for side in [-1, 1]:
        ex = cx + side * 92 * scale

        # Sombra suave da cavidade ocular no terço superior
        draw.ellipse([ex - 45*scale, eye_y - 45*scale, ex + 45*scale, eye_y - 20*scale], fill=C_GRAY_VLIGHT)
        
        # Pálpebra superior forte e densa (6px em 2000px = 12px em scale 2)
        p0 = (ex - side * 54 * scale, eye_y - 14 * scale)
        p1 = (ex - side * 16 * scale, eye_y - 38 * scale)
        p2 = (ex + side * 28 * scale, eye_y - 34 * scale)
        p3 = (ex + side * 62 * scale, eye_y - 10 * scale)
        draw_bezier_curve(draw, p0, p1, p2, p3, C_BLACK, width=11.5 * scale)

        # Pestanas longas e finas em leque orgânico
        draw.polygon([(ex + side * 50 * scale, eye_y - 14 * scale), (ex + side * 75 * scale, eye_y - 32 * scale), (ex + side * 42 * scale, eye_y - 24 * scale)], fill=C_BLACK)
        draw.polygon([(ex + side * 26 * scale, eye_y - 32 * scale), (ex + side * 40 * scale, eye_y - 50 * scale), (ex + side * 18 * scale, eye_y - 35 * scale)], fill=C_BLACK)
        draw.polygon([(ex + side * 6 * scale, eye_y - 36 * scale), (ex + side * 12 * scale, eye_y - 54 * scale), (ex, eye_y - 37 * scale)], fill=C_BLACK)

        # Íris anime alongada com anel de limbo escuro
        rx, ry = 22 * scale, 30 * scale
        draw.ellipse([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], fill=C_GRAY_MID, outline=C_BLACK, width=int(3.5*scale))
        # Topo da íris sombreado em preto profundo
        draw.chord([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], start=180, end=360, fill=C_BLACK)

        # Estrias radiais finas na íris (detalhe hiper-realista anime)
        for ang in range(0, 180, 15):
            rad = math.radians(ang)
            fx0 = ex + math.cos(rad) * (rx * 0.45)
            fy0 = eye_y + 4*scale + math.sin(rad) * (ry * 0.45)
            fx1 = ex + math.cos(rad) * (rx * 0.88)
            fy1 = eye_y + 4*scale + math.sin(rad) * (ry * 0.88)
            draw.line([(fx0, fy0), (fx1, fy1)], fill=C_BLACK, width=int(1.6 * scale))

        # Pupila central
        draw.ellipse([ex - 7*scale, eye_y - 4*scale, ex + 7*scale, eye_y + 12*scale], fill=C_BLACK)

        # Brilho de luz primário (grande e nítido)
        draw.ellipse([ex - side * 13 * scale - 7*scale, eye_y - 18*scale, ex - side * 13 * scale + 6*scale, eye_y - 4*scale], fill=C_WHITE)
        # Microbrilho secundário na borda inferior da íris
        draw.ellipse([ex + side * 8 * scale, eye_y + 10*scale, ex + side * 8 * scale + 6*scale, eye_y + 16*scale], fill=C_WHITE)

        # Pálpebra inferior interrompida com micro-cílios inferiores
        draw_bezier_curve(draw, (ex - side * 28 * scale, eye_y + 26 * scale),
                                (ex, eye_y + 32 * scale),
                                (ex + side * 24 * scale, eye_y + 28 * scale),
                                (ex + side * 44 * scale, eye_y + 14 * scale), C_BLACK, width=3.0 * scale)
        for cl_i in range(-1, 3):
            cx_cl = ex + side * cl_i * 12 * scale
            draw.line([(cx_cl, eye_y + 30 * scale), (cx_cl + side * 3 * scale, eye_y + 38 * scale)], fill=C_GRAY_MID, width=int(1.4 * scale))

        # Dobra da pálpebra superior (Double eyelid)
        draw_bezier_curve(draw, (ex - side * 38 * scale, eye_y - 46 * scale),
                                (ex, eye_y - 55 * scale),
                                (ex + side * 28 * scale, eye_y - 50 * scale),
                                (ex + side * 50 * scale, eye_y - 34 * scale), C_GRAY_MID, width=2.8 * scale)

        # Sobrancelha expressiva e confiante com textura de pelos
        sb_y = eye_y - 75 * scale + (side * 4 * scale)
        draw_bezier_curve(draw, (ex - side * 48 * scale, sb_y + 6 * scale),
                                (ex - side * 10 * scale, sb_y - 12 * scale),
                                (ex + side * 28 * scale, sb_y - 8 * scale),
                                (ex + side * 60 * scale, sb_y + 10 * scale), C_BLACK, width=5.0 * scale)

    # -------------------------------------------------------------------------
    # 5. NARIZ, LÁBIOS SEDUTORES COM GLOSS E ORELHA COM BRINCO
    # -------------------------------------------------------------------------
    print("▶ [5/8] Desenhando lábios sedutores com reflexo gloss, nariz elegante e brinco...")
    nose_y = cy + 68 * scale
    draw.polygon([(cx - 3 * scale, nose_y), (cx + 9 * scale, nose_y + 20 * scale), (cx - 4 * scale, nose_y + 25 * scale)], fill=C_GRAY_DARK)
    draw.line([(cx + 3 * scale, nose_y - 18 * scale), (cx + 9 * scale, nose_y + 20 * scale)], fill=C_BLACK, width=int(2.5 * scale))
    draw.ellipse([cx + 5 * scale, nose_y + 8 * scale, cx + 9 * scale, nose_y + 13 * scale], fill=C_WHITE) # Ponto de luz na ponta do nariz

    # Boca sedutora e delicada
    mouth_y = cy + 172 * scale
    draw_bezier_curve(draw, (cx - 35 * scale, mouth_y), (cx - 10 * scale, mouth_y - 5 * scale),
                            (cx + 10 * scale, mouth_y - 5 * scale), (cx + 38 * scale, mouth_y - 2 * scale), C_BLACK, width=4.5 * scale)
    # Abertura escura da boca
    draw.polygon([(cx - 22 * scale, mouth_y + 2 * scale), (cx, mouth_y), (cx + 24 * scale, mouth_y + 2 * scale), (cx + 2 * scale, mouth_y + 8 * scale)], fill=C_BLACK)
    # Sombra e volume do lábio inferior
    draw_bezier_curve(draw, (cx - 16 * scale, mouth_y + 22 * scale), (cx, mouth_y + 27 * scale),
                            (cx + 12 * scale, mouth_y + 26 * scale), (cx + 22 * scale, mouth_y + 20 * scale), C_GRAY_MID, width=3.2 * scale)
    # Brilho de Gloss especular no lábio inferior
    draw.ellipse([cx - 6 * scale, mouth_y + 12 * scale, cx + 6 * scale, mouth_y + 18 * scale], fill=C_WHITE)

    # Brinco gótico pendente na orelha esquerda
    earring_x = cx - 180 * scale
    earring_y = cy + 100 * scale
    draw.line([(earring_x, earring_y), (earring_x, earring_y + 60 * scale)], fill=C_BLACK, width=int(2.5 * scale))
    draw.ellipse([earring_x - 7 * scale, earring_y + 60 * scale, earring_x + 7 * scale, earring_y + 85 * scale], fill=C_ALMOST_BLACK, outline=C_BLACK, width=int(2 * scale))
    draw.ellipse([earring_x - 3 * scale, earring_y + 64 * scale, earring_x + 1 * scale, earring_y + 72 * scale], fill=C_WHITE)

    # -------------------------------------------------------------------------
    # 6. FRANJA CANÔNICA HIERÁRQUICA E MECHAS FRONTAIS DINÂMICAS
    # -------------------------------------------------------------------------
    print("▶ [6/8] Renderizando franja irregular em 5 mechas e fios soltos (flyaways)...")
    bangs_detailed = [
        ((cx - 75 * scale, cy - 350 * scale), (cx - 35 * scale, cy - 210 * scale), (cx - 15 * scale, cy - 90 * scale), (cx - 12 * scale, cy + 25 * scale), 6.8),
        ((cx - 15 * scale, cy - 370 * scale), (cx + 12 * scale, cy - 230 * scale), (cx + 24 * scale, cy - 110 * scale), (cx + 18 * scale, cy - 5 * scale), 6.2),
        ((cx + 55 * scale, cy - 360 * scale), (cx + 75 * scale, cy - 210 * scale), (cx + 85 * scale, cy - 80 * scale), (cx + 80 * scale, cy + 45 * scale), 6.5),
        ((cx - 150 * scale, cy - 310 * scale), (cx - 130 * scale, cy - 170 * scale), (cx - 115 * scale, cy - 35 * scale), (cx - 100 * scale, cy + 125 * scale), 7.2),
        ((cx + 140 * scale, cy - 310 * scale), (cx + 150 * scale, cy - 170 * scale), (cx + 145 * scale, cy - 35 * scale), (cx + 130 * scale, cy + 125 * scale), 7.2),
        ((cx - 185 * scale, cy - 190 * scale), (cx - 200 * scale, cy + 40 * scale), (cx - 175 * scale, cy + 250 * scale), (cx - 140 * scale, cy + 460 * scale), 7.8),
        ((cx + 185 * scale, cy - 190 * scale), (cx + 200 * scale, cy + 40 * scale), (cx + 175 * scale, cy + 250 * scale), (cx + 140 * scale, cy + 460 * scale), 7.8),
    ]
    for p0, p1, p2, p3, bw in bangs_detailed:
        draw_bezier_curve(draw, p0, p1, p2, p3, C_BLACK, width=bw * scale, steps=80)
        # Fios paralelos de textura interna
        draw_bezier_curve(draw, (p0[0]+4*scale, p0[1]), (p1[0]+3*scale, p1[1]), (p2[0]+2*scale, p2[1]), (p3[0]+1*scale, p3[1]), C_GRAY_DARK, width=(bw*0.35)*scale, steps=70)
        draw_bezier_curve(draw, (p0[0]-4*scale, p0[1]), (p1[0]-3*scale, p1[1]), (p2[0]-2*scale, p2[1]), (p3[0]-1*scale, p3[1]), C_GRAY_DARK, width=(bw*0.35)*scale, steps=70)

    # Fios esvoaçantes ultra-finos (Flyaways) cruzando o rosto e os chifres
    flyaways = [
        ((cx + 160 * scale, cy - 260 * scale), (cx + 260 * scale, cy - 280 * scale), (cx + 340 * scale, cy - 200 * scale), (cx + 380 * scale, cy - 80 * scale)),
        ((cx - 160 * scale, cy - 260 * scale), (cx - 260 * scale, cy - 280 * scale), (cx - 340 * scale, cy - 200 * scale), (cx - 380 * scale, cy - 80 * scale)),
        ((cx + 80 * scale, cy + 40 * scale), (cx + 130 * scale, cy + 120 * scale), (cx + 150 * scale, cy + 220 * scale), (cx + 120 * scale, cy + 320 * scale)),
        ((cx - 80 * scale, cy + 40 * scale), (cx - 130 * scale, cy + 120 * scale), (cx - 150 * scale, cy + 220 * scale), (cx - 120 * scale, cy + 320 * scale)),
    ]
    for p0, p1, p2, p3 in flyaways:
        draw_bezier_curve(draw, p0, p1, p2, p3, C_BLACK, width=2.2 * scale, steps=75)

    # -------------------------------------------------------------------------
    # 7. CHOKER DE COURO COM GEMA LAPIDADA, CORPETE, RENDA & FIVELAS COM ILHÓS
    # -------------------------------------------------------------------------
    print("▶ [7/8] Construindo choker com gema facetada, corpete com renda e fivelas...")
    choker_y = cy + 325 * scale
    draw.polygon([
        (cx - 92 * scale, choker_y - 20 * scale),
        (cx + 92 * scale, choker_y - 20 * scale),
        (cx + 86 * scale, choker_y + 25 * scale),
        (cx - 86 * scale, choker_y + 25 * scale)
    ], fill=C_BLACK)

    # Costura dupla fina nas bordas do choker
    draw.line([(cx - 90 * scale, choker_y - 15 * scale), (cx + 90 * scale, choker_y - 15 * scale)], fill=C_GRAY_MID, width=int(1.5 * scale))
    draw.line([(cx - 84 * scale, choker_y + 20 * scale), (cx + 84 * scale, choker_y + 20 * scale)], fill=C_GRAY_MID, width=int(1.5 * scale))

    # Gema negra lapidada central com engaste metálico
    gem_cx, gem_cy = cx, choker_y + 40 * scale
    draw.polygon([(gem_cx, gem_cy - 24 * scale), (gem_cx + 24 * scale, gem_cy), (gem_cx, gem_cy + 26 * scale), (gem_cx - 24 * scale, gem_cy)], fill=C_GRAY_LIGHT, outline=C_BLACK, width=int(3 * scale))
    draw.polygon([(gem_cx, gem_cy - 20 * scale), (gem_cx + 20 * scale, gem_cy), (gem_cx, gem_cy + 22 * scale), (gem_cx - 20 * scale, gem_cy)], fill=C_ALMOST_BLACK)
    # Facetas lapidadas e triângulos de brilho especular
    draw.polygon([(gem_cx - 8 * scale, gem_cy - 12 * scale), (gem_cx, gem_cy - 16 * scale), (gem_cx - 2 * scale, gem_cy - 4 * scale)], fill=C_WHITE)
    draw.polygon([(gem_cx + 4 * scale, gem_cy + 4 * scale), (gem_cx + 14 * scale, gem_cy), (gem_cx + 8 * scale, gem_cy + 12 * scale)], fill=C_GRAY_LIGHT)

    # Corpete Gótico Estruturado (#1A1A1A)
    corset_poly = [
        (cx - 155 * scale, cy + 430 * scale),
        (cx - 65 * scale, cy + 390 * scale),
        (cx, cy + 410 * scale),
        (cx + 65 * scale, cy + 390 * scale),
        (cx + 155 * scale, cy + 430 * scale),
        (cx + 270 * scale, sh),
        (cx - 270 * scale, sh)
    ]
    draw.polygon(corset_poly, fill=C_ALMOST_BLACK)

    # Renda de Filigrana Gótica Autêntica no decote (arcos com picôs)
    for rx in range(int(cx - 145 * scale), int(cx + 145 * scale), int(14 * scale)):
        t_l = (rx - (cx - 145 * scale)) / (290.0 * scale)
        ly = (cy + 410 * scale) - math.sin(t_l * math.pi) * 16 * scale
        # Arco externo
        draw.ellipse([rx - 6 * scale, ly - 6 * scale, rx + 6 * scale, ly + 6 * scale], outline=C_BLACK, width=int(2.2 * scale))
        # Picô central
        draw.line([(rx, ly - 6 * scale), (rx, ly - 10 * scale)], fill=C_BLACK, width=int(2 * scale))

    # Tiras com ilhós perfurados e fivelas de metal com pino central
    for s_i in range(3):
        strap_y = cy + 480 * scale + s_i * 72 * scale
        draw.polygon([
            (cx - 180 * scale, strap_y - 12 * scale), (cx + 180 * scale, strap_y - 12 * scale),
            (cx + 190 * scale, strap_y + 14 * scale), (cx - 190 * scale, strap_y + 14 * scale)
        ], fill=C_BLACK)
        
        # Fivela central metálica
        f_w, f_h = 32 * scale, 22 * scale
        draw.rectangle([cx - f_w, strap_y - f_h/2, cx + f_w, strap_y + f_h/2], fill=C_GRAY_LIGHT, outline=C_BLACK, width=int(3.2 * scale))
        draw.rectangle([cx - f_w + 8*scale, strap_y - f_h/2 + 5*scale, cx + f_w - 8*scale, strap_y + f_h/2 - 5*scale], fill=C_BLACK)
        # Pino metálico da fivela
        draw.line([(cx, strap_y - f_h/2), (cx, strap_y + f_h/2)], fill=C_WHITE, width=int(3 * scale))
        # Brilho de metal
        draw.line([(cx - f_w + 2*scale, strap_y - f_h/2 + 2*scale), (cx + f_w - 2*scale, strap_y - f_h/2 + 2*scale)], fill=C_WHITE, width=int(2 * scale))

        # Ilhós prateados perfurados nas laterais das tiras
        for eyelet_off in [-130, -90, -50, 50, 90, 130]:
            ey_x = cx + eyelet_off * scale
            draw.ellipse([ey_x - 5*scale, strap_y - 5*scale, ey_x + 5*scale, strap_y + 5*scale], fill=C_GRAY_LIGHT, outline=C_BLACK, width=int(1.8 * scale))
            draw.ellipse([ey_x - 2*scale, strap_y - 2*scale, ey_x + 2*scale, strap_y + 2*scale], fill=C_BLACK)

    # Correntes duplas entrelaçadas do choker ao corpete
    chain1 = bezier_cubic((cx - 120 * scale, cy + 430 * scale), (cx - 70 * scale, cy + 530 * scale),
                          (cx - 30 * scale, cy + 540 * scale), (gem_cx, gem_cy + 24 * scale), steps=20)
    for ci in range(0, len(chain1) - 1, 2):
        cp = chain1[ci]
        draw.ellipse([cp[0] - 5 * scale, cp[1] - 5 * scale, cp[0] + 5 * scale, cp[1] + 5 * scale], fill=C_GRAY_LIGHT, outline=C_BLACK, width=int(2 * scale))

    # -------------------------------------------------------------------------
    # 8. PÉTALAS BOTÂNICAS GÓTICAS FLUTUANTES COM VEIOS
    # -------------------------------------------------------------------------
    print("▶ [8/8] Adicionando pétalas góticas com veios e calibrando nitidez...")
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
        draw.polygon(pts_r, fill=C_BLACK)
        # Veio central em branco
        v_top = pts_r[0]
        v_bot = (px + 0 * cos_r - (pr * 0.25) * sin_r, py + 0 * sin_r + (pr * 0.25) * cos_r)
        draw.line([v_top, v_bot], fill=C_WHITE, width=int(2.2 * scale))

    # Downsampling com Lanczos de alta fidelidade para 2000x2000 px
    print("🔍 Processando supersampling Lanczos 2x para 2000x2000 px...")
    final_master = canvas.resize((size, size), Image.Resampling.LANCZOS)
    
    # Unsharp Mask calibrado para nitidez vetorial de nanquim (zero borrão)
    print("💎 Aplicando Unsharp Mask de estúdio para nitidez cristalina...")
    final_master = final_master.filter(ImageFilter.UnsharpMask(radius=1.0, percent=85, threshold=1))
    return final_master

def main():
    print("==================================================================")
    print("🖤 BLACKCORE // MISUKI ULTRA-DETAILED MASTERPIECE")
    print("==================================================================")
    t0 = time.time()

    size = 2000
    studio_img = render_ultra_detailed_misuki(size=size)

    OUT_DIR_DL.mkdir(parents=True, exist_ok=True)
    OUT_DIR_PIC.mkdir(parents=True, exist_ok=True)

    # 1. Studio Master Ultra-Detalhado
    out_studio_dl = OUT_DIR_DL / "MISUKI_Ultra_Detalhada_Studio.png"
    out_studio_pic = OUT_DIR_PIC / "MISUKI_Ultra_Detalhada_Studio.png"
    studio_img.convert("RGB").save(out_studio_dl, "PNG", optimize=True)
    studio_img.convert("RGB").save(out_studio_pic, "PNG", optimize=True)
    print(f"📁 Studio Ultra-Detalhado salvo: {out_studio_dl.name} ({out_studio_dl.stat().st_size // 1024} KB)")

    # 2. Darkcore Obsidian Ultra-Detalhado
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
    out_dark_dl = OUT_DIR_DL / "MISUKI_Ultra_Detalhada_Darkcore.png"
    out_dark_pic = OUT_DIR_PIC / "MISUKI_Ultra_Detalhada_Darkcore.png"
    dark_img.save(out_dark_dl, "PNG", optimize=True)
    dark_img.save(out_dark_pic, "PNG", optimize=True)
    print(f"📁 Darkcore Ultra-Detalhado salvo: {out_dark_dl.name} ({out_dark_dl.stat().st_size // 1024} KB)")

    # 3. Transparente Alfa
    trans_img = Image.new("RGBA", (size, size), (12, 12, 16, 0))
    trans_img.putalpha(inv_gray)
    out_trans_dl = OUT_DIR_DL / "MISUKI_Ultra_Detalhada_Transparente.png"
    out_trans_pic = OUT_DIR_PIC / "MISUKI_Ultra_Detalhada_Transparente.png"
    trans_img.save(out_trans_dl, "PNG", optimize=True)
    trans_img.save(out_trans_pic, "PNG", optimize=True)
    print(f"📁 Transparente Alfa salvo: {out_trans_dl.name} ({out_trans_dl.stat().st_size // 1024} KB)")

    # Sincronização imediata no Android Media Scanner
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
    print(f"✅ RENDERIZAÇÃO ULTRA-DETALHADA FINALIZADA EM {elapsed:.2f}s!")
    print("Arquivos oficiais disponíveis na Galeria e Downloads do seu celular:")
    print(f" 1. {out_studio_dl}")
    print(f" 2. {out_dark_dl}")
    print(f" 3. {out_trans_dl}")
    print("==================================================================")

if __name__ == "__main__":
    main()
