from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Tuple

ROOT = Path(__file__).resolve().parents[1]
PRESETS_PATH = ROOT / "presets.json"

_CODE_TO_NAME = {
    "A": "soft_sketch_base",
    "B": "paint_retro_interface",
    "C": "soft_render_delicado",
    "D": "gothic_pastel_fusion",
    "E": "production_polish_light",
    "F": "v06_pro_oil_painting",
}


def _num(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def load_all_presets() -> Dict[str, Dict[str, Any]]:
    data = json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
    return data.get("presets", {})


def resolve_preset(name_or_code: str | None) -> Tuple[str, Dict[str, Any]]:
    presets = load_all_presets()
    raw = (name_or_code or "D").strip()
    name = _CODE_TO_NAME.get(raw.upper(), raw)
    if name not in presets:
        name = "gothic_pastel_fusion" if "gothic_pastel_fusion" in presets else next(iter(presets))
    cfg = dict(presets[name])

    # Backwards compatibility with the original string-based preset file.
    cfg["line_weight"] = _num(cfg.get("line_weight"), 0.55)
    jitter_map = {"low": 0.15, "low_medium": 0.25, "medium": 0.38, "medium_high": 0.52, "high": 0.68}
    j = cfg.get("line_jitter", 0.35)
    cfg["line_jitter"] = jitter_map.get(str(j), _num(j, 0.35))
    hair_map = {"light": 0.38, "medium": 0.56, "high": 0.78, "very_high": 0.92}
    h = cfg.get("hair_complexity", 0.72)
    cfg["hair_complexity"] = hair_map.get(str(h), _num(h, 0.72))
    shadow_map = {"low": 0.25, "medium": 0.50, "high": 0.74, "very_high": 0.88}
    s = cfg.get("shadow_intensity", 0.55)
    cfg["shadow_intensity"] = shadow_map.get(str(s), _num(s, 0.55))
    cfg.setdefault("asymmetry", 0.16)
    cfg.setdefault("grain", 0.12)
    cfg.setdefault("edge_break", 0.10)
    cfg.setdefault("stroke_repeat", 1)
    cfg.setdefault("finish_level", "balanced")
    cfg.setdefault("ui_frame", False)
    return name, cfg
