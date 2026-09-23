from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFilter

from ..scene_spec import SceneSpec
from ..scenarios import SCENARIOS, DEFAULT_SCENARIO, scenario_plan


RGBA = Tuple[int, int, int, int]


def _hex_rgba(value: str, alpha: int = 255) -> RGBA:
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    try:
        r = int(value[0:2], 16)
        g = int(value[2:4], 16)
        b = int(value[4:6], 16)
        return (r, g, b, alpha)
    except Exception:
        return (20, 20, 24, alpha)


def _lerp(a: RGBA, b: RGBA, t: float) -> RGBA:
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(4))  # type: ignore[return-value]


@dataclass
class SceneRenderResult:
    image: Image.Image
    telemetry: Dict[str, Any]
    plan: Dict[str, Any]


class ScenarioBuilder:
    """Local cinematic scene builder with a protected subject zone.

    This is deliberately procedural and Termux-friendly. The important upgrade is
    not pretending it is a neural image model: it creates stable composition,
    foreground/midground/background depth, coherent light, and a central low-clutter
    area where Misuki can remain readable.
    """

    def _palette(self, spec: SceneSpec) -> List[RGBA]:
        profile = SCENARIOS.get(spec.scenario, DEFAULT_SCENARIO)
        cols = [_hex_rgba(c) for c in profile.palette]
        # Scene primitives address five tonal roles (deep, mid, accentA, accentB, light).
        # Some restrained profiles intentionally define only four colors, so pad with
        # the lightest existing value instead of crashing on palette[4].
        while len(cols) < 5:
            cols.append(cols[-1] if cols else (235, 235, 238, 255))
        if spec.palette_hint == "monochrome":
            gray = []
            for r, g, b, a in cols:
                y = int(r * .299 + g * .587 + b * .114)
                gray.append((y, y, y, a))
            return gray
        if spec.palette_hint == "black_cyan":
            return [(5,7,10,255),(10,24,30,255),(18,110,125,255),(160,230,235,255),(235,245,245,255)]
        return cols

    def _gradient(self, w: int, h: int, top: RGBA, bottom: RGBA) -> Image.Image:
        im = Image.new("RGBA", (w, h), top)
        d = ImageDraw.Draw(im)
        for y in range(h):
            t = y / max(1, h - 1)
            d.line((0, y, w, y), fill=_lerp(top, bottom, t))
        return im

    def _soft_glow(self, layer: Image.Image, xy: Tuple[float,float], radius: float, color: RGBA) -> None:
        w, h = layer.size
        glow = Image.new("RGBA", (w, h), (0,0,0,0))
        d = ImageDraw.Draw(glow, "RGBA")
        x, y = xy
        d.ellipse((x-radius, y-radius, x+radius, y+radius), fill=color)
        glow = glow.filter(ImageFilter.GaussianBlur(max(3, int(radius * .22))))
        layer.alpha_composite(glow)

    def _safe_zone(self, layer: Image.Image, strength: float, palette: List[RGBA]) -> None:
        w, h = layer.size
        # A subtle low-detail halo behind the head/upper torso. This is not a bright
        # circle; it gently lowers local contrast so black hair/horns stay readable.
        haze = Image.new("RGBA", (w, h), (0,0,0,0))
        d = ImageDraw.Draw(haze, "RGBA")
        cx, cy = w*.5, h*.42
        rx, ry = w*.26, h*.31
        light = palette[-1]
        alpha = int(24 + 34 * strength)
        d.ellipse((cx-rx, cy-ry, cx+rx, cy+ry), fill=(light[0], light[1], light[2], alpha))
        # Crown/horn separation field for dark environments. This stays blurred and
        # low-detail so it behaves like controlled backlight, not a visible shape.
        d.ellipse((cx-w*.23, h*.025, cx+w*.23, h*.36), fill=(light[0], light[1], light[2], int(alpha*.78)))
        haze = haze.filter(ImageFilter.GaussianBlur(max(8, int(w*.055))))
        layer.alpha_composite(haze)

    def _draw_moon(self, layer: Image.Image, x: float, y: float, r: float, color: RGBA) -> None:
        self._soft_glow(layer, (x,y), r*1.6, (color[0],color[1],color[2],42))
        d = ImageDraw.Draw(layer, "RGBA")
        d.ellipse((x-r,y-r,x+r,y+r), fill=(color[0],color[1],color[2],220))
        # subtle craters
        for ox, oy, rr in [(-.25,-.12,.16),(.2,.12,.12),(.05,-.28,.09)]:
            d.ellipse((x+ox*r-rr*r,y+oy*r-rr*r,x+ox*r+rr*r,y+oy*r+rr*r), fill=(90,90,105,28))

    def _draw_curtains(self, layer: Image.Image, rng: random.Random, palette: List[RGBA]) -> None:
        w, h = layer.size
        d = ImageDraw.Draw(layer, "RGBA")
        dark = palette[0]
        mid = palette[1]
        for side in (-1, 1):
            outer = 0 if side < 0 else w
            inner = w*.16 if side < 0 else w*.84
            pts = [(outer,0),(inner,0),(inner+side*w*.035,h*.34),(inner-side*w*.01,h*.72),(outer,h)]
            d.polygon(pts, fill=(dark[0],dark[1],dark[2],238))
            for i in range(4):
                x = inner + side*w*(.012 + i*.02)
                d.line((x,0,x+side*w*.02,h*.72), fill=(mid[0],mid[1],mid[2],90), width=max(1,int(w*.003)))

    def _draw_columns_arches(self, layer: Image.Image, palette: List[RGBA], cathedral: bool = False) -> None:
        w, h = layer.size
        d = ImageDraw.Draw(layer, "RGBA")
        dark, mid = palette[0], palette[1]
        for x in (w*.12, w*.28, w*.72, w*.88):
            cw = w*.055 if cathedral else w*.045
            d.rectangle((x-cw/2,h*.18,x+cw/2,h*.94), fill=(mid[0],mid[1],mid[2],190))
            d.rectangle((x-cw*.65,h*.16,x+cw*.65,h*.205), fill=(dark[0],dark[1],dark[2],220))
            # simple vertical grooves
            for j in (-.22, 0, .22):
                xx=x+j*cw
                d.line((xx,h*.22,xx,h*.90), fill=(palette[2][0],palette[2][1],palette[2][2],38), width=max(1,int(w*.0015)))
        if cathedral:
            # pointed arch envelope
            for x0, x1 in ((w*.05,w*.36),(w*.64,w*.95)):
                cx=(x0+x1)/2; top=h*.11; base=h*.52
                d.arc((x0,top,x1,base),180,360,fill=(palette[2][0],palette[2][1],palette[2][2],100),width=max(1,int(w*.004)))
                d.line((x0,base*.64,x0,h*.78),fill=(mid[0],mid[1],mid[2],130),width=max(1,int(w*.004)))
                d.line((x1,base*.64,x1,h*.78),fill=(mid[0],mid[1],mid[2],130),width=max(1,int(w*.004)))

    def _draw_bookshelves(self, layer: Image.Image, rng: random.Random, palette: List[RGBA]) -> None:
        w,h=layer.size; d=ImageDraw.Draw(layer,"RGBA")
        for x0,x1 in ((w*.02,w*.25),(w*.75,w*.98)):
            d.rectangle((x0,h*.18,x1,h*.86), fill=(palette[1][0],palette[1][1],palette[1][2],220))
            for row in range(6):
                y=h*(.22+row*.105)
                d.line((x0+w*.01,y,x1-w*.01,y), fill=(palette[4][0],palette[4][1],palette[4][2],42), width=max(1,int(w*.002)))
                x=x0+w*.015
                while x<x1-w*.02:
                    bw=rng.uniform(w*.008,w*.018)
                    bh=rng.uniform(h*.045,h*.075)
                    col=rng.choice([palette[2],palette[3],palette[4]])
                    d.rectangle((x,y-bh,x+bw,y), fill=(col[0],col[1],col[2],rng.randint(60,125)))
                    x+=bw+rng.uniform(w*.002,w*.006)

    def _draw_cyber_city(self, layer: Image.Image, rng: random.Random, palette: List[RGBA]) -> None:
        w,h=layer.size; d=ImageDraw.Draw(layer,"RGBA")
        horizon=h*.72
        x=0
        while x<w:
            bw=rng.uniform(w*.035,w*.09); bh=rng.uniform(h*.12,h*.48)
            by=horizon-bh
            col=palette[1]
            d.rectangle((x,by,x+bw,horizon),fill=(col[0],col[1],col[2],230))
            if x < w*.33 or x > w*.67:
                neon=rng.choice([palette[2],palette[3],palette[4]])
                d.line((x+bw*.18,by+h*.015,x+bw*.82,by+h*.015),fill=(neon[0],neon[1],neon[2],120),width=max(1,int(w*.002)))
            x += bw + rng.uniform(w*.004,w*.012)
        # perspective street
        d.polygon([(w*.43,horizon),(w*.57,horizon),(w*.82,h),(w*.18,h)], fill=(5,7,10,235))
        for side in (-1,1):
            d.line((w*.5+side*w*.07,horizon,w*.5+side*w*.32,h),fill=(palette[2][0],palette[2][1],palette[2][2],75),width=max(1,int(w*.003)))
        # rain mainly outside the central face zone
        for _ in range(90):
            x=rng.uniform(0,w)
            if w*.34<x<w*.66 and rng.random()<.8:
                continue
            y=rng.uniform(0,h); ln=rng.uniform(h*.012,h*.045)
            d.line((x,y,x-w*.008,y+ln),fill=(palette[4][0],palette[4][1],palette[4][2],rng.randint(20,65)),width=1)

    def _draw_roses(self, layer: Image.Image, rng: random.Random, palette: List[RGBA]) -> None:
        w,h=layer.size; d=ImageDraw.Draw(layer,"RGBA")
        for side in (-1,1):
            for _ in range(18):
                x = rng.uniform(0,w*.28) if side<0 else rng.uniform(w*.72,w)
                y = rng.uniform(h*.35,h*.96)
                r = rng.uniform(w*.006,w*.017)
                col=palette[3]
                for k in range(4):
                    ang=k*math.pi/2+rng.random()*.4
                    ox=math.cos(ang)*r*.5; oy=math.sin(ang)*r*.5
                    d.ellipse((x+ox-r*.7,y+oy-r*.5,x+ox+r*.7,y+oy+r*.5),fill=(col[0],col[1],col[2],rng.randint(60,130)))

    def _draw_lab(self, layer: Image.Image, rng: random.Random, palette: List[RGBA]) -> None:
        w,h=layer.size; d=ImageDraw.Draw(layer,"RGBA")
        for side in (-1,1):
            x0=w*.04 if side<0 else w*.72
            x1=w*.28 if side<0 else w*.96
            y0=h*.20; y1=h*.62
            d.rounded_rectangle((x0,y0,x1,y1),radius=int(w*.012),fill=(palette[1][0],palette[1][1],palette[1][2],185),outline=(palette[2][0],palette[2][1],palette[2][2],90),width=max(1,int(w*.002)))
            for r in range(5):
                yy=y0+h*(.055+r*.065)
                d.line((x0+w*.02,yy,x1-w*.02,yy),fill=(palette[2][0],palette[2][1],palette[2][2],rng.randint(35,85)),width=max(1,int(w*.0015)))
        # central halo panel stays simple
        d.rounded_rectangle((w*.34,h*.16,w*.66,h*.67),radius=int(w*.025),fill=(palette[2][0],palette[2][1],palette[2][2],22),outline=(palette[4][0],palette[4][1],palette[4][2],30),width=max(1,int(w*.002)))

    def _draw_forest(self, layer: Image.Image, rng: random.Random, palette: List[RGBA]) -> None:
        w,h=layer.size; d=ImageDraw.Draw(layer,"RGBA")
        ground=h*.76
        for side in (-1,1):
            for i in range(9):
                base_x=(w*.06+w*.028*i) if side<0 else (w*.94-w*.028*i)
                height=rng.uniform(h*.18,h*.42); top=ground-height
                d.line((base_x,ground,base_x+rng.uniform(-w*.015,w*.015),top),fill=(palette[1][0],palette[1][1],palette[1][2],180),width=max(2,int(w*.008)))
                for k in range(5):
                    yy=top+height*(.2+k*.14); half=w*(.028+.012*(5-k))
                    d.polygon([(base_x,yy-height*.025),(base_x-half,yy+height*.035),(base_x+half,yy+height*.035)],fill=(palette[1][0],palette[1][1],palette[1][2],130))
        # path
        d.polygon([(w*.47,ground),(w*.53,ground),(w*.67,h),(w*.33,h)],fill=(palette[1][0],palette[1][1],palette[1][2],160))

    def _draw_single_3d_cube(self, d: ImageDraw.ImageDraw, cx: float, cy: float, size: float, top_color: RGBA, left_color: RGBA, right_color: RGBA, edge_color: RGBA = (255, 255, 255, 240)) -> None:
        dx = size * 0.866
        dy = size * 0.500
        v_center = (cx, cy)
        v_top = (cx, cy - size)
        v_top_left = (cx - dx, cy - dy)
        v_top_right = (cx + dx, cy - dy)
        v_bottom_left = (cx - dx, cy + dy)
        v_bottom_right = (cx + dx, cy + dy)
        v_bottom = (cx, cy + size)

        poly_top = [v_center, v_top_left, v_top, v_top_right]
        poly_left = [v_center, v_top_left, v_bottom_left, v_bottom]
        poly_right = [v_center, v_top_right, v_bottom_right, v_bottom]

        d.polygon(poly_top, fill=top_color)
        d.polygon(poly_left, fill=left_color)
        d.polygon(poly_right, fill=right_color)

        edges = [
            (v_center, v_top_left), (v_center, v_top_right), (v_center, v_bottom),
            (v_top_left, v_top), (v_top_right, v_top),
            (v_top_left, v_bottom_left), (v_top_right, v_bottom_right),
            (v_bottom_left, v_bottom), (v_bottom_right, v_bottom)
        ]
        w_edge = max(1, int(size * 0.04))
        for p1, p2 in edges:
            d.line([p1, p2], fill=edge_color, width=w_edge)

    def _draw_3d_rainbow_cubes(self, layer: Image.Image, rng: random.Random, palette: List[RGBA]) -> None:
        w, h = layer.size
        d = ImageDraw.Draw(layer, "RGBA")

        # 1. Volumetric Rainbow Rays from behind main central cube
        ray_layer = Image.new("RGBA", (w, h), (0,0,0,0))
        rd = ImageDraw.Draw(ray_layer, "RGBA")
        rainbow_spectrum = [
            (255, 30, 80, 70), (255, 140, 0, 70), (255, 230, 0, 70),
            (0, 230, 120, 70), (0, 200, 255, 70), (160, 30, 255, 70)
        ]
        rcx, rcy = w * 0.5, h * 0.42
        for i, col in enumerate(rainbow_spectrum):
            angle_deg = -120 + i * 48
            rad = math.radians(angle_deg)
            x_end = rcx + math.cos(rad) * w * 1.2
            y_end = rcy + math.sin(rad) * h * 1.2
            ray_poly = [
                (rcx - w*.04, rcy - h*.04), (rcx + w*.04, rcy + h*.04),
                (x_end + w*.12, y_end + h*.12), (x_end - w*.12, y_end - h*.12)
            ]
            rd.polygon(ray_poly, fill=col)
        ray_layer = ray_layer.filter(ImageFilter.GaussianBlur(max(5, int(w * 0.025))))
        layer.alpha_composite(ray_layer)

        # 2. Glass Mirror Reflective Floor Grid
        floor_y = h * 0.72
        floor_poly = [(0, floor_y), (w, floor_y), (w, h), (0, h)]
        d.polygon(floor_poly, fill=(12, 8, 25, 230))
        for grid_x in range(0, w + 1, int(max(10, w * 0.08))):
            d.line((grid_x, floor_y, w * 0.5 + (grid_x - w * 0.5) * 2.2, h), fill=(0, 220, 255, 45), width=max(1, int(w * 0.0015)))
        for grid_y in [0.76, 0.82, 0.89, 0.96]:
            d.line((0, h * grid_y, w, h * grid_y), fill=(255, 0, 180, 40), width=max(1, int(w * 0.0015)))

        # 3. Constellation of 3D Rainbow Cubes
        cubes = [
            (0.50, 0.42, 0.16, (255, 220, 0, 240), (255, 0, 110, 235), (0, 220, 255, 235)),
            (0.22, 0.26, 0.09, (0, 255, 180, 230), (0, 140, 255, 220), (180, 0, 255, 220)),
            (0.78, 0.28, 0.10, (255, 100, 0, 230), (255, 0, 180, 220), (255, 220, 0, 220)),
            (0.16, 0.58, 0.075, (255, 0, 200, 230), (120, 0, 255, 220), (0, 200, 255, 220)),
            (0.84, 0.56, 0.08, (0, 230, 255, 230), (0, 255, 120, 220), (255, 220, 0, 220)),
            (0.50, 0.15, 0.055, (255, 255, 255, 240), (255, 0, 120, 220), (0, 180, 255, 220)),
        ]

        # Floor reflections
        ref_layer = Image.new("RGBA", (w, h), (0,0,0,0))
        ref_d = ImageDraw.Draw(ref_layer, "RGBA")
        for cx_r, cy_r, sz_r, top_c, left_c, right_c in cubes:
            ref_cy = floor_y + (floor_y - cy_r * h) * 0.55
            if ref_cy < h:
                self._draw_single_3d_cube(ref_d, cx_r * w, ref_cy, sz_r * w * 0.85, (*top_c[:3], 90), (*left_c[:3], 80), (*right_c[:3], 80), edge_color=(255,255,255,110))
        ref_layer = ref_layer.filter(ImageFilter.GaussianBlur(max(2, int(w * 0.012))))
        layer.alpha_composite(ref_layer)

        # Primary 3D Cubes
        for cx_r, cy_r, sz_r, top_c, left_c, right_c in cubes:
            self._draw_single_3d_cube(d, cx_r * w, cy_r * h, sz_r * w, top_c, left_c, right_c)
            self._soft_glow(layer, (cx_r * w, cy_r * h), sz_r * w * 1.2, (*top_c[:3], int(top_c[3] * 0.35)))

        # 4. Floating Rainbow Particles
        for _ in range(36):
            px = rng.uniform(w * 0.05, w * 0.95)
            py = rng.uniform(h * 0.08, h * 0.92)
            pr = rng.uniform(w * 0.003, w * 0.012)
            p_col = rng.choice([
                (255, 50, 120, 220), (255, 220, 0, 220), (0, 230, 255, 220),
                (180, 50, 255, 220), (255, 255, 255, 255)
            ])
            d.ellipse((px - pr, py - pr, px + pr, py + pr), fill=p_col)

    def _draw_scenario_structures(self, layer: Image.Image, spec: SceneSpec, rng: random.Random, palette: List[RGBA]) -> None:
        sid=spec.scenario
        w,h=layer.size
        if sid=="minimal_studio":
            return
        if sid=="gothic_bedroom":
            d=ImageDraw.Draw(layer,"RGBA")
            # Put the tall window on a side third instead of directly behind the
            # crown. This keeps the horn silhouette clean and creates asymmetry.
            if spec.seed & 1:
                wx0, wx1 = w*.67, w*.92
            else:
                wx0, wx1 = w*.08, w*.33
            d.rounded_rectangle((wx0,h*.12,wx1,h*.56),radius=int(w*.02),fill=(palette[2][0],palette[2][1],palette[2][2],32),outline=(palette[4][0],palette[4][1],palette[4][2],45),width=max(1,int(w*.003)))
            d.line(((wx0+wx1)/2,h*.13,(wx0+wx1)/2,h*.55), fill=(palette[4][0],palette[4][1],palette[4][2],30), width=max(1,int(w*.0015)))
            self._draw_curtains(layer,rng,palette)
            d.rectangle((w*.16,h*.70,w*.84,h*.95),fill=(palette[1][0],palette[1][1],palette[1][2],175))
            d.rounded_rectangle((w*.22,h*.60,w*.78,h*.78),radius=int(w*.03),outline=(palette[3][0],palette[3][1],palette[3][2],80),width=max(1,int(w*.004)))
        elif sid=="moonlit_cathedral":
            self._draw_columns_arches(layer,palette,cathedral=True)
            self._draw_moon(layer,w*.5,h*.20,w*.08,palette[4])
        elif sid=="cyber_rain_city":
            self._draw_cyber_city(layer,rng,palette)
        elif sid=="occult_library":
            self._draw_bookshelves(layer,rng,palette)
            self._draw_moon(layer,w*.5,h*.18,w*.06,palette[4])
        elif sid=="dark_rose_garden":
            self._draw_moon(layer,w*.58,h*.18,w*.075,palette[4])
            self._draw_columns_arches(layer,palette,cathedral=False)
            self._draw_roses(layer,rng,palette)
        elif sid=="throne_chamber":
            self._draw_columns_arches(layer,palette,cathedral=False)
            d=ImageDraw.Draw(layer,"RGBA")
            d.rounded_rectangle((w*.34,h*.40,w*.66,h*.91),radius=int(w*.025),fill=(palette[0][0],palette[0][1],palette[0][2],230),outline=(palette[3][0],palette[3][1],palette[3][2],80),width=max(1,int(w*.004)))
            d.polygon([(w*.37,h*.48),(w*.50,h*.34),(w*.63,h*.48)],fill=(palette[1][0],palette[1][1],palette[1][2],210))
        elif sid=="neon_lab":
            self._draw_lab(layer,rng,palette)
        elif sid=="rainbow_3d_cubes":
            self._draw_3d_rainbow_cubes(layer,rng,palette)
        elif sid=="moon_balcony":
            self._draw_moon(layer,w*.68,h*.18,w*.09,palette[4])
            self._draw_curtains(layer,rng,palette)
            d=ImageDraw.Draw(layer,"RGBA")
            d.line((0,h*.76,w,h*.76),fill=(palette[4][0],palette[4][1],palette[4][2],70),width=max(1,int(w*.004)))
            for x in range(0,w,int(max(16,w*.07))):
                d.line((x,h*.76,x,h*.90),fill=(palette[2][0],palette[2][1],palette[2][2],80),width=max(1,int(w*.002)))
        elif sid=="forest_shrine":
            self._draw_forest(layer,rng,palette)
            d=ImageDraw.Draw(layer,"RGBA")
            # simple gate behind subject, thin enough not to merge with horns
            d.line((w*.32,h*.37,w*.32,h*.70),fill=(palette[3][0],palette[3][1],palette[3][2],100),width=max(2,int(w*.008)))
            d.line((w*.68,h*.37,w*.68,h*.70),fill=(palette[3][0],palette[3][1],palette[3][2],100),width=max(2,int(w*.008)))
            d.line((w*.28,h*.37,w*.72,h*.37),fill=(palette[3][0],palette[3][1],palette[3][2],100),width=max(2,int(w*.009)))

    def _atmosphere(self, layer: Image.Image, spec: SceneSpec, rng: random.Random, palette: List[RGBA], character_present: bool) -> None:
        w,h=layer.size
        fog=Image.new("RGBA",(w,h),(0,0,0,0)); d=ImageDraw.Draw(fog,"RGBA")
        for _ in range(int(8+18*spec.scene_strength)):
            x=rng.uniform(-w*.1,w*1.1); y=rng.uniform(h*.12,h*.95)
            if character_present and w*.34<x<w*.66 and h*.18<y<h*.70 and rng.random()<.75:
                continue
            rw=rng.uniform(w*.05,w*.18); rh=rng.uniform(h*.008,h*.035)
            c=palette[-1]
            d.ellipse((x-rw,y-rh,x+rw,y+rh),fill=(c[0],c[1],c[2],rng.randint(2,10)))
        fog=fog.filter(ImageFilter.GaussianBlur(max(5,int(w*.018))))
        layer.alpha_composite(fog)

        # sparse motes / sparkles, never a regular grid
        dd=ImageDraw.Draw(layer,"RGBA")
        for _ in range(int(18+40*spec.scene_strength)):
            x=rng.uniform(0,w); y=rng.uniform(0,h)
            if character_present and w*.37<x<w*.63 and h*.23<y<h*.62 and rng.random()<.8:
                continue
            r=rng.choice([1,1,1,2]); c=rng.choice([palette[2],palette[3],palette[4]])
            dd.ellipse((x-r,y-r,x+r,y+r),fill=(c[0],c[1],c[2],rng.randint(10,42)))

    def render(self, spec: SceneSpec, character_present: bool = False) -> SceneRenderResult:
        w,h=spec.width,spec.height
        rng=random.Random(spec.seed ^ 0x51CE0A)
        profile=SCENARIOS.get(spec.scenario,DEFAULT_SCENARIO)
        palette=self._palette(spec)
        top=palette[0]
        bottom=palette[1] if len(palette)>1 else palette[0]
        img=self._gradient(w,h,top,bottom)

        # light pool toward upper center/third based on scenario
        glow_col=palette[-1]
        self._soft_glow(img,(w*.52,h*.33),w*.20,(glow_col[0],glow_col[1],glow_col[2],24))
        self._draw_scenario_structures(img,spec,rng,palette)
        self._atmosphere(img,spec,rng,palette,character_present)
        if character_present:
            self._safe_zone(img,spec.scene_strength,palette)

        # Vignette for cinematic focus.
        vign=Image.new("L",(w,h),0); vd=ImageDraw.Draw(vign)
        vd.ellipse((-w*.12,-h*.08,w*1.12,h*1.08),fill=210)
        vign=vign.filter(ImageFilter.GaussianBlur(max(12,int(w*.08))))
        black=Image.new("RGBA",(w,h),(0,0,0,int(40+50*spec.scene_strength)))
        black.putalpha(Image.eval(vign,lambda x:max(0,210-x)))
        img=Image.alpha_composite(img,black)

        depth_count = len(profile.depth_planes)
        clearance = profile.subject_clearance if character_present else 0.0
        center_suppression = 0.86 if character_present else 0.0
        scene_score = 0.0
        scene_score += min(30.0, depth_count / 3.0 * 30.0)
        if character_present:
            scene_score += min(25.0, clearance / 0.42 * 25.0)
            scene_score += min(20.0, center_suppression / 0.80 * 20.0)
        else:
            scene_score += 25.0
            scene_score += 20.0
        scene_score += 15.0  # one controlled dominant light direction in this builder
        if profile.id == "minimal_studio" or 1 <= len(profile.props) <= 8:
            scene_score += 10.0
        telemetry={
            "scenario": profile.id,
            "depth_plane_count": depth_count,
            "subject_clearance_ratio": clearance,
            "foreground_elements": len(profile.foreground),
            "prop_count": len(profile.props),
            "atmosphere_count": len(profile.atmosphere),
            "central_detail_suppression": center_suppression,
            "single_light_direction": True,
            "character_present": character_present,
            "scene_quality_proxy": round(min(90.0, scene_score), 1),
            "scene_quality_type": "composition_geometry_proxy",
            "reference_scene_similarity": None,
        }
        return SceneRenderResult(image=img,telemetry=telemetry,plan=scenario_plan(profile,character_present=character_present))
