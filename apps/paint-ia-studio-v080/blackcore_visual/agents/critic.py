from __future__ import annotations

from typing import Any, Dict, List

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat


class CriticAgent:
    """Cheap visual critic used for diagnostics and conservative post-processing."""

    def analyze(self, image: Image.Image, mode: str = "character") -> Dict[str, Any]:
        rgb = image.convert("RGB")
        small = rgb.resize((192, 192))
        stat = ImageStat.Stat(small)
        means = stat.mean
        stds = stat.stddev
        luminance = sum(means) / 3.0
        contrast = sum(stds) / 3.0

        mirror = small.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        diff = ImageChops.difference(small, mirror)
        symmetry_error = sum(ImageStat.Stat(diff).mean) / (3.0 * 255.0)
        symmetry = max(0.0, 1.0 - symmetry_error)

        edges = small.convert("L").filter(ImageFilter.FIND_EDGES)
        edge_mean = ImageStat.Stat(edges).mean[0] / 255.0

        warnings: List[str] = []
        if mode == "character" and symmetry > 0.93:
            warnings.append("simetria muito alta; introduzir micro-assimetria em cabelo, olhos ou pose")
        if contrast < 28:
            warnings.append("contraste global baixo; reforçar separação entre planos")
        if luminance < 34:
            warnings.append("imagem muito escura; preservar detalhes em sombras")
        if edge_mean > 0.20:
            warnings.append("densidade de bordas alta; reduzir ruído/repetição de linhas")

        quality = 100.0
        quality -= max(0.0, (0.94 - symmetry) * -60) if mode == "character" else 0
        quality -= max(0.0, 28 - contrast) * 0.45
        quality -= max(0.0, edge_mean - 0.18) * 100
        quality = max(0.0, min(100.0, quality))

        return {
            "luminance": round(luminance, 2),
            "contrast": round(contrast, 2),
            "symmetry": round(symmetry, 3),
            "edge_density": round(edge_mean, 3),
            "technical_score": round(quality, 1),
            "warnings": warnings,
        }

    def polish(self, image: Image.Image, report: Dict[str, Any]) -> Image.Image:
        out = image.convert("RGBA")
        if report.get("contrast", 40) < 30:
            out = ImageEnhance.Contrast(out).enhance(1.08)
        # Unsharp mask is conservative and CPU-friendly.
        out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=65, threshold=4))
        return out
