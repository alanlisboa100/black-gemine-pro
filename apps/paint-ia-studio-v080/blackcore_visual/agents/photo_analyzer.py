from __future__ import annotations

from typing import Any, Dict, List, Tuple

from PIL import Image, ImageChops, ImageFilter, ImageStat


class PhotoAnalyzerAgent:
    """Fast content-agnostic photo diagnostics using Pillow only.

    It does not pretend to recognize identities or semantic objects. It measures
    exposure, clipping, contrast, saturation, color cast, sharpness and noise so the
    editor can choose conservative corrections automatically on CPU/Termux.
    """

    @staticmethod
    def _percentile(hist: List[int], pct: float) -> int:
        total = max(1, sum(hist))
        target = total * pct
        acc = 0
        for i, count in enumerate(hist):
            acc += count
            if acc >= target:
                return i
        return 255

    def analyze(self, image: Image.Image) -> Dict[str, Any]:
        rgb = image.convert("RGB")
        # Metrics are calculated on a bounded preview for predictable CPU cost.
        preview = rgb.copy()
        preview.thumbnail((640, 640), Image.Resampling.LANCZOS)
        gray = preview.convert("L")
        hist = gray.histogram()
        stat = ImageStat.Stat(preview)
        gstat = ImageStat.Stat(gray)

        means = stat.mean[:3]
        luminance = float(gstat.mean[0])
        contrast = float(gstat.stddev[0])
        p05 = self._percentile(hist, 0.05)
        p95 = self._percentile(hist, 0.95)
        dynamic_range = float(p95 - p05)
        total = max(1, sum(hist))
        shadow_clip = sum(hist[:6]) / total
        highlight_clip = sum(hist[250:]) / total
        deep_shadows = sum(hist[:35]) / total
        bright_highlights = sum(hist[220:]) / total

        hsv = preview.convert("HSV")
        sat_mean = float(ImageStat.Stat(hsv.getchannel("S")).mean[0])

        # Sharpness proxy: mean high-frequency edge magnitude.
        edges = gray.filter(ImageFilter.FIND_EDGES)
        sharpness = float(ImageStat.Stat(edges).mean[0])

        # Noise proxy: residual against a small median filter. High-frequency details
        # also contribute, so this is used conservatively.
        median = gray.filter(ImageFilter.MedianFilter(size=3))
        diff = ImageStat.Stat(ImageChops.difference(gray, median)).mean[0]
        noise = float(diff)

        avg = sum(means) / 3.0
        cast = {
            "red": round(means[0] - avg, 2),
            "green": round(means[1] - avg, 2),
            "blue": round(means[2] - avg, 2),
        }
        cast_strength = max(means) - min(means)

        warnings: List[str] = []
        recommendations: List[str] = []
        if luminance < 72:
            warnings.append("imagem escura")
            recommendations.append("elevar exposição e sombras com proteção de altas luzes")
        elif luminance > 188:
            warnings.append("imagem clara demais")
            recommendations.append("reduzir exposição preservando médios tons")
        if shadow_clip > 0.025:
            warnings.append("pretos clipados")
        if highlight_clip > 0.018:
            warnings.append("altas luzes clipadas")
        if contrast < 31:
            recommendations.append("aumentar contraste local/global de forma moderada")
        if dynamic_range < 105:
            recommendations.append("expandir faixa tonal")
        if sat_mean < 42:
            recommendations.append("recuperar saturação levemente")
        elif sat_mean > 145:
            recommendations.append("reduzir saturação para evitar cores estouradas")
        if cast_strength > 32:
            recommendations.append("corrigir dominante de cor com balanço de branco limitado")
        if noise > 12:
            recommendations.append("reduzir ruído antes de aplicar nitidez")
        elif sharpness < 14:
            recommendations.append("aplicar nitidez seletiva leve")

        # Technical quality score is intentionally diagnostic, not an aesthetic rating.
        score = 100.0
        score -= min(22.0, abs(luminance - 125.0) * 0.18)
        score -= min(15.0, max(0.0, 32.0 - contrast) * 0.45)
        score -= min(18.0, shadow_clip * 350.0 + highlight_clip * 420.0)
        score -= min(12.0, max(0.0, noise - 10.0) * 0.7)
        score -= min(8.0, max(0.0, 12.0 - sharpness) * 0.35)
        score = max(0.0, min(100.0, score))

        return {
            "width": image.width,
            "height": image.height,
            "luminance": round(luminance, 2),
            "contrast": round(contrast, 2),
            "dynamic_range": round(dynamic_range, 2),
            "saturation": round(sat_mean, 2),
            "sharpness": round(sharpness, 2),
            "noise": round(noise, 2),
            "shadow_clip": round(shadow_clip, 4),
            "highlight_clip": round(highlight_clip, 4),
            "deep_shadows": round(deep_shadows, 4),
            "bright_highlights": round(bright_highlights, 4),
            "channel_means": {"r": round(means[0], 2), "g": round(means[1], 2), "b": round(means[2], 2)},
            "color_cast": cast,
            "color_cast_strength": round(cast_strength, 2),
            "technical_score": round(score, 1),
            "warnings": warnings,
            "recommendations": recommendations,
        }
