#!/usr/bin/env python3
"""
paint_studio_pro.py - Motor Gráfico de Alta Fidelidade (BLACKCORE Pro Studio v2.0)
Renderização em Múltiplos Passes, SSAA 2x/4x com Downsampling Lanczos,
Sombreamento Orgânico, Shaders de Materiais (Pele, Cabelo, Obsidiana) e Pós-Processamento Bloom.
"""

from __future__ import annotations
import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

class ProStudioEngine:
    def __init__(self, target_w=1200, target_h=1200, ssaa=2):
        self.target_w = target_w
        self.target_h = target_h
        self.ssaa = ssaa
        self.w = target_w * ssaa
        self.h = target_h * ssaa
        self.cx = self.w // 2
        self.cy = self.h // 2

    def create_layer(self) -> tuple[Image.Image, ImageDraw.ImageDraw]:
        """Cria uma camada transparente em resolução supersampled."""
        img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        return img, ImageDraw.Draw(img, "RGBA")

    def draw_bezier_strand(self, draw: ImageDraw.ImageDraw, p0, p1, p2, p3, color, width=2, steps=40):
        """Desenha uma curva de Bézier cúbica suave para mechas e fios de cabelo."""
        points = []
        for i in range(steps + 1):
            t = i / steps
            inv_t = 1 - t
            x = (inv_t**3 * p0[0] + 
                 3 * inv_t**2 * t * p1[0] + 
                 3 * inv_t * t**2 * p2[0] + 
                 t**3 * p3[0])
            y = (inv_t**3 * p0[1] + 
                 3 * inv_t**2 * t * p1[1] + 
                 3 * inv_t * t**2 * p2[1] + 
                 t**3 * p3[1])
            points.append((x, y))
        
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=color, width=width)

    def render_gothic_queen(self) -> Image.Image:
        """Renderiza a personagem gótica em altíssima fidelidade e acabamento profissional."""
        w, h = self.w, self.h
        cx, cy = self.cx, self.cy

        # ----------------------------------------------------
        # PASS 1: FUNDO ATMOSFÉRICO CYBER/DARK
        # ----------------------------------------------------
        bg = Image.new("RGBA", (w, h), (4, 3, 9, 255))
        bg_draw = ImageDraw.Draw(bg, "RGBA")

        # Gradiente suave de estúdio
        for y in range(h):
            t = y / h
            r = int(3 + t * 14)
            g = int(2 + t * 4)
            b = int(7 + t * 18)
            bg_draw.line([0, y, w, y], fill=(r, g, b, 255))

        # Arquitetura futurista desfocada e colunas cibernéticas
        bg_fx, bg_fx_draw = self.create_layer()
        for px, pw in [(int(w*0.1), int(w*0.06)), (int(w*0.25), int(w*0.08)), (int(w*0.75), int(w*0.08)), (int(w*0.9), int(w*0.06))]:
            bg_fx_draw.rectangle([px, 0, px + pw, h], fill=(12, 6, 16, 140))
            # Luzes verticais neon nas colunas
            bg_fx_draw.line([px, 0, px, h], fill=(220, 10, 40, 80), width=int(2 * self.ssaa))
            bg_fx_draw.line([px + pw, 0, px + pw, h], fill=(180, 0, 50, 60), width=int(2 * self.ssaa))

        # Luzes vermelhas bokeh
        for _ in range(16):
            bx = random.randint(int(w*0.05), int(w*0.95))
            by = random.randint(int(h*0.1), int(h*0.8))
            br = random.randint(int(40 * self.ssaa), int(120 * self.ssaa))
            bg_fx_draw.ellipse([bx - br, by - br, bx + br, by + br], fill=(240, 15, 45, random.randint(15, 40)))

        bg_fx = bg_fx.filter(ImageFilter.GaussianBlur(int(20 * self.ssaa)))
        base = Image.alpha_composite(bg, bg_fx)

        # ----------------------------------------------------
        # PASS 2: ILUMINAÇÃO VOLUMÉTRICA TRASEIRA (RIM RED LIGHT)
        # ----------------------------------------------------
        rim_glow, rg_draw = self.create_layer()
        glow_radius = int(w * 0.42)
        for r in range(glow_radius, 0, -int(6 * self.ssaa)):
            t = 1 - (r / glow_radius)
            alpha = int(140 * (t**1.9))
            rg_draw.ellipse([cx - r, cy - r - int(60 * self.ssaa), cx + r, cy + r - int(60 * self.ssaa)], 
                            fill=(255, 10, 40, alpha))

        rim_glow = rim_glow.filter(ImageFilter.GaussianBlur(int(32 * self.ssaa)))
        base = Image.alpha_composite(base, rim_glow)

        # ----------------------------------------------------
        # PASS 3: CABELO LONGO VOLUMOSO (CAMADA TRASEIRA)
        # ----------------------------------------------------
        hair_bg, hb_draw = self.create_layer()
        
        # Massa de cabelo densa
        hb_draw.polygon([
            (cx - int(100*self.ssaa), cy - int(250*self.ssaa)),
            (cx - int(320*self.ssaa), cy - int(180*self.ssaa)),
            (cx - int(480*self.ssaa), cy + int(100*self.ssaa)),
            (cx - int(440*self.ssaa), cy + int(480*self.ssaa)),
            (cx - int(300*self.ssaa), h),
            (cx + int(300*self.ssaa), h),
            (cx + int(440*self.ssaa), cy + int(480*self.ssaa)),
            (cx + int(480*self.ssaa), cy + int(100*self.ssaa)),
            (cx + int(320*self.ssaa), cy - int(180*self.ssaa)),
            (cx + int(100*self.ssaa), cy - int(250*self.ssaa)),
        ], fill=(8, 7, 12, 255))

        # Mechas e fios com reflexos frios e sombreamento em ondas
        for _ in range(260):
            side = -1 if random.random() > 0.5 else 1
            x0 = cx + side * random.randint(int(50*self.ssaa), int(300*self.ssaa))
            y0 = cy - random.randint(int(180*self.ssaa), int(260*self.ssaa))
            
            p1 = (x0 + side * random.randint(int(80*self.ssaa), int(240*self.ssaa)), y0 + random.randint(int(150*self.ssaa), int(350*self.ssaa)))
            p2 = (x0 + side * random.randint(int(40*self.ssaa), int(180*self.ssaa)), y0 + random.randint(int(400*self.ssaa), int(650*self.ssaa)))
            p3 = (x0 + side * random.randint(int(20*self.ssaa), int(120*self.ssaa)), h)

            c_choice = random.random()
            if c_choice > 0.75:
                # Reflexo frio azul/prateado
                strand_color = (90, 120, 180, random.randint(90, 160))
                sw = random.randint(int(2*self.ssaa), int(5*self.ssaa))
            elif c_choice > 0.4:
                # Tom frio intermediário
                strand_color = (25, 30, 48, 220)
                sw = random.randint(int(3*self.ssaa), int(8*self.ssaa))
            else:
                # Preto profundo
                strand_color = (8, 8, 14, 255)
                sw = random.randint(int(4*self.ssaa), int(12*self.ssaa))

            self.draw_bezier_strand(hb_draw, (x0, y0), p1, p2, p3, strand_color, width=sw)

        base = Image.alpha_composite(base, hair_bg)

        # ----------------------------------------------------
        # PASS 4: CORPO & ROUPA GÓTICA ELEGANTE
        # ----------------------------------------------------
        body, b_draw = self.create_layer()

        # Ombros e decote elegante
        shoulder_y = cy + int(240 * self.ssaa)
        b_draw.polygon([
            (cx - int(100*self.ssaa), cy + int(130*self.ssaa)),
            (cx + int(100*self.ssaa), cy + int(130*self.ssaa)),
            (cx + int(420*self.ssaa), shoulder_y + int(280*self.ssaa)),
            (cx - int(420*self.ssaa), shoulder_y + int(280*self.ssaa))
        ], fill=(12, 11, 16, 255))

        # Corset de veludo preto gótico
        corset_top = cy + int(200 * self.ssaa)
        b_draw.polygon([
            (cx - int(130*self.ssaa), corset_top),
            (cx + int(130*self.ssaa), corset_top),
            (cx + int(180*self.ssaa), h),
            (cx - int(180*self.ssaa), h)
        ], fill=(7, 7, 10, 255))

        # Debrum e detalhes vermelhos discretos (Filigrana Carmesim)
        crimson = (200, 15, 45, 230)
        gold_crimson = (220, 40, 70, 255)
        
        # Gola e decote V sutil com borda dupla
        b_draw.line([
            (cx - int(130*self.ssaa), corset_top),
            (cx, corset_top + int(45*self.ssaa)),
            (cx + int(130*self.ssaa), corset_top)
        ], fill=crimson, width=int(4 * self.ssaa))
        
        # Costuras verticais de corset
        for off in [-int(45*self.ssaa), int(45*self.ssaa)]:
            b_draw.line([(cx + off, corset_top + int(45*self.ssaa)), (cx + off, h)], fill=crimson, width=int(2.5 * self.ssaa))
            
        # Gargantilha Gótica Prateada e Pingente de Rubi Lapidado
        choker_y = cy + int(145 * self.ssaa)
        b_draw.rectangle([cx - int(60*self.ssaa), choker_y, cx + int(60*self.ssaa), choker_y + int(18*self.ssaa)], 
                         fill=(20, 20, 26, 255), outline=(160, 165, 185, 255), width=int(1.5*self.ssaa))
        
        # Pingente gota de rubi com brilho
        gem_y = choker_y + int(30 * self.ssaa)
        b_draw.polygon([
            (cx, gem_y - int(12*self.ssaa)),
            (cx + int(10*self.ssaa), gem_y),
            (cx, gem_y + int(16*self.ssaa)),
            (cx - int(10*self.ssaa), gem_y)
        ], fill=(230, 10, 40, 255))
        b_draw.polygon([
            (cx, gem_y - int(8*self.ssaa)),
            (cx + int(5*self.ssaa), gem_y),
            (cx, gem_y + int(10*self.ssaa)),
            (cx - int(5*self.ssaa), gem_y)
        ], fill=(255, 140, 170, 255))

        base = Image.alpha_composite(base, body)

        # ----------------------------------------------------
        # PASS 5: PELE CLARA / PORCELANA & ROSTO
        # ----------------------------------------------------
        face, f_draw = self.create_layer()

        skin_base = (244, 240, 250, 255)
        skin_cold_shadow = (205, 200, 222, 255)

        # Pescoço
        f_draw.polygon([
            (cx - int(65*self.ssaa), cy + int(45*self.ssaa)),
            (cx + int(65*self.ssaa), cy + int(45*self.ssaa)),
            (cx + int(80*self.ssaa), cy + int(165*self.ssaa)),
            (cx - int(80*self.ssaa), cy + int(165*self.ssaa))
        ], fill=skin_base)
        
        # Sombra do queixo e clavícula
        f_draw.polygon([
            (cx - int(65*self.ssaa), cy + int(45*self.ssaa)),
            (cx + int(65*self.ssaa), cy + int(45*self.ssaa)),
            (cx + int(55*self.ssaa), cy + int(95*self.ssaa)),
            (cx - int(55*self.ssaa), cy + int(95*self.ssaa))
        ], fill=skin_cold_shadow)

        # Contorno Facial Suave
        face_pts = [
            (cx - int(145*self.ssaa), cy - int(150*self.ssaa)),
            (cx - int(160*self.ssaa), cy - int(40*self.ssaa)),
            (cx - int(150*self.ssaa), cy + int(30*self.ssaa)),
            (cx - int(110*self.ssaa), cy + int(95*self.ssaa)),
            (cx - int(55*self.ssaa), cy + int(140*self.ssaa)),
            (cx, cy + int(152*self.ssaa)),
            (cx + int(55*self.ssaa), cy + int(140*self.ssaa)),
            (cx + int(110*self.ssaa), cy + int(95*self.ssaa)),
            (cx + int(150*self.ssaa), cy + int(30*self.ssaa)),
            (cx + int(160*self.ssaa), cy - int(40*self.ssaa)),
            (cx + int(145*self.ssaa), cy - int(150*self.ssaa)),
            (cx, cy - int(200*self.ssaa))
        ]
        f_draw.polygon(face_pts, fill=skin_base)

        # Sombreamento suave nas maçãs do rosto
        for off_s in [-1, 1]:
            f_draw.ellipse([
                cx + off_s * int(120*self.ssaa) - int(35*self.ssaa), cy + int(15*self.ssaa) - int(25*self.ssaa),
                cx + off_s * int(120*self.ssaa) + int(35*self.ssaa), cy + int(15*self.ssaa) + int(25*self.ssaa)
            ], fill=(225, 218, 235, 120))

        # Nariz fino e elegante
        nose_y = cy + int(25 * self.ssaa)
        f_draw.line([cx - int(5*self.ssaa), nose_y + int(18*self.ssaa), cx, nose_y + int(24*self.ssaa), cx + int(5*self.ssaa), nose_y + int(18*self.ssaa)], 
                    fill=(160, 150, 180, 240), width=int(2.5 * self.ssaa))
        f_draw.line([cx, cy - int(30*self.ssaa), cx, nose_y + int(20*self.ssaa)], fill=(215, 210, 230, 90), width=int(2 * self.ssaa))

        # Lábios com batom vinho gótico e leve sorriso confiante
        mouth_y = cy + int(85 * self.ssaa)
        f_draw.polygon([
            (cx - int(38*self.ssaa), mouth_y),
            (cx - int(15*self.ssaa), mouth_y - int(6*self.ssaa)),
            (cx, mouth_y - int(3*self.ssaa)),
            (cx + int(15*self.ssaa), mouth_y - int(6*self.ssaa)),
            (cx + int(38*self.ssaa), mouth_y),
            (cx + int(20*self.ssaa), mouth_y + int(12*self.ssaa)),
            (cx, mouth_y + int(15*self.ssaa)),
            (cx - int(20*self.ssaa), mouth_y + int(12*self.ssaa))
        ], fill=(145, 18, 48, 250))
        # Linha central escura e brilho no lábio inferior
        f_draw.line([(cx - int(40*self.ssaa), mouth_y - int(1*self.ssaa)), (cx + int(40*self.ssaa), mouth_y - int(1*self.ssaa))], fill=(40, 5, 12, 255), width=int(2 * self.ssaa))
        f_draw.ellipse([cx - int(10*self.ssaa), mouth_y + int(4*self.ssaa), cx + int(10*self.ssaa), mouth_y + int(9*self.ssaa)], fill=(220, 120, 150, 180))

        base = Image.alpha_composite(base, face)

        # ----------------------------------------------------
        # PASS 6: CHIFRES NEGROS DE OBSIDIANA (POLIDOS & CURVADOS)
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
                # Curvatura graciosa varrendo para fora e ponta recurvada para o alto
                hx = bx + side * (math.sin(t * math.pi * 0.85) * int(220*self.ssaa) + t * int(50*self.ssaa))
                hy = by - (t * int(380*self.ssaa) + math.cos(t * math.pi * 0.5) * int(50*self.ssaa))
                rad = (1 - t) * int(38 * self.ssaa) + int(2.5 * self.ssaa)
                pts.append((hx, hy, rad))

            # Corpo principal em preto obsidiana
            for hx, hy, rad in pts:
                h_draw.ellipse([hx - rad, hy - rad, hx + rad, hy + rad], fill=(8, 8, 14, 255))

            # Faixa especular vítrea de obsidiana (reflexo prateado)
            for hx, hy, rad in pts:
                spec_rad = rad * 0.45
                h_draw.ellipse([hx - spec_rad, hy - spec_rad, hx + spec_rad*0.3, hy + spec_rad*0.3], fill=(130, 150, 185, 45))

            # Luz de recorte vermelha na crista externa
            for hx, hy, rad in pts:
                rim_x = hx + side * (rad * 0.8)
                h_draw.ellipse([rim_x - int(3*self.ssaa), hy - int(3*self.ssaa), rim_x + int(3*self.ssaa), hy + int(3*self.ssaa)], 
                               fill=(255, 20, 50, 200))

        draw_obsidian_horn(is_left=True)
        draw_obsidian_horn(is_left=False)

        base = Image.alpha_composite(base, horns)

        # ----------------------------------------------------
        # PASS 7: OLHOS VERMELHOS INTENSOS (PONTO FOCAL ULTRA-DETALHADO)
        # ----------------------------------------------------
        eyes, e_draw = self.create_layer()
        eye_y = cy - int(30 * self.ssaa)
        eye_space = int(75 * self.ssaa)
        ew = int(48 * self.ssaa)
        eh = int(25 * self.ssaa)

        for side in [-1, 1]:
            ex = cx + side * eye_space

            # Sobrancelhas marcantes arqueadas (expressão confiante / intimidadora)
            brow_y = eye_y - int(34 * self.ssaa)
            e_draw.polygon([
                (ex - side * int(34*self.ssaa), brow_y + int(5*self.ssaa)),
                (ex - side * int(12*self.ssaa), brow_y - int(10*self.ssaa)),
                (ex + side * int(34*self.ssaa), brow_y - int(2*self.ssaa)),
                (ex + side * int(24*self.ssaa), brow_y - int(14*self.ssaa)),
                (ex - side * int(12*self.ssaa), brow_y - int(16*self.ssaa))
            ], fill=(14, 10, 18, 255))

            # Delineador gótico marcado
            e_draw.ellipse([ex - ew, eye_y - eh, ex + ew, eye_y + eh], fill=(12, 10, 18, 255))
            # Esclera pálida com toque frio
            e_draw.ellipse([ex - ew + int(3.5*self.ssaa), eye_y - eh + int(3.5*self.ssaa), ex + ew - int(3.5*self.ssaa), eye_y + eh - int(3.5*self.ssaa)], 
                           fill=(238, 238, 248, 255))

            # HALO DE ILUMINAÇÃO VERMELHA (Glow Magnético)
            iris_r = int(19 * self.ssaa)
            for gr in range(int(45 * self.ssaa), iris_r, -int(3 * self.ssaa)):
                t = 1 - (gr - iris_r) / (int(26 * self.ssaa))
                e_draw.ellipse([ex - gr, eye_y - gr, ex + gr, eye_y + gr], fill=(255, 0, 50, int(95 * t)))

            # ÍRIS RUBI DEGRADE
            for ir in range(iris_r, 0, -int(2 * self.ssaa)):
                t = 1 - (ir / iris_r)
                ir_color = (int(180 + t * 75), int(t * 70), int(20 + t * 60), 255)
                e_draw.ellipse([ex - ir, eye_y - ir, ex + ir, eye_y + ir], fill=ir_color)

            # Anel interno de energia rubi
            e_draw.ellipse([ex - int(12*self.ssaa), eye_y - int(12*self.ssaa), ex + int(12*self.ssaa), eye_y + int(12*self.ssaa)], 
                           outline=(255, 80, 110, 255), width=int(2*self.ssaa))

            # Pupila vertical de gato/demônio
            e_draw.ellipse([ex - int(3*self.ssaa), eye_y - int(14*self.ssaa), ex + int(3*self.ssaa), eye_y + int(14*self.ssaa)], 
                           fill=(10, 0, 4, 255))

            # Brilho especular nítido de estúdio (Catchlights)
            e_draw.ellipse([ex - int(7*self.ssaa), eye_y - int(9*self.ssaa), ex - int(1*self.ssaa), eye_y - int(3*self.ssaa)], 
                           fill=(255, 255, 255, 255))
            e_draw.ellipse([ex + int(3*self.ssaa), eye_y + int(3*self.ssaa), ex + int(7*self.ssaa), eye_y + int(7*self.ssaa)], 
                           fill=(255, 210, 230, 230))

        base = Image.alpha_composite(base, eyes)

        # ----------------------------------------------------
        # PASS 8: CABELO FRONTAL & MECHAS
        # ----------------------------------------------------
        hair_fg, hf_draw = self.create_layer()

        front_strands = [
            # Franja esquerda longa
            [(cx - int(145*self.ssaa), cy - int(200*self.ssaa)), 
             (cx - int(115*self.ssaa), cy - int(100*self.ssaa)), 
             (cx - int(140*self.ssaa), cy + int(50*self.ssaa)), 
             (cx - int(160*self.ssaa), cy + int(240*self.ssaa))],
            [(cx - int(125*self.ssaa), cy - int(190*self.ssaa)), 
             (cx - int(95*self.ssaa), cy - int(70*self.ssaa)), 
             (cx - int(105*self.ssaa), cy + int(90*self.ssaa)), 
             (cx - int(125*self.ssaa), cy + int(360*self.ssaa))],
            # Franja direita longa
            [(cx + int(145*self.ssaa), cy - int(200*self.ssaa)), 
             (cx + int(115*self.ssaa), cy - int(100*self.ssaa)), 
             (cx + int(140*self.ssaa), cy + int(50*self.ssaa)), 
             (cx + int(160*self.ssaa), cy + int(240*self.ssaa))],
            [(cx + int(125*self.ssaa), cy - int(190*self.ssaa)), 
             (cx + int(95*self.ssaa), cy - int(70*self.ssaa)), 
             (cx + int(105*self.ssaa), cy + int(90*self.ssaa)), 
             (cx + int(125*self.ssaa), cy + int(360*self.ssaa))],
            # Mechas delicadas na testa
            [(cx - int(35*self.ssaa), cy - int(190*self.ssaa)), 
             (cx - int(18*self.ssaa), cy - int(130*self.ssaa)), 
             (cx - int(30*self.ssaa), cy - int(75*self.ssaa))],
            [(cx + int(35*self.ssaa), cy - int(190*self.ssaa)), 
             (cx + int(18*self.ssaa), cy - int(130*self.ssaa)), 
             (cx + int(30*self.ssaa), cy - int(75*self.ssaa))]
        ]

        for pts in front_strands:
            p0, p1, p2 = pts[0], pts[1], pts[2]
            p3 = pts[3] if len(pts) > 3 else pts[2]
            # Base preta
            self.draw_bezier_strand(hf_draw, p0, p1, p2, p3, (6, 6, 11, 255), width=int(12*self.ssaa))
            # Reflexo azul/prata frio
            self.draw_bezier_strand(hf_draw, p0, p1, p2, p3, (90, 125, 185, 150), width=int(3.5*self.ssaa))
            # Luz de filamento branco frio
            self.draw_bezier_strand(hf_draw, p0, p1, p2, p3, (210, 230, 255, 90), width=int(1.2*self.ssaa))

        base = Image.alpha_composite(base, hair_fg)

        # ----------------------------------------------------
        # PASS 9: PÓS-PROCESSAMENTO (BLOOM & DOWNSAMPLING LANCZOS)
        # ----------------------------------------------------
        # Extrai os realces brilhantes para o efeito de Bloom
        bloom_layer, bloom_draw = self.create_layer()
        for _ in range(80):
            ex = random.randint(0, w)
            ey = random.randint(0, h)
            er = random.randint(int(1.5*self.ssaa), int(5*self.ssaa))
            bloom_draw.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(255, 25, 55, random.randint(80, 220)))

        bloom_filtered = bloom_layer.filter(ImageFilter.GaussianBlur(int(8 * self.ssaa)))
        base = Image.alpha_composite(base, bloom_filtered)

        # Vinheta cinematográfica
        vin, v_draw = self.create_layer()
        max_dist = math.hypot(cx, cy)
        for r in range(int(max_dist), int(max_dist * 0.45), -int(15 * self.ssaa)):
            t = 1 - (r / max_dist)
            v_draw.rectangle([0, 0, w, h], outline=(0, 0, 0, int(190 * (1 - t)**2)), width=int(20 * self.ssaa))
        base = Image.alpha_composite(base, vin)

        # SSAA Downsampling de alta precisão com filtro Lanczos
        print(f"🔄 Reduzindo {self.w}x{self.h} para {self.target_w}x{self.target_h} via Lanczos Anti-Aliasing...")
        final_img = base.convert("RGB").resize((self.target_w, self.target_h), Image.Resampling.LANCZOS)
        
        # Leve aprimoramento de nitidez e contraste
        enhancer = ImageEnhance.Sharpness(final_img)
        final_img = enhancer.enhance(1.12)

        return final_img

def main():
    print("\033[1;36m🎨 BLACKCORE STUDIO PRO // Renderizando Personagem em Alta Fidelidade (SSAA 2x Lanczos)...\033[0m")
    t0 = time.time()
    
    engine = ProStudioEngine(target_w=1200, target_h=1200, ssaa=2)
    img = engine.render_gothic_queen()
    
    out_dir = Path("/storage/emulated/0/Download")
    if not out_dir.exists():
        out_dir = Path.home() / "BLACKCORE-Projects" / "black-paint-studio" / "gallery"
        out_dir.mkdir(parents=True, exist_ok=True)

    out_file = out_dir / "personagem_goth_v2_pro.png"
    img.save(out_file, "PNG", quality=100)

    # Dispara scanner do Android
    subprocess.run(["termux-media-scan", str(out_file)], capture_output=True)
    
    elapsed = time.time() - t0
    print(f"\033[1;32m✅ Renderização Pro concluída em {elapsed:.2f}s!\033[0m")
    print(f"\033[1;37m👉 Arquivo em alta fidelidade: {out_file}\033[0m\n")

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
