#!/usr/bin/env python3
"""
paint_new_ink_masterpiece.py - Nova Obra Original no Estilo Manga Lineart de PIN32
Cria uma nova ilustração focada 100% no estilo de traço puro (Nanquim / G-Pen Manga),
com nova composição (perfil 3/4 elegante, mechas de cabelo fluidas, olhar expressivo,
hachuras tradicionais de sombreamento e detalhes de vestimenta), em alta resolução (1254x1254).
"""

from __future__ import annotations
import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

OUT_DIR_DL = Path("/storage/emulated/0/Download")
OUT_DIR_PIC = Path("/storage/emulated/0/Pictures")

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
        # fator de espessura imitando pressão da pena nanquim G-Pen
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

def draw_hatching(draw, p_start, p_end, length=30, angle_deg=45, spacing=7, color=(16, 16, 20, 255), width=2):
    """Gera hachuras paralelas de sombreamento estilo mangá tradicional."""
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

def render_artwork(size=1254):
    # Renderizamos em SSAA 2x para nitidez e anti-aliasing impecáveis
    scale = 2
    sw, sh = size * scale, size * scale
    
    # Camada transparente para capturar apenas os traços
    ink_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(ink_layer, "RGBA")
    
    # Cor do nanquim preto aveludado
    INK = (14, 14, 18, 255)
    INK_SOFT = (25, 25, 32, 200)
    INK_LIGHT = (40, 40, 50, 150)

    cx = sw * 0.48
    cy = sh * 0.46

    # =========================================================================
    # 1. CABELO DE TRÁS (BACK HAIR & FLUID SILHOUETTE)
    # =========================================================================
    # Grandes mechas que fluem para a esquerda e para baixo com o vento
    for offset in range(-6, 7):
        p0 = (cx + 50 * scale + offset * 12, cy - 260 * scale)
        p1 = (cx - 240 * scale + offset * 25, cy - 80 * scale)
        p2 = (cx - 360 * scale + offset * 30, cy + 220 * scale)
        p3 = (cx - 280 * scale + offset * 40, cy + 560 * scale)
        draw_bezier_curve(draw, p0, p1, p2, p3, INK, width=5.5 * scale, steps=90)

    # Cabelo traseiro direito descendo pelas costas
    for offset in range(-4, 5):
        p0 = (cx + 160 * scale + offset * 15, cy - 200 * scale)
        p1 = (cx + 340 * scale + offset * 20, cy + 60 * scale)
        p2 = (cx + 280 * scale + offset * 25, cy + 380 * scale)
        p3 = (cx + 320 * scale + offset * 35, cy + 600 * scale)
        draw_bezier_curve(draw, p0, p1, p2, p3, INK, width=5.0 * scale, steps=90)

    # =========================================================================
    # 2. ROSTO E ANATOMIA EM PERFIL 3/4 ELEGANTE
    # =========================================================================
    # Contorno da testa e sobrancelha
    forehead_p0 = (cx + 10 * scale, cy - 140 * scale)
    forehead_p1 = (cx + 25 * scale, cy - 80 * scale)
    forehead_p2 = (cx + 40 * scale, cy - 40 * scale)
    forehead_p3 = (cx + 52 * scale, cy - 10 * scale)
    draw_bezier_curve(draw, forehead_p0, forehead_p1, forehead_p2, forehead_p3, INK, width=4.2 * scale)

    # Nariz delicado estilo manga
    nose_p0 = (cx + 52 * scale, cy - 10 * scale)
    nose_p1 = (cx + 65 * scale, cy + 18 * scale)
    nose_p2 = (cx + 72 * scale, cy + 38 * scale)
    nose_p3 = (cx + 58 * scale, cy + 44 * scale)
    draw_bezier_curve(draw, nose_p0, nose_p1, nose_p2, nose_p3, INK, width=3.8 * scale)

    # Filtro e lábio superior
    lip_up_p0 = (cx + 58 * scale, cy + 44 * scale)
    lip_up_p1 = (cx + 50 * scale, cy + 60 * scale)
    lip_up_p2 = (cx + 54 * scale, cy + 68 * scale)
    lip_up_p3 = (cx + 46 * scale, cy + 74 * scale)
    draw_bezier_curve(draw, lip_up_p0, lip_up_p1, lip_up_p2, lip_up_p3, INK, width=3.2 * scale)

    # Lábio inferior entreaberto e queixo gracioso
    chin_p0 = (cx + 46 * scale, cy + 86 * scale)
    chin_p1 = (cx + 50 * scale, cy + 96 * scale)
    chin_p2 = (cx + 46 * scale, cy + 115 * scale)
    chin_p3 = (cx + 30 * scale, cy + 138 * scale)
    draw_bezier_curve(draw, chin_p0, chin_p1, chin_p2, chin_p3, INK, width=3.8 * scale)

    # Mandíbula até a orelha
    jaw_p0 = (cx + 30 * scale, cy + 138 * scale)
    jaw_p1 = (cx - 30 * scale, cy + 135 * scale)
    jaw_p2 = (cx - 75 * scale, cy + 95 * scale)
    jaw_p3 = (cx - 95 * scale, cy + 30 * scale)
    draw_bezier_curve(draw, jaw_p0, jaw_p1, jaw_p2, jaw_p3, INK, width=4.0 * scale)

    # Hachuras sutis sob a mandíbula (sombra anatômica clássica de mangá)
    draw_hatching(draw, 
                  (cx + 20 * scale, cy + 140 * scale), 
                  (cx - 70 * scale, cy + 105 * scale), 
                  length=26 * scale, angle_deg=115, spacing=8 * scale, color=INK_LIGHT, width=int(1.8 * scale))

    # Pescoço esbelto e clavícula
    neck_front_0 = (cx + 15 * scale, cy + 144 * scale)
    neck_front_1 = (cx + 18 * scale, cy + 210 * scale)
    neck_front_2 = (cx + 22 * scale, cy + 270 * scale)
    neck_front_3 = (cx + 28 * scale, cy + 330 * scale)
    draw_bezier_curve(draw, neck_front_0, neck_front_1, neck_front_2, neck_front_3, INK, width=3.8 * scale)

    neck_back_0 = (cx - 90 * scale, cy + 45 * scale)
    neck_back_1 = (cx - 85 * scale, cy + 140 * scale)
    neck_back_2 = (cx - 75 * scale, cy + 230 * scale)
    neck_back_3 = (cx - 60 * scale, cy + 310 * scale)
    draw_bezier_curve(draw, neck_back_0, neck_back_1, neck_back_2, neck_back_3, INK, width=3.8 * scale)

    # Clavícula com traços suaves
    draw_bezier_curve(draw, (cx + 24 * scale, cy + 310 * scale), (cx + 80 * scale, cy + 325 * scale),
                            (cx + 130 * scale, cy + 335 * scale), (cx + 180 * scale, cy + 345 * scale), INK, width=2.8 * scale)
    draw_bezier_curve(draw, (cx - 20 * scale, cy + 315 * scale), (cx - 60 * scale, cy + 330 * scale),
                            (cx - 110 * scale, cy + 340 * scale), (cx - 150 * scale, cy + 350 * scale), INK, width=2.5 * scale)

    # Orelha delicada e brinco longo
    ear_0 = (cx - 92 * scale, cy - 10 * scale)
    ear_1 = (cx - 120 * scale, cy + 5 * scale)
    ear_2 = (cx - 118 * scale, cy + 45 * scale)
    ear_3 = (cx - 90 * scale, cy + 55 * scale)
    draw_bezier_curve(draw, ear_0, ear_1, ear_2, ear_3, INK, width=3.0 * scale)
    # Cartilagem interna
    draw_bezier_curve(draw, (cx - 98 * scale, cy + 8 * scale), (cx - 110 * scale, cy + 18 * scale),
                            (cx - 105 * scale, cy + 32 * scale), (cx - 94 * scale, cy + 40 * scale), INK_SOFT, width=2.2 * scale)

    # Brinco de gota/pendente estilo anime gótico
    draw.line([(cx - 90 * scale, cy + 56 * scale), (cx - 90 * scale, cy + 105 * scale)], fill=INK, width=int(2.2 * scale))
    draw.ellipse([cx - 94 * scale, cy + 105 * scale, cx - 86 * scale, cy + 128 * scale], outline=INK, width=int(2.5 * scale))

    # =========================================================================
    # 3. OLHO EXPRESSIVO E DETALHADO (LINEART IMPECÁVEL)
    # =========================================================================
    # Sobrancelha elegante com textura de pelos
    brow_0 = (cx - 30 * scale, cy - 50 * scale)
    brow_1 = (cx + 10 * scale, cy - 65 * scale)
    brow_2 = (cx + 45 * scale, cy - 62 * scale)
    brow_3 = (cx + 65 * scale, cy - 45 * scale)
    draw_bezier_curve(draw, brow_0, brow_1, brow_2, brow_3, INK, width=4.5 * scale)
    # Pelinhos da sobrancelha
    for bx in range(int(cx - 20 * scale), int(cx + 60 * scale), int(6 * scale)):
        t_brow = (bx - (cx - 20 * scale)) / (80.0 * scale)
        by = (cy - 52 * scale) - math.sin(t_brow * math.pi) * 12 * scale
        draw.line([(bx, by), (bx + 4 * scale, by - 6 * scale)], fill=INK_SOFT, width=int(1.5 * scale))

    # Pálpebra superior curva e volumosa com pestana clássica
    eye_up_0 = (cx - 8 * scale, cy - 22 * scale)
    eye_up_1 = (cx + 16 * scale, cy - 35 * scale)
    eye_up_2 = (cx + 42 * scale, cy - 32 * scale)
    eye_up_3 = (cx + 56 * scale, cy - 14 * scale)
    draw_bezier_curve(draw, eye_up_0, eye_up_1, eye_up_2, eye_up_3, INK, width=6.0 * scale)

    # Cílios longos e estilizados
    draw_bezier_curve(draw, (cx + 52 * scale, cy - 22 * scale), (cx + 64 * scale, cy - 32 * scale),
                            (cx + 70 * scale, cy - 35 * scale), (cx + 76 * scale, cy - 38 * scale), INK, width=3.2 * scale)
    draw_bezier_curve(draw, (cx + 40 * scale, cy - 30 * scale), (cx + 48 * scale, cy - 42 * scale),
                            (cx + 54 * scale, cy - 46 * scale), (cx + 58 * scale, cy - 48 * scale), INK, width=2.6 * scale)

    # Dobra da pálpebra (Double eyelid fold)
    draw_bezier_curve(draw, (cx - 2 * scale, cy - 36 * scale), (cx + 18 * scale, cy - 44 * scale),
                            (cx + 38 * scale, cy - 42 * scale), (cx + 48 * scale, cy - 30 * scale), INK_SOFT, width=2.2 * scale)

    # Íris detalhada em hachura radial
    iris_cx = cx + 24 * scale
    iris_cy = cy - 18 * scale
    iris_rx = 17 * scale
    iris_ry = 22 * scale
    draw.ellipse([iris_cx - iris_rx, iris_cy - iris_ry, iris_cx + iris_rx, iris_cy + iris_ry], outline=INK, width=int(3.0 * scale))
    
    # Pupila central
    draw.ellipse([iris_cx - 6 * scale, iris_cy - 7 * scale, iris_cx + 6 * scale, iris_cy + 7 * scale], fill=INK)

    # Brilho de luz especular primário e secundário
    draw.ellipse([iris_cx - 9 * scale, iris_cy - 14 * scale, iris_cx - 2 * scale, iris_cy - 6 * scale], fill=(255, 255, 255, 255), outline=INK, width=int(1.5 * scale))
    draw.ellipse([iris_cx + 5 * scale, iris_cy + 2 * scale, iris_cx + 9 * scale, iris_cy + 6 * scale], fill=(255, 255, 255, 255))

    # Hachura fina na metade superior da íris para dar profundidade de mangá
    draw_hatching(draw, (iris_cx - iris_rx + 2 * scale, iris_cy - 12 * scale), 
                        (iris_cx + iris_rx - 2 * scale, iris_cy - 12 * scale), 
                        length=14 * scale, angle_deg=90, spacing=3 * scale, color=INK_SOFT, width=int(1.4 * scale))

    # Pálpebra inferior delicada
    draw_bezier_curve(draw, (cx + 4 * scale, cy + 4 * scale), (cx + 20 * scale, cy + 8 * scale),
                            (cx + 38 * scale, cy + 6 * scale), (cx + 48 * scale, cy - 2 * scale), INK_SOFT, width=2.2 * scale)

    # =========================================================================
    # 4. FRANJA E MECHAS FRONTAIS (FLOWING BANGS & STRANDS)
    # =========================================================================
    # Mechas da franja que caem em camadas orgânicas sobre a testa e bochecha
    bangs = [
        # p0, p1, p2, p3, width
        ((cx - 40 * scale, cy - 250 * scale), (cx - 10 * scale, cy - 140 * scale), (cx + 10 * scale, cy - 60 * scale), (cx + 18 * scale, cy + 10 * scale), 4.5),
        ((cx - 60 * scale, cy - 240 * scale), (cx - 35 * scale, cy - 120 * scale), (cx - 12 * scale, cy - 30 * scale), (cx - 5 * scale, cy + 40 * scale), 4.2),
        ((cx - 10 * scale, cy - 260 * scale), (cx + 25 * scale, cy - 150 * scale), (cx + 45 * scale, cy - 80 * scale), (cx + 48 * scale, cy - 20 * scale), 4.0),
        ((cx + 30 * scale, cy - 250 * scale), (cx + 70 * scale, cy - 160 * scale), (cx + 90 * scale, cy - 60 * scale), (cx + 80 * scale, cy + 30 * scale), 4.5),
        ((cx - 80 * scale, cy - 230 * scale), (cx - 95 * scale, cy - 100 * scale), (cx - 70 * scale, cy + 20 * scale), (cx - 50 * scale, cy + 140 * scale), 4.8),
        ((cx - 110 * scale, cy - 200 * scale), (cx - 140 * scale, cy - 70 * scale), (cx - 130 * scale, cy + 70 * scale), (cx - 105 * scale, cy + 210 * scale), 5.0),
    ]

    for p0, p1, p2, p3, bw in bangs:
        draw_bezier_curve(draw, p0, p1, p2, p3, INK, width=bw * scale, steps=80)
        # Fio fino de detalhe correndo paralelo à mecha
        p0_sub = (p0[0] + 4 * scale, p0[1])
        p1_sub = (p1[0] + 4 * scale, p1[1])
        p2_sub = (p2[0] + 3 * scale, p2[1])
        p3_sub = (p3[0] + 2 * scale, p3[1])
        draw_bezier_curve(draw, p0_sub, p1_sub, p2_sub, p3_sub, INK_SOFT, width=(bw * 0.45) * scale, steps=70)

    # Topo da cabeça / volume do cabelo
    crown_0 = (cx - 140 * scale, cy - 180 * scale)
    crown_1 = (cx - 110 * scale, cy - 280 * scale)
    crown_2 = (cx - 20 * scale, cy - 320 * scale)
    crown_3 = (cx + 70 * scale, cy - 290 * scale)
    draw_bezier_curve(draw, crown_0, crown_1, crown_2, crown_3, INK, width=5.5 * scale)

    crown_r0 = (cx + 70 * scale, cy - 290 * scale)
    crown_r1 = (cx + 140 * scale, cy - 250 * scale)
    crown_r2 = (cx + 180 * scale, cy - 170 * scale)
    crown_r3 = (cx + 185 * scale, cy - 80 * scale)
    draw_bezier_curve(draw, crown_r0, crown_r1, crown_r2, crown_r3, INK, width=5.0 * scale)

    # Fios soltos de cabelo esvoaçante (flyaway strands) para máximo realismo artesanal
    flyaways = [
        ((cx + 60 * scale, cy - 295 * scale), (cx + 120 * scale, cy - 340 * scale), (cx + 190 * scale, cy - 310 * scale), (cx + 250 * scale, cy - 250 * scale)),
        ((cx - 20 * scale, cy - 325 * scale), (cx - 50 * scale, cy - 370 * scale), (cx - 110 * scale, cy - 350 * scale), (cx - 160 * scale, cy - 300 * scale)),
        ((cx + 80 * scale, cy + 25 * scale), (cx + 130 * scale, cy + 70 * scale), (cx + 150 * scale, cy + 140 * scale), (cx + 135 * scale, cy + 210 * scale)),
        ((cx - 45 * scale, cy + 135 * scale), (cx - 30 * scale, cy + 195 * scale), (cx - 15 * scale, cy + 255 * scale), (cx - 5 * scale, cy + 310 * scale)),
    ]
    for p0, p1, p2, p3 in flyaways:
        draw_bezier_curve(draw, p0, p1, p2, p3, INK_SOFT, width=2.0 * scale, steps=70)

    # =========================================================================
    # 5. VESTIMENTA & GOLA ORIENTAL DETALHADA COM DOBRAS DE TECIDO
    # =========================================================================
    # Gola estruturada (Kimono / Lapela elegante de casaco)
    lapel_left_0 = (cx - 65 * scale, cy + 285 * scale)
    lapel_left_1 = (cx - 30 * scale, cy + 340 * scale)
    lapel_left_2 = (cx + 15 * scale, cy + 420 * scale)
    lapel_left_3 = (cx + 45 * scale, cy + 520 * scale)
    draw_bezier_curve(draw, lapel_left_0, lapel_left_1, lapel_left_2, lapel_left_3, INK, width=5.0 * scale)

    # Borda dupla da lapela
    draw_bezier_curve(draw, 
                      (lapel_left_0[0] - 12 * scale, lapel_left_0[1]),
                      (lapel_left_1[0] - 14 * scale, lapel_left_1[1]),
                      (lapel_left_2[0] - 14 * scale, lapel_left_2[1]),
                      (lapel_left_3[0] - 14 * scale, lapel_left_3[1]),
                      INK_SOFT, width=2.8 * scale)

    lapel_right_0 = (cx + 25 * scale, cy + 325 * scale)
    lapel_right_1 = (cx - 10 * scale, cy + 390 * scale)
    lapel_right_2 = (cx - 40 * scale, cy + 470 * scale)
    lapel_right_3 = (cx - 70 * scale, cy + 560 * scale)
    draw_bezier_curve(draw, lapel_right_0, lapel_right_1, lapel_right_2, lapel_right_3, INK, width=5.2 * scale)

    # Ombros e caimento do tecido
    shoulder_r0 = (cx + 35 * scale, cy + 335 * scale)
    shoulder_r1 = (cx + 130 * scale, cy + 360 * scale)
    shoulder_r2 = (cx + 240 * scale, cy + 410 * scale)
    shoulder_r3 = (cx + 360 * scale, cy + 520 * scale)
    draw_bezier_curve(draw, shoulder_r0, shoulder_r1, shoulder_r2, shoulder_r3, INK, width=4.8 * scale)

    shoulder_l0 = (cx - 70 * scale, cy + 315 * scale)
    shoulder_l1 = (cx - 180 * scale, cy + 350 * scale)
    shoulder_l2 = (cx - 280 * scale, cy + 400 * scale)
    shoulder_l3 = (cx - 390 * scale, cy + 510 * scale)
    draw_bezier_curve(draw, shoulder_l0, shoulder_l1, shoulder_l2, shoulder_l3, INK, width=4.8 * scale)

    # Dobras de tecido e vincos orgânicos nas mangas e peito
    folds = [
        ((cx + 110 * scale, cy + 375 * scale), (cx + 90 * scale, cy + 440 * scale), (cx + 100 * scale, cy + 510 * scale), (cx + 120 * scale, cy + 580 * scale)),
        ((cx + 180 * scale, cy + 420 * scale), (cx + 170 * scale, cy + 490 * scale), (cx + 185 * scale, cy + 550 * scale), (cx + 205 * scale, cy + 610 * scale)),
        ((cx - 130 * scale, cy + 370 * scale), (cx - 120 * scale, cy + 430 * scale), (cx - 105 * scale, cy + 500 * scale), (cx - 90 * scale, cy + 570 * scale)),
        ((cx - 210 * scale, cy + 410 * scale), (cx - 195 * scale, cy + 480 * scale), (cx - 180 * scale, cy + 550 * scale), (cx - 165 * scale, cy + 620 * scale)),
    ]
    for p0, p1, p2, p3 in folds:
        draw_bezier_curve(draw, p0, p1, p2, p3, INK, width=3.4 * scale)
        # Hachura ao longo das dobras principais
        draw_hatching(draw, p1, p2, length=18 * scale, angle_deg=40, spacing=8 * scale, color=INK_LIGHT, width=int(1.6 * scale))

    # =========================================================================
    # 6. PÉTALAS FLUTUANTES EM TRAÇOS DE NANQUIM (SAKURA BOTANICAL ACCENTS)
    # =========================================================================
    # Pétalas de cerejeira delicadas em contorno puro com veios internos
    petal_centers = [
        (cx + 260 * scale, cy - 180 * scale, 38 * scale, -25),
        (cx + 340 * scale, cy - 60 * scale, 32 * scale, 35),
        (cx + 220 * scale, cy + 80 * scale, 26 * scale, 65),
        (cx - 220 * scale, cy - 140 * scale, 30 * scale, -45),
        (cx - 310 * scale, cy + 40 * scale, 34 * scale, 15),
        (cx - 260 * scale, cy + 260 * scale, 28 * scale, -10),
        (cx + 280 * scale, cy + 310 * scale, 36 * scale, 50),
    ]

    for px, py, pr, rot in petal_centers:
        rad = math.radians(rot)
        cos_r = math.cos(rad)
        sin_r = math.sin(rad)
        # 4 pontos de controle formando a pétala
        pts_local = [
            (0, -pr),
            (pr * 0.65, -pr * 0.4),
            (pr * 0.75, pr * 0.6),
            (0, pr),
            (-pr * 0.75, pr * 0.6),
            (-pr * 0.65, -pr * 0.4),
            (0, -pr)
        ]
        pts_rot = [(px + x * cos_r - y * sin_r, py + x * sin_r + y * cos_r) for x, y in pts_local]
        for i in range(len(pts_rot) - 1):
            draw.line([pts_rot[i], pts_rot[i+1]], fill=INK, width=int(2.4 * scale))
        # Veio central da pétala
        vein_top = pts_rot[0]
        vein_bot = (px + 0 * cos_r - (pr * 0.2) * sin_r, py + 0 * sin_r + (pr * 0.2) * cos_r)
        draw.line([vein_top, vein_bot], fill=INK_SOFT, width=int(1.6 * scale))

    # Downsampling com Lanczos para resolução nativa 1254x1254 com nitidez perfeita
    print("✨ Processando anti-aliasing Lanczos para resolução 1254x1254...")
    ink_final_alpha = ink_layer.resize((size, size), Image.Resampling.LANCZOS)
    return ink_final_alpha

def main():
    print("==================================================================")
    print("🖤 BLACKCORE // NOVA OBRA NO ESTILO DE TRAÇOS DE PIN32")
    print("==================================================================")
    t0 = time.time()

    size = 1254
    alpha_strokes = render_artwork(size=size)
    alpha_channel = alpha_strokes.split()[3]

    OUT_DIR_DL.mkdir(parents=True, exist_ok=True)
    OUT_DIR_PIC.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # 1. VERSÃO STUDIO INK (Papel Branco Fine Art + Nanquim Japonês)
    # -------------------------------------------------------------------------
    print("✒️  [1/3] Gerando Versão Studio Ink (Nanquim sobre Papel de Arte)...")
    studio_canvas = Image.new("RGB", (size, size), (255, 255, 255))
    studio_pixels = studio_canvas.load()
    alpha_pixels = alpha_channel.load()

    for y in range(size):
        for x in range(size):
            a = alpha_pixels[x, y]
            if a > 0:
                t = a / 255.0
                # Preto nanquim refinado
                r = int(255 - t * (255 - 14))
                g = int(255 - t * (255 - 14))
                b = int(255 - t * (255 - 18))
                studio_pixels[x, y] = (r, g, b)

    # Leve acabamento de unsharp mask para máxima definição
    studio_canvas = studio_canvas.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=1))

    out_studio_dl = OUT_DIR_DL / "PIN32_estilo_novo_studio_ink.png"
    out_studio_pic = OUT_DIR_PIC / "PIN32_estilo_novo_studio_ink.png"
    studio_canvas.save(out_studio_dl, "PNG", optimize=True)
    studio_canvas.save(out_studio_pic, "PNG", optimize=True)
    print(f"   -> Salvo em: {out_studio_dl.name}")

    # -------------------------------------------------------------------------
    # 2. VERSÃO DARKCORE OBSIDIAN (Prata/Luz sobre Fundo Preto Profundo)
    # -------------------------------------------------------------------------
    print("🖤 [2/3] Gerando Versão Darkcore Obsidian (Prata sobre Fundo Escuro)...")
    dark_canvas = Image.new("RGB", (size, size), (12, 12, 16))
    dark_pixels = dark_canvas.load()

    for y in range(size):
        for x in range(size):
            a = alpha_pixels[x, y]
            if a > 0:
                t = a / 255.0
                r = int(12 + t * (242 - 12))
                g = int(12 + t * (245 - 12))
                b = int(16 + t * (255 - 16))
                dark_pixels[x, y] = (r, g, b)

    dark_canvas = dark_canvas.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=1))

    out_dark_dl = OUT_DIR_DL / "PIN32_estilo_novo_darkcore.png"
    out_dark_pic = OUT_DIR_PIC / "PIN32_estilo_novo_darkcore.png"
    dark_canvas.save(out_dark_dl, "PNG", optimize=True)
    dark_canvas.save(out_dark_pic, "PNG", optimize=True)
    print(f"   -> Salvo em: {out_dark_dl.name}")

    # -------------------------------------------------------------------------
    # 3. VERSÃO TRANSPARENTE (Isolada para uso livre em qualquer software)
    # -------------------------------------------------------------------------
    print("✨ [3/3] Gerando Versão Transparente (.PNG Alfa)...")
    out_trans_dl = OUT_DIR_DL / "PIN32_estilo_novo_transparente.png"
    out_trans_pic = OUT_DIR_PIC / "PIN32_estilo_novo_transparente.png"
    alpha_strokes.save(out_trans_dl, "PNG", optimize=True)
    alpha_strokes.save(out_trans_pic, "PNG", optimize=True)
    print(f"   -> Salvo em: {out_trans_dl.name}")

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
    print(f"✅ NOVA OBRA CRIADA COM SUCESSO EM {elapsed:.2f}s!")
    print("Arquivos prontos na Galeria do seu celular:")
    print(f" 1. {out_studio_dl}")
    print(f" 2. {out_dark_dl}")
    print(f" 3. {out_trans_dl}")
    print("==================================================================")

if __name__ == "__main__":
    main()
