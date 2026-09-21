#!/usr/bin/env python3
"""
paint_studio_pro.py - Motor Gráfico v0.3 Naturalness & Organic Shading Engine
Implementação Oficial do Roadmap v0.2 -> 1.0 (Black Core Visual Generation)
Foco: Naturalidade, assimetria controlada, quebra de rigidez geométrica, stroke adaptativo e iluminação integrada.
"""

from __future__ import annotations
import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

class ProStudioEngineV03:
    def __init__(self, target_w=1200, target_h=1200, ssaa=2, seed=42):
        self.target_w = target_w
        self.target_h = target_h
        self.ssaa = ssaa
        self.w = target_w * ssaa
        self.h = target_h * ssaa
        self.cx = self.w // 2
        self.cy = self.h // 2
        random.seed(seed)

    def create_layer(self) -> tuple[Image.Image, ImageDraw.ImageDraw]:
        """Cria uma camada transparente em resolução supersampled."""
        img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        return img, ImageDraw.Draw(img, "RGBA")

    def draw_adaptive_bezier(self, draw: ImageDraw.ImageDraw, p0, p1, p2, p3, color, base_width=3, steps=50):
        """Pilar 7: Stroke Adaptativo - Desenha curvas com variação orgânica de espessura e opacidade."""
        points = []
        for i in range(steps + 1):
            t = i / steps
            inv_t = 1 - t
            x = (inv_t**3 * p0[0] + 3 * inv_t**2 * t * p1[0] + 3 * inv_t * t**2 * p2[0] + t**3 * p3[0])
            y = (inv_t**3 * p0[1] + 3 * inv_t**2 * t * p1[1] + 3 * inv_t * t**2 * p2[1] + t**3 * p3[1])
            points.append((x, y))
        
        for i in range(len(points) - 1):
            t = i / steps
            # Variação suave de espessura imitando pressão natural do pincel
            width_var = math.sin(t * math.pi) * 0.8 + 0.6
            cur_w = max(1, int(base_width * width_var * (1 + (random.random() - 0.5) * 0.15)))
            
            # Pequena variação de transparência no traço
            if len(color) == 4:
                alpha = int(color[3] * (0.85 + math.sin(t * math.pi * 2) * 0.15))
                cur_color = (color[0], color[1], color[2], max(10, min(255, alpha)))
            else:
                cur_color = color
                
            draw.line([points[i], points[i+1]], fill=cur_color, width=cur_w)

    def render_v03_character(self) -> Image.Image:
        """Renderiza a personagem aplicando rigorosamente os 7 pilares do Roadmap v0.3."""
        w, h = self.w, self.h
        cx, cy = self.cx, self.cy

        # ----------------------------------------------------
        # PILAR 6: FUNDO INTEGRADO AO AMBIENTE E À FIGURA
        # ----------------------------------------------------
        bg = Image.new("RGBA", (w, h), (4, 3, 9, 255))
        bg_draw = ImageDraw.Draw(bg, "RGBA")

        # Gradiente não-uniforme no fundo
        for y in range(h):
            t = y / h
            r = int(3 + math.sin(t * math.pi * 0.8) * 16)
            g = int(2 + math.sin(t * math.pi * 0.8) * 5)
            b = int(7 + math.sin(t * math.pi * 0.8) * 22)
            bg_draw.line([0, y, w, y], fill=(r, g, b, 255))

        # Arquitetura futurista assimétrica com luzes vermelhas desfocadas
        bg_fx, bg_fx_draw = self.create_layer()
        pillars = [
            (int(w*0.08), int(w*0.07), 160),
            (int(w*0.22), int(w*0.09), 200),
            (int(w*0.74), int(w*0.06), 180),
            (int(w*0.89), int(w*0.08), 150)
        ]
        for px, pw, alpha in pillars:
            bg_fx_draw.rectangle([px, 0, px + pw, h], fill=(14, 6, 18, alpha))
            bg_fx_draw.line([px, 0, px, h], fill=(240, 10, 45, 90), width=int(2 * self.ssaa))

        # Luzes bokeh assimétricas
        for _ in range(18):
            bx = random.randint(int(w*0.05), int(w*0.95))
            by = random.randint(int(h*0.1), int(h*0.8))
            br = random.randint(int(30 * self.ssaa), int(130 * self.ssaa))
            bg_fx_draw.ellipse([bx - br, by - br, bx + br, by + br], fill=(235, 15, 45, random.randint(15, 38)))

        bg_fx = bg_fx.filter(ImageFilter.GaussianBlur(int(22 * self.ssaa)))
        base = Image.alpha_composite(bg, bg_fx)

        # Luz Traseira Vermelha Volumétrica
        rim_glow, rg_draw = self.create_layer()
        glow_radius = int(w * 0.44)
        for r in range(glow_radius, 0, -int(6 * self.ssaa)):
            t = 1 - (r / glow_radius)
            alpha = int(145 * (t**1.8))
            rg_draw.ellipse([cx - r, cy - r - int(50 * self.ssaa), cx + r, cy + r - int(50 * self.ssaa)], fill=(255, 12, 42, alpha))

        rim_glow = rim_glow.filter(ImageFilter.GaussianBlur(int(36 * self.ssaa)))
        base = Image.alpha_composite(base, rim_glow)

        # ----------------------------------------------------
        # PILAR 5: CABELO ORGÂNICO (SEM REPETIÇÃO RÍGIDA DE FIOS)
        # ----------------------------------------------------
        hair_bg, hb_draw = self.create_layer()
        
        # Massa base com leve assimetria nas curvas
        hb_draw.polygon([
            (cx - int(110*self.ssaa), cy - int(250*self.ssaa)),
            (cx - int(340*self.ssaa), cy - int(170*self.ssaa)),
            (cx - int(490*self.ssaa), cy + int(110*self.ssaa)),
            (cx - int(430*self.ssaa), cy + int(490*self.ssaa)),
            (cx - int(310*self.ssaa), h),
            (cx + int(290*self.ssaa), h),
            (cx + int(450*self.ssaa), cy + int(470*self.ssaa)),
            (cx + int(470*self.ssaa), cy + int(110*self.ssaa)),
            (cx + int(310*self.ssaa), cy - int(190*self.ssaa)),
            (cx + int(90*self.ssaa), cy - int(250*self.ssaa)),
        ], fill=(7, 7, 12, 255))

        # Agrupamento natural de mechas em feixes (strand bundles)
        for _ in range(320):
            side = -1 if random.random() > 0.48 else 1
            x0 = cx + side * random.randint(int(40*self.ssaa), int(310*self.ssaa)) + random.randint(-15, 15)
            y0 = cy - random.randint(int(170*self.ssaa), int(270*self.ssaa))
            
            p1 = (x0 + side * random.randint(int(70*self.ssaa), int(250*self.ssaa)), y0 + random.randint(int(140*self.ssaa), int(360*self.ssaa)))
            p2 = (x0 + side * random.randint(int(30*self.ssaa), int(190*self.ssaa)), y0 + random.randint(int(380*self.ssaa), int(680*self.ssaa)))
            p3 = (x0 + side * random.randint(int(10*self.ssaa), int(140*self.ssaa)), h + random.randint(0, 50))

            c_choice = random.random()
            if c_choice > 0.7:
                # Reflexo frio azul/prateado suave
                strand_color = (95, 130, 190, random.randint(80, 160))
                sw = random.randint(int(2*self.ssaa), int(5*self.ssaa))
            elif c_choice > 0.35:
                strand_color = (22, 28, 46, 210)
                sw = random.randint(int(3*self.ssaa), int(9*self.ssaa))
            else:
                strand_color = (6, 6, 11, 255)
                sw = random.randint(int(4*self.ssaa), int(14*self.ssaa))

            self.draw_adaptive_bezier(hb_draw, (x0, y0), p1, p2, p3, strand_color, base_width=sw)

        base = Image.alpha_composite(base, hair_bg)

        # ----------------------------------------------------
        # ROUPA GÓTICA & CORPO ELEGANTE
        # ----------------------------------------------------
        body, b_draw = self.create_layer()

        shoulder_y = cy + int(240 * self.ssaa)
        b_draw.polygon([
            (cx - int(100*self.ssaa), cy + int(130*self.ssaa)),
            (cx + int(100*self.ssaa), cy + int(130*self.ssaa)),
            (cx + int(420*self.ssaa), shoulder_y + int(280*self.ssaa)),
            (cx - int(420*self.ssaa), shoulder_y + int(280*self.ssaa))
        ], fill=(11, 10, 15, 255))

        corset_top = cy + int(200 * self.ssaa)
        b_draw.polygon([
            (cx - int(130*self.ssaa), corset_top),
            (cx + int(130*self.ssaa), corset_top),
            (cx + int(180*self.ssaa), h),
            (cx - int(180*self.ssaa), h)
        ], fill=(6, 6, 9, 255))

        crimson = (195, 12, 42, 230)
        b_draw.line([(cx - int(130*self.ssaa), corset_top), (cx + int(2*self.ssaa), corset_top + int(44*self.ssaa)), (cx + int(130*self.ssaa), corset_top)], fill=crimson, width=int(4 * self.ssaa))
        
        for off in [-int(45*self.ssaa), int(45*self.ssaa)]:
            b_draw.line([(cx + off, corset_top + int(44*self.ssaa)), (cx + off, h)], fill=crimson, width=int(2.5 * self.ssaa))
            
        choker_y = cy + int(145 * self.ssaa)
        b_draw.rectangle([cx - int(58*self.ssaa), choker_y, cx + int(58*self.ssaa), choker_y + int(18*self.ssaa)], fill=(18, 18, 24, 255), outline=(160, 165, 185, 255), width=int(1.5*self.ssaa))
        gem_y = choker_y + int(30 * self.ssaa)
        b_draw.polygon([(cx, gem_y - int(12*self.ssaa)), (cx + int(10*self.ssaa), gem_y), (cx, gem_y + int(16*self.ssaa)), (cx - int(10*self.ssaa), gem_y)], fill=(230, 10, 40, 255))

        base = Image.alpha_composite(base, body)

        # ----------------------------------------------------
        # PILAR 1 E PILAR 4: ROSTO COM MICRO-VARIAÇÕES & BOCHECHAS COM TRANSIÇÃO SUAVE
        # ----------------------------------------------------
        face, f_draw = self.create_layer()

        skin_base = (244, 240, 250, 255)
        
        # Pescoço
        f_draw.polygon([
            (cx - int(65*self.ssaa), cy + int(45*self.ssaa)),
            (cx + int(65*self.ssaa), cy + int(45*self.ssaa)),
            (cx + int(80*self.ssaa), cy + int(165*self.ssaa)),
            (cx - int(80*self.ssaa), cy + int(165*self.ssaa))
        ], fill=skin_base)

        # Contorno do Rosto com Leve Assimetria Natural
        face_pts = [
            (cx - int(144*self.ssaa), cy - int(150*self.ssaa)),
            (cx - int(161*self.ssaa), cy - int(38*self.ssaa)),
            (cx - int(151*self.ssaa), cy + int(32*self.ssaa)),
            (cx - int(109*self.ssaa), cy + int(96*self.ssaa)),
            (cx - int(54*self.ssaa), cy + int(141*self.ssaa)),
            (cx + int(2*self.ssaa), cy + int(153*self.ssaa)),  # Micro-deslocamento no queixo
            (cx + int(56*self.ssaa), cy + int(139*self.ssaa)),
            (cx + int(111*self.ssaa), cy + int(94*self.ssaa)),
            (cx + int(149*self.ssaa), cy + int(28*self.ssaa)),
            (cx + int(159*self.ssaa), cy - int(42*self.ssaa)),
            (cx + int(146*self.ssaa), cy - int(150*self.ssaa)),
            (cx, cy - int(200*self.ssaa))
        ]
        f_draw.polygon(face_pts, fill=skin_base)

        # Pilar 4: Sombreamento em camadas suaves nas bochechas (degradação senoidal sem blocos rígidos)
        cheek_shade, cs_draw = self.create_layer()
        # Bochecha Esquerda
        for r_step in range(int(50 * self.ssaa), 0, -int(4 * self.ssaa)):
            alpha = int(35 * (1 - r_step / (50 * self.ssaa)))
            cs_draw.ellipse([
                cx - int(122*self.ssaa) - r_step, cy + int(18*self.ssaa) - int(r_step*0.6),
                cx - int(122*self.ssaa) + r_step, cy + int(18*self.ssaa) + int(r_step*0.6)
            ], fill=(195, 185, 215, alpha))
            
        # Bochecha Direita (Com leve assimetria na opacidade para realçar a iluminação direcional)
        for r_step in range(int(48 * self.ssaa), 0, -int(4 * self.ssaa)):
            alpha = int(28 * (1 - r_step / (48 * self.ssaa)))
            cs_draw.ellipse([
                cx + int(122*self.ssaa) - r_step, cy + int(16*self.ssaa) - int(r_step*0.6),
                cx + int(122*self.ssaa) + r_step, cy + int(16*self.ssaa) + int(r_step*0.6)
            ], fill=(195, 185, 215, alpha))

        cheek_shade = cheek_shade.filter(ImageFilter.GaussianBlur(int(12 * self.ssaa)))
        face = Image.alpha_composite(face, cheek_shade)
        f_draw = ImageDraw.Draw(face, "RGBA")

        # Pilar 1: Nariz com volumes suaves e sombras delicadas
        nose_y = cy + int(25 * self.ssaa)
        f_draw.line([cx - int(5*self.ssaa), nose_y + int(18*self.ssaa), cx + int(1*self.ssaa), nose_y + int(24*self.ssaa), cx + int(6*self.ssaa), nose_y + int(18*self.ssaa)], fill=(155, 145, 175, 220), width=int(2.5 * self.ssaa))
        f_draw.line([cx - int(1*self.ssaa), cy - int(30*self.ssaa), cx, nose_y + int(20*self.ssaa)], fill=(210, 205, 230, 80), width=int(2 * self.ssaa))

        # PILAR 3: BOCA COM QUEBRA DE GEOMETRIA PERFEITA E ASSIMETRIA
        mouth_y = cy + int(86 * self.ssaa)
        # Lábios com pequena assimetria na curvatura do arco do cupido e espessura adaptativa
        f_draw.polygon([
            (cx - int(38*self.ssaa), mouth_y + int(1*self.ssaa)),
            (cx - int(16*self.ssaa), mouth_y - int(6*self.ssaa)),
            (cx + int(1*self.ssaa), mouth_y - int(2*self.ssaa)),   # Centro levemente deslocado
            (cx + int(14*self.ssaa), mouth_y - int(5*self.ssaa)),
            (cx + int(37*self.ssaa), mouth_y - int(1*self.ssaa)),
            (cx + int(18*self.ssaa), mouth_y + int(13*self.ssaa)),
            (cx, mouth_y + int(15*self.ssaa)),
            (cx - int(21*self.ssaa), mouth_y + int(11*self.ssaa))
        ], fill=(142, 16, 46, 250))

        # Traço de separação labial não-matemático
        f_draw.line([(cx - int(40*self.ssaa), mouth_y), (cx + int(2*self.ssaa), mouth_y - int(0.5*self.ssaa)), (cx + int(39*self.ssaa), mouth_y + int(0.5*self.ssaa))], fill=(38, 4, 10, 255), width=int(2 * self.ssaa))
        f_draw.ellipse([cx - int(12*self.ssaa), mouth_y + int(4*self.ssaa), cx + int(8*self.ssaa), mouth_y + int(9*self.ssaa)], fill=(225, 125, 155, 170))

        base = Image.alpha_composite(base, face)

        # ----------------------------------------------------
        # CHIFRES NEGROS DE OBSIDIANA (POLIDOS)
        # ----------------------------------------------------
        horns, h_draw = self.create_layer()

        def draw_obsidian_horn(is_left=True):
            side = -1 if is_left else 1
            bx = cx + side * int(120 * self.ssaa)
            by = cy - int(155 * self.ssaa)

            steps = 90
            pts = []
            for i in range(steps):
                t = i / steps
                hx = bx + side * (math.sin(t * math.pi * 0.85) * int(220*self.ssaa) + t * int(50*self.ssaa))
                hy = by - (t * int(380*self.ssaa) + math.cos(t * math.pi * 0.5) * int(50*self.ssaa))
                rad = (1 - t) * int(38 * self.ssaa) + int(2.5 * self.ssaa)
                pts.append((hx, hy, rad))

            for hx, hy, rad in pts:
                h_draw.ellipse([hx - rad, hy - rad, hx + rad, hy + rad], fill=(8, 8, 14, 255))

            for hx, hy, rad in pts:
                spec_rad = rad * 0.45
                h_draw.ellipse([hx - spec_rad, hy - spec_rad, hx + spec_rad*0.3, hy + spec_rad*0.3], fill=(130, 150, 185, 45))

            for hx, hy, rad in pts:
                rim_x = hx + side * (rad * 0.8)
                h_draw.ellipse([rim_x - int(3*self.ssaa), hy - int(3*self.ssaa), rim_x + int(3*self.ssaa), hy + int(3*self.ssaa)], fill=(255, 20, 50, 200))

        draw_obsidian_horn(is_left=True)
        draw_obsidian_horn(is_left=False)

        base = Image.alpha_composite(base, horns)

        # ----------------------------------------------------
        # PILAR 2: OLHOS COM DETALHES INTERNOS & PEQUENAS ASSIMETRIAS
        # ----------------------------------------------------
        eyes, e_draw = self.create_layer()
        eye_y = cy - int(30 * self.ssaa)
        eye_space = int(75 * self.ssaa)

        for side in [-1, 1]:
            ex = cx + side * eye_space
            # Pilar 2: Pequena variação na abertura dos olhos e pálpebra
            ey_var = eye_y + (int(1 * self.ssaa) if side == 1 else 0)
            ew = int(48 * self.ssaa)
            eh = int(25 * self.ssaa) + (int(1 * self.ssaa) if side == -1 else 0)

            brow_y = ey_var - int(34 * self.ssaa)
            e_draw.polygon([
                (ex - side * int(34*self.ssaa), brow_y + int(5*self.ssaa)),
                (ex - side * int(12*self.ssaa), brow_y - int(10*self.ssaa)),
                (ex + side * int(34*self.ssaa), brow_y - int(2*self.ssaa)),
                (ex + side * int(24*self.ssaa), brow_y - int(14*self.ssaa)),
                (ex - side * int(12*self.ssaa), brow_y - int(16*self.ssaa))
            ], fill=(14, 10, 18, 255))

            e_draw.ellipse([ex - ew, ey_var - eh, ex + ew, ey_var + eh], fill=(12, 10, 18, 255))
            e_draw.ellipse([ex - ew + int(3.5*self.ssaa), ey_var - eh + int(3.5*self.ssaa), ex + ew - int(3.5*self.ssaa), ey_var + eh - int(3.5*self.ssaa)], fill=(238, 238, 248, 255))

            # Halo de iluminação com variação de borda
            iris_r = int(19 * self.ssaa)
            for gr in range(int(45 * self.ssaa), iris_r, -int(3 * self.ssaa)):
                t = 1 - (gr - iris_r) / (int(26 * self.ssaa))
                e_draw.ellipse([ex - gr, ey_var - gr, ex + gr, ey_var + gr], fill=(255, 0, 50, int(95 * t)))

            # Íris com micro-fibras e anel de limbo
            for ir in range(iris_r, 0, -int(2 * self.ssaa)):
                t = 1 - (ir / iris_r)
                ir_color = (int(180 + t * 75), int(t * 70), int(20 + t * 60), 255)
                e_draw.ellipse([ex - ir, ey_var - ir, ex + ir, ey_var + ir], fill=ir_color)

            # Detalhes internos (micro-fibras radiantes na íris)
            for f_ang in range(0, 360, 30):
                rad_a = math.radians(f_ang + side * 5)
                fx1 = ex + math.cos(rad_a) * (iris_r * 0.3)
                fy1 = ey_var + math.sin(rad_a) * (iris_r * 0.3)
                fx2 = ex + math.cos(rad_a) * (iris_r * 0.85)
                fy2 = ey_var + math.sin(rad_a) * (iris_r * 0.85)
                e_draw.line([fx1, fy1, fx2, fy2], fill=(255, 120, 150, 140), width=int(1.2 * self.ssaa))

            # Pupila fenda
            e_draw.ellipse([ex - int(3*self.ssaa), ey_var - int(14*self.ssaa), ex + int(3*self.ssaa), ey_var + int(14*self.ssaa)], fill=(10, 0, 4, 255))

            # Asimetria no reflexo especular (Catchlight em ângulos levemente diferentes)
            off_cat_x = -int(7 * self.ssaa) if side == -1 else -int(5 * self.ssaa)
            e_draw.ellipse([ex + off_cat_x, ey_var - int(9*self.ssaa), ex + off_cat_x + int(6*self.ssaa), ey_var - int(3*self.ssaa)], fill=(255, 255, 255, 255))
            e_draw.ellipse([ex + int(3*self.ssaa), ey_var + int(3*self.ssaa), ex + int(7*self.ssaa), ey_var + int(7*self.ssaa)], fill=(255, 210, 230, 230))

        base = Image.alpha_composite(base, eyes)

        # ----------------------------------------------------
        # PILAR 5: CABELO FRONTAL COM FIOS SOLTOS CRUZANDO (STRAY HAIRS)
        # ----------------------------------------------------
        hair_fg, hf_draw = self.create_layer()

        front_strands = [
            # Franja esquerda com variação de espessura
            [(cx - int(145*self.ssaa), cy - int(200*self.ssaa)), (cx - int(115*self.ssaa), cy - int(100*self.ssaa)), (cx - int(140*self.ssaa), cy + int(50*self.ssaa)), (cx - int(160*self.ssaa), cy + int(240*self.ssaa))],
            [(cx - int(125*self.ssaa), cy - int(190*self.ssaa)), (cx - int(95*self.ssaa), cy - int(70*self.ssaa)), (cx - int(105*self.ssaa), cy + int(90*self.ssaa)), (cx - int(125*self.ssaa), cy + int(360*self.ssaa))],
            # Franja direita assimétrica
            [(cx + int(148*self.ssaa), cy - int(198*self.ssaa)), (cx + int(118*self.ssaa), cy - int(98*self.ssaa)), (cx + int(138*self.ssaa), cy + int(52*self.ssaa)), (cx + int(162*self.ssaa), cy + int(242*self.ssaa))],
            [(cx + int(122*self.ssaa), cy - int(188*self.ssaa)), (cx + int(92*self.ssaa), cy - int(68*self.ssaa)), (cx + int(108*self.ssaa), cy + int(92*self.ssaa)), (cx + int(122*self.ssaa), cy + int(362*self.ssaa))],
            # Fios soltos cruzando a testa (quebra de rigidez)
            [(cx - int(45*self.ssaa), cy - int(195*self.ssaa)), (cx - int(10*self.ssaa), cy - int(110*self.ssaa)), (cx + int(15*self.ssaa), cy - int(55*self.ssaa))],
            [(cx + int(40*self.ssaa), cy - int(190*self.ssaa)), (cx + int(5*self.ssaa), cy - int(105*self.ssaa)), (cx - int(20*self.ssaa), cy - int(50*self.ssaa))]
        ]

        for pts in front_strands:
            p0, p1, p2 = pts[0], pts[1], pts[2]
            p3 = pts[3] if len(pts) > 3 else pts[2]
            self.draw_adaptive_bezier(hf_draw, p0, p1, p2, p3, (6, 6, 11, 255), base_width=int(11*self.ssaa))
            self.draw_adaptive_bezier(hf_draw, p0, p1, p2, p3, (92, 128, 188, 150), base_width=int(3*self.ssaa))

        base = Image.alpha_composite(base, hair_fg)

        # ----------------------------------------------------
        # PÓS-PROCESSAMENTO & DOWNSAMPLING LANCZOS
        # ----------------------------------------------------
        bloom_layer, bloom_draw = self.create_layer()
        for _ in range(90):
            ex = random.randint(0, w)
            ey = random.randint(0, h)
            er = random.randint(int(1.5*self.ssaa), int(5*self.ssaa))
            bloom_draw.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(255, 20, 55, random.randint(80, 220)))

        bloom_filtered = bloom_layer.filter(ImageFilter.GaussianBlur(int(8 * self.ssaa)))
        base = Image.alpha_composite(base, bloom_filtered)

        vin, v_draw = self.create_layer()
        max_dist = math.hypot(cx, cy)
        for r in range(int(max_dist), int(max_dist * 0.45), -int(15 * self.ssaa)):
            t = 1 - (r / max_dist)
            v_draw.rectangle([0, 0, w, h], outline=(0, 0, 0, int(190 * (1 - t)**2)), width=int(20 * self.ssaa))
        base = Image.alpha_composite(base, vin)

        print(f"🔄 Executando Downsampling Lanczos v0.3: {self.w}x{self.h} -> {self.target_w}x{self.target_h}...")
        final_img = base.convert("RGB").resize((self.target_w, self.target_h), Image.Resampling.LANCZOS)
        
        enhancer = ImageEnhance.Sharpness(final_img)
        final_img = enhancer.enhance(1.12)

        return final_img

def main():
    print("\033[1;36m🎨 BLACKCORE STUDIO PRO v0.3 // Renderizando com os 7 Pilares de Naturalidade...\033[0m")
    t0 = time.time()
    
    engine = ProStudioEngineV03(target_w=1200, target_h=1200, ssaa=2)
    img = engine.render_v03_character()
    
    out_dir = Path("/storage/emulated/0/Download")
    if not out_dir.exists():
        out_dir = Path.home() / "BLACKCORE-Projects" / "black-paint-studio" / "gallery"
        out_dir.mkdir(parents=True, exist_ok=True)

    out_file = out_dir / "personagem_goth_v03_natural.png"
    img.save(out_file, "PNG", quality=100)

    # Dispara scanner do Android
    subprocess.run(["termux-media-scan", str(out_file)], capture_output=True)
    
    elapsed = time.time() - t0
    print(f"\033[1;32m✅ Renderização v0.3 concluída em {elapsed:.2f}s!\033[0m")
    print(f"\033[1;37m👉 Arquivo em alta fidelidade com naturalidade v0.3: {out_file}\033[0m\n")

    # Prévia no terminal
    try:
        sys.path.insert(0, str(Path.home() / ".blackcore" / "modules" / "black_numbers"))
        from bn_vision import scan_pixels, render_terminal_ansi
        scan_data = scan_pixels(out_file, width=42, height=22)
        render_terminal_ansi(scan_data, colored=True)
    except Exception as e:
        print(f"Prévia: {e}")

if __name__ == "__main__":
    main()
