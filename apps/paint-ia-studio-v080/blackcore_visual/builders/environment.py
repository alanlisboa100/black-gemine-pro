from __future__ import annotations

from PIL import Image

from ..scene_spec import SceneSpec
from ..agents.stroke import StrokeAgent
from .scenario import ScenarioBuilder


class EnvironmentBuilder:
    """v0.8 environment facade.

    The old engine rendered only one sunset-forest composition regardless of the
    prompt. v0.8 resolves a named scenario and uses a deterministic cinematic
    composition grammar. StrokeAgent is kept in the signature for backwards
    compatibility with the renderer/API.
    """

    def __init__(self) -> None:
        self.scenario_builder = ScenarioBuilder()
        self.last_telemetry = {}
        self.last_plan = {}

    def render(self, spec: SceneSpec, stroke: StrokeAgent) -> Image.Image:
        result = self.scenario_builder.render(spec, character_present=False)
        self.last_telemetry = result.telemetry
        self.last_plan = result.plan
        return result.image
