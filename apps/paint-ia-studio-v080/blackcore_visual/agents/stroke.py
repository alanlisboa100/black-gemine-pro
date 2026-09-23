from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Iterable, List, Sequence, Tuple

from PIL import Image, ImageDraw

Point = Tuple[float, float]
RGBA = Tuple[int, int, int, int]


@dataclass
class StrokeProfile:
    width: float = 3.0
    jitter: float = 0.35
    width_variation: float = 0.22
    opacity_variation: float = 0.10
    edge_break: float = 0.08
    repeats: int = 1


class StrokeAgent:
    """Humanizes mathematically-perfect line work.

    The engine keeps the underlying structure deterministic (seeded) while adding
    controlled imperfection: positional jitter, pressure-like width changes,
    occasional edge breaks, and multiple passes.
    """

    def __init__(self, seed: int):
        self.rng = random.Random(seed)

    @staticmethod
    def _cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
        u = 1 - t
        x = u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0]
        y = u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]
        return x, y

    def bezier_points(self, p0: Point, p1: Point, p2: Point, p3: Point, steps: int = 48) -> List[Point]:
        return [self._cubic(p0, p1, p2, p3, i / steps) for i in range(steps + 1)]

    def humanize(self, points: Sequence[Point], jitter_px: float) -> List[Point]:
        if len(points) < 3 or jitter_px <= 0:
            return list(points)
        out: List[Point] = []
        n = len(points)
        for i, (x, y) in enumerate(points):
            # Keep endpoints stable; strongest organic deviation in the middle.
            envelope = math.sin(math.pi * i / max(1, n - 1))
            j = jitter_px * envelope
            out.append((x + self.rng.gauss(0, j), y + self.rng.gauss(0, j)))
        return out

    def draw_polyline(self, layer: Image.Image, points: Sequence[Point], color: RGBA, profile: StrokeProfile) -> None:
        if len(points) < 2:
            return
        base = max(1.0, profile.width)
        for repeat in range(max(1, profile.repeats)):
            pts = self.humanize(points, profile.jitter * base * (0.45 + repeat * 0.12))
            draw = ImageDraw.Draw(layer, "RGBA")
            for i in range(len(pts) - 1):
                if self.rng.random() < profile.edge_break:
                    continue
                phase = math.sin((i / max(1, len(pts)-2)) * math.pi)
                width = base * (1.0 + (self.rng.random()*2-1) * profile.width_variation * (0.5 + 0.5*phase))
                alpha = int(color[3] * (1.0 - self.rng.random() * profile.opacity_variation))
                draw.line([pts[i], pts[i+1]], fill=(*color[:3], max(15, alpha)), width=max(1, int(round(width))))

    def draw_bezier(self, layer: Image.Image, p0: Point, p1: Point, p2: Point, p3: Point, color: RGBA, profile: StrokeProfile, steps: int = 52) -> None:
        self.draw_polyline(layer, self.bezier_points(p0, p1, p2, p3, steps), color, profile)
