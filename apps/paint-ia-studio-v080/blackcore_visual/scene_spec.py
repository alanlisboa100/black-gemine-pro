from __future__ import annotations

from dataclasses import dataclass, asdict, field
from typing import Any, Dict


@dataclass
class SceneSpec:
    prompt: str = ""
    mode: str = "character"
    preset: str = "gothic_pastel_fusion"
    width: int = 1024
    height: int = 1024
    seed: int = 42
    subject: str = "gothic_anime_character"
    mood: str = "dark_elegant"
    framing: str = "portrait"
    palette_hint: str = "black_red"
    detail_level: float = 0.78
    asymmetry: float = 0.16
    background_type: str = "minimal_studio"
    pose: str = "front_portrait"
    scenario: str = "minimal_studio"
    camera_angle: str = "eye_level"
    lighting: str = "soft_key_plus_rim"
    composition: str = "subject_first"
    scene_strength: float = 0.65
    extras: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
