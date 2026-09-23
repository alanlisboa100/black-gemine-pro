#!/usr/bin/env python3
"""
render_3_masterpieces.py - Trilogia de Obras-Primas Visuais v0.6 (BLACKCORE Studio)
Gera 3 pinturas insanas, ricas em detalhes, iluminação volumétrica e atmosfera cinematográfica:
  1. Eclipse Carmesim // Ishs Sob o Véu Noturno
  2. Metrópole Cyber-Gótica 2077 // Reflexos de Chuva e Neon
  3. Santuário das Higanbana // Lírios-Aranha e Orbes Espirituais
"""

import math, os, random, subprocess, sys, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

TARGET_DIR = Path("/storage/emulated/0/Download")
if not TARGET_DIR.exists():
    TARGET_DIR = Path.home() / "BLACKCORE-Projects" / "black-paint-studio" / "gallery"
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

class MasterpieceRenderer:
    def __init__(self, width=1600, height=1600, ssaa=2, seed=777):
        self.target_w = width
        self.target_h = height
        self.ssaa = ssaa
        self.w = width * ssaa
        self.h = height * ssaa
        self.cx = self.w // 2
        self.cy = self.h // 2
        self.seed = seed
        random.seed(seed)

    def layer(self) -> tuple[Image.Image, ImageDraw.ImageDraw]:
        img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        return img, ImageDraw.Draw(img, "RGBA")

    def bezier(self, draw: ImageDraw.ImageDraw, p0, p1, p2, p3, color, width=4, steps=55):
        points = []
        for i in range(steps + 1):
            t = i / steps
            inv = 1.0 - t
            x = (inv**3 * p0[0] + 3 * inv**2 * t * p1[0] + 3 * inv * t**2 * p2[0] + t**3 * p3[0])
            y = (inv**3 * p0[1] + 3 * inv**2 * t * p1[1] + 3 * inv * t**2 * p2[1] + t**3 * p3[1])
            points.append((x, y))
        for i in range(len(points) - 1):
            t = i / steps
            w_factor = math.sin(t * math.pi) * 0.75 + 0.45
            w = max(1, int(width * w_factor))
            draw.line([points[i], points[i+1]], fill=color, width=w)

    def draw_eyes(self, canvas: Image.Image, glow_color=(255, 20, 60), iris_glow=True, cyber_hud=False) -> Image.Image:
        w, h, cx, cy = self.w, self.h, self.cx, self.cy
        eyes, d = self.layer()
        eye_y = cy - int(32 * self.ssaa)
        eye_space = int(78 * self.ssaa)
        ew = int(50 * self.ssaa)
        eh = int(28 * self.ssaa)

        for side in [-1, 1]:
            ex = cx + side * eye_space

            # Sobrancelhas góticas expressivas
            brow_y = eye_y - int(38 * self.ssaa)
            d.polygon([
                (ex - side * int(38*self.ssaa), brow_y + int(6*self.ssaa)),
                (ex - side * int(12*self.ssaa), brow_y - int(12*self.ssaa)),
                (ex + side * int(36*self.ssaa), brow_y - int(3*self.ssaa)),
                (ex + side * int(22*self.ssaa), brow_y - int(16*self.ssaa)),
                (ex - side * int(14*self.ssaa), brow_y - int(17*self.ssaa))
            ], fill=(12, 10, 18, 255))

            # Delineador superior marcante e cílios
            d.ellipse([ex - ew, eye_y - eh, ex + ew, eye_y + eh], fill=(14, 12, 20, 255))
            d.ellipse([ex - ew + int(4*self.ssaa), eye_y - eh + int(4*self.ssaa), ex + ew - int(4*self.ssaa), eye_y + eh - int(4*self.ssaa)], fill=(244, 244, 254, 255))

            # Halo de luminescência dos olhos
            iris_r = int(22 * self.ssaa)
            if iris_glow:
                for gr in range(int(52 * self.ssaa), iris_r, -int(3 * self.ssaa)):
                    t = 1 - (gr - iris_r) / (int(30 * self.ssaa))
                    d.ellipse([ex - gr, eye_y - gr, ex + gr, eye_y + gr], fill=(*glow_color[:3], int(95 * t)))

            # Íris Rubi com degradê profundo
            for ir in range(iris_r, 0, -int(2 * self.ssaa)):
                t = 1 - (ir / iris_r)
                r_c = int(glow_color[0] * (0.6 + t * 0.4))
                g_c = int(glow_color[1] * t * 0.7)
                b_c = int(glow_color[2] * (0.3 + t * 0.5))
                d.ellipse([ex - ir, eye_y - ir, ex + ir, eye_y + ir], fill=(r_c, g_c, b_c, 255))

            # Microfibras radiantes internas
            for f_ang in range(0, 360, 20):
                rad_a = math.radians(f_ang + side * 5)
                fx1 = ex + math.cos(rad_a) * (iris_r * 0.25)
                fy1 = eye_y + math.sin(rad_a) * (iris_r * 0.25)
                fx2 = ex + math.cos(rad_a) * (iris_r * 0.90)
                fy2 = eye_y + math.sin(rad_a) * (iris_r * 0.90)
                d.line([fx1, fy1, fx2, fy2], fill=(255, 170, 200, 180), width=int(1.2 * self.ssaa))

            # Pupila vertical estilo criatura demoníaca/gótica
            d.ellipse([ex - int(3.5*self.ssaa), eye_y - int(15*self.ssaa), ex + int(3.5*self.ssaa), eye_y + int(15*self.ssaa)], fill=(8, 0, 4, 255))

            # Múltiplos pontos de luz especular (Catchlights de anime)
            d.ellipse([ex - int(8*self.ssaa), eye_y - int(10*self.ssaa), ex - int(2*self.ssaa), eye_y - int(4*self.ssaa)], fill=(255, 255, 255, 255))
            d.ellipse([ex + int(4*self.ssaa), eye_y + int(4*self.ssaa), ex + int(8*self.ssaa), eye_y + int(8*self.ssaa)], fill=(255, 220, 235, 240))

            # Cílios finos no canto externo
            for cl in range(4):
                cx1 = ex + side * (ew - int(4*self.ssaa))
                cy1 = eye_y - int(6*self.ssaa) + cl * int(5*self.ssaa)
                cx2 = cx1 + side * int((12 + cl*4) * self.ssaa)
                cy2 = cy1 - int((10 - cl*2) * self.ssaa)
                d.line([cx1, cy1, cx2, cy2], fill=(12, 10, 18, 255), width=int(2.2 * self.ssaa))

            # Cyber HUD / Mira Ocular Futurista opcional
            if cyber_hud:
                d.arc([ex - int(32*self.ssaa), eye_y - int(32*self.ssaa), ex + int(32*self.ssaa), eye_y + int(32*self.ssaa)], start=20, end=110, fill=(0, 245, 255, 200), width=int(1.5*self.ssaa))
                d.arc([ex - int(32*self.ssaa), eye_y - int(32*self.ssaa), ex + int(32*self.ssaa), eye_y + int(32*self.ssaa)], start=200, end=290, fill=(0, 245, 255, 200), width=int(1.5*self.ssaa))
                d.line([ex - int(38*self.ssaa), eye_y, ex - int(28*self.ssaa), eye_y], fill=(0, 245, 255, 240), width=int(1.5*self.ssaa))

        return Image.alpha_composite(canvas, eyes)

    def draw_face_and_skin(self, canvas: Image.Image, blush_tone=(245, 170, 195)) -> Image.Image:
        w, h, cx, cy = self.w, self.h, self.cx, self.cy
        face, f_draw = self.layer()
        skin_base = (248, 244, 254, 255)

        # Pescoço elegante
        f_draw.polygon([
            (cx - int(70*self.ssaa), cy + int(42*self.ssaa)),
            (cx + int(70*self.ssaa), cy + int(42*self.ssaa)),
            (cx + int(84*self.ssaa), cy + int(168*self.ssaa)),
            (cx - int(84*self.ssaa), cy + int(168*self.ssaa))
        ], fill=skin_base)

        # Sombra de oclusão abaixo do queixo
        f_draw.polygon([
            (cx - int(70*self.ssaa), cy + int(42*self.ssaa)),
            (cx + int(70*self.ssaa), cy + int(42*self.ssaa)),
            (cx + int(58*self.ssaa), cy + int(105*self.ssaa)),
            (cx - int(58*self.ssaa), cy + int(105*self.ssaa))
        ], fill=(195, 190, 215, 210))

        # Estrutura facial anime delicada
        face_pts = [
            (cx - int(148*self.ssaa), cy - int(152*self.ssaa)),
            (cx - int(164*self.ssaa), cy - int(38*self.ssaa)),
            (cx - int(154*self.ssaa), cy + int(32*self.ssaa)),
            (cx - int(112*self.ssaa), cy + int(98*self.ssaa)),
            (cx - int(56*self.ssaa), cy + int(143*self.ssaa)),
            (cx, cy + int(155*self.ssaa)),
            (cx + int(56*self.ssaa), cy + int(143*self.ssaa)),
            (cx + int(112*self.ssaa), cy + int(98*self.ssaa)),
            (cx + int(154*self.ssaa), cy + int(32*self.ssaa)),
            (cx + int(164*self.ssaa), cy - int(38*self.ssaa)),
            (cx + int(148*self.ssaa), cy - int(152*self.ssaa)),
            (cx, cy - int(205*self.ssaa))
        ]
        f_draw.polygon(face_pts, fill=skin_base)

        # Blush Suave Airbrush
        blush, b_draw = self.layer()
        b_draw.ellipse([cx - int(150*self.ssaa), cy + int(4*self.ssaa), cx - int(62*self.ssaa), cy + int(54*self.ssaa)], fill=(*blush_tone, 100))
        b_draw.ellipse([cx + int(62*self.ssaa), cy + int(4*self.ssaa), cx + int(150*self.ssaa), cy + int(54*self.ssaa)], fill=(*blush_tone, 100))
        blush = blush.filter(ImageFilter.GaussianBlur(int(17 * self.ssaa)))
        face = Image.alpha_composite(face, blush)
        f_draw = ImageDraw.Draw(face, "RGBA")

        # Nariz minimalista anime
        nose_y = cy + int(24 * self.ssaa)
        f_draw.line([cx - int(4*self.ssaa), nose_y + int(18*self.ssaa), cx, nose_y + int(23*self.ssaa), cx + int(5*self.ssaa), nose_y + int(18*self.ssaa)], fill=(155, 145, 175, 230), width=int(2 * self.ssaa))

        # Lábios góticos expressivos com gradiente e brilho
        mouth_y = cy + int(88 * self.ssaa)
        f_draw.polygon([
            (cx - int(38*self.ssaa), mouth_y),
            (cx - int(16*self.ssaa), mouth_y - int(5*self.ssaa)),
            (cx, mouth_y - int(2*self.ssaa)),
            (cx + int(16*self.ssaa), mouth_y - int(5*self.ssaa)),
            (cx + int(38*self.ssaa), mouth_y),
            (cx + int(19*self.ssaa), mouth_y + int(12*self.ssaa)),
            (cx, mouth_y + int(15*self.ssaa)),
            (cx - int(19*self.ssaa), mouth_y + int(12*self.ssaa))
        ], fill=(160, 20, 52, 245))
        # Linha central e brilho especular nos lábios
        f_draw.line([(cx - int(39*self.ssaa), mouth_y), (cx + int(39*self.ssaa), mouth_y)], fill=(32, 2, 8, 255), width=int(2 * self.ssaa))
        f_draw.ellipse([cx - int(7*self.ssaa), mouth_y + int(4*self.ssaa), cx + int(7*self.ssaa), mouth_y + int(9*self.ssaa)], fill=(255, 200, 215, 170))

        return Image.alpha_composite(canvas, face)

    def draw_horns(self, canvas: Image.Image, rim_light_color=(255, 30, 60)) -> Image.Image:
        w, h, cx, cy = self.w, self.h, self.cx, self.cy
        horns, h_draw = self.layer()
        for side in [-1, 1]:
            bx = cx + side * int(124 * self.ssaa)
            by = cy - int(160 * self.ssaa)
            steps = 100
            for i in range(steps):
                t = i / steps
                hx = bx + side * (math.sin(t * math.pi * 0.88) * int(230*self.ssaa) + t * int(55*self.ssaa))
                hy = by - (t * int(395*self.ssaa) + math.cos(t * math.pi * 0.5) * int(55*self.ssaa))
                rad = (1 - t) * int(40 * self.ssaa) + int(2.5 * self.ssaa)
                
                # Núcleo de obsidiana profundo
                h_draw.ellipse([hx - rad, hy - rad, hx + rad, hy + rad], fill=(8, 7, 13, 255))
                # Reflexo especular polido
                h_draw.ellipse([hx - rad*0.35, hy - rad*0.35, hx + rad*0.2, hy + rad*0.2], fill=(130, 150, 190, 45))
                # Luz de contorno volumétrica
                rim_x = hx + side * (rad * 0.83)
                h_draw.ellipse([rim_x - int(3.5*self.ssaa), hy - int(3.5*self.ssaa), rim_x + int(3.5*self.ssaa), hy + int(3.5*self.ssaa)], fill=(*rim_light_color, 215))

        return Image.alpha_composite(canvas, horns)

    def draw_flowing_hair(self, canvas: Image.Image, bg=True, hair_tint=(95, 130, 190)) -> Image.Image:
        w, h, cx, cy = self.w, self.h, self.cx, self.cy
        hair, d = self.layer()

        if bg:
            # Massa volumosa de trás
            d.polygon([
                (cx - int(125*self.ssaa), cy - int(285*self.ssaa)),
                (cx - int(390*self.ssaa), cy - int(185*self.ssaa)),
                (cx - int(540*self.ssaa), cy + int(120*self.ssaa)),
                (cx - int(480*self.ssaa), h),
                (cx + int(480*self.ssaa), h),
                (cx + int(540*self.ssaa), cy + int(120*self.ssaa)),
                (cx + int(390*self.ssaa), cy - int(185*self.ssaa)),
                (cx + int(125*self.ssaa), cy - int(285*self.ssaa))
            ], fill=(7, 7, 12, 255))

            for _ in range(380):
                side = -1 if random.random() > 0.49 else 1
                x0 = cx + side * random.randint(int(45*self.ssaa), int(350*self.ssaa))
                y0 = cy - random.randint(int(180*self.ssaa), int(295*self.ssaa))
                p1 = (x0 + side * random.randint(int(80*self.ssaa), int(270*self.ssaa)), y0 + random.randint(int(150*self.ssaa), int(390*self.ssaa)))
                p2 = (x0 + side * random.randint(int(30*self.ssaa), int(210*self.ssaa)), y0 + random.randint(int(400*self.ssaa), int(720*self.ssaa)))
                p3 = (x0 + side * random.randint(int(10*self.ssaa), int(160*self.ssaa)), h)

                rnd = random.random()
                if rnd > 0.72:
                    color = (*hair_tint, random.randint(90, 180))
                    sw = random.randint(int(2*self.ssaa), int(5*self.ssaa))
                elif rnd > 0.35:
                    color = (22, 26, 45, 230)
                    sw = random.randint(int(4*self.ssaa), int(9*self.ssaa))
                else:
                    color = (6, 6, 10, 255)
                    sw = random.randint(int(6*self.ssaa), int(16*self.ssaa))

                self.bezier(d, (x0, y0), p1, p2, p3, color, width=sw)
        else:
            # Mechas frontais sobre a testa e ombros + fios soltos (stray hairs)
            strands = [
                [(cx - int(148*self.ssaa), cy - int(205*self.ssaa)), (cx - int(118*self.ssaa), cy - int(105*self.ssaa)), (cx - int(142*self.ssaa), cy + int(50*self.ssaa)), (cx - int(165*self.ssaa), cy + int(245*self.ssaa))],
                [(cx + int(150*self.ssaa), cy - int(202*self.ssaa)), (cx + int(120*self.ssaa), cy - int(102*self.ssaa)), (cx + int(140*self.ssaa), cy + int(52*self.ssaa)), (cx + int(166*self.ssaa), cy + int(248*self.ssaa))],
                [(cx - int(48*self.ssaa), cy - int(200*self.ssaa)), (cx - int(12*self.ssaa), cy - int(112*self.ssaa)), (cx + int(18*self.ssaa), cy - int(55*self.ssaa))],
                [(cx + int(45*self.ssaa), cy - int(196*self.ssaa)), (cx + int(8*self.ssaa), cy - int(108*self.ssaa)), (cx - int(22*self.ssaa), cy - int(50*self.ssaa))],
                # Mecha central e mecha lateral esvoaçante
                [(cx - int(10*self.ssaa), cy - int(205*self.ssaa)), (cx - int(2*self.ssaa), cy - int(120*self.ssaa)), (cx + int(6*self.ssaa), cy - int(35*self.ssaa))],
                [(cx - int(155*self.ssaa), cy - int(150*self.ssaa)), (cx - int(190*self.ssaa), cy - int(20*self.ssaa)), (cx - int(175*self.ssaa), cy + int(180*self.ssaa))]
            ]
            for pts in strands:
                p0, p1, p2 = pts[0], pts[1], pts[2]
                p3 = pts[3] if len(pts) > 3 else pts[2]
                self.bezier(d, p0, p1, p2, p3, (6, 6, 11, 255), width=int(13*self.ssaa))
                self.bezier(d, p0, p1, p2, p3, (*hair_tint, 160), width=int(3.5*self.ssaa))

            # Fios soltos hiper-finos (Stray Hairs)
            for _ in range(45):
                fx0 = cx + random.randint(-int(90*self.ssaa), int(90*self.ssaa))
                fy0 = cy - random.randint(int(160*self.ssaa), int(210*self.ssaa))
                fx1 = fx0 + random.randint(-int(40*self.ssaa), int(40*self.ssaa))
                fy1 = fy0 + random.randint(int(60*self.ssaa), int(160*self.ssaa))
                d.line([fx0, fy0, fx1, fy1], fill=(*hair_tint, random.randint(80, 160)), width=int(1.2*self.ssaa))

        return Image.alpha_composite(canvas, hair)

    def finalize(self, canvas: Image.Image, filename: str, title: str):
        print(f"🔄 Downsampling Lanczos Studio Pro ({self.w}x{self.h} -> {self.target_w}x{self.target_h})...")
        final = canvas.convert("RGB").resize((self.target_w, self.target_h), Image.Resampling.LANCZOS)
        enhancer = ImageEnhance.Sharpness(final)
        final = enhancer.enhance(1.18)

        out_path = TARGET_DIR / filename
        final.save(out_path, "PNG", quality=100)
        subprocess.run(["termux-media-scan", str(out_path)], capture_output=True)
        print(f"✅ Obra-prima salva: {out_path} ({os.path.getsize(out_path) // 1024} KB) - '{title}'")
        return out_path

    # =========================================================================
    # PINTURA 1: ECLIPSE CARMESIM // ISHS SOB O VÉU NOTURNO
    # =========================================================================
    def render_painting_1(self) -> Path:
        print("\n🎨 [1/3] Renderizando 'Eclipse Carmesim // Ishs Sob o Véu Noturno'...")
        w, h, cx, cy = self.w, self.h, self.cx, self.cy

        # 1. Fundo Cósmico Profundo
        bg, d_bg = self.layer()
        for y in range(h):
            t = y / h
            r = int(12 + t * 24)
            g = int(4 + t * 8)
            b = int(18 + t * 35)
            d_bg.line([0, y, w, y], fill=(r, g, b, 255))

        # Grande Lua de Sangue (Eclipse Carmesim Halo)
        moon_r = int(w * 0.32)
        moon_x = cx
        moon_y = cy - int(80 * self.ssaa)
        
        # Corona de fogo cósmico
        for r in range(int(moon_r * 1.55), moon_r, -int(6 * self.ssaa)):
            t = 1 - (r - moon_r) / (int(moon_r * 0.55))
            d_bg.ellipse([moon_x - r, moon_y - r, moon_x + r, moon_y + r], fill=(255, 20, 55, int(85 * (t**1.6))))

        # Disco do Eclipse
        d_bg.ellipse([moon_x - moon_r, moon_y - moon_r, moon_x + moon_r, moon_y + moon_r], fill=(20, 10, 18, 255))
        # Anel de borda brilhante
        d_bg.arc([moon_x - moon_r, moon_y - moon_r, moon_x + moon_r, moon_y + moon_r], start=0, end=360, fill=(255, 30, 60, 255), width=int(5*self.ssaa))

        canvas = bg

        # 2. Cabelo Traseiro
        canvas = self.draw_flowing_hair(canvas, bg=True, hair_tint=(100, 135, 205))

        # 3. Corpo & Vestido Gótico com Renda e Broche
        body, b_draw = self.layer()
        # Vestido preto profundo
        b_draw.polygon([
            (cx - int(115*self.ssaa), cy + int(135*self.ssaa)),
            (cx + int(115*self.ssaa), cy + int(135*self.ssaa)),
            (cx + int(470*self.ssaa), h),
            (cx - int(470*self.ssaa), h)
        ], fill=(9, 9, 14, 255))
        # Corset com vincos de veludo
        corset_top = cy + int(200 * self.ssaa)
        b_draw.polygon([
            (cx - int(145*self.ssaa), corset_top),
            (cx + int(145*self.ssaa), corset_top),
            (cx + int(195*self.ssaa), h),
            (cx - int(195*self.ssaa), h)
        ], fill=(6, 5, 9, 255))
        # Bordado Carmesim
        b_draw.line([(cx - int(145*self.ssaa), corset_top), (cx, corset_top + int(48*self.ssaa)), (cx + int(145*self.ssaa), corset_top)], fill=(225, 20, 55, 240), width=int(4.5 * self.ssaa))

        # Choker de veludo com Rubi Lapidado
        choker_y = cy + int(146 * self.ssaa)
        b_draw.rectangle([cx - int(64*self.ssaa), choker_y, cx + int(64*self.ssaa), choker_y + int(22*self.ssaa)], fill=(16, 16, 24, 255), outline=(180, 185, 210, 255), width=int(1.8*self.ssaa))
        gem_y = choker_y + int(34 * self.ssaa)
        b_draw.polygon([(cx, gem_y - int(15*self.ssaa)), (cx + int(12*self.ssaa), gem_y), (cx, gem_y + int(20*self.ssaa)), (cx - int(12*self.ssaa), gem_y)], fill=(245, 10, 50, 255))
        canvas = Image.alpha_composite(canvas, body)

        # 4. Rosto e Pele
        canvas = self.draw_face_and_skin(canvas, blush_tone=(245, 165, 195))

        # 5. Chifres de Obsidiana
        canvas = self.draw_horns(canvas, rim_light_color=(255, 25, 60))

        # 6. Olhos Rubi Magnéticos
        canvas = self.draw_eyes(canvas, glow_color=(255, 15, 55), iris_glow=True, cyber_hud=False)

        # 7. Cabelo Frontal
        canvas = self.draw_flowing_hair(canvas, bg=False, hair_tint=(100, 140, 215))

        # 8. Pétalas de Rosa e Fagulhas Carmesim Flutuantes
        fx, f_draw = self.layer()
        for _ in range(120):
            px = random.randint(0, w)
            py = random.randint(0, h)
            pr = random.randint(int(2*self.ssaa), int(7*self.ssaa))
            f_draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(255, random.randint(15, 45), random.randint(40, 80), random.randint(80, 220)))

        # Pétalas de rosa detalhadas
        for _ in range(35):
            ptx = random.randint(int(w*0.05), int(w*0.95))
            pty = random.randint(int(h*0.1), int(h*0.95))
            pw = random.randint(int(10*self.ssaa), int(26*self.ssaa))
            ph = random.randint(int(6*self.ssaa), int(16*self.ssaa))
            f_draw.ellipse([ptx - pw, pty - ph, ptx + pw, pty + ph], fill=(195, 15, 45, random.randint(140, 230)))
        canvas = Image.alpha_composite(canvas, fx)

        # Vinheta de estúdio
        vin, v_draw = self.layer()
        max_dist = math.hypot(cx, cy)
        for r in range(int(max_dist), int(max_dist * 0.48), -int(16 * self.ssaa)):
            t = 1 - (r / max_dist)
            v_draw.rectangle([0, 0, w, h], outline=(0, 0, 0, int(185 * (1 - t)**2)), width=int(20 * self.ssaa))
        canvas = Image.alpha_composite(canvas, vin)

        return self.finalize(canvas, "pintura_01_eclipse_carmesim.png", "Eclipse Carmesim // Ishs Sob o Véu Noturno")

    # =========================================================================
    # PINTURA 2: METRÓPOLE CYBER-GÓTICA 2077 // REFLEXOS DE CHUVA E NEON
    # =========================================================================
    def render_painting_2(self) -> Path:
        print("\n🎨 [2/3] Renderizando 'Metrópole Cyber-Gótica 2077 // Reflexos de Chuva e Neon'...")
        w, h, cx, cy = self.w, self.h, self.cx, self.cy

        # 1. Skyline Noturno com Arranha-Céus e Chuva
        bg, d_bg = self.layer()
        for y in range(h):
            t = y / h
            r = int(5 + t * 15)
            g = int(8 + t * 25)
            b = int(22 + t * 45)
            d_bg.line([0, y, w, y], fill=(r, g, b, 255))

        # Silhuetas de prédios futuristas ao fundo
        for i in range(16):
            bx = i * int(w // 14) - int(30 * self.ssaa)
            bw = int(w // 13)
            bh = random.randint(int(h * 0.45), int(h * 0.85))
            d_bg.rectangle([bx, h - bh, bx + bw, h], fill=(8, 12, 22, 255))
            # Janelas iluminadas neon
            for wy in range(h - bh + int(20*self.ssaa), h - int(300*self.ssaa), int(25*self.ssaa)):
                for wx in range(bx + int(8*self.ssaa), bx + bw - int(8*self.ssaa), int(15*self.ssaa)):
                    if random.random() > 0.45:
                        c = random.choice([(0, 240, 255), (255, 0, 128), (140, 0, 255)])
                        d_bg.rectangle([wx, wy, wx + int(6*self.ssaa), wy + int(10*self.ssaa)], fill=(*c, 180))

        # Hologramas e Holofotes no Céu
        for _ in range(6):
            hx = random.randint(0, w)
            hw = random.randint(int(100*self.ssaa), int(260*self.ssaa))
            d_bg.polygon([(hx, 0), (hx + hw, 0), (hx + int(hw*0.2), int(h*0.75)), (hx - int(hw*0.2), int(h*0.75))], fill=(0, 245, 255, 18))

        canvas = bg

        # 2. Cabelo Traseiro com Reflexo Ciano & Magenta
        canvas = self.draw_flowing_hair(canvas, bg=True, hair_tint=(0, 220, 255))

        # 3. Jaqueta Cyberpunk de Vinil Preto com Gola Alta e LEDs
        body, b_draw = self.layer()
        jacket_top = cy + int(125 * self.ssaa)
        # Jaqueta volumosa estilo Blade Runner
        b_draw.polygon([
            (cx - int(160*self.ssaa), jacket_top),
            (cx + int(160*self.ssaa), jacket_top),
            (cx + int(490*self.ssaa), h),
            (cx - int(490*self.ssaa), h)
        ], fill=(10, 14, 20, 255))

        # Fitas de LED Neon Ciano e Magenta
        b_draw.line([(cx - int(150*self.ssaa), jacket_top), (cx - int(100*self.ssaa), h)], fill=(0, 250, 255, 240), width=int(5 * self.ssaa))
        b_draw.line([(cx + int(150*self.ssaa), jacket_top), (cx + int(100*self.ssaa), h)], fill=(255, 0, 140, 240), width=int(5 * self.ssaa))

        # Gargantilha High-Tech com fibra óptica
        choker_y = cy + int(142 * self.ssaa)
        b_draw.rectangle([cx - int(65*self.ssaa), choker_y, cx + int(65*self.ssaa), choker_y + int(22*self.ssaa)], fill=(20, 25, 38, 255), outline=(0, 240, 255, 255), width=int(2*self.ssaa))
        b_draw.ellipse([cx - int(8*self.ssaa), choker_y + int(5*self.ssaa), cx + int(8*self.ssaa), choker_y + int(17*self.ssaa)], fill=(0, 255, 200, 255))

        canvas = Image.alpha_composite(canvas, body)

        # 4. Rosto & Pele com reflexo ciano
        canvas = self.draw_face_and_skin(canvas, blush_tone=(235, 150, 190))

        # 5. Chifres com Circuitos Tecnológicos
        canvas = self.draw_horns(canvas, rim_light_color=(0, 245, 255))

        # 6. Olhos com HUD Holográfico
        canvas = self.draw_eyes(canvas, glow_color=(255, 20, 100), iris_glow=True, cyber_hud=True)

        # 7. Cabelo Frontal
        canvas = self.draw_flowing_hair(canvas, bg=False, hair_tint=(0, 230, 255))

        # 8. Gotas de Chuva e Reflexos de Neon Diagonais
        rain, r_draw = self.layer()
        for _ in range(450):
            rx = random.randint(0, w)
            ry = random.randint(0, h)
            rl = random.randint(int(15*self.ssaa), int(45*self.ssaa))
            alpha = random.randint(40, 180)
            c = random.choice([(180, 240, 255), (255, 100, 180), (255, 255, 255)])
            r_draw.line([rx, ry, rx - int(rl*0.25), ry + rl], fill=(*c, alpha), width=int(1.3*self.ssaa))
        canvas = Image.alpha_composite(canvas, rain)

        # Vinheta cinematográfica fria
        vin, v_draw = self.layer()
        max_dist = math.hypot(cx, cy)
        for r in range(int(max_dist), int(max_dist * 0.45), -int(15 * self.ssaa)):
            t = 1 - (r / max_dist)
            v_draw.rectangle([0, 0, w, h], outline=(0, 0, 5, int(195 * (1 - t)**2)), width=int(20 * self.ssaa))
        canvas = Image.alpha_composite(canvas, vin)

        return self.finalize(canvas, "pintura_02_cyber_metropole_2077.png", "Metrópole Cyber-Gótica 2077 // Reflexos de Chuva e Neon")

    # =========================================================================
    # PINTURA 3: SANTUÁRIO DAS HIGANBANA // LÍRIOS-ARANHA E ORBES ESPIRITUAIS
    # =========================================================================
    def render_painting_3(self) -> Path:
        print("\n🎨 [3/3] Renderizando 'Santuário das Higanbana // Lírios-Aranha e Orbes Espirituais'...")
        w, h, cx, cy = self.w, self.h, self.cx, self.cy

        # 1. Fundo Espiritual Místico (Noite Lilás & Torii Gate)
        bg, d_bg = self.layer()
        for y in range(h):
            t = y / h
            r = int(14 + t * 28)
            g = int(5 + t * 10)
            b = int(24 + t * 40)
            d_bg.line([0, y, w, y], fill=(r, g, b, 255))

        # Silhueta de Torii Gate místico ao fundo
        torii_y = cy - int(120 * self.ssaa)
        tw = int(w * 0.44)
        th = int(h * 0.48)
        # Pilares do Torii
        d_bg.rectangle([cx - tw, torii_y, cx - tw + int(36*self.ssaa), torii_y + th], fill=(18, 10, 20, 240))
        d_bg.rectangle([cx + tw - int(36*self.ssaa), torii_y, cx + tw, torii_y + th], fill=(18, 10, 20, 240))
        # Viga superior curva
        d_bg.polygon([
            (cx - tw - int(60*self.ssaa), torii_y - int(30*self.ssaa)),
            (cx + tw + int(60*self.ssaa), torii_y - int(30*self.ssaa)),
            (cx + tw + int(40*self.ssaa), torii_y + int(8*self.ssaa)),
            (cx - tw - int(40*self.ssaa), torii_y + int(8*self.ssaa))
        ], fill=(22, 12, 24, 255))

        # Lua Branca Espiritual Suave
        moon_r = int(w * 0.22)
        for r in range(int(moon_r * 1.6), moon_r, -int(5 * self.ssaa)):
            t = 1 - (r - moon_r) / (int(moon_r * 0.6))
            d_bg.ellipse([cx - r, torii_y - int(80*self.ssaa) - r, cx + r, torii_y - int(80*self.ssaa) + r], fill=(210, 190, 255, int(75 * t)))
        d_bg.ellipse([cx - moon_r, torii_y - int(80*self.ssaa) - moon_r, cx + moon_r, torii_y - int(80*self.ssaa) + moon_r], fill=(245, 240, 255, 235))

        canvas = bg

        # 2. Cabelo Traseiro com reflexo púrpura
        canvas = self.draw_flowing_hair(canvas, bg=True, hair_tint=(180, 110, 230))

        # 3. Quimono Gótico com Haori Escuro e Flores de Cerejeira
        body, b_draw = self.layer()
        b_draw.polygon([
            (cx - int(130*self.ssaa), cy + int(130*self.ssaa)),
            (cx + int(130*self.ssaa), cy + int(130*self.ssaa)),
            (cx + int(480*self.ssaa), h),
            (cx - int(480*self.ssaa), h)
        ], fill=(12, 8, 16, 255))

        # Cruzamento do quimono (gola em V)
        b_draw.polygon([
            (cx - int(130*self.ssaa), cy + int(130*self.ssaa)),
            (cx, cy + int(240*self.ssaa)),
            (cx + int(130*self.ssaa), cy + int(130*self.ssaa)),
            (cx, cy + int(270*self.ssaa))
        ], fill=(185, 20, 55, 230))

        # Faixa Obi com laço carmesim
        obi_y = cy + int(275 * self.ssaa)
        b_draw.rectangle([cx - int(180*self.ssaa), obi_y, cx + int(180*self.ssaa), obi_y + int(70*self.ssaa)], fill=(20, 12, 28, 255), outline=(225, 25, 65, 255), width=int(3*self.ssaa))

        canvas = Image.alpha_composite(canvas, body)

        # 4. Rosto & Pele
        canvas = self.draw_face_and_skin(canvas, blush_tone=(245, 175, 195))

        # 5. Chifres com Luz Esmaltada Púrpura
        canvas = self.draw_horns(canvas, rim_light_color=(220, 40, 110))

        # 6. Olhos Místicos Carmesim
        canvas = self.draw_eyes(canvas, glow_color=(255, 10, 60), iris_glow=True, cyber_hud=False)

        # 7. Cabelo Frontal
        canvas = self.draw_flowing_hair(canvas, bg=False, hair_tint=(190, 120, 240))

        # 8. Jardim de Higanbana (Lírios-Aranha) na parte inferior & Orbes Espirituais (Kitsunebi)
        spirits, s_draw = self.layer()
        # Orbes Espirituais Flutuantes com Glow
        orbs = [
            (cx - int(340*self.ssaa), cy - int(80*self.ssaa), int(28*self.ssaa), (0, 240, 220)),
            (cx + int(360*self.ssaa), cy - int(130*self.ssaa), int(32*self.ssaa), (255, 30, 90)),
            (cx - int(240*self.ssaa), cy + int(160*self.ssaa), int(22*self.ssaa), (180, 50, 255)),
            (cx + int(260*self.ssaa), cy + int(190*self.ssaa), int(24*self.ssaa), (0, 255, 180))
        ]
        for ox, oy, orad, ocolor in orbs:
            for gr in range(int(orad * 2.8), orad, -int(3 * self.ssaa)):
                t = 1 - (gr - orad) / (orad * 1.8)
                s_draw.ellipse([ox - gr, oy - gr, ox + gr, oy + gr], fill=(*ocolor, int(80 * t)))
            s_draw.ellipse([ox - orad, oy - orad, ox + orad, oy + orad], fill=(255, 255, 255, 250))

        # Pétalas de Higanbana caindo suavemente
        for _ in range(80):
            hx = random.randint(0, w)
            hy = random.randint(int(h*0.3), h)
            hl = random.randint(int(12*self.ssaa), int(30*self.ssaa))
            hw = random.randint(int(2*self.ssaa), int(5*self.ssaa))
            s_draw.ellipse([hx - hl, hy - hw, hx + hl, hy + hw], fill=(235, 15, 45, random.randint(140, 235)))

        canvas = Image.alpha_composite(canvas, spirits)

        # Vinheta Noturna
        vin, v_draw = self.layer()
        max_dist = math.hypot(cx, cy)
        for r in range(int(max_dist), int(max_dist * 0.46), -int(15 * self.ssaa)):
            t = 1 - (r / max_dist)
            v_draw.rectangle([0, 0, w, h], outline=(5, 0, 8, int(190 * (1 - t)**2)), width=int(20 * self.ssaa))
        canvas = Image.alpha_composite(canvas, vin)

        return self.finalize(canvas, "pintura_03_higanbana_lua_espiritual.png", "Santuário das Higanbana // Lírios-Aranha e Orbes Espirituais")

def main():
    print("==================================================================")
    print("🎨 BLACKCORE // MASTERPIECE SUITE v0.6 (3 PINTURAS SUPREMAS)")
    print("==================================================================")
    t0 = time.time()
    renderer = MasterpieceRenderer(width=1600, height=1600, ssaa=2, seed=888)

    p1 = renderer.render_painting_1()
    p2 = renderer.render_painting_2()
    p3 = renderer.render_painting_3()

    total_time = time.time() - t0
    print("\n==================================================================")
    print(f"✨ CONCLUÍDO COM SUCESSO EM {total_time:.2f}s!")
    print(f"📁 1: {p1}")
    print(f"📁 2: {p2}")
    print(f"📁 3: {p3}")
    print("==================================================================")

if __name__ == "__main__":
    main()
