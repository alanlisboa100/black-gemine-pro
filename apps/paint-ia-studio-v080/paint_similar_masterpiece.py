#!/usr/bin/env python3
"""
paint_similar_masterpiece.py - Renderizador de Página Completa de Mangá no Estilo de file_0000000075f4820e8c6544c0767f93aa.png
Recria toda a riqueza visual, composição em painéis (Koma), retículas de meio-tom (Screentone),
personagem expressiva em primeiro plano com cabelo em beta-nuri (nanquim denso), hachuras dinâmicas,
linhas de ação (Speed Lines) e contraste cinematográfico de mangá japonês em 1055x1491 px.
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

def draw_hatching(draw, p_start, p_end, length=30, angle_deg=45, spacing=8, color=(14, 14, 18, 255), width=2):
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

def generate_screentone_pattern(w, h, spacing=8, dot_r=2.0, color=(14, 14, 18, 255)):
    """Gera padrão de retícula de pontos (Screentone clássico de mangá)."""
    tone = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(tone, "RGBA")
    for y in range(0, h, spacing):
        offset = (y // spacing) % 2 * (spacing // 2)
        for x in range(offset, w, spacing):
            d.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=color)
    return tone

def render_manga_page(w=1055, h=1491):
    scale = 2
    sw, sh = w * scale, h * scale

    # Fundo branco de papel mangá de alta qualidade
    page = Image.new("RGBA", (sw, sh), (255, 255, 255, 255))
    draw_page = ImageDraw.Draw(page, "RGBA")

    INK = (12, 12, 16, 255)
    INK_SOFT = (25, 25, 32, 220)
    INK_LIGHT = (45, 45, 55, 160)

    margin_x = 55 * scale
    margin_top = 65 * scale
    margin_bot = 70 * scale
    content_w = sw - 2 * margin_x
    content_h = sh - margin_top - margin_bot

    print("📐 [1/5] Desenhando estrutura de painéis (Koma-wari)...")
    # Divisão de painéis:
    # Painel 1 (Topo Direito): x=[sw*0.58, sw-margin_x], y=[margin_top, sh*0.42]
    # Painel 2 (Base Direita): x=[sw*0.52, sw-margin_x], y=[sh*0.45, sh-margin_bot]
    # Painel 3 (Fundo Principal Esquerdo onde a personagem domina)

    border_w = int(4.5 * scale)

    # Painel Topo Direito
    p1_box = [int(sw * 0.56), margin_top, sw - margin_x, int(sh * 0.42)]
    draw_page.rectangle(p1_box, outline=INK, width=border_w)

    # Painel Base Direita
    p2_box = [int(sw * 0.50), int(sh * 0.45), sw - margin_x, sh - margin_bot]
    draw_page.rectangle(p2_box, outline=INK, width=border_w)

    # Moldura externa geral
    draw_page.rectangle([margin_x, margin_top, sw - margin_x, sh - margin_bot], outline=INK, width=border_w)

    # -------------------------------------------------------------------------
    # RETÍCULAS & LINHAS DE AÇÃO NOS PAINÉIS SECUNDÁRIOS
    # -------------------------------------------------------------------------
    print("✨ [2/5] Aplicando retículas (Screentones) e linhas de ação (Speed Lines)...")
    # Retícula suave no painel inferior direito
    tone_layer = generate_screentone_pattern(sw, sh, spacing=int(7 * scale), dot_r=1.5 * scale, color=INK_LIGHT)
    # Mascarar para ficar dentro do painel 2
    mask_p2 = Image.new("L", (sw, sh), 0)
    d_m2 = ImageDraw.Draw(mask_p2)
    d_m2.rectangle([p2_box[0] + border_w, p2_box[1] + border_w, p2_box[2] - border_w, p2_box[3] - border_w], fill=255)
    page.paste(tone_layer, (0, 0), mask_p2)

    # Linhas de Ação (Speed Lines) dinâmicas no painel superior direito
    speed_focus = (sw - margin_x, int(sh * 0.22))
    p1_inner = [p1_box[0] + border_w, p1_box[1] + border_w, p1_box[2] - border_w, p1_box[3] - border_w]
    speed_mask = Image.new("L", (sw, sh), 0)
    d_sm = ImageDraw.Draw(speed_mask)
    d_sm.rectangle(p1_inner, fill=255)
    
    speed_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    d_spd = ImageDraw.Draw(speed_img, "RGBA")
    for ang in range(120, 260, 4):
        rad = math.radians(ang + random.uniform(-0.5, 0.5))
        dist = sw * 0.6
        p_end = (speed_focus[0] + math.cos(rad) * dist, speed_focus[1] + math.sin(rad) * dist)
        d_spd.line([speed_focus, p_end], fill=INK_SOFT, width=int(random.choice([1.5, 2.5, 3.5]) * scale))
    page.paste(speed_img, (0, 0), speed_mask)

    # Efeito sonoro mangá (SFX / Onomatopeia "ドンッ!" em caligrafia nanquim estilizada) no painel 1
    sfx_x = int(sw * 0.64)
    sfx_y = int(sh * 0.12)
    # Desenho dos traços do SFX em pinceladas grossas angulares
    draw_page.polygon([(sfx_x, sfx_y), (sfx_x + 70*scale, sfx_y - 20*scale), 
                       (sfx_x + 90*scale, sfx_y + 60*scale), (sfx_x + 30*scale, sfx_y + 80*scale)], fill=INK)
    draw_page.polygon([(sfx_x + 110*scale, sfx_y + 10*scale), (sfx_x + 170*scale, sfx_y), 
                       (sfx_x + 150*scale, sfx_y + 110*scale), (sfx_x + 100*scale, sfx_y + 90*scale)], fill=INK)
    # Realce branco no SFX
    draw_page.line([(sfx_x + 15*scale, sfx_y + 10*scale), (sfx_x + 75*scale, sfx_y - 5*scale)], fill=(255, 255, 255, 255), width=int(2.5*scale))

    # -------------------------------------------------------------------------
    # PERSONAGEM PRINCIPAL HEROICA (PRIMEIRO PLANO & SOBREPOSIÇÃO DE PAINÉIS)
    # -------------------------------------------------------------------------
    print("🎨 [3/5] Desenhando a personagem principal, anatomia, olhar e beta-nuri...")
    char_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw_char = ImageDraw.Draw(char_img, "RGBA")

    cx = sw * 0.36
    cy = sh * 0.44

    # 3.1 BASE DO CABELO EM BETA-NURI (Preto Sólido Profundo com Mechas Esculpidas)
    hair_poly = [
        (cx - 240 * scale, cy - 180 * scale),
        (cx - 180 * scale, cy - 360 * scale),
        (cx - 40 * scale, cy - 440 * scale),
        (cx + 120 * scale, cy - 420 * scale),
        (cx + 250 * scale, cy - 320 * scale),
        (cx + 310 * scale, cy - 180 * scale),
        (cx + 340 * scale, cy + 40 * scale),
        (cx + 290 * scale, cy + 280 * scale),
        (cx + 180 * scale, cy + 540 * scale),
        (cx - 80 * scale, cy + 580 * scale),
        (cx - 260 * scale, cy + 420 * scale),
        (cx - 320 * scale, cy + 160 * scale),
        (cx - 300 * scale, cy - 40 * scale)
    ]
    draw_char.polygon(hair_poly, fill=INK)

    # Recortes em branco e mechas angulares (Luz no Cabelo Manga / Beta-nuri Highlights)
    hair_highlights = [
        # Mecha frontal esquerda
        [(cx - 120 * scale, cy - 380 * scale), (cx - 70 * scale, cy - 310 * scale), (cx - 95 * scale, cy - 300 * scale)],
        [(cx - 50 * scale, cy - 400 * scale), (cx - 10 * scale, cy - 310 * scale), (cx - 35 * scale, cy - 305 * scale)],
        [(cx + 30 * scale, cy - 390 * scale), (cx + 65 * scale, cy - 290 * scale), (cx + 40 * scale, cy - 285 * scale)],
        [(cx + 120 * scale, cy - 360 * scale), (cx + 145 * scale, cy - 270 * scale), (cx + 125 * scale, cy - 265 * scale)],
        [(cx + 190 * scale, cy - 300 * scale), (cx + 205 * scale, cy - 220 * scale), (cx + 185 * scale, cy - 215 * scale)],
    ]
    for pts in hair_highlights:
        draw_char.polygon(pts, fill=(255, 255, 255, 255))

    # 3.2 ROSTO E PELE EM ALTA DEFINIÇÃO
    face_skin = [
        (cx - 135 * scale, cy - 140 * scale),
        (cx + 30 * scale, cy - 170 * scale),
        (cx + 140 * scale, cy - 130 * scale),
        (cx + 160 * scale, cy - 40 * scale),
        (cx + 145 * scale, cy + 60 * scale),
        (cx + 90 * scale, cy + 160 * scale),
        (cx + 10 * scale, cy + 220 * scale),
        (cx - 70 * scale, cy + 180 * scale),
        (cx - 125 * scale, cy + 90 * scale),
        (cx - 145 * scale, cy - 30 * scale)
    ]
    draw_char.polygon(face_skin, fill=(255, 255, 255, 255))

    # Pescoço e Peito em branco puro
    neck_skin = [
        (cx - 70 * scale, cy + 170 * scale),
        (cx + 15 * scale, cy + 220 * scale),
        (cx + 40 * scale, cy + 340 * scale),
        (cx - 95 * scale, cy + 330 * scale)
    ]
    draw_char.polygon(neck_skin, fill=(255, 255, 255, 255))

    # Retícula suave de sombra sob a mandíbula e bochecha
    neck_shade_poly = [
        (cx - 65 * scale, cy + 180 * scale),
        (cx + 10 * scale, cy + 220 * scale),
        (cx - 15 * scale, cy + 270 * scale),
        (cx - 75 * scale, cy + 240 * scale)
    ]
    shade_tone = generate_screentone_pattern(sw, sh, spacing=int(5 * scale), dot_r=1.2 * scale, color=INK)
    shade_mask = Image.new("L", (sw, sh), 0)
    d_shm = ImageDraw.Draw(shade_mask)
    d_shm.polygon(neck_shade_poly, fill=255)
    char_img.paste(shade_tone, (0, 0), shade_mask)
    draw_char = ImageDraw.Draw(char_img, "RGBA")

    # Contorno da Mandíbula e Queixo
    draw_bezier_curve(draw_char, (cx - 140 * scale, cy - 20 * scale), (cx - 125 * scale, cy + 100 * scale),
                                 (cx - 60 * scale, cy + 185 * scale), (cx + 10 * scale, cy + 220 * scale), INK, width=4.5 * scale)
    draw_bezier_curve(draw_char, (cx + 10 * scale, cy + 220 * scale), (cx + 65 * scale, cy + 180 * scale),
                                 (cx + 115 * scale, cy + 110 * scale), (cx + 145 * scale, cy + 40 * scale), INK, width=4.5 * scale)

    # 3.3 OLHOS INTENSOS E DRAMÁTICOS DE MANGÁ
    # Olho Esquerdo (3/4 visão frontal)
    lex = cx - 55 * scale
    ley = cy - 25 * scale
    # Pálpebra superior e pestanas espessas
    draw_bezier_curve(draw_char, (lex - 45 * scale, ley - 15 * scale), (lex - 15 * scale, ley - 35 * scale),
                                 (lex + 25 * scale, ley - 30 * scale), (lex + 50 * scale, ley - 10 * scale), INK, width=6.5 * scale)
    # Cílios pontiagudos
    draw_char.polygon([(lex + 45*scale, ley - 15*scale), (lex + 65*scale, ley - 30*scale), (lex + 40*scale, ley - 22*scale)], fill=INK)
    draw_char.polygon([(lex + 20*scale, ley - 30*scale), (lex + 30*scale, ley - 45*scale), (lex + 15*scale, ley - 32*scale)], fill=INK)

    # Íris esquerda com retícula e pupilas
    draw_char.ellipse([lex - 22*scale, ley - 24*scale, lex + 28*scale, ley + 28*scale], outline=INK, width=int(3.2*scale))
    draw_char.ellipse([lex - 8*scale, ley - 10*scale, lex + 14*scale, ley + 12*scale], fill=INK)
    # Brilho duplo
    draw_char.ellipse([lex - 16*scale, ley - 18*scale, lex - 4*scale, ley - 6*scale], fill=(255, 255, 255, 255))
    draw_char.ellipse([lex + 6*scale, ley + 6*scale, lex + 14*scale, ley + 14*scale], fill=(255, 255, 255, 255))
    # Pálpebra inferior
    draw_bezier_curve(draw_char, (lex - 25 * scale, ley + 24 * scale), (lex + 5 * scale, ley + 28 * scale),
                                 (lex + 30 * scale, ley + 22 * scale), (lex + 42 * scale, ley + 12 * scale), INK_SOFT, width=2.8 * scale)

    # Olho Direito
    rex = cx + 75 * scale
    rey = cy - 20 * scale
    draw_bezier_curve(draw_char, (rex - 38 * scale, rey - 10 * scale), (rex - 10 * scale, rey - 30 * scale),
                                 (rex + 20 * scale, rey - 28 * scale), (rex + 42 * scale, rey - 12 * scale), INK, width=5.8 * scale)
    draw_char.polygon([(rex + 38*scale, rey - 14*scale), (rex + 55*scale, rey - 28*scale), (rex + 34*scale, rey - 20*scale)], fill=INK)
    draw_char.ellipse([rex - 18*scale, rey - 20*scale, rex + 22*scale, rey + 24*scale], outline=INK, width=int(3.0*scale))
    draw_char.ellipse([rex - 6*scale, rey - 8*scale, rex + 10*scale, rey + 10*scale], fill=INK)
    draw_char.ellipse([rex - 12*scale, rey - 15*scale, rex - 2*scale, rey - 5*scale], fill=(255, 255, 255, 255))
    draw_bezier_curve(draw_char, (rex - 20 * scale, rey + 20 * scale), (rex + 5 * scale, rey + 24 * scale),
                                 (rex + 25 * scale, rey + 18 * scale), (rex + 36 * scale, rey + 10 * scale), INK_SOFT, width=2.5 * scale)

    # Sobrancelhas marcantes com expressão de foco
    draw_bezier_curve(draw_char, (lex - 42 * scale, ley - 48 * scale), (lex - 10 * scale, ley - 62 * scale),
                                 (lex + 25 * scale, ley - 60 * scale), (lex + 52 * scale, ley - 44 * scale), INK, width=4.5 * scale)
    draw_bezier_curve(draw_char, (rex - 32 * scale, ley - 44 * scale), (rex - 5 * scale, ley - 58 * scale),
                                 (rex + 25 * scale, ley - 56 * scale), (rex + 45 * scale, ley - 42 * scale), INK, width=4.2 * scale)

    # Nariz e Boca expressiva
    draw_bezier_curve(draw_char, (cx + 12 * scale, cy - 2 * scale), (cx + 18 * scale, cy + 40 * scale),
                                 (cx + 24 * scale, cy + 70 * scale), (cx + 14 * scale, cy + 78 * scale), INK, width=3.5 * scale)
    draw_char.polygon([(cx + 14*scale, cy + 78*scale), (cx + 25*scale, cy + 82*scale), (cx + 12*scale, cy + 86*scale)], fill=INK)

    # Lábios entreabertos com profundidade de nanquim
    mouth_y = cy + 125 * scale
    draw_bezier_curve(draw_char, (cx - 28 * scale, mouth_y), (cx - 5 * scale, mouth_y - 6 * scale),
                                 (cx + 15 * scale, mouth_y - 6 * scale), (cx + 38 * scale, mouth_y), INK, width=4.0 * scale)
    # Abertura escura da boca
    draw_char.polygon([(cx - 18*scale, mouth_y + 2*scale), (cx + 5*scale, mouth_y - 1*scale),
                       (cx + 25*scale, mouth_y + 2*scale), (cx + 5*scale, mouth_y + 12*scale)], fill=INK)
    # Linha do lábio inferior
    draw_bezier_curve(draw_char, (cx - 12 * scale, mouth_y + 24 * scale), (cx + 5 * scale, mouth_y + 28 * scale),
                                 (cx + 15 * scale, mouth_y + 27 * scale), (cx + 24 * scale, mouth_y + 23 * scale), INK_SOFT, width=2.8 * scale)

    # 3.4 FRANJA E MECHAS QUE CRUZAM O ROSTO (CAMADAS DINÂMICAS)
    bang_curves = [
        ((cx - 80 * scale, cy - 260 * scale), (cx - 50 * scale, cy - 140 * scale), (cx - 30 * scale, cy - 30 * scale), (cx - 20 * scale, cy + 50 * scale)),
        ((cx - 20 * scale, cy - 280 * scale), (cx + 5 * scale, cy - 160 * scale), (cx + 15 * scale, cy - 60 * scale), (cx + 18 * scale, cy + 30 * scale)),
        ((cx + 60 * scale, cy - 270 * scale), (cx + 80 * scale, cy - 150 * scale), (cx + 85 * scale, cy - 40 * scale), (cx + 70 * scale, cy + 60 * scale)),
        ((cx - 140 * scale, cy - 220 * scale), (cx - 120 * scale, cy - 100 * scale), (cx - 105 * scale, cy + 20 * scale), (cx - 85 * scale, cy + 140 * scale)),
        ((cx + 130 * scale, cy - 220 * scale), (cx + 150 * scale, cy - 90 * scale), (cx + 145 * scale, cy + 30 * scale), (cx + 125 * scale, cy + 150 * scale)),
    ]
    for p0, p1, p2, p3 in bang_curves:
        draw_bezier_curve(draw_char, p0, p1, p2, p3, INK, width=5.2 * scale, steps=80)
        # Sombra de hachura nas pontas das mechas
        draw_hatching(draw_char, (p2[0], p2[1]), (p3[0], p3[1]), length=14 * scale, angle_deg=60, spacing=6 * scale, color=INK_SOFT, width=int(1.6 * scale))

    # 3.5 VESTIMENTA / GOLA ALTA E OMBROS COM HACHURAS DE DOBRA
    coat_poly = [
        (cx - 260 * scale, cy + 360 * scale),
        (cx - 120 * scale, cy + 310 * scale),
        (cx - 40 * scale, cy + 360 * scale),
        (cx + 60 * scale, cy + 330 * scale),
        (cx + 180 * scale, cy + 360 * scale),
        (cx + 280 * scale, cy + 440 * scale),
        (cx + 320 * scale, sh),
        (cx - 300 * scale, sh)
    ]
    draw_char.polygon(coat_poly, fill=INK)

    # Lapela da gola alta com vincos brancos e hachuras
    draw_bezier_curve(draw_char, (cx - 100 * scale, cy + 305 * scale), (cx - 40 * scale, cy + 355 * scale),
                                 (cx - 10 * scale, cy + 450 * scale), (cx + 20 * scale, cy + 560 * scale), (255, 255, 255, 255), width=4.5 * scale)
    draw_bezier_curve(draw_char, (cx + 45 * scale, cy + 325 * scale), (cx + 10 * scale, cy + 390 * scale),
                                 (cx - 15 * scale, cy + 480 * scale), (cx - 35 * scale, cy + 580 * scale), (255, 255, 255, 255), width=4.5 * scale)

    # -------------------------------------------------------------------------
    # COMPOSIÇÃO FINAL & DETALHES DE PÁGINA
    # -------------------------------------------------------------------------
    print("✨ [4/5] Compondo camadas, sobreposição de molduras e partículas...")
    # Sobrepor a personagem ao fundo com overlap dos painéis
    page = Image.alpha_composite(page, char_img)
    draw_final = ImageDraw.Draw(page, "RGBA")

    # Caixa de Narração / Texto no Painel Inferior (Estilo Mangá Japonês)
    box_w = 180 * scale
    box_h = 130 * scale
    box_x = p2_box[2] - box_w - 20 * scale
    box_y = p2_box[3] - box_h - 25 * scale
    draw_final.rectangle([box_x, box_y, box_x + box_w, box_y + box_h], fill=(255, 255, 255, 255), outline=INK, width=int(3.5 * scale))
    # Linhas de texto estilizado dentro da caixa de narração
    for ly in range(int(box_y + 24 * scale), int(box_y + box_h - 20 * scale), int(22 * scale)):
        draw_final.line([(box_x + 18 * scale, ly), (box_x + box_w - 18 * scale, ly)], fill=INK_SOFT, width=int(2.5 * scale))

    # Downsampling com Lanczos para 1055x1491 nativo
    print("🔍 [5/5] Finalizando com anti-aliasing Lanczos em 1055x1491 px...")
    final_studio = page.resize((w, h), Image.Resampling.LANCZOS)
    return final_studio

def main():
    print("==================================================================")
    print("🖤 BLACKCORE // PÁGINA COMPLETA DE MANGÁ INSPIRADA NA REFERÊNCIA")
    print("==================================================================")
    t0 = time.time()

    w, h = 1055, 1491
    studio_img = render_manga_page(w, h)

    OUT_DIR_DL.mkdir(parents=True, exist_ok=True)
    OUT_DIR_PIC.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # 1. VERSÃO STUDIO INK (Página de Mangá Clássica em Preto e Branco)
    # -------------------------------------------------------------------------
    out_studio_dl = OUT_DIR_DL / "MANGA_obra_inspirada_referencia_studio.png"
    out_studio_pic = OUT_DIR_PIC / "MANGA_obra_inspirada_referencia_studio.png"
    studio_img.convert("RGB").save(out_studio_dl, "PNG", optimize=True)
    studio_img.convert("RGB").save(out_studio_pic, "PNG", optimize=True)
    print(f"📁 Studio Ink salvo: {out_studio_dl.name}")

    # -------------------------------------------------------------------------
    # 2. VERSÃO DARKCORE OBSIDIAN (Invertida em Fundo Preto Cinematográfico)
    # -------------------------------------------------------------------------
    gray = studio_img.convert("L")
    inv_gray = ImageOps.invert(gray)
    dark_img = Image.new("RGB", (w, h), (12, 12, 16))
    dark_pixels = dark_img.load()
    inv_pixels = inv_gray.load()

    for y in range(h):
        for x in range(w):
            v = inv_pixels[x, y]
            if v > 0:
                t = v / 255.0
                r = int(12 + t * (245 - 12))
                g = int(12 + t * (248 - 12))
                b = int(16 + t * (255 - 16))
                dark_pixels[x, y] = (r, g, b)

    out_dark_dl = OUT_DIR_DL / "MANGA_obra_inspirada_referencia_dark.png"
    out_dark_pic = OUT_DIR_PIC / "MANGA_obra_inspirada_referencia_dark.png"
    dark_img.save(out_dark_dl, "PNG", optimize=True)
    dark_img.save(out_dark_pic, "PNG", optimize=True)
    print(f"📁 Darkcore Obsidian salvo: {out_dark_dl.name}")

    # -------------------------------------------------------------------------
    # 3. VERSÃO TRANSPARENTE (Lineart + Screentone com Canal Alfa)
    # -------------------------------------------------------------------------
    alpha_mask = inv_gray
    trans_img = Image.new("RGBA", (w, h), (14, 14, 18, 0))
    trans_img.putalpha(alpha_mask)

    out_trans_dl = OUT_DIR_DL / "MANGA_obra_inspirada_referencia_transparente.png"
    out_trans_pic = OUT_DIR_PIC / "MANGA_obra_inspirada_referencia_transparente.png"
    trans_img.save(out_trans_dl, "PNG", optimize=True)
    trans_img.save(out_trans_pic, "PNG", optimize=True)
    print(f"📁 Transparente salvo: {out_trans_dl.name}")

    # Sincronização com Android Media Scanner
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
    print(f"✅ RENDERIZAÇÃO CONCLUÍDA COM SUCESSO EM {elapsed:.2f}s!")
    print("Imagens prontas na Galeria do Android:")
    print(f" 1. {out_studio_dl}")
    print(f" 2. {out_dark_dl}")
    print(f" 3. {out_trans_dl}")
    print("==================================================================")

if __name__ == "__main__":
    main()
