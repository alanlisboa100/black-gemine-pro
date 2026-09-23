from __future__ import annotations

import hashlib
from typing import Any, Dict

from ..scene_spec import SceneSpec
from ..presets import resolve_preset
from ..scenarios import resolve_scenario, scenario_plan


class DirectorAgent:
    """Deterministic local director for character/environment construction.

    v0.8 expands the old prompt classifier into a scene/composition director. It
    intentionally remains local and cheap: no cloud model is required. The goal is
    to convert free-form text into an executable SceneSpec plus a machine-readable
    scenario plan that downstream builders can follow.
    """

    CHARACTER_WORDS = (
        "girl", "garota", "mulher", "character", "personagem", "anime", "horn", "chifre",
        "rosto", "face", "misuki", "retrato", "portrait",
    )
    ENV_WORDS = (
        "landscape", "paisagem", "mountain", "montanha", "forest", "floresta", "city",
        "cidade", "environment", "cenário", "cenario", "room", "quarto", "cathedral", "catedral",
        "library", "biblioteca", "garden", "jardim", "balcony", "varanda", "lab", "laboratório",
        "laboratorio", "throne", "trono",
    )
    MISUKI_WORDS = (
        "misuki", "minha personagem", "blackcore girl", "personagem blackcore",
        "personagem da blackcore", "minha garota", "minha personagem gótica", "minha personagem gotica",
    )

    def analyze(self, payload: Dict[str, Any]) -> SceneSpec:
        prompt = str(payload.get("prompt") or "personagem gótica anime com cabelo longo e atmosfera cinematográfica")
        lower = prompt.lower()
        requested_mode = str(payload.get("mode") or "auto").lower()

        if requested_mode == "auto":
            env_hits = sum(w in lower for w in self.ENV_WORDS)
            char_hits = sum(w in lower for w in self.CHARACTER_WORDS)
            # A prompt may contain both character and scenario. Character stays the
            # primary mode when a person/Misuki is explicitly requested; scenario is
            # then rendered as a background rather than replacing the subject.
            mode = "character" if char_hits >= env_hits or any(k in lower for k in self.MISUKI_WORDS) else "environment"
        else:
            mode = requested_mode if requested_mode in {"character", "environment"} else "character"

        preset_name, preset_cfg = resolve_preset(payload.get("preset"))
        width = max(256, min(int(payload.get("width") or 1024), 2048))
        height = max(256, min(int(payload.get("height") or 1024), 2048))

        seed = payload.get("seed")
        if seed in (None, "", 0, "0"):
            digest = hashlib.sha256((prompt + preset_name).encode("utf-8")).digest()
            seed = int.from_bytes(digest[:4], "big")
        seed = int(seed) & 0xFFFFFFFF

        mood = "dark_elegant"
        if any(k in lower for k in ("soft", "fofo", "fofa", "cute", "delicado", "pastel")):
            mood = "soft_delicate"
        if any(k in lower for k in ("horror", "terror", "sinistro", "evil", "sombrio pesado")):
            mood = "ominous"
        if any(k in lower for k in ("retro", "paint 90", "90s", "pixel")):
            mood = "retro_art"
        if any(k in lower for k in ("cinematic", "cinematográfico", "cinematografico", "filme")):
            mood = "cinematic_dark"

        framing = "portrait"
        if any(k in lower for k in ("full body", "corpo inteiro", "inteiro", "em pé", "em pe", "braços", "pernas", "dos pés", "dos pes")):
            framing = "full_body"
        elif any(k in lower for k in ("close", "close-up", "rosto", "face", "busto")):
            framing = "close_up"
        elif any(k in lower for k in ("meio corpo", "half body", "waist-up", "cintura")):
            framing = "half_body"

        pose = "front_portrait"
        if any(k in lower for k in ("tilted", "inclinada", "inclinado", "cabeça inclinada", "cabeca inclinada")):
            pose = "head_tilt"
        elif any(k in lower for k in ("sentada", "seated", "sitting")):
            pose = "seated_relaxed"
        elif any(k in lower for k in ("perfil", "profile", "side view")):
            pose = "profile"
        elif any(k in lower for k in ("3/4", "three quarter", "três quartos", "tres quartos")):
            pose = "three_quarter"

        camera_angle = "eye_level"
        if any(k in lower for k in ("low angle", "ângulo baixo", "angulo baixo", "de baixo")):
            camera_angle = "slight_low_angle"
        elif any(k in lower for k in ("high angle", "ângulo alto", "angulo alto", "de cima")):
            camera_angle = "slight_high_angle"

        palette_hint = "black_red"
        if any(k in lower for k in ("preto e branco", "black and white", "b&w", "monocrom", "grayscale", "cinza")):
            palette_hint = "monochrome"
        elif any(k in lower for k in ("cyan", "ciano", "turquoise", "turquesa")):
            palette_hint = "black_cyan"
        elif any(k in lower for k in ("pink", "rosa", "lilac", "lilás", "lilas")):
            palette_hint = "pastel_pink_lilac"

        detail = float(payload.get("detail_level") or 0.80)
        detail = max(0.20, min(detail, 1.0))
        asym = float(payload.get("asymmetry") or preset_cfg.get("asymmetry", 0.16))
        asym = max(0.0, min(asym, 0.45))
        scene_strength = float(payload.get("scene_strength") or 0.65)
        scene_strength = max(0.0, min(scene_strength, 1.0))

        requested_profile = str(payload.get("character_profile") or "auto").lower()
        if requested_profile == "misuki":
            character_profile = "misuki"
        elif any(k in lower for k in self.MISUKI_WORDS):
            character_profile = "misuki"
        elif mode == "character" and ("chifre" in lower or "horn" in lower) and ("gótic" in lower or "gothic" in lower) and ("cabelo longo" in lower or "long hair" in lower):
            character_profile = "misuki"
        else:
            character_profile = "generic"

        scenario = resolve_scenario(prompt, str(payload.get("scenario") or "auto"))
        # If the prompt contains no scene cues and the user did not ask for a
        # scenario, minimal studio is deliberately chosen to protect the subject.
        has_scene_cue = any(w in lower for w in self.ENV_WORDS)
        if mode == "character" and not has_scene_cue and str(payload.get("scenario") or "auto").lower() == "auto":
            scenario = resolve_scenario("minimal studio", "minimal_studio")

        lighting = scenario.lighting
        if any(k in lower for k in ("backlight", "contraluz")):
            lighting = "strong_backlight_with_face_fill"
        elif any(k in lower for k in ("soft light", "luz suave")):
            lighting = "soft_diffused_key"
        elif any(k in lower for k in ("dramatic light", "luz dramática", "luz dramatica")):
            lighting = "dramatic_key_plus_rim"

        sp = scenario_plan(scenario, character_present=(mode == "character"))

        return SceneSpec(
            prompt=prompt,
            mode=mode,
            preset=preset_name,
            width=width,
            height=height,
            seed=seed,
            subject="gothic_anime_character" if mode == "character" else "procedural_environment",
            mood=mood,
            framing=framing,
            palette_hint=palette_hint,
            detail_level=detail,
            asymmetry=asym,
            background_type=scenario.id,
            pose=pose,
            scenario=scenario.id,
            camera_angle=camera_angle,
            lighting=lighting,
            composition=scenario.composition,
            scene_strength=scene_strength,
            extras={
                "preset": preset_cfg,
                "character_profile": character_profile,
                "scenario_profile": scenario.to_dict(),
                "scenario_plan": sp,
            },
        )
