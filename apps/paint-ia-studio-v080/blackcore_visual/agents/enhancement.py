from __future__ import annotations

import math
from typing import Any, Dict, Tuple

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


class EnhancementAgent:
    """Executes an explicit photo-adjustment plan with conservative Pillow ops."""

    @staticmethod
    def _preserve_alpha(original: Image.Image, rgb: Image.Image) -> Image.Image:
        if "A" not in original.getbands():
            return rgb.convert("RGBA")
        alpha = original.getchannel("A")
        out = rgb.convert("RGBA")
        out.putalpha(alpha.resize(out.size))
        return out

    @staticmethod
    def _white_balance(rgb: Image.Image, gains: Tuple[float, float, float]) -> Image.Image:
        channels = rgb.split()
        corrected = []
        for ch, gain in zip(channels, gains):
            lut = [max(0, min(255, int(i * gain))) for i in range(256)]
            corrected.append(ch.point(lut))
        return Image.merge("RGB", corrected)

    @staticmethod
    def _tone_curve(rgb: Image.Image, shadow_lift: float, highlight_compress: float) -> Image.Image:
        # Monotonic channel LUT. Small shadow lift plus soft shoulder for highlights.
        shadow_lift = max(0.0, min(0.35, shadow_lift))
        highlight_compress = max(0.0, min(0.30, highlight_compress))
        lut = []
        for i in range(256):
            x = i / 255.0
            lifted = x + shadow_lift * (1.0 - x) * math.exp(-3.2 * x)
            shoulder = lifted - highlight_compress * max(0.0, lifted - 0.72) ** 2 * 1.8
            lut.append(max(0, min(255, int(round(shoulder * 255.0)))))
        return rgb.point(lut * 3)

    def apply(self, image: Image.Image, plan: Dict[str, Any]) -> Image.Image:
        source = image.convert("RGBA")
        rgb = source.convert("RGB")

        gains = tuple(float(x) for x in plan.get("white_balance_gains", (1.0, 1.0, 1.0)))
        rgb = self._white_balance(rgb, gains)

        if plan.get("denoise_radius", 0) >= 1:
            size = 3 if int(plan.get("denoise_radius", 1)) <= 1 else 5
            rgb = rgb.filter(ImageFilter.MedianFilter(size=size))

        rgb = self._tone_curve(
            rgb,
            float(plan.get("shadow_lift", 0.0)),
            float(plan.get("highlight_compress", 0.0)),
        )

        ev = float(plan.get("exposure_ev", 0.0))
        if abs(ev) > 0.005:
            rgb = ImageEnhance.Brightness(rgb).enhance(2.0 ** ev)

        autocontrast = float(plan.get("autocontrast_blend", 0.0))
        if autocontrast > 0.0:
            auto = ImageOps.autocontrast(rgb, cutoff=(0.35, 0.35), preserve_tone=True)
            rgb = Image.blend(rgb, auto, max(0.0, min(0.65, autocontrast)))

        contrast = float(plan.get("contrast_factor", 1.0))
        if abs(contrast - 1.0) > 0.005:
            rgb = ImageEnhance.Contrast(rgb).enhance(contrast)

        saturation = float(plan.get("saturation_factor", 1.0))
        if abs(saturation - 1.0) > 0.005:
            rgb = ImageEnhance.Color(rgb).enhance(saturation)

        sharpen = int(plan.get("sharpen_percent", 0))
        if sharpen > 0:
            radius = float(plan.get("sharpen_radius", 1.25))
            threshold = int(plan.get("sharpen_threshold", 4))
            rgb = rgb.filter(ImageFilter.UnsharpMask(radius=radius, percent=sharpen, threshold=threshold))

        return self._preserve_alpha(source, rgb)
