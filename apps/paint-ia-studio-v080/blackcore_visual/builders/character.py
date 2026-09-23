from __future__ import annotations

import math
import random
from typing import Dict, Tuple

from PIL import Image, ImageDraw, ImageFilter

from ..scene_spec import SceneSpec
from ..agents.stroke import StrokeAgent, StrokeProfile

RGBA = Tuple[int, int, int, int]


def _palette(spec: SceneSpec) -> Dict[str, RGBA]:
    if spec.palette_hint == "black_cyan":
        return {
            "bg0": (5, 7, 18, 255), "bg1": (8, 30, 43, 255), "accent": (0, 238, 204, 255),
            "accent2": (255, 30, 120, 255), "hair": (7, 8, 16, 255), "hair_mid": (22, 35, 48, 255),
            "hair_hi": (32, 112, 130, 210), "skin": (247, 241, 250, 255), "skin_shadow": (198, 175, 205, 120),
            "ink": (16, 13, 25, 255), "lip": (151, 29, 69, 255),
        }
    if spec.palette_hint == "pastel_pink_lilac":
        return {
            "bg0": (26, 18, 35, 255), "bg1": (105, 45, 80, 255), "accent": (242, 93, 141, 255),
            "accent2": (181, 143, 213, 255), "hair": (31, 25, 43, 255), "hair_mid": (68, 54, 82, 255),
            "hair_hi": (167, 137, 187, 210), "skin": (250, 239, 243, 255), "skin_shadow": (225, 178, 195, 120),
            "ink": (33, 24, 37, 255), "lip": (160, 54, 92, 255),
        }
    return {
        "bg0": (5, 3, 12, 255), "bg1": (78, 10, 38, 255), "accent": (226, 24, 60, 255),
        "accent2": (142, 38, 96, 255), "hair": (7, 6, 13, 255), "hair_mid": (28, 29, 48, 255),
        "hair_hi": (68, 82, 142, 210), "skin": (246, 242, 250, 255), "skin_shadow": (205, 176, 206, 120),
        "ink": (18, 14, 24, 255), "lip": (151, 20, 58, 255),
    }


def _gradient(w: int, h: int, top: RGBA, bottom: RGBA) -> Image.Image:
    im = Image.new("RGBA", (w, h), top)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(4))
        d.line((0, y, w, y), fill=c)
    return im


def _soft_ellipse(layer: Image.Image, box, color, blur: int) -> None:
    tmp = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp, "RGBA")
    d.ellipse(box, fill=color)
    tmp = tmp.filter(ImageFilter.GaussianBlur(radius=blur))
    layer.alpha_composite(tmp)


class CharacterBuilder:
    """CPU-friendly anime/gothic character renderer.

    The rendering hierarchy is intentional: background -> back hair -> horns -> face ->
    features -> front hair -> clothes -> atmosphere. This prevents the old issue where
    dozens of random hair lines crossed the whole face with no visual hierarchy.
    """

    def render(self, spec: SceneSpec, stroke: StrokeAgent) -> Image.Image:
        w, h = spec.width, spec.height
        cfg = spec.extras.get("preset", {})
        pal = _palette(spec)
        rng = random.Random(spec.seed ^ 0xCAFE)
        cx = w / 2

        # Background and cinematic halo.
        out = _gradient(w, h, pal["bg0"], pal["bg1"])
        halo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        hc = (cx, h * 0.40)
        _soft_ellipse(halo, (hc[0]-w*.30, hc[1]-w*.30, hc[0]+w*.30, hc[1]+w*.30), (*pal["accent"][:3], 40), max(6, int(w*.045)))
        _soft_ellipse(halo, (hc[0]-w*.14, hc[1]-w*.14, hc[0]+w*.14, hc[1]+w*.14), (255, 158, 102, 28), max(5, int(w*.025)))
        out = Image.alpha_composite(out, halo)

        # Sparse floating particles.
        pd = ImageDraw.Draw(out, "RGBA")
        for _ in range(int(38 + spec.detail_level * 55)):
            x, y = rng.randrange(w), rng.randrange(h)
            rr = rng.choice((1, 1, 1, 2, 2, 3))
            col = pal["accent"] if rng.random() < .62 else (255, 223, 185, 255)
            pd.ellipse((x-rr, y-rr, x+rr, y+rr), fill=(*col[:3], rng.randint(35, 125)))

        # Main back-hair mass.
        base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        bd = ImageDraw.Draw(base, "RGBA")
        bd.ellipse((cx-w*.35, h*.205, cx+w*.35, h*.92), fill=pal["hair"])
        bd.polygon([(cx-w*.36,h*.43),(cx-w*.33,h),(cx-w*.08,h),(cx-w*.02,h*.46)], fill=pal["hair"])
        bd.polygon([(cx+w*.36,h*.43),(cx+w*.33,h),(cx+w*.08,h),(cx+w*.02,h*.46)], fill=pal["hair"])

        # Back hair highlights are drawn BEFORE the face, giving hierarchy.
        complexity = float(cfg.get("hair_complexity", .80)) * spec.detail_level
        back_prof = StrokeProfile(
            width=max(1.0, w*.0025) * (.75 + float(cfg.get("line_weight", .55))),
            jitter=float(cfg.get("line_jitter", .35)) * .62,
            width_variation=.34,
            edge_break=float(cfg.get("edge_break", .08)) * .45,
            repeats=max(1, int(cfg.get("stroke_repeat", 1)))
        )
        back_count = int(24 + complexity * 42)
        for side in (-1, 1):
            for _ in range(back_count):
                sx = cx + side * rng.uniform(w*.065, w*.22)
                sy = rng.uniform(h*.25, h*.40)
                ex = cx + side * rng.uniform(w*.15, w*.34)
                ey = rng.uniform(h*.65, h*.98)
                c1 = (sx + side*rng.uniform(w*.015,w*.055), sy+rng.uniform(h*.07,h*.16))
                c2 = (ex - side*rng.uniform(w*.01,w*.055), ey-rng.uniform(h*.07,h*.18))
                col = pal["hair_hi"] if rng.random() < .72 else (*pal["accent2"][:3], rng.randint(70,130))
                stroke.draw_bezier(base, (sx,sy), c1, c2, (ex,ey), (*col[:3], rng.randint(65,155)), back_prof, 28)
        out = Image.alpha_composite(out, base)

        # Horn silhouettes + rim accents.
        horn = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        hd = ImageDraw.Draw(horn, "RGBA")
        for side in (-1, 1):
            base_x = cx + side*w*.115
            outer = []
            for i in range(36):
                t = i/35
                x = base_x + side*(w*.025 + w*.255*t)
                y = h*.325 - h*.17*math.sin(t*math.pi*.76) - h*.105*t
                outer.append((x,y))
            inner = []
            for i,(x,y) in enumerate(reversed(outer)):
                t = i/max(1,len(outer)-1)
                inner.append((x - side*w*(.048*(1-t)+.008), y+h*(.030*(1-t)+.004)))
            hd.polygon(outer+inner, fill=(3,3,9,255))
            rim = StrokeProfile(width=max(1,w*.0026), jitter=.10, width_variation=.18, edge_break=.01, repeats=1)
            stroke.draw_polyline(horn, outer, pal["accent"], rim)
        out = Image.alpha_composite(out, horn)

        # Face: rounded anime mask with jaw taper and controlled asymmetry.
        face_layer = Image.new("RGBA", (w, h), (0,0,0,0))
        fd = ImageDraw.Draw(face_layer, "RGBA")
        asym = spec.asymmetry
        head_cx = cx + w*.009*asym
        top = h*.305
        bottom = h*.655
        half = w*.155
        face_pts = [
            (head_cx-half*.82, top+h*.025),
            (head_cx-half*.52, top-h*.016),
            (head_cx+half*.50, top-h*.008),
            (head_cx+half*.83, top+h*.028),
            (head_cx+half*.90, h*.48),
            (head_cx+half*.74, h*.57),
            (head_cx+half*.38, bottom-h*.006),
            (head_cx, bottom+h*.020),
            (head_cx-half*.40, bottom-h*.004),
            (head_cx-half*.75, h*.57),
            (head_cx-half*.90, h*.48),
        ]
        fd.polygon(face_pts, fill=pal["skin"])

        # Soft cheek/jaw modeling.
        shadow = Image.new("RGBA", (w,h), (0,0,0,0))
        strength = float(cfg.get("shadow_intensity", .55))
        _soft_ellipse(shadow, (head_cx-half*.98,h*.455,head_cx-half*.15,h*.555), (*pal["skin_shadow"][:3], int(86*strength)), max(4,int(w*.011)))
        _soft_ellipse(shadow, (head_cx+half*.14,h*.458,head_cx+half*.98,h*.558), (*pal["skin_shadow"][:3], int(80*strength)), max(4,int(w*.011)))
        # Under-chin shadow.
        sd = ImageDraw.Draw(shadow, "RGBA")
        sd.ellipse((head_cx-half*.44,h*.615,head_cx+half*.44,h*.68), fill=(64,28,55,int(50*strength)))
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(3,int(w*.008))))
        face_layer = Image.alpha_composite(face_layer, shadow)
        fd = ImageDraw.Draw(face_layer, "RGBA")

        # Eyes: almond outlines with upper-lid emphasis and slight asymmetry.
        eye_y = h*.465
        eye_dx = w*.082
        eye_w, eye_h = w*.057, h*.025
        line_w = max(1, int(w*.0021))
        feature_prof = StrokeProfile(width=max(1.0,w*.0020)*(.82+float(cfg.get("line_weight",.55))), jitter=float(cfg.get("line_jitter",.35))*.25, width_variation=.18, edge_break=.015, repeats=1)
        for side in (-1,1):
            ex = head_cx + side*eye_dx
            ey = eye_y + side*asym*h*.004
            # sclera polygon: inner/outer corners + slight arc illusion.
            eye_poly = [(ex-eye_w,ey),(ex-eye_w*.38,ey-eye_h),(ex+eye_w*.40,ey-eye_h*.82),(ex+eye_w,ey),(ex+eye_w*.34,ey+eye_h*.75),(ex-eye_w*.38,ey+eye_h*.72)]
            fd.polygon(eye_poly, fill=(252,250,252,255))
            # iris
            ir = w*.0215*(1 + side*asym*.035)
            fd.ellipse((ex-ir,ey-ir,ex+ir,ey+ir), fill=pal["accent"])
            fd.ellipse((ex-ir*.24,ey-ir*.98,ex+ir*.24,ey+ir*.98), fill=(20,7,18,255))
            fd.ellipse((ex-ir*.42,ey-ir*.54,ex-ir*.08,ey-ir*.20), fill=(255,247,247,220))
            # lid lines
            stroke.draw_bezier(face_layer,(ex-eye_w,ey),(ex-eye_w*.45,ey-eye_h*1.25),(ex+eye_w*.35,ey-eye_h*1.15),(ex+eye_w,ey),pal["ink"],feature_prof,20)
            lower = StrokeProfile(width=max(1,w*.0011),jitter=.05,width_variation=.1,edge_break=.08,repeats=1)
            stroke.draw_bezier(face_layer,(ex-eye_w*.86,ey+eye_h*.16),(ex-eye_w*.38,ey+eye_h*.92),(ex+eye_w*.42,ey+eye_h*.82),(ex+eye_w*.84,ey+eye_h*.10),(*pal["ink"][:3],135),lower,16)
            # eyebrow
            brow_y = ey-eye_h*2.1
            stroke.draw_bezier(face_layer,(ex-eye_w*.80,brow_y),(ex-eye_w*.25,brow_y-eye_h*.25),(ex+eye_w*.30,brow_y-eye_h*.12),(ex+eye_w*.72,brow_y+eye_h*.12),(*pal["ink"][:3],220),feature_prof,16)

        # Nose and mouth — subtle but volumetric.
        nd = ImageDraw.Draw(face_layer, "RGBA")
        nd.line([(head_cx,h*.50),(head_cx-w*.004,h*.535)], fill=(*pal["ink"][:3],75), width=max(1,int(w*.0013)))
        nd.line([(head_cx-w*.004,h*.535),(head_cx+w*.006,h*.541)], fill=(*pal["ink"][:3],100), width=max(1,int(w*.0012)))
        mouth_y = h*.582
        mw = w*.040
        nd.polygon([(head_cx-mw,mouth_y),(head_cx-w*.006,mouth_y-h*.004),(head_cx,mouth_y+h*.004),(head_cx+w*.007,mouth_y-h*.003),(head_cx+mw,mouth_y),(head_cx,mouth_y+h*.018)], fill=pal["lip"])
        nd.line([(head_cx-mw*.72,mouth_y+h*.005),(head_cx+mw*.72,mouth_y+h*.005)], fill=(84,10,38,155), width=max(1,int(w*.001)))

        # Forehead emblem.
        emblem_y = h*.34
        nd.line([(head_cx-w*.017,emblem_y),(head_cx,emblem_y+h*.072),(head_cx+w*.017,emblem_y)], fill=pal["ink"], width=max(2,int(w*.0026)))
        out = Image.alpha_composite(out, face_layer)

        # Front hair: only a few deliberate locks around the face + bangs.
        front = Image.new("RGBA", (w,h), (0,0,0,0))
        front_prof = StrokeProfile(width=max(1,w*.0032)*(.7+float(cfg.get("line_weight",.55))), jitter=float(cfg.get("line_jitter",.35))*.45, width_variation=.40, edge_break=.045, repeats=1)
        for side in (-1,1):
            # temple locks
            for j in range(5):
                sx = head_cx + side*(half*.72 + j*w*.007)
                sy = h*(.35 + j*.006)
                ex = head_cx + side*rng.uniform(w*.11,w*.18)
                ey = rng.uniform(h*.62,h*.79)
                stroke.draw_bezier(front,(sx,sy),(sx+side*w*.025,sy+h*.08),(ex-side*w*.018,ey-h*.10),(ex,ey),(*pal["hair_hi"][:3],rng.randint(125,205)),front_prof,30)
            # outer long front lock
            sx=head_cx+side*half*.83; sy=h*.37; ex=head_cx+side*w*.22; ey=h*.90
            stroke.draw_bezier(front,(sx,sy),(sx+side*w*.05,h*.48),(ex-side*w*.02,h*.70),(ex,ey),(*pal["hair_hi"][:3],190),front_prof,34)
        # Bangs across forehead, intentionally sparse.
        bang_prof=StrokeProfile(width=max(1,w*.0025),jitter=.10,width_variation=.32,edge_break=.03,repeats=1)
        bang_starts=[-.085,-.052,-.018,.020,.055,.088]
        for i,rel in enumerate(bang_starts):
            sx=head_cx+w*rel; sy=h*.305+rng.uniform(-h*.008,h*.006)
            ex=head_cx+w*(rel*.55)+rng.uniform(-w*.008,w*.008); ey=h*.425+rng.uniform(-h*.015,h*.012)
            stroke.draw_bezier(front,(sx,sy),(sx+rng.uniform(-w*.015,w*.015),h*.34),(ex+rng.uniform(-w*.010,w*.010),h*.39),(ex,ey),(*pal["hair_hi"][:3],175),bang_prof,22)
        out = Image.alpha_composite(out, front)

        # Neck, collar and robe on top of hair bottom for clean silhouette.
        cloth = Image.new("RGBA", (w,h), (0,0,0,0))
        cd = ImageDraw.Draw(cloth, "RGBA")
        neck_w=w*.075
        cd.polygon([(head_cx-neck_w,h*.625),(head_cx+neck_w,h*.625),(head_cx+neck_w*.76,h*.705),(head_cx-neck_w*.78,h*.705)], fill=pal["skin"])
        cd.polygon([(cx-w*.235,h*.675),(cx+w*.235,h*.675),(cx+w*.40,h),(cx-w*.40,h)], fill=(7,7,12,255))
        cd.polygon([(cx-w*.16,h*.69),(cx,h*.735),(cx+w*.16,h*.69),(cx+w*.13,h*.735),(cx,h*.765),(cx-w*.13,h*.735)], fill=(11,10,18,255), outline=pal["accent"])
        # throat gem
        gy=h*.692; rr=w*.010
        cd.polygon([(cx,gy-rr),(cx+rr,gy),(cx,gy+rr),(cx-rr,gy)], fill=pal["accent"])
        # subtle robe seams
        seam=(*pal["accent"][:3],135)
        cd.line((cx-w*.055,h*.77,cx-w*.045,h),fill=seam,width=max(1,int(w*.0015)))
        cd.line((cx+w*.055,h*.77,cx+w*.045,h),fill=seam,width=max(1,int(w*.0015)))
        out=Image.alpha_composite(out,cloth)

        # Very subtle vignette, preserving detail in shadows.
        vign = Image.new("L", (w,h), 0)
        vd = ImageDraw.Draw(vign)
        vd.ellipse((-w*.08,-h*.02,w*1.08,h*1.06), fill=205)
        vign = vign.filter(ImageFilter.GaussianBlur(radius=max(8,int(w*.10))))
        dark = Image.new("RGBA",(w,h),(0,0,0,62))
        dark.putalpha(Image.eval(vign, lambda p: max(0, 205-p)))
        out = Image.alpha_composite(out,dark)
        return out
