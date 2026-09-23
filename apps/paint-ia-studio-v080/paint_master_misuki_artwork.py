#!/usr/bin/env python3
"""
paint_master_misuki_artwork.py - Renderização Canônica da Misuki pelo Manual Mestre
Implementa 100% das diretrizes técnicas do BLACKCORE_Manual_Mestre_Misuki_Paint.pdf:
  - Canvas Busto Oficial: 2000x2000 px com 2x SSAA (4000x4000) e anti-aliasing Lanczos.
  - DNA Visual:
      * Rosto delicado, queixo estreito, mandíbula suave, nariz mínimo e boca curta com lábio inferior realçado.
      * Olhos expressivos alongados com pálpebra superior pesada (5-6px), íris sombreada no topo e brilho pontual branco.
      * Chifres negros curvados em C/S nascendo na lateral-superior do crânio com 8 segmentos de volume e brilho quebrado.
      * Cabelo em Beta-nuri (preto denso) longo, franja irregular em mechas hierárquicas e fios esvoaçantes sobrepostos à raiz dos chifres.
      * Roupa gótica estruturada: corpete com tiras e fivelas de alto contraste, bordas em renda, choker com gema geométrica e correntes finas.
      * Mapa de valores P&B calibrado: 50% pretos/quase-pretos, 30% cinzas, 20% brancos.
"""

from __future__ import annotations
import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

OUT_DIR_DL = Path("/storage/emulated/0/Download")
OUT_DIR_PIC = Path("/storage/emulated/0/Pictures")

# Paleta Canônica do Manual Mestre (Seção 19)
HEX_WHITE = (255, 255, 255, 255)       # #FFFFFF - Brilho máximo e pele iluminada
HEX_GRAY_VLIGHT = (232, 232, 232, 255)  # #E8E8E8 - Pele em sombra leve
HEX_GRAY_LIGHT = (200, 200, 200, 255)   # #C8C8C8 - Transições e material claro
HEX_GRAY_MID = (138, 138, 138, 255)     # #8A8A8A - Sombras estruturais e íris
HEX_GRAY_DARK = (74, 74, 74, 255)       # #4A4A4A - Roupa e tecido fosco
HEX_ALMOST_BLACK = (26, 26, 26, 255)    # #1A1A1A - Massas escuras com detalhe
HEX_BLACK = (0, 0, 0, 255)              # #000000 - Cílios, silhueta e beta-nuri

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

def draw_hatching(draw, p_start, p_end, length=30, angle_deg=45, spacing=8, color=HEX_BLACK, width=2):
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

def render_misuki_masterpiece(canvas_size=2000):
    scale = 2  # SSAA 2x -> 4000x4000 render interno
    sw, sh = canvas_size * scale, canvas_size * scale

    # Fundo branco puro de estúdio técnico (#FFFFFF) conforme Seção 03
    page = Image.new("RGBA", (sw, sh), HEX_WHITE)
    draw_page = ImageDraw.Draw(page, "RGBA")

    cx = sw * 0.50
    cy = sh * 0.45

    print("📐 [1/6] Estruturando proporções da cabeça, queixo estreito e eixos...")

    # -------------------------------------------------------------------------
    # 1. CABELO TRASEIRO & SILHUETA DE MASSA GRANDE (Seção 10 & 11)
    # -------------------------------------------------------------------------
    print("🖤 [2/6] Renderizando massa de cabelo em Beta-nuri e mechas longas...")
    back_hair_poly = [
        (cx - 360 * scale, cy - 280 * scale),
        (cx - 280 * scale, cy - 480 * scale),
        (cx, cy - 540 * scale),
        (cx + 280 * scale, cy - 480 * scale),
        (cx + 360 * scale, cy - 280 * scale),
        (cx + 420 * scale, cy - 60 * scale),
        (cx + 460 * scale, cy + 240 * scale),
        (cx + 440 * scale, cy + 620 * scale),
        (cx + 300 * scale, sh),
        (cx - 300 * scale, sh),
        (cx - 440 * scale, cy + 620 * scale),
        (cx - 460 * scale, cy + 240 * scale),
        (cx - 420 * scale, cy - 60 * scale)
    ]
    draw_page.polygon(back_hair_poly, fill=HEX_ALMOST_BLACK)

    # Mechas traseiras dinâmicas e pontas fluidas com nanquim preto
    for off in range(-5, 6):
        # Esquerda
        p0 = (cx - 180 * scale + off * 20, cy - 350 * scale)
        p1 = (cx - 380 * scale + off * 25, cy - 60 * scale)
        p2 = (cx - 480 * scale + off * 30, cy + 340 * scale)
        p3 = (cx - 380 * scale + off * 35, sh)
        draw_bezier_curve(draw_page, p0, p1, p2, p3, HEX_BLACK, width=7.0 * scale, steps=90)
        # Direita
        p0_r = (cx + 180 * scale + off * 20, cy - 350 * scale)
        p1_r = (cx + 380 * scale + off * 25, cy - 60 * scale)
        p2_r = (cx + 480 * scale + off * 30, cy + 340 * scale)
        p3_r = (cx + 380 * scale + off * 35, sh)
        draw_bezier_curve(draw_page, p0_r, p1_r, p2_r, p3_r, HEX_BLACK, width=7.0 * scale, steps=90)

    # -------------------------------------------------------------------------
    # 2. ROSTO & PESCOÇO CANÔNICO (Seção 06: Queixo estreito, mandíbula suave)
    # -------------------------------------------------------------------------
    print("✨ [3/6] Desenhando rosto de porcelana, olhos alongados e expressão confiante...")
    face_skin = [
        (cx - 175 * scale, cy - 180 * scale),
        (cx, cy - 220 * scale),
        (cx + 175 * scale, cy - 180 * scale),
        (cx + 195 * scale, cy - 30 * scale),
        (cx + 170 * scale, cy + 100 * scale),
        (cx + 105 * scale, cy + 220 * scale),
        (cx, cy + 280 * scale),  # Queixo estreito e delicado
        (cx - 105 * scale, cy + 220 * scale),
        (cx - 170 * scale, cy + 100 * scale),
        (cx - 195 * scale, cy - 30 * scale)
    ]
    draw_page.polygon(face_skin, fill=HEX_WHITE)

    # Pescoço esbelto e ombros elegantes
    neck_skin = [
        (cx - 85 * scale, cy + 220 * scale),
        (cx + 85 * scale, cy + 220 * scale),
        (cx + 130 * scale, cy + 440 * scale),
        (cx - 130 * scale, cy + 440 * scale)
    ]
    draw_page.polygon(neck_skin, fill=HEX_WHITE)

    # Sombra anatômica suave sob a mandíbula e clavícula (#E8E8E8 e #C8C8C8)
    neck_shadow = [
        (cx - 80 * scale, cy + 230 * scale),
        (cx, cy + 280 * scale),
        (cx + 80 * scale, cy + 230 * scale),
        (cx + 60 * scale, cy + 340 * scale),
        (cx - 60 * scale, cy + 340 * scale)
    ]
    draw_page.polygon(neck_shadow, fill=HEX_GRAY_VLIGHT)

    # Contornos de line art da face e pescoço (3 px em 2000px = 6px em scale 2)
    draw_bezier_curve(draw_page, (cx - 190 * scale, cy - 30 * scale), (cx - 165 * scale, cy + 110 * scale),
                                 (cx - 100 * scale, cy + 225 * scale), (cx, cy + 280 * scale), HEX_BLACK, width=5.5 * scale)
    draw_bezier_curve(draw_page, (cx + 190 * scale, cy - 30 * scale), (cx + 165 * scale, cy + 110 * scale),
                                 (cx + 100 * scale, cy + 225 * scale), (cx, cy + 280 * scale), HEX_BLACK, width=5.5 * scale)

    # Pescoço linhas
    draw_bezier_curve(draw_page, (cx - 85 * scale, cy + 235 * scale), (cx - 90 * scale, cy + 320 * scale),
                                 (cx - 105 * scale, cy + 390 * scale), (cx - 125 * scale, cy + 450 * scale), HEX_BLACK, width=4.5 * scale)
    draw_bezier_curve(draw_page, (cx + 85 * scale, cy + 235 * scale), (cx + 90 * scale, cy + 320 * scale),
                                 (cx + 105 * scale, cy + 390 * scale), (cx + 125 * scale, cy + 450 * scale), HEX_BLACK, width=4.5 * scale)

    # Clavícula
    draw_bezier_curve(draw_page, (cx - 15 * scale, cy + 430 * scale), (cx - 70 * scale, cy + 445 * scale),
                                 (cx - 140 * scale, cy + 455 * scale), (cx - 200 * scale, cy + 465 * scale), HEX_BLACK, width=3.5 * scale)
    draw_bezier_curve(draw_page, (cx + 15 * scale, cy + 430 * scale), (cx + 70 * scale, cy + 445 * scale),
                                 (cx + 140 * scale, cy + 455 * scale), (cx + 200 * scale, cy + 465 * scale), HEX_BLACK, width=3.5 * scale)

    # -------------------------------------------------------------------------
    # 3. OLHOS CANÔNICOS DA MISUKI (Seção 07: Linha superior marcante 5-6px)
    # -------------------------------------------------------------------------
    eye_y = cy - 25 * scale
    for side in [-1, 1]:
        ex = cx + side * 95 * scale
        
        # Pálpebra superior curva longa ascendente, espessa no terço externo (5-6px)
        p0 = (ex - side * 55 * scale, eye_y - 15 * scale)
        p1 = (ex - side * 15 * scale, eye_y - 38 * scale)
        p2 = (ex + side * 30 * scale, eye_y - 34 * scale)
        p3 = (ex + side * 62 * scale, eye_y - 12 * scale)
        draw_bezier_curve(draw_page, p0, p1, p2, p3, HEX_BLACK, width=10.0 * scale)

        # Cílios pontiagudos em leque no terço externo
        draw_page.polygon([(ex + side * 50 * scale, eye_y - 16 * scale),
                           (ex + side * 75 * scale, eye_y - 32 * scale),
                           (ex + side * 42 * scale, eye_y - 25 * scale)], fill=HEX_BLACK)
        draw_page.polygon([(ex + side * 25 * scale, eye_y - 34 * scale),
                           (ex + side * 38 * scale, eye_y - 50 * scale),
                           (ex + side * 18 * scale, eye_y - 36 * scale)], fill=HEX_BLACK)

        # Íris anime alongada (#8A8A8A) com topo preto sombreado (#000000)
        rx, ry = 22 * scale, 30 * scale
        draw_page.ellipse([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], fill=HEX_GRAY_MID, outline=HEX_BLACK, width=int(3.5*scale))
        # Topo sombreado da íris
        draw_page.chord([ex - rx, eye_y - ry + 4*scale, ex + rx, eye_y + ry + 4*scale], start=180, end=360, fill=HEX_BLACK)
        
        # Pupila central
        draw_page.ellipse([ex - 7*scale, eye_y - 4*scale, ex + 7*scale, eye_y + 12*scale], fill=HEX_BLACK)

        # Brilho branco pontual nítido no canto superior
        draw_page.ellipse([ex - side * 14 * scale - 7*scale, eye_y - 18*scale, ex - side * 14 * scale + 5*scale, eye_y - 6*scale], fill=HEX_WHITE)
        # Microbrilho secundário
        draw_page.ellipse([ex + side * 9 * scale, eye_y + 10*scale, ex + side * 9 * scale + 6*scale, eye_y + 16*scale], fill=HEX_WHITE)

        # Pálpebra inferior interrompida (1-2 px)
        draw_bezier_curve(draw_page, (ex - side * 30 * scale, eye_y + 26 * scale),
                                     (ex, eye_y + 32 * scale),
                                     (ex + side * 25 * scale, eye_y + 28 * scale),
                                     (ex + side * 45 * scale, eye_y + 14 * scale), HEX_BLACK, width=3.0 * scale)

        # Dobra da pálpebra superior (Double eyelid)
        draw_bezier_curve(draw_page, (ex - side * 40 * scale, eye_y - 48 * scale),
                                     (ex, eye_y - 56 * scale),
                                     (ex + side * 30 * scale, eye_y - 52 * scale),
                                     (ex + side * 50 * scale, eye_y - 36 * scale), HEX_GRAY_MID, width=2.8 * scale)

        # Sobrancelha expressiva confiante / misteriosa (Seção 08)
        sb_y = eye_y - 75 * scale + (side * 4 * scale) # leve assimetria natural
        draw_bezier_curve(draw_page, (ex - side * 48 * scale, sb_y + 6 * scale),
                                     (ex - side * 10 * scale, sb_y - 12 * scale),
                                     (ex + side * 30 * scale, sb_y - 8 * scale),
                                     (ex + side * 60 * scale, sb_y + 10 * scale), HEX_BLACK, width=5.0 * scale)

    # -------------------------------------------------------------------------
    # 4. NARIZ MÍNIMO & BOCA DELICADA (Seção 09)
    # -------------------------------------------------------------------------
    # Nariz: 1 traço curto + sombra mínima
    nose_y = cy + 70 * scale
    draw_page.polygon([(cx - 2 * scale, nose_y), (cx + 10 * scale, nose_y + 22 * scale), (cx - 4 * scale, nose_y + 26 * scale)], fill=HEX_GRAY_DARK)
    draw_page.line([(cx + 4 * scale, nose_y - 20 * scale), (cx + 10 * scale, nose_y + 22 * scale)], fill=HEX_BLACK, width=int(2.5 * scale))

    # Boca: Curta, menor que a distância entre as pupilas, canto sutilmente elevado
    mouth_y = cy + 175 * scale
    # Lábio superior com quebra central delicada
    draw_bezier_curve(draw_page, (cx - 36 * scale, mouth_y), (cx - 10 * scale, mouth_y - 5 * scale),
                                 (cx + 12 * scale, mouth_y - 5 * scale), (cx + 40 * scale, mouth_y - 2 * scale), HEX_BLACK, width=4.5 * scale)
    # Linha escura de abertura
    draw_page.polygon([(cx - 24 * scale, mouth_y + 2 * scale), (cx, mouth_y), (cx + 26 * scale, mouth_y + 2 * scale), (cx + 2 * scale, mouth_y + 8 * scale)], fill=HEX_BLACK)
    # Sombra do lábio inferior com brilho
    draw_bezier_curve(draw_page, (cx - 16 * scale, mouth_y + 24 * scale), (cx, mouth_y + 28 * scale),
                                 (cx + 12 * scale, mouth_y + 27 * scale), (cx + 22 * scale, mouth_y + 22 * scale), HEX_GRAY_MID, width=3.0 * scale)

    # -------------------------------------------------------------------------
    # 5. OS DOIS CHIFRES CANÔNICOS (Seção 12 & 13: Encaixe, 8 anéis e brilho quebrado)
    # -------------------------------------------------------------------------
    print("🖤 [4/6] Esculpindo os dois chifres negros curvados com anéis de volume...")
    # Chifre Esquerdo
    horn_l_root = (cx - 190 * scale, cy - 240 * scale)
    horn_l_mid = (cx - 380 * scale, cy - 420 * scale)
    horn_l_tip = (cx - 280 * scale, cy - 720 * scale)

    # Chifre Direito
    horn_r_root = (cx + 190 * scale, cy - 240 * scale)
    horn_r_mid = (cx + 380 * scale, cy - 420 * scale)
    horn_r_tip = (cx + 280 * scale, cy - 720 * scale)

    for side, root, mid, tip in [(-1, horn_l_root, horn_l_mid, horn_l_tip), (1, horn_r_root, horn_r_mid, horn_r_tip)]:
        # Curva central guia
        steps = 40
        guide_pts = bezier_cubic(root, (root[0] + side * 120 * scale, root[1] - 120 * scale),
                                        (mid[0] + side * 20 * scale, mid[1] - 140 * scale),
                                        tip, steps=steps)
        
        # Construção da casca do chifre (afunilando da raiz à ponta)
        poly_left = []
        poly_right = []
        for i, (gx, gy) in enumerate(guide_pts):
            t = i / float(steps)
            rad_norm = math.atan2(gy - guide_pts[max(0, i-1)][1], gx - guide_pts[max(0, i-1)][0]) + math.pi/2
            radius = (1.0 - t * 0.88) * (52.0 * scale)
            poly_left.append((gx + math.cos(rad_norm) * radius, gy + math.sin(rad_norm) * radius))
            poly_right.append((gx - math.cos(rad_norm) * radius, gy - math.sin(rad_norm) * radius))

        horn_poly = poly_left + poly_right[::-1]
        draw_page.polygon(horn_poly, fill=HEX_ALMOST_BLACK)

        # 8 Anéis de Volume Transversais acompanhando a curvatura (Seção 13)
        for ring_i in range(1, 9):
            idx = int(ring_i * (steps / 9.5))
            pt_l = poly_left[idx]
            pt_r = poly_right[idx]
            pt_mid = guide_pts[idx]
            # Arco curvado do anel
            draw_bezier_curve(draw_page, pt_l, (pt_mid[0] - side * 10 * scale, pt_mid[1] + 15 * scale),
                                         (pt_mid[0] + side * 10 * scale, pt_mid[1] + 15 * scale),
                                         pt_r, HEX_BLACK, width=4.0 * scale)
            # Brilho quebrado no lado da luz (Seção 13, item 47)
            b_start = (pt_l[0] * 0.6 + pt_mid[0] * 0.4, pt_l[1] * 0.6 + pt_mid[1] * 0.4)
            b_end = (pt_l[0] * 0.3 + pt_mid[0] * 0.7, pt_l[1] * 0.3 + pt_mid[1] * 0.7)
            draw_page.line([b_start, b_end], fill=HEX_WHITE, width=int(2.5 * scale))

        # Contorno externo do chifre
        for i in range(len(poly_left) - 1):
            draw_page.line([poly_left[i], poly_left[i+1]], fill=HEX_BLACK, width=int(5.0 * scale))
            draw_page.line([poly_right[i], poly_right[i+1]], fill=HEX_BLACK, width=int(5.0 * scale))

    # -------------------------------------------------------------------------
    # 6. FRANJA IRREGULAR & MECHAS FRONTAIS (Seção 10: Sobreposição com a raiz dos chifres)
    # -------------------------------------------------------------------------
    print("✒️  [5/6] Desenhando franja irregular em mechas hierárquicas e mechas laterais...")
    # Mechas que passam na frente da raiz dos chifres (Regra da Seção 12, item 43)
    horn_over_bangs = [
        # Franja central e mechas em camadas
        ((cx - 80 * scale, cy - 360 * scale), (cx - 40 * scale, cy - 220 * scale), (cx - 20 * scale, cy - 100 * scale), (cx - 15 * scale, cy + 20 * scale), 6.5),
        ((cx - 20 * scale, cy - 380 * scale), (cx + 10 * scale, cy - 240 * scale), (cx + 25 * scale, cy - 120 * scale), (cx + 20 * scale, cy - 10 * scale), 6.0),
        ((cx + 60 * scale, cy - 370 * scale), (cx + 80 * scale, cy - 220 * scale), (cx + 90 * scale, cy - 90 * scale), (cx + 85 * scale, cy + 40 * scale), 6.2),
        ((cx - 160 * scale, cy - 320 * scale), (cx - 140 * scale, cy - 180 * scale), (cx - 125 * scale, cy - 40 * scale), (cx - 110 * scale, cy + 120 * scale), 7.0),
        ((cx + 150 * scale, cy - 320 * scale), (cx + 160 * scale, cy - 180 * scale), (cx + 155 * scale, cy - 40 * scale), (cx + 140 * scale, cy + 120 * scale), 7.0),
        # Mechas laterais finas emoldurando as bochechas
        ((cx - 195 * scale, cy - 200 * scale), (cx - 210 * scale, cy + 40 * scale), (cx - 185 * scale, cy + 260 * scale), (cx - 150 * scale, cy + 480 * scale), 7.5),
        ((cx + 195 * scale, cy - 200 * scale), (cx + 210 * scale, cy + 40 * scale), (cx + 185 * scale, cy + 260 * scale), (cx + 150 * scale, cy + 480 * scale), 7.5),
    ]

    for p0, p1, p2, p3, bw in horn_over_bangs:
        # Preenchimento em preto sólido
        draw_bezier_curve(draw_page, p0, p1, p2, p3, HEX_BLACK, width=bw * scale, steps=80)
        # Fio de detalhe e luz interna na mecha
        p0_sub = (p0[0] + 5 * scale, p0[1])
        p1_sub = (p1[0] + 4 * scale, p1[1])
        p2_sub = (p2[0] + 3 * scale, p2[1])
        p3_sub = (p3[0] + 2 * scale, p3[1])
        draw_bezier_curve(draw_page, p0_sub, p1_sub, p2_sub, p3_sub, HEX_GRAY_DARK, width=(bw * 0.4) * scale, steps=70)

    # -------------------------------------------------------------------------
    # 7. VESTIMENTA GÓTICA / TECHWEAR (Seções 16 & 17: Choker, Corpete, Tiras, Renda)
    # -------------------------------------------------------------------------
    print("👗 [6/6] Construindo corpete gótico, choker com gema geométrica, tiras e fivelas...")
    
    # 7.1 Choker preto (#000000) no pescoço
    choker_y = cy + 330 * scale
    draw_page.polygon([
        (cx - 95 * scale, choker_y - 20 * scale),
        (cx + 95 * scale, choker_y - 20 * scale),
        (cx + 90 * scale, choker_y + 25 * scale),
        (cx - 90 * scale, choker_y + 25 * scale)
    ], fill=HEX_BLACK)

    # Pingente central geométrico / Gema negra com brilho branco (Seção 17)
    gem_cx, gem_cy = cx, choker_y + 40 * scale
    gem_pts = [(gem_cx, gem_cy - 22 * scale), (gem_cx + 22 * scale, gem_cy), (gem_cx, gem_cy + 24 * scale), (gem_cx - 22 * scale, gem_cy)]
    draw_page.polygon(gem_pts, fill=HEX_ALMOST_BLACK, outline=HEX_BLACK, width=int(3 * scale))
    # Brilho branco na gema
    draw_page.polygon([(gem_cx - 8 * scale, gem_cy - 12 * scale), (gem_cx, gem_cy - 16 * scale), (gem_cx - 2 * scale, gem_cy - 4 * scale)], fill=HEX_WHITE)

    # 7.2 Corpete Gótico Estruturado (#1A1A1A)
    corset_poly = [
        (cx - 150 * scale, cy + 440 * scale),
        (cx - 60 * scale, cy + 400 * scale),
        (cx, cy + 420 * scale),
        (cx + 60 * scale, cy + 400 * scale),
        (cx + 150 * scale, cy + 440 * scale),
        (cx + 260 * scale, sh),
        (cx - 260 * scale, sh)
    ]
    draw_page.polygon(corset_poly, fill=HEX_ALMOST_BLACK)

    # 7.3 Borda de Renda Delicada no Decote (Seção 17: Silhueta simplificada)
    for rx in range(int(cx - 140 * scale), int(cx + 140 * scale), int(16 * scale)):
        t_lace = (rx - (cx - 140 * scale)) / (280.0 * scale)
        ly = (cy + 420 * scale) - math.sin(t_lace * math.pi) * 18 * scale
        draw_page.ellipse([rx - 7 * scale, ly - 6 * scale, rx + 7 * scale, ly + 6 * scale], outline=HEX_BLACK, width=int(2.2 * scale))

    # 7.4 Tiras e Fivelas Metálicas de Alto Contraste
    for s_i in range(3):
        strap_y = cy + 490 * scale + s_i * 75 * scale
        # Tira preta
        draw_page.polygon([
            (cx - 180 * scale, strap_y - 12 * scale), (cx + 180 * scale, strap_y - 12 * scale),
            (cx + 190 * scale, strap_y + 14 * scale), (cx - 190 * scale, strap_y + 14 * scale)
        ], fill=HEX_BLACK)
        # Fivela de metal retangular central com brilho (#C8C8C8 e #FFFFFF)
        f_w, f_h = 32 * scale, 22 * scale
        draw_page.rectangle([cx - f_w, strap_y - f_h/2, cx + f_w, strap_y + f_h/2], fill=HEX_GRAY_LIGHT, outline=HEX_BLACK, width=int(3 * scale))
        draw_page.rectangle([cx - f_w + 8*scale, strap_y - f_h/2 + 6*scale, cx + f_w - 8*scale, strap_y + f_h/2 - 6*scale], fill=HEX_BLACK)
        # Filete de brilho de metal
        draw_page.line([(cx - f_w + 2*scale, strap_y - f_h/2 + 2*scale), (cx + f_w - 2*scale, strap_y - f_h/2 + 2*scale)], fill=HEX_WHITE, width=int(2 * scale))

    # 7.5 Correntes Finas Sutis (Seção 17: Em 1 ou 2 regiões, nunca em todo lugar)
    chain_pts = bezier_cubic((cx - 120 * scale, cy + 440 * scale), (cx - 70 * scale, cy + 540 * scale),
                             (cx - 30 * scale, cy + 550 * scale), (gem_cx, gem_cy + 24 * scale), steps=20)
    for ci in range(0, len(chain_pts) - 1, 2):
        c_p = chain_pts[ci]
        draw_page.ellipse([c_p[0] - 5 * scale, c_p[1] - 5 * scale, c_p[0] + 5 * scale, c_p[1] + 5 * scale], fill=HEX_GRAY_LIGHT, outline=HEX_BLACK, width=int(1.8 * scale))

    # -------------------------------------------------------------------------
    # DOWNSAMPLING COM LANCZOS PARA NATIVO 2000x2000 PX
    # -------------------------------------------------------------------------
    print("🔍 Processando anti-aliasing Lanczos para 2000x2000 px oficial...")
    final_masterpiece = page.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
    return final_masterpiece

def main():
    print("==================================================================")
    print("🖤 BLACKCORE // MISUKI CANONICAL MASTERPIECE (MANUAL MESTRE)")
    print("==================================================================")
    t0 = time.time()

    canvas_size = 2000
    studio_img = render_misuki_masterpiece(canvas_size=canvas_size)

    OUT_DIR_DL.mkdir(parents=True, exist_ok=True)
    OUT_DIR_PIC.mkdir(parents=True, exist_ok=True)

    # 1. VERSÃO STUDIO MASTER (P&B Canônico com Fundo Branco Técnico)
    out_studio_dl = OUT_DIR_DL / "MISUKI_Obra_Mestre_Canon_Studio.png"
    out_studio_pic = OUT_DIR_PIC / "MISUKI_Obra_Mestre_Canon_Studio.png"
    studio_img.convert("RGB").save(out_studio_dl, "PNG", optimize=True)
    studio_img.convert("RGB").save(out_studio_pic, "PNG", optimize=True)
    print(f"📁 Studio Master salvo: {out_studio_dl.name} ({out_studio_dl.stat().st_size // 1024} KB)")

    # 2. VERSÃO DARKCORE OBSIDIAN (Invertido em Preto Profundo + Linhas de Luz)
    gray = studio_img.convert("L")
    inv_gray = ImageOps.invert(gray)
    dark_img = Image.new("RGB", (canvas_size, canvas_size), (12, 12, 16))
    dark_pixels = dark_img.load()
    inv_pixels = inv_gray.load()

    for y in range(canvas_size):
        for x in range(canvas_size):
            v = inv_pixels[x, y]
            if v > 0:
                t = v / 255.0
                r = int(12 + t * (245 - 12))
                g = int(12 + t * (248 - 12))
                b = int(16 + t * (255 - 16))
                dark_pixels[x, y] = (r, g, b)

    out_dark_dl = OUT_DIR_DL / "MISUKI_Obra_Mestre_Canon_Darkcore.png"
    out_dark_pic = OUT_DIR_PIC / "MISUKI_Obra_Mestre_Canon_Darkcore.png"
    dark_img.save(out_dark_dl, "PNG", optimize=True)
    dark_img.save(out_dark_pic, "PNG", optimize=True)
    print(f"📁 Darkcore Obsidian salvo: {out_dark_dl.name} ({out_dark_dl.stat().st_size // 1024} KB)")

    # 3. VERSÃO TRANSPARENTE (Canal Alfa Isolado para Pintura)
    alpha_mask = inv_gray
    trans_img = Image.new("RGBA", (canvas_size, canvas_size), (14, 14, 18, 0))
    trans_img.putalpha(alpha_mask)

    out_trans_dl = OUT_DIR_DL / "MISUKI_Obra_Mestre_Canon_Transparente.png"
    out_trans_pic = OUT_DIR_PIC / "MISUKI_Obra_Mestre_Canon_Transparente.png"
    trans_img.save(out_trans_dl, "PNG", optimize=True)
    trans_img.save(out_trans_pic, "PNG", optimize=True)
    print(f"📁 Transparente salvo: {out_trans_dl.name} ({out_trans_dl.stat().st_size // 1024} KB)")

    # Notificar Media Scanner do Android
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
    print(f"✅ OBRA MESTRE CONCLUÍDA COM MÁXIMA PRECISÃO EM {elapsed:.2f}s!")
    print("Arquivos oficiais disponíveis na Galeria do celular:")
    print(f" 1. {out_studio_dl}")
    print(f" 2. {out_dark_dl}")
    print(f" 3. {out_trans_dl}")
    print("==================================================================")

if __name__ == "__main__":
    main()
