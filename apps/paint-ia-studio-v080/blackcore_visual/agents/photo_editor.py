from __future__ import annotations

import copy
from typing import Any, Dict, List, Tuple

from PIL import Image

from .enhancement import EnhancementAgent
from .photo_analyzer import PhotoAnalyzerAgent
from .critic import CriticAgent
from ..memory.visual_memory import VisualMemory


class PhotoEditorAgent:
    """Plans and executes adaptive photo enhancement.

    Auto mode measures the image first, creates a bounded plan, tests several plan
    strengths on a preview, then applies only the best candidate to the full image.
    Shared VisualMemory contributes small biases from successful previous edits.
    """

    def __init__(self, memory: VisualMemory | None = None) -> None:
        self.analyzer = PhotoAnalyzerAgent()
        self.enhancer = EnhancementAgent()
        self.critic = CriticAgent()
        self.memory = memory or VisualMemory()

    @staticmethod
    def _clamp(v: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, v))

    def build_plan(self, metrics: Dict[str, Any], profile: str = "auto", strength: float = 1.0) -> Dict[str, Any]:
        profile = (profile or "auto").lower()
        strength = self._clamp(float(strength), 0.35, 1.5)
        policy = self.memory.photo_policy()

        lum = float(metrics["luminance"])
        contrast = float(metrics["contrast"])
        saturation = float(metrics["saturation"])
        noise = float(metrics["noise"])
        sharpness = float(metrics["sharpness"])
        shadow_clip = float(metrics["shadow_clip"])
        highlight_clip = float(metrics["highlight_clip"])

        target_lum = 124.0
        if profile == "night":
            target_lum = 104.0
        elif profile == "portrait":
            target_lum = 132.0
        elif profile == "artwork":
            target_lum = 120.0

        exposure_ev = self._clamp((target_lum - lum) / 170.0, -0.38, 0.42)
        exposure_ev += float(policy.get("exposure_bias", 0.0))

        contrast_factor = 1.0 + self._clamp((47.0 - contrast) / 120.0, -0.12, 0.22)
        contrast_factor += float(policy.get("contrast_bias", 0.0))

        saturation_target = 82.0 if profile not in {"portrait", "night"} else (72.0 if profile == "portrait" else 68.0)
        saturation_factor = 1.0 + self._clamp((saturation_target - saturation) / 260.0, -0.13, 0.16)
        saturation_factor += float(policy.get("saturation_bias", 0.0))

        means = metrics.get("channel_means") or {"r": 128, "g": 128, "b": 128}
        avg = max(1.0, (float(means["r"]) + float(means["g"]) + float(means["b"])) / 3.0)
        wb_strength = 0.34 if float(metrics.get("color_cast_strength", 0)) > 18 else 0.16
        if profile == "artwork":
            wb_strength *= 0.35  # preserve intentional stylized palettes
        raw_gains = [avg / max(1.0, float(means[c])) for c in ("r", "g", "b")]
        gains = tuple(1.0 + (self._clamp(g, 0.90, 1.10) - 1.0) * wb_strength for g in raw_gains)

        denoise = 1 if noise > 11.5 else 0
        sharpen = 0
        if noise < 15.0:
            sharpen = int(self._clamp((19.0 - sharpness) * 7.0 + 42.0, 35.0, 105.0))
            sharpen += int(policy.get("sharpen_bias", 0.0))
        if profile == "portrait":
            sharpen = int(sharpen * 0.82)
        if profile == "artwork":
            sharpen = int(sharpen * 1.08)

        shadow_lift = self._clamp((88.0 - lum) / 280.0 + shadow_clip * 1.8, 0.0, 0.18)
        highlight_compress = self._clamp(highlight_clip * 2.8 + max(0.0, lum - 175) / 500.0, 0.0, 0.16)
        auto_blend = self._clamp((108.0 - float(metrics.get("dynamic_range", 120))) / 180.0, 0.0, 0.22)

        # Apply user strength around neutral points rather than multiplying all values blindly.
        plan = {
            "profile": profile,
            "strength": round(strength, 3),
            "exposure_ev": round(exposure_ev * strength, 4),
            "contrast_factor": round(1.0 + (contrast_factor - 1.0) * strength, 4),
            "saturation_factor": round(1.0 + (saturation_factor - 1.0) * strength, 4),
            "white_balance_gains": [round(1.0 + (g - 1.0) * strength, 4) for g in gains],
            "shadow_lift": round(shadow_lift * strength, 4),
            "highlight_compress": round(highlight_compress * strength, 4),
            "autocontrast_blend": round(auto_blend * strength, 4),
            "denoise_radius": denoise,
            "sharpen_percent": max(0, int(sharpen * strength)),
            "sharpen_radius": 1.25,
            "sharpen_threshold": 4 if noise < 9 else 6,
            "memory_samples": int(policy.get("sample_count", 0)),
        }
        return plan

    @staticmethod
    def _score(metrics: Dict[str, Any]) -> float:
        # Analyzer score plus extra clipping safeguards.
        return float(metrics.get("technical_score", 0.0)) - float(metrics.get("shadow_clip", 0.0)) * 120.0 - float(metrics.get("highlight_clip", 0.0)) * 150.0

    def enhance(self, image: Image.Image, profile: str = "auto", strength: float = 1.0) -> Dict[str, Any]:
        before = self.analyzer.analyze(image)
        critic_before = self.critic.analyze(image, "photo")
        preview = image.copy()
        preview.thumbnail((640, 640), Image.Resampling.LANCZOS)

        candidates: List[Tuple[float, Dict[str, Any], Dict[str, Any]]] = []
        for multiplier in (0.72, 1.0, 1.22):
            plan = self.build_plan(before, profile=profile, strength=strength * multiplier)
            edited_preview = self.enhancer.apply(preview, plan)
            after_preview = self.analyzer.analyze(edited_preview)
            candidates.append((self._score(after_preview), plan, after_preview))

        before_score = self._score(before)
        candidates.sort(key=lambda x: x[0], reverse=True)
        best_score, best_plan, _ = candidates[0]

        # If all candidates are measurably worse, keep changes minimal instead of blindly editing.
        if best_score < before_score - 1.5:
            best_plan = self.build_plan(before, profile=profile, strength=min(0.45, strength * 0.5))

        output = self.enhancer.apply(image, best_plan)
        after = self.analyzer.analyze(output)
        critic_after = self.critic.analyze(output, "photo")
        quality_delta = round(self._score(after) - before_score, 3)
        event = self.memory.record_event("photo_edit", {
            "profile": profile,
            "before": before,
            "after": after,
            "critic_before": critic_before,
            "critic_after": critic_after,
            "plan": best_plan,
            "quality_delta": quality_delta,
        })
        return {
            "image": output,
            "before": before,
            "after": after,
            "critic_before": critic_before,
            "critic_after": critic_after,
            "plan": best_plan,
            "quality_delta": quality_delta,
            "event_id": event["event_id"],
            "memory": self.memory.status(),
        }
