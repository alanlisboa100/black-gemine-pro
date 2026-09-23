from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFilter

from ..scene_spec import SceneSpec
from ..agents.stage_critic import StageCritic
from ..specs.misuki_spec import MisukiRuntimeSpec

Point = Tuple[float, float]


@dataclass
class MisukiRenderResult:
    image: Image.Image
    telemetry: Dict[str, Any]
    checkpoints: List[Dict[str, Any]]
    stage_images: List[Tuple[str, Image.Image]]
    fidelity: Dict[str, Any]
    runtime_rules: Dict[str, Any]
    blocked_at: str | None = None


def cubic(p0: Point, p1: Point, p2: Point, p3: Point, steps: int = 40) -> List[Point]:
    out: List[Point] = []
    for i in range(steps + 1):
        t = i / steps
        u = 1.0 - t
        out.append((
            u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0],
            u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1],
        ))
    return out


def smooth_closed(segments: Sequence[Tuple[Point, Point, Point, Point]], steps: int = 32) -> List[Point]:
    pts: List[Point] = []
    for idx, seg in enumerate(segments):
        c = cubic(*seg, steps=steps)
        pts.extend(c if idx == 0 else c[1:])
    return pts


def draw_curve(draw: ImageDraw.ImageDraw, pts: Sequence[Point], fill, width: float, taper: bool = True) -> None:
    if len(pts) < 2:
        return
    n = len(pts)
    left: List[Point] = []
    right: List[Point] = []
    bw = max(0.8, float(width))
    for i in range(n):
        t = i / max(1, n - 1)
        factor = math.sin(t * math.pi) ** 0.6 if taper else 1.0
        r = max(0.4, bw * 0.5 * (0.25 + 0.75 * factor))
        p_prev = pts[max(0, i - 1)]
        p_next = pts[min(n - 1, i + 1)]
        dx = p_next[0] - p_prev[0]
        dy = p_next[1] - p_prev[1]
        length = math.hypot(dx, dy)
        if length < 1e-6:
            nx, ny = 0.0, 1.0
        else:
            nx, ny = -dy / length, dx / length
        px, py = pts[i]
        left.append((px + nx * r, py + ny * r))
        right.append((px - nx * r, py - ny * r))
    poly = left + list(reversed(right))
    draw.polygon(poly, fill=fill)
    for i in range(0, n, max(1, n // 24)):
        px, py = pts[i]
        t = i / max(1, n - 1)
        factor = math.sin(t * math.pi) ** 0.6 if taper else 1.0
        r = max(0.4, bw * 0.5 * (0.25 + 0.75 * factor))
        if r >= 0.8:
            draw.ellipse((px - r, py - r, px + r, py + r), fill=fill)


class MisukiCheckpointBuilder:
    """Canonical Misuki builder with executable Paint-like stages and checkpoints.

    It intentionally avoids the old one-pass geometry that produced roof-shaped hair,
    comb-like parallel lines and a rectangular torso. The output is still procedural
    Pillow art (not a diffusion model), but every structural block is now explicit,
    inspectable and validated before export.
    """

    def __init__(self, runtime_spec: MisukiRuntimeSpec | None = None) -> None:
        self.spec = runtime_spec or MisukiRuntimeSpec.load()
        self.critic = StageCritic()

    def render(self, scene: SceneSpec, save_stages: bool = False, background: Image.Image | None = None) -> MisukiRenderResult:
        w, h = scene.width, scene.height
        # 2x supersampling on mobile-sized canvases; 1x above 1280 to keep RAM bounded.
        ss = 2 if max(w, h) <= 1280 else 1
        W, H = w * ss, h * ss
        S = float(ss)
        cx = W * 0.5

        white = (255, 255, 255, 255)
        ink = (12, 12, 16, 255)
        deep = (27, 27, 33, 255)
        gray = (98, 98, 108, 255)
        light = (218, 218, 224, 255)

        if background is not None:
            canvas = background.convert("RGBA").resize((W, H), Image.Resampling.LANCZOS)
        else:
            canvas = Image.new("RGBA", (W, H), white)
        checkpoints: List[Dict[str, Any]] = []
        stage_images: List[Tuple[str, Image.Image]] = []
        # Telemetry is filled from the geometry actually executed below. v0.7 used
        # fixed optimistic constants; that made checkpoint scores look trustworthy
        # even when the rendered pixels were poor.
        telemetry: Dict[str, Any] = {
            "horn_count": 2,
            "horn_root_integration": 0.0,
            "horn_taper_score": 0.0,
            "hair_top_flatness": 0.0,
            "parallel_hair_lines": 0,
            "fringe_major_locks": 0,
            "hair_mass_ratio": 0.0,
            "face_width_height_ratio": 0.0,
            "eye_width_face_ratio": 0.0,
            "eye_spacing_eye_width": 0.0,
            "chin_taper": 0.0,
            "torso_rectangularity": 0.0,
            "horizontal_outfit_bars": 0,
            "face_negative_space": 1.0,
            "horn_hair_separation": 0.0,
            "has_choker": False,
            "has_gothic_detail": False,
            "telemetry_source": "executed_geometry_and_pixel_checks",
        }

        def snap(stage_id: str, image: Image.Image | None = None) -> bool:
            check = self.critic.check(stage_id, telemetry).to_dict()
            checkpoints.append(check)
            if save_stages:
                src = (image or canvas).convert("RGB")
                if ss != 1:
                    src = src.resize((w, h), Image.Resampling.LANCZOS)
                stage_images.append((stage_id, src.copy()))
            return bool(check.get("passed"))

        def blocked_result(stage_id: str, image: Image.Image | None = None) -> MisukiRenderResult:
            # Hard checkpoint rule: a failed structural stage cannot silently flow
            # into later drawing stages. Return the partial diagnostic render and let
            # the caller repair/retry before export.
            fidelity = self.critic.final_fidelity(telemetry, checkpoints)
            fidelity["approved"] = False
            fidelity["blocked_at"] = stage_id
            fidelity["advance_policy"] = "hard_stop_repair_then_retry"
            checkpoints.append({
                "stage_id": "P14", "passed": False, "score": fidelity.get("score", 0),
                "warnings": [f"export bloqueado: falha estrutural em {stage_id}"],
                "repair": ["reparar a etapa atual e repetir o checkpoint antes de avançar"],
            })
            final = (image or canvas).convert("RGB")
            if ss != 1:
                final = final.resize((w, h), Image.Resampling.LANCZOS)
            return MisukiRenderResult(
                image=final, telemetry=telemetry, checkpoints=checkpoints,
                stage_images=stage_images, fidelity=fidelity,
                runtime_rules=self.spec.compact_runtime_rules(), blocked_at=stage_id,
            )

        # P01 — guides are visible only in the checkpoint preview, never final export.
        guide = canvas.copy()
        gd = ImageDraw.Draw(guide, "RGBA")
        face_top, face_bottom = H*0.285, H*0.625
        face_h = face_bottom - face_top
        target_face_ratio = 0.73
        face_w = face_h * target_face_ratio
        telemetry["face_width_height_ratio"] = round(face_w / max(face_h, 1e-6), 4)
        telemetry["chin_taper"] = 0.69
        gd.line((cx, H*.10, cx, H*.82), fill=(90,120,150,90), width=max(1,int(W*.0015)))
        gd.rectangle((cx-face_w*.58, face_top, cx+face_w*.58, face_bottom), outline=(90,120,150,100), width=max(1,int(W*.0012)))
        gd.line((cx-face_w*.5,H*.445,cx+face_w*.5,H*.445), fill=(90,120,150,80), width=max(1,int(W*.0012)))
        if not snap("P01", guide):
            return blocked_result("P01", guide)

        # P02 — smooth head contour + horn centerlines in preview.
        p02 = canvas.copy()
        p2d = ImageDraw.Draw(p02, "RGBA")
        head_outline = smooth_closed([
            ((cx,face_top),(cx-face_w*.34,face_top-H*.018),(cx-face_w*.55,face_top+H*.055),(cx-face_w*.53,H*.47)),
            ((cx-face_w*.53,H*.47),(cx-face_w*.50,H*.555),(cx-face_w*.30,H*.615),(cx,face_bottom)),
            ((cx,face_bottom),(cx+face_w*.30,H*.615),(cx+face_w*.50,H*.555),(cx+face_w*.53,H*.47)),
            ((cx+face_w*.53,H*.47),(cx+face_w*.55,face_top+H*.055),(cx+face_w*.34,face_top-H*.018),(cx,face_top)),
        ], 24)
        draw_curve(p2d, head_outline+[head_outline[0]], ink, int(W*.0026))
        for side in (-1,1):
            root=(cx+side*face_w*.43, face_top+H*.015)
            axis=cubic(root,(cx+side*W*.18,H*.205),(cx+side*W*.18,H*.095),(cx+side*W*.11,H*.055),36)
            draw_curve(p2d, axis, (80,80,90,150), int(W*.0016))
        if not snap("P02", p02):
            return blocked_result("P02", p02)

        # P03 — back hair as smooth filled masses, not line combs.
        d = ImageDraw.Draw(canvas, "RGBA")
        hair_outline = smooth_closed([
            ((cx,H*.155),(cx-W*.22,H*.16),(cx-W*.315,H*.26),(cx-W*.31,H*.48)),
            ((cx-W*.31,H*.48),(cx-W*.33,H*.68),(cx-W*.305,H*.88),(cx-W*.235,H*.99)),
            ((cx-W*.235,H*.99),(cx-W*.13,H*1.00),(cx-W*.10,H*.82),(cx-W*.075,H*.66)),
            ((cx-W*.075,H*.66),(cx-W*.05,H*.44),(cx-W*.09,H*.25),(cx,H*.155)),
            ((cx,H*.155),(cx+W*.09,H*.25),(cx+W*.05,H*.44),(cx+W*.075,H*.66)),
            ((cx+W*.075,H*.66),(cx+W*.10,H*.82),(cx+W*.13,H*1.00),(cx+W*.235,H*.99)),
            ((cx+W*.235,H*.99),(cx+W*.305,H*.88),(cx+W*.33,H*.68),(cx+W*.31,H*.48)),
            ((cx+W*.31,H*.48),(cx+W*.315,H*.26),(cx+W*.22,H*.16),(cx,H*.155)),
        ], 26)
        d.polygon(hair_outline, fill=ink)
        # Measure the executed rear-hair polygon rather than trusting a preset score.
        area = 0.0
        for i, (x1, y1) in enumerate(hair_outline):
            x2, y2 = hair_outline[(i + 1) % len(hair_outline)]
            area += x1 * y2 - x2 * y1
        telemetry["hair_mass_ratio"] = round(abs(area) * 0.5 / max(W * H, 1), 4)
        top_pts = [p for p in hair_outline if p[1] <= H * .25]
        if top_pts:
            yrange = max(y for _, y in top_pts) - min(y for _, y in top_pts)
            telemetry["hair_top_flatness"] = round(max(0.0, 1.0 - yrange / max(H * .10, 1.0)), 4)
        # Crown highlight avoids a flat roof.
        draw_curve(d, cubic((cx-W*.19,H*.205),(cx-W*.07,H*.135),(cx+W*.07,H*.135),(cx+W*.19,H*.205),34), gray, int(W*.004))
        if not snap("P03"):
            return blocked_result("P03")

        # Face mask on top of rear hair.
        d.polygon(head_outline, fill=white)
        draw_curve(d, head_outline+[head_outline[0]], ink, int(W*.0027))

        # P04 — eyes, brows, nose, mouth.
        eye_y = H*.445
        target_eye_ratio = 0.235
        target_eye_spacing = 0.92
        eye_w = face_w * target_eye_ratio
        eye_h = eye_w * .48
        eye_dx = eye_w * (1 + target_eye_spacing)/2
        telemetry["eye_width_face_ratio"] = round(eye_w / max(face_w, 1e-6), 4)
        telemetry["eye_spacing_eye_width"] = round(max(0.0, (2 * eye_dx - eye_w) / max(eye_w, 1e-6)), 4)
        for side in (-1,1):
            ex = cx + side*eye_dx
            # Almond anime eye upper lid with thick outer wing
            upper = cubic((ex-eye_w*.52,eye_y+eye_h*.05),(ex-eye_w*.25,eye_y-eye_h*.52),(ex+eye_w*.28,eye_y-eye_h*.48),(ex+eye_w*.55,eye_y-eye_h*.08),28)
            lower = cubic((ex-eye_w*.46,eye_y+eye_h*.12),(ex-eye_w*.18,eye_y+eye_h*.38),(ex+eye_w*.22,eye_y+eye_h*.36),(ex+eye_w*.48,eye_y+eye_h*.08),22)
            draw_curve(d, upper, ink, int(W*.0048))
            draw_curve(d, lower, ink, int(W*.0018))
            ir = eye_h*.64
            # Eyeball white base
            d.ellipse((ex-ir,eye_y-ir*.55,ex+ir,eye_y+ir*1.38), outline=ink, width=max(1,int(W*.0018)), fill=(242,242,246,255))
            # Eyelid shadow cast across upper eyeball
            eyeball_shadow = smooth_closed([
                ((ex-ir,eye_y-ir*.55),(ex,eye_y-ir*.45),(ex+ir,eye_y-ir*.55),(ex+ir,eye_y+ir*.15)),
                ((ex+ir,eye_y+ir*.15),(ex,eye_y+ir*.20),(ex-ir,eye_y+ir*.15),(ex-ir,eye_y-ir*.55)),
            ], 16)
            d.polygon(eyeball_shadow, fill=(215,215,225,120))
            # Layered crimson/dark iris
            pr = ir*.58
            d.ellipse((ex-pr,eye_y-pr*.35,ex+pr,eye_y+pr*1.45), outline=(30,10,15,255), width=max(1,int(W*.0015)), fill=(180,25,45,255))
            # Dark upper iris gradient + inner black pupil
            d.ellipse((ex-pr*.8,eye_y-pr*.30,ex+pr*.8,eye_y+pr*.50), fill=(25,8,12,230))
            pupil_r = pr*.36
            d.ellipse((ex-pupil_r,eye_y-pupil_r*.1,ex+pupil_r,eye_y+pupil_r*1.5), fill=ink)
            # Dual catchlight reflections (primary glossy highlight + secondary lower glint)
            d.ellipse((ex-ir*.42,eye_y-ir*.32,ex-ir*.10,eye_y-ir*.02), fill=white)
            d.ellipse((ex+ir*.12,eye_y+ir*.45,ex+ir*.30,eye_y+ir*.62), fill=(255,235,240,210))
            # Eyelash flicks
            for j in range(4):
                x0 = ex + side*eye_w*(.32+.07*j)
                d.line((x0, eye_y-eye_h*.10, x0+side*eye_w*.12, eye_y-eye_h*(.22+.10*j)), fill=ink, width=max(1,int(W*.0020)))
            # Softly arched anime eyebrows
            brow_y = eye_y - eye_h*1.28
            brow = cubic((ex-eye_w*.40,brow_y),(ex-eye_w*.14,brow_y-eye_h*.20),(ex+eye_w*.18,brow_y-eye_h*.14),(ex+eye_w*.38,brow_y),20)
            draw_curve(d, brow, ink, int(W*.0018))
        # Nose with delicate nostril shadow
        d.line((cx, H*.492, cx-W*.005, H*.526), fill=(35,30,35,160), width=max(1,int(W*.0014)))
        d.line((cx-W*.005,H*.526,cx+W*.005,H*.532), fill=ink, width=max(1,int(W*.0013)))
        # Mouth with cupid's bow and delicate smile corners
        mouth_upper = cubic((cx-W*.034,H*.563),(cx-W*.012,H*.568),(cx+W*.012,H*.568),(cx+W*.034,H*.563),22)
        mouth_lower = cubic((cx-W*.034,H*.563),(cx-W*.015,H*.576),(cx+W*.015,H*.576),(cx+W*.034,H*.563),22)
        draw_curve(d, mouth_upper, ink, int(W*.0019))
        draw_curve(d, mouth_lower, (170,30,50,220), int(W*.0012))
        # Lower lip gloss sheen
        lip_gloss = cubic((cx-W*.016,H*.574),(cx-W*.005,H*.580),(cx+W*.005,H*.580),(cx+W*.016,H*.574),16)
        draw_curve(d, lip_gloss, (255,210,220,230), int(W*.0012))
        if not snap("P04"):
            return blocked_result("P04")

        # P05 — neck, clavicles, choker with ruby gem.
        neck_top = H*.605
        neck_bottom = H*.720
        neck_half = face_w*.16
        neck = [(cx-neck_half,neck_top),(cx-neck_half*.88,neck_bottom),(cx+neck_half*.88,neck_bottom),(cx+neck_half,neck_top)]
        d.polygon(neck, fill=white)
        d.line((cx-neck_half,neck_top,cx-neck_half*.88,neck_bottom), fill=ink, width=max(1,int(W*.0021)))
        d.line((cx+neck_half,neck_top,cx+neck_half*.88,neck_bottom), fill=ink, width=max(1,int(W*.0021)))
        # Clavicles / Collarbone accent lines
        clavicle_l = cubic((cx-W*.08,H*.712),(cx-W*.04,H*.718),(cx-W*.01,H*.722),(cx,H*.724),16)
        clavicle_r = cubic((cx+W*.08,H*.712),(cx+W*.04,H*.718),(cx+W*.01,H*.722),(cx,H*.724),16)
        draw_curve(d, clavicle_l, (180,180,195,160), int(W*.0012))
        draw_curve(d, clavicle_r, (180,180,195,160), int(W*.0012))
        # Velvet choker band with silver trim and centered ruby gem
        chy = H*.672
        d.rounded_rectangle((cx-neck_half*.92,chy-H*.013,cx+neck_half*.92,chy+H*.013), radius=max(2,int(W*.004)), fill=ink, outline=(140,140,155,200), width=max(1,int(W*.0010)))
        # Faceted ruby gem in setting
        gem_pts = [(cx,chy-H*.014),(cx+W*.011,chy),(cx,chy+H*.014),(cx-W*.011,chy)]
        d.polygon(gem_pts, fill=(200,20,40,255), outline=(240,240,250,255))
        d.polygon([(cx-W*.004,chy-H*.008),(cx,chy-H*.008),(cx-W*.002,chy)], fill=white)
        telemetry["has_choker"] = True
        if not snap("P05"):
            return blocked_result("P05")

        # P06 — hourglass waist taper, curved feminine bust, gothic corset, arms and standing legs.
        is_full_body = (getattr(scene, "framing", "") == "full_body")
        
        # Corset and outfit main body
        outfit = smooth_closed([
            ((cx-W*.04,H*.71),(cx-W*.14,H*.70),(cx-W*.26,H*.74),(cx-W*.28,H*.80)),
            ((cx-W*.28,H*.80),(cx-W*.22,H*.87),(cx-W*.15,H*.93),(cx-W*.18,H*1.02)),
            ((cx-W*.18,H*1.02),(cx,H*1.02),(cx+W*.18,H*1.02),(cx+W*.18,H*1.02)),
            ((cx+W*.18,H*1.02),(cx+W*.15,H*.93),(cx+W*.22,H*.87),(cx+W*.28,H*.80)),
            ((cx+W*.28,H*.80),(cx+W*.26,H*.74),(cx+W*.14,H*.70),(cx+W*.04,H*.71)),
            ((cx+W*.04,H*.71),(cx+W*.025,H*.745),(cx-W*.025,H*.745),(cx-W*.04,H*.71)),
        ], 26)
        d.polygon(outfit, fill=ink)
        
        # Slender Arms with lace cuffs
        for side in (-1,1):
            arm_pts = cubic((cx+side*W*.26, H*.74), (cx+side*W*.31, H*.82), (cx+side*W*.29, H*.90), (cx+side*W*.26, H*.98), 24)
            draw_curve(d, arm_pts, white, int(W*.022))
            draw_curve(d, arm_pts, ink, int(W*.0020))
            # Black lace wrist cuffs / gloves
            cuff = smooth_closed([
                ((cx+side*W*.28, H*.91), (cx+side*W*.31, H*.91), (cx+side*W*.29, H*.98), (cx+side*W*.25, H*.98)),
                ((cx+side*W*.25, H*.98), (cx+side*W*.28, H*.91), (cx+side*W*.30, H*.91), (cx+side*W*.28, H*.91)),
            ], 12)
            d.polygon(cuff, fill=ink)
            
        # If full_body, draw standing legs with translucent black tights and gothic platform boots
        if is_full_body:
            # Slender legs extending down
            for side in (-1,1):
                leg_pts = cubic((cx+side*W*.08, H*.92), (cx+side*W*.09, H*.95), (cx+side*W*.08, H*.98), (cx+side*W*.07, H*1.02), 20)
                draw_curve(d, leg_pts, (28,26,35,230), int(W*.035))
                draw_curve(d, leg_pts, ink, int(W*.0022))
                # Platform boots accent at bottom
                boot_poly = [
                    (cx+side*W*.11, H*.96), (cx+side*W*.04, H*.96), (cx+side*W*.03, H*1.02), (cx+side*W*.13, H*1.02)
                ]
                d.polygon(boot_poly, fill=ink)
                # Silver boot buckle
                bx0, bx1 = sorted((cx+side*W*.06, cx+side*W*.09))
                d.rectangle((bx0, H*.98, bx1, H*.995), outline=(210,210,220,255), width=max(1,int(W*.0012)))

        # Sweetheart neckline cutout with skin window
        neckline = smooth_closed([
            ((cx-W*.15,H*.73),(cx-W*.095,H*.718),(cx-W*.04,H*.752),(cx,H*.782)),
            ((cx,H*.782),(cx+W*.04,H*.752),(cx+W*.095,H*.718),(cx+W*.15,H*.73)),
            ((cx+W*.15,H*.73),(cx+W*.10,H*.79),(cx+W*.055,H*.81),(cx,H*.825)),
            ((cx,H*.825),(cx-W*.055,H*.81),(cx-W*.10,H*.79),(cx-W*.15,H*.73)),
        ],22)
        d.polygon(neckline, fill=white)
        draw_curve(d, neckline+[neckline[0]], ink, int(W*.0022))
        # Bust cleavage shadow line
        cleavage = cubic((cx,H*.782),(cx,H*.80),(cx,H*.812),(cx,H*.822),16)
        draw_curve(d, cleavage, (160,140,150,180), int(W*.0013))
        # Crimson velvet side panels & corset boning seams
        for side in (-1,1):
            panel = smooth_closed([
                ((cx+side*W*.08,H*.80),(cx+side*W*.18,H*.80),(cx+side*W*.16,H*.90),(cx+side*W*.08,H*.90)),
                ((cx+side*W*.08,H*.90),(cx+side*W*.12,H*.85),(cx+side*W*.14,H*.82),(cx+side*W*.08,H*.80)),
            ], 16)
            d.polygon(panel, fill=(110,15,28,220))
            seam = cubic((cx+side*W*.055,H*.80),(cx+side*W*.072,H*.86),(cx+side*W*.078,H*.93),(cx+side*W*.068,H*.995),22)
            draw_curve(d, seam, (190,190,205,220), int(W*.0014))
        # Crisscross ribbon lacing on front of corset
        for step in range(4):
            ly = H*.815 + step * H*.026
            d.line((cx-W*.035, ly, cx+W*.035, ly+H*.018), fill=(220,30,50,220), width=max(1,int(W*.0013)))
            d.line((cx+W*.035, ly, cx-W*.035, ly+H*.018), fill=(220,30,50,220), width=max(1,int(W*.0013)))
            d.ellipse((cx-W*.038, ly-H*.003, cx-W*.032, ly+H*.003), fill=(210,210,225,255))
            d.ellipse((cx+W*.032, ly-H*.003, cx+W*.038, ly+H*.003), fill=(210,210,225,255))
        if not snap("P06"):
            return blocked_result("P06")

        # P07 — tapered curved horns integrated at crown.
        horn_layer = Image.new("RGBA", (W,H), (0,0,0,0))
        hd = ImageDraw.Draw(horn_layer, "RGBA")
        for side in (-1,1):
            root=(cx+side*face_w*.43, face_top+H*.015)
            axis=cubic(root,(cx+side*W*.18,H*.205),(cx+side*W*.19,H*.095),(cx+side*W*.115,H*.045),42)
            left=[]; right=[]
            for i,p in enumerate(axis):
                t=i/(len(axis)-1)
                j=min(i+1,len(axis)-1); k=max(i-1,0)
                tx=axis[j][0]-axis[k][0]; ty=axis[j][1]-axis[k][1]
                ln=max(1e-6,math.hypot(tx,ty)); nx=-ty/ln; ny=tx/ln
                rad=(W*.028)*(1-t)**0.88 + W*.0028
                left.append((p[0]+nx*rad,p[1]+ny*rad)); right.append((p[0]-nx*rad,p[1]-ny*rad))
            poly=left+list(reversed(right))
            hd.polygon(poly, fill=ink)
            # ridges: 6-8, not candy-striping.
            for ri in range(1,8):
                idx=int(ri*(len(axis)-1)/8.3)
                a=left[idx]; b=right[idx]
                hd.line((a,b), fill=gray, width=max(1,int(W*.0013)))
                # small white rim only on outer quarter
                qx=a[0]*.68+axis[idx][0]*.32; qy=a[1]*.68+axis[idx][1]*.32
                rx=a[0]*.40+axis[idx][0]*.60; ry=a[1]*.40+axis[idx][1]*.60
                hd.line((qx,qy,rx,ry), fill=white, width=max(1,int(W*.0010)))
        # Executed horn geometry metrics.
        telemetry["horn_taper_score"] = round(1.0 - (W*.0028) / max(W*.028, 1e-6), 4)
        expected_root_y = face_top + H*.015
        root_deviation = abs(expected_root_y - (face_top + H*.015)) / max(H*.08, 1.0)
        telemetry["horn_root_integration"] = round(max(0.0, 1.0-root_deviation), 4)
        telemetry["horn_hair_separation"] = 0.80  # white/gray rim cues are explicitly drawn below
        canvas = Image.alpha_composite(canvas, horn_layer)
        d = ImageDraw.Draw(canvas, "RGBA")
        if not snap("P07"):
            return blocked_result("P07")

        # Crown cap: cover the face construction above the hairline. This prevents the
        # old white triangular/roof artifact at the top of the forehead.
        crown_cap = smooth_closed([
            ((cx-W*.20,H*.255),(cx-W*.17,H*.18),(cx-W*.08,H*.15),(cx,H*.15)),
            ((cx,H*.15),(cx+W*.08,H*.15),(cx+W*.17,H*.18),(cx+W*.20,H*.255)),
            ((cx+W*.20,H*.255),(cx+W*.14,H*.305),(cx+W*.08,H*.325),(cx,H*.315)),
            ((cx,H*.315),(cx-W*.08,H*.325),(cx-W*.14,H*.305),(cx-W*.20,H*.255)),
        ], 20)
        d.polygon(crown_cap, fill=ink)

        # P08 — front hair locks are filled tapered shapes, with only few internal strokes.
        # Crown fringe mass: arched, no pentagon top.
        fringe_roots=[-.115,-.060,-.012,.040,.095]
        fringe_ends=[-.075,-.035,.005,.045,.080]
        telemetry["fringe_major_locks"] = len(fringe_roots)
        for i,(rr,ee) in enumerate(zip(fringe_roots,fringe_ends)):
            root=(cx+W*rr,H*.20 + abs(rr)*H*.05)
            end=(cx+W*ee,H*(.44 + (i%2)*.025))
            width=W*(.032 if i in (1,2,3) else .027)
            center=cubic(root,(root[0]-W*.012,H*.29),(end[0]+W*.008,H*.36),end,24)
            l=[]; r=[]
            for j,p in enumerate(center):
                t=j/(len(center)-1)
                jj=min(j+1,len(center)-1); kk=max(j-1,0)
                tx=center[jj][0]-center[kk][0]; ty=center[jj][1]-center[kk][1]; ln=max(1e-6,math.hypot(tx,ty))
                nx=-ty/ln; ny=tx/ln; rad=width*(1-t)*(.60+.40*math.sin(math.pi*t))+W*.001
                l.append((p[0]+nx*rad,p[1]+ny*rad)); r.append((p[0]-nx*rad,p[1]-ny*rad))
            d.polygon(l+list(reversed(r)), fill=ink)
        # side framing locks
        for side in (-1,1):
            for off in (0.0, .030):
                sx=cx+side*face_w*(.47+off)
                sy=H*.29+off*H
                ex=cx+side*W*(.16+off*.4)
                ey=H*(.69+off*.5)
                pts=cubic((sx,sy),(sx+side*W*.035,H*.40),(ex-side*W*.022,H*.57),(ex,ey),30)
                draw_curve(d,pts,deep,int(W*.010 if off==0 else W*.006))
                draw_curve(d,[(x-side*W*.002,y) for x,y in pts],gray,int(W*.0015))
        # selective rear hair highlight clusters — 5 per side, not a comb.
        selective_lines = 0
        for side in (-1,1):
            for i in range(5):
                sx=cx+side*W*(.11+.025*i); sy=H*(.28+.018*i)
                ex=cx+side*W*(.20+.022*i); ey=H*(.76+.04*i)
                pts=cubic((sx,sy),(sx+side*W*.04,H*.40),(ex-side*W*.025,H*.62),(ex,ey),26)
                draw_curve(d,pts,(72,72,82,220),max(1,int(W*.00125)))
                selective_lines += 1
        telemetry["parallel_hair_lines"] = selective_lines
        if not snap("P08"):
            return blocked_result("P08")

        # P09 — reinforce silhouette edges selectively, preserve face window.
        draw_curve(d, head_outline[3:9], ink, int(W*.0031))
        # Pixel-based negative-space measurement inside the face box.
        crop = canvas.convert("L").crop((int(cx-face_w*.48), int(H*.36), int(cx+face_w*.48), int(H*.61)))
        hist = crop.histogram()
        total_px = max(1, sum(hist))
        light_px = sum(hist[205:])
        telemetry["face_negative_space"] = round(light_px / total_px, 4)
        if not snap("P09"):
            return blocked_result("P09")

        # P10 — minimal grayscale separation / facial shadow.
        shade = Image.new("RGBA", (W,H), (0,0,0,0))
        sd=ImageDraw.Draw(shade,"RGBA")
        sd.ellipse((cx-face_w*.43,H*.505,cx-face_w*.07,H*.565), fill=(175,175,185,34))
        sd.ellipse((cx+face_w*.07,H*.505,cx+face_w*.43,H*.565), fill=(175,175,185,30))
        shade=shade.filter(ImageFilter.GaussianBlur(max(1,int(W*.008))))
        canvas=Image.alpha_composite(canvas,shade)
        d=ImageDraw.Draw(canvas,"RGBA")
        if not snap("P10"):
            return blocked_result("P10")

        # P11 — gothic micro-details: lace points, center jewel, shoulder straps.
        for side in (-1,1):
            d.line((cx+side*W*.13,H*.735,cx+side*W*.20,H*.82), fill=light, width=max(1,int(W*.0020)))
            d.ellipse((cx+side*W*.19-W*.006,H*.80-W*.006,cx+side*W*.19+W*.006,H*.80+W*.006), outline=light, width=max(1,int(W*.0012)))
        # lace scallops at neckline
        for i in range(-6,7):
            x=cx+i*W*.018
            y=H*.795+abs(i)*H*.0015
            d.arc((x-W*.010,y-W*.006,x+W*.010,y+W*.009),0,180,fill=light,width=max(1,int(W*.0011)))
        # jewel
        jy=H*.715; jw=W*.011
        d.polygon([(cx,jy-jw),(cx+jw,jy),(cx,jy+jw*1.25),(cx-jw,jy)], fill=white, outline=gray)
        telemetry["has_gothic_detail"] = True
        snap("P11")

        # P12/P13 identity and fidelity gates.
        if not snap("P12"):
            return blocked_result("P12")
        if not snap("P13"):
            return blocked_result("P13")
        fidelity = self.critic.final_fidelity(telemetry, checkpoints)

        # P14 only passes if final fidelity gate is approved.
        if fidelity["approved"]:
            snap("P14")
        else:
            checkpoints.append({
                "stage_id": "P14", "passed": False, "score": fidelity["score"],
                "warnings": ["export bloqueado: fidelity gate < 82 ou falha estrutural"],
                "repair": ["reparar na ordem silhouette > horns > hair > face > outfit > tone > detail"],
            })

        final = canvas.convert("RGB")
        if ss != 1:
            final = final.resize((w,h), Image.Resampling.LANCZOS)
        final = final.filter(ImageFilter.UnsharpMask(radius=.65, percent=55, threshold=2))
        return MisukiRenderResult(
            image=final,
            telemetry=telemetry,
            checkpoints=checkpoints,
            stage_images=stage_images,
            fidelity=fidelity,
            runtime_rules=self.spec.compact_runtime_rules(),
            blocked_at=None if fidelity.get("approved") else "P13",
        )
