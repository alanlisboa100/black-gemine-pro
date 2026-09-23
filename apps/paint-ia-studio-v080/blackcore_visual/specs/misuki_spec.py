from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SPEC = ROOT / "runtime" / "saza_import" / "BLACKCORE_MISUKI_VISUAL_ENGINE_SPEC_V2.json"
DEFAULT_MEMORY = ROOT / "runtime" / "misuki_core" / "MISUKI_RUNTIME_MEMORY_V4.json"
LEGACY_MEMORY = ROOT / "runtime" / "saza_import" / "BLACKCORE_MISUKI_RUNTIME_MEMORY_V2.txt"


@dataclass
class StageRule:
    id: str
    name: str
    goal: str
    tool: str
    checkpoint: str
    line_width_ratio: float = 0.0025
    max_retries: int = 2


@dataclass
class MisukiRuntimeSpec:
    raw: Dict[str, Any]
    source_path: str
    memory_text: str = ""
    stages: List[StageRule] = field(default_factory=list)

    @classmethod
    def load(cls, path: str | Path | None = None) -> "MisukiRuntimeSpec":
        source = Path(path or DEFAULT_SPEC)
        if not source.exists():
            raise FileNotFoundError(f"Misuki spec ausente: {source}")
        raw = json.loads(source.read_text(encoding="utf-8"))
        if DEFAULT_MEMORY.exists():
            memory = DEFAULT_MEMORY.read_text(encoding="utf-8")
        elif LEGACY_MEMORY.exists():
            memory = LEGACY_MEMORY.read_text(encoding="utf-8")
        else:
            memory = ""

        # Paint pipeline from the machine-readable V2 spec is promoted from passive
        # documentation to an executable stage list.
        raw_stages = ((raw.get("paint_pipeline") or {}).get("stages") or [])
        stage_defaults = {
            "P01": ("guide", "head box and center axis inside safe canvas margins", 0.0016),
            "P02": ("curve", "head contour and horn axes have balanced placement", 0.0024),
            "P03": ("fill", "hair is one smooth mass, never a roof polygon or comb of parallel lines", 0.0026),
            "P04": ("curve", "eyes/nose/mouth sit on canonical face guides", 0.0020),
            "P05": ("curve", "neck, choker and shoulders connect anatomically", 0.0024),
            "P06": ("fill", "outfit has gothic neckline and torso silhouette, not horizontal bars", 0.0028),
            "P07": ("curve", "horn volume tapers from integrated roots to curved tips", 0.0026),
            "P08": ("ink", "line hierarchy is visible: outer > facial > internal detail", 0.0024),
            "P09": ("fill", "black masses preserve face negative space and hair/horn separation", 0.0024),
            "P10": ("shade", "gray separation is sparse and structural", 0.0020),
            "P11": ("detail", "details improve identity without adding noise", 0.0016),
            "P12": ("verify", "thumbnail identity gate passes", 0.0016),
            "P13": ("verify", "fidelity score passes minimum threshold", 0.0016),
            "P14": ("export", "only approved render is exported", 0.0016),
        }
        stages: List[StageRule] = []
        for item in raw_stages:
            sid = str(item.get("id") or "")
            if sid == "P00":
                continue
            tool, checkpoint, width = stage_defaults.get(sid, ("draw", str(item.get("goal") or "stage complete"), 0.0022))
            stages.append(StageRule(
                id=sid,
                name=str(item.get("name") or sid),
                goal=str(item.get("goal") or ""),
                tool=tool,
                checkpoint=checkpoint,
                line_width_ratio=width,
            ))
        if not stages:
            # Safe fallback. This ensures the engine never silently reverts to one-pass drawing.
            stages = [
                StageRule("P01", "canvas_and_guides", "place head and guides", "guide", "guides valid"),
                StageRule("P02", "head_and_horn_axes", "place smooth head and horn axes", "curve", "axes balanced"),
                StageRule("P03", "hair_mass", "block hair as smooth masses", "fill", "hair mass valid"),
                StageRule("P04", "facial_features", "place canonical features", "curve", "features valid"),
                StageRule("P05", "neck_choker_shoulders", "connect neck and shoulders", "curve", "anatomy valid"),
                StageRule("P06", "outfit_block", "block gothic outfit", "fill", "outfit valid"),
                StageRule("P07", "horn_volume", "build tapered horn volumes", "curve", "horns valid"),
                StageRule("P08", "line_refinement", "refine line hierarchy", "ink", "line hierarchy valid"),
                StageRule("P09", "black_masses", "fill dark masses", "fill", "negative space valid"),
                StageRule("P10", "gray_separation", "separate forms", "shade", "forms readable"),
                StageRule("P11", "details", "add selective details", "detail", "noise controlled"),
                StageRule("P12", "thumbnail_gate", "verify identity", "verify", "identity valid"),
                StageRule("P13", "fidelity_gate", "score fidelity", "verify", "score valid"),
                StageRule("P14", "export", "export approved image", "export", "approved"),
            ]
        return cls(raw=raw, source_path=str(source), memory_text=memory, stages=stages)

    @property
    def hard_constraints(self) -> List[Dict[str, Any]]:
        return list(self.raw.get("hard_constraints") or [])

    @property
    def canonical_identity(self) -> Dict[str, Any]:
        return dict(self.raw.get("canonical_identity") or {})

    def compact_runtime_rules(self) -> Dict[str, Any]:
        memory: Dict[str, Any] = {}
        if self.memory_text.strip():
            try:
                parsed = json.loads(self.memory_text)
                if isinstance(parsed, dict):
                    memory = parsed
            except json.JSONDecodeError:
                memory = {"legacy_text": self.memory_text[:4000]}
        execution = memory.get("execution") if isinstance(memory.get("execution"), dict) else {}
        return {
            "name": "Misuki",
            "signature": self.canonical_identity.get("signature_features", {}),
            "hard_constraints": [x.get("rule") for x in self.hard_constraints],
            "repair_order": execution.get("repair_order") or ["silhouette", "horns", "hair", "face", "outfit", "tone", "detail"],
            "negative_rules": memory.get("negative_rules", []),
            "scene_rules": memory.get("scene_rules", {}),
            "advance_rule": execution.get("advance_rule", "do not approve/export when a critical structural gate fails"),
            "paint_program_rule": execution.get("paint_program"),
            "runtime_memory_version": memory.get("version", "legacy"),
            "stage_count": len(self.stages),
            "source": self.source_path,
        }
