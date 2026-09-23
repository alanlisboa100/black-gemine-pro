from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Dict

from PIL import Image

from .agents.director import DirectorAgent
from .agents.stroke import StrokeAgent
from .agents.critic import CriticAgent
from .agents.photo_analyzer import PhotoAnalyzerAgent
from .agents.photo_editor import PhotoEditorAgent
from .builders.character import CharacterBuilder
from .builders.environment import EnvironmentBuilder
from .builders.scenario import ScenarioBuilder
from .builders.misuki import MisukiCheckpointBuilder
from .memory.visual_memory import VisualMemory
from .specs.misuki_spec import MisukiRuntimeSpec
from .paint_program import misuki_paint_program
from .scenarios import scenario_catalog

ROOT = Path(__file__).resolve().parents[1]
MEMORY_DIR = ROOT / "blackcore_visual" / "memory"
MEMORY_DIR.mkdir(parents=True, exist_ok=True)


class VisualEngine:
    VERSION = "0.8.0"

    def __init__(self) -> None:
        self.memory = VisualMemory(MEMORY_DIR)
        self.director = DirectorAgent()
        self.critic = CriticAgent()
        self.photo_analyzer = PhotoAnalyzerAgent()
        self.photo_editor = PhotoEditorAgent(self.memory)
        self.scenario_builder = ScenarioBuilder()
        try:
            self.misuki_spec = MisukiRuntimeSpec.load()
            self.misuki_builder = MisukiCheckpointBuilder(self.misuki_spec)
        except Exception:
            # Generic engine remains functional even if a user removes the optional pack.
            self.misuki_spec = None
            self.misuki_builder = None

    def _safe_filename(self, value: Any, fallback: str) -> str:
        raw = str(value or fallback)
        safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in raw)
        if not safe.lower().endswith(".png"):
            safe += ".png"
        return safe

    def generate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        spec = self.director.analyze(payload)
        out_dir = Path(payload.get("output_dir") or (ROOT / "gallery"))
        out_dir.mkdir(parents=True, exist_ok=True)
        filename = self._safe_filename(payload.get("filename"), f"blackcore_{spec.mode}_{int(time.time())}_{spec.seed}.png")
        path = out_dir / filename

        is_misuki = (
            spec.mode == "character"
            and spec.extras.get("character_profile") == "misuki"
            and self.misuki_builder is not None
        )

        if is_misuki:
            save_stages = bool(payload.get("save_stages", True))
            scene_enabled = bool(payload.get("scene_enabled", True))
            scene_result = self.scenario_builder.render(spec, character_present=True) if scene_enabled else None
            result = self.misuki_builder.render(
                spec, save_stages=save_stages, background=scene_result.image if scene_result else None
            )
            image = result.image
            # Technical critic remains separate from identity fidelity.
            technical = self.critic.analyze(image, spec.mode)
            if payload.get("auto_refine", True):
                image = self.critic.polish(image, technical)
                technical = self.critic.analyze(image, spec.mode)
            export_blocked = not bool(result.fidelity.get("approved"))
            if export_blocked:
                rejected_dir = out_dir / "rejected"
                rejected_dir.mkdir(parents=True, exist_ok=True)
                path = rejected_dir / filename
            image.save(path, "PNG", optimize=True)

            stage_paths = []
            if result.stage_images:
                stage_dir = out_dir / "checkpoints" / Path(filename).stem
                stage_dir.mkdir(parents=True, exist_ok=True)
                for idx, (stage_id, stage_img) in enumerate(result.stage_images, start=1):
                    sp = stage_dir / f"{idx:02d}_{stage_id}.png"
                    stage_img.save(sp, "PNG", optimize=True)
                    stage_paths.append(str(sp))

            paint_program = misuki_paint_program(spec.width, spec.height, scenario_id=spec.scenario)
            program_path = out_dir / f"{Path(filename).stem}_paint_plan.json"
            import json
            program_path.write_text(json.dumps(paint_program, ensure_ascii=False, indent=2), encoding="utf-8")

            record = {
                "timestamp": int(time.time()),
                "engine_version": self.VERSION,
                "scene": spec.to_dict(),
                "critic": technical,
                "fidelity": result.fidelity,
                "checkpoints": result.checkpoints,
                "telemetry": result.telemetry,
                "runtime_rules": result.runtime_rules,
                "scenario_plan": scene_result.plan if scene_result else None,
                "scenario_telemetry": scene_result.telemetry if scene_result else None,
                "export_blocked": export_blocked,
                "blocked_at": result.blocked_at,
                "paint_program": paint_program,
                "paint_program_path": str(program_path),
                "stage_paths": stage_paths,
                "path": str(path),
            }
            self.memory.record_generation(record)
            self.memory.record_event("misuki_fidelity", {
                "score": result.fidelity.get("score"),
                "approved": result.fidelity.get("approved"),
                "components": result.fidelity.get("components"),
                "path": str(path),
            })
            return record

        stroke = StrokeAgent(spec.seed)
        builder = CharacterBuilder() if spec.mode == "character" else EnvironmentBuilder()
        image = builder.render(spec, stroke)
        report = self.critic.analyze(image, spec.mode)
        if payload.get("auto_refine", True):
            image = self.critic.polish(image, report)
            report = self.critic.analyze(image, spec.mode)
        image.save(path, "PNG", optimize=True)

        record = {
            "timestamp": int(time.time()),
            "engine_version": self.VERSION,
            "scene": spec.to_dict(),
            "critic": report,
            "scenario_plan": getattr(builder, "last_plan", None) if spec.mode == "environment" else None,
            "scenario_telemetry": getattr(builder, "last_telemetry", None) if spec.mode == "environment" else None,
            "path": str(path),
        }
        self.memory.record_generation(record)
        return record

    def analyze_image(self, image: Image.Image, mode: str = "character") -> Dict[str, Any]:
        return self.critic.analyze(image, mode)

    def analyze_photo(self, image: Image.Image) -> Dict[str, Any]:
        return self.photo_analyzer.analyze(image)

    def enhance_photo(self, image: Image.Image, profile: str = "auto", strength: float = 1.0) -> Dict[str, Any]:
        return self.photo_editor.enhance(image, profile=profile, strength=strength)

    def memory_status(self) -> Dict[str, Any]:
        out = self.memory.status()
        out["misuki_spec_loaded"] = self.misuki_spec is not None
        out["misuki_spec_source"] = self.misuki_spec.source_path if self.misuki_spec else None
        out["scenario_profiles"] = list(scenario_catalog().keys())
        return out

    def memory_feedback(self, event_id: str, rating: int) -> Dict[str, Any]:
        return self.memory.feedback(event_id, rating)
