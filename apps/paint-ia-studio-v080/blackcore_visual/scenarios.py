from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, Iterable, List, Tuple


@dataclass(frozen=True)
class ScenarioProfile:
    id: str
    label: str
    keywords: Tuple[str, ...]
    mood: str
    composition: str
    camera: str
    lighting: str
    palette: Tuple[str, ...]
    depth_planes: Tuple[str, ...]
    props: Tuple[str, ...]
    foreground: Tuple[str, ...]
    atmosphere: Tuple[str, ...]
    avoid: Tuple[str, ...]
    subject_clearance: float = 0.42

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


SCENARIOS: Dict[str, ScenarioProfile] = {
    "rainbow_3d_cubes": ScenarioProfile(
        id="rainbow_3d_cubes",
        label="Cubos 3D Arco-Íris & Cenário Maravilhoso",
        keywords=(
            "cubo", "cubos", "cubos 3d", "cubo 3d", "arco-iris", "arco iris", "rainbow",
            "cubos arco iris", "3d rainbow cubes", "rainbow cubes", "cenario maravilhoso", "cenário maravilhoso"
        ),
        mood="rainbow_3d_glowing",
        composition="3d floating isometric rainbow cubes in glowing cosmic perspective with reflective floor and rainbow rays",
        camera="perspective wide 3d view, low angle tilt",
        lighting="vibrant multi-color rainbow volumetric glow + specular edge reflections",
        palette=("#080512", "#1A0A2E", "#FF0055", "#FFCC00", "#00FFCC"),
        depth_planes=("cosmic nebula grid", "distant floating mini rainbow cubes", "main 3d rainbow cube constellation", "light beams & sparkles", "reflective floor"),
        props=("floating isometric 3d cubes", "glowing rainbow facet faces", "neon edge outlines", "volumetric rainbow light shafts", "reflective glass floor"),
        foreground=("floating rainbow crystal motes", "soft prismatic bloom"),
        atmosphere=("volumetric rainbow god rays", "floating rainbow dust", "glass floor reflections"),
        avoid=("flat 2d squares", "dull colors"),
        subject_clearance=0.45,
    ),
    "minimal_studio": ScenarioProfile(
        id="minimal_studio",
        label="Minimal Studio",
        keywords=("studio", "fundo simples", "background simple", "minimal", "clean"),
        mood="clean_dark_elegant",
        composition="centered portrait with large negative space around face",
        camera="portrait 50mm equivalent, eye level",
        lighting="soft key from upper-left + faint rim",
        palette=("#F7F7F7", "#D9D9DD", "#17171B", "#050506"),
        depth_planes=("soft gradient wall", "subject", "subtle vignette"),
        props=(),
        foreground=(),
        atmosphere=("very soft grain",),
        avoid=("busy background", "high contrast behind face"),
        subject_clearance=0.58,
    ),
    "gothic_bedroom": ScenarioProfile(
        id="gothic_bedroom",
        label="Gothic Bedroom",
        keywords=("quarto", "bedroom", "cama", "bed", "gothic room", "quarto gótico", "quarto gotico"),
        mood="intimate_gothic",
        composition="subject centered or rule-of-thirds beside a tall window; bed and drapery frame the lower scene",
        camera="portrait or half-body, slightly low eye-level",
        lighting="window backlight + warm candle accents + soft face key",
        palette=("#0A0A0E", "#222029", "#6D2636", "#B98A74", "#E8E2E2"),
        depth_planes=("window/moon", "curtains and wall panels", "bed/headboard", "subject", "foreground fabric/roses"),
        props=("tall window", "heavy curtains", "ornate headboard", "candles", "small gothic mirror", "red crystal ornament"),
        foreground=("dark fabric folds", "few rose petals"),
        atmosphere=("dust motes", "soft bloom", "gentle vignette"),
        avoid=("modern bright bedroom", "flat empty wall", "objects crossing face"),
    ),
    "moonlit_cathedral": ScenarioProfile(
        id="moonlit_cathedral",
        label="Moonlit Cathedral",
        keywords=("cathedral", "catedral", "igreja gótica", "gothic cathedral", "vitrais", "stained glass"),
        mood="sacred_dark_cinematic",
        composition="strong vertical arches; subject at center aisle or slightly off-center; converging perspective guides to face",
        camera="medium portrait with mild low angle",
        lighting="cold moon shaft + dim stained-glass bounce + narrow rim",
        palette=("#08090E", "#171925", "#4D536B", "#8D1F34", "#E7E8ED"),
        depth_planes=("rose window", "arches/columns", "altar or aisle", "subject", "foreground candles"),
        props=("pointed arches", "stained glass", "stone columns", "candles", "ornamental altar"),
        foreground=("blurred candle silhouettes",),
        atmosphere=("volumetric light", "floating dust", "thin floor mist"),
        avoid=("bright daytime church", "dense ornament directly behind face"),
    ),
    "cyber_rain_city": ScenarioProfile(
        id="cyber_rain_city",
        label="Cyber Rain City",
        keywords=("cyber", "cyberpunk", "cidade", "city", "neon city", "chuva", "rain", "rua neon"),
        mood="neon_noir",
        composition="subject foreground; perspective street recedes diagonally; signs pushed to side thirds",
        camera="waist-up or full-body, 35-50mm equivalent",
        lighting="cyan/red neon rim + soft frontal fill + wet-ground reflections",
        palette=("#05070A", "#0E1B22", "#0B6D7C", "#B41736", "#E9F2F4"),
        depth_planes=("distant towers", "mid street/signs", "subject", "foreground rain/reflection"),
        props=("neon panels", "cables", "wet street", "distant towers", "small holographic symbols"),
        foreground=("rain streaks", "wet reflection streaks"),
        atmosphere=("rain", "mist", "neon bloom"),
        avoid=("text-heavy signs", "neon over face", "random rainbow palette"),
    ),
    "occult_library": ScenarioProfile(
        id="occult_library",
        label="Occult Library",
        keywords=("biblioteca", "library", "livros", "books", "occult", "oculto", "grimório", "grimoire"),
        mood="mysterious_scholarly",
        composition="bookshelves frame both sides; arch/window behind; subject clear in center",
        camera="seated or half-body portrait, eye level",
        lighting="warm candle key + cool window rim",
        palette=("#080808", "#1D1717", "#4B332B", "#7F2437", "#E7DDD0"),
        depth_planes=("arched window", "bookshelves", "desk/chair", "subject", "foreground books/candle"),
        props=("bookshelves", "old books", "candle", "small crystal", "ornate desk", "subtle geometric sigil"),
        foreground=("book edge", "candle blur"),
        atmosphere=("dust motes", "thin smoke", "warm pool of light"),
        avoid=("giant readable occult text", "clutter covering silhouette"),
    ),
    "dark_rose_garden": ScenarioProfile(
        id="dark_rose_garden",
        label="Dark Rose Garden",
        keywords=("rose", "roses", "rosa", "rosas", "garden", "jardim", "jardim gótico", "gothic garden"),
        mood="romantic_dark",
        composition="arched garden frame with subject in open center; roses concentrated on outer thirds",
        camera="portrait or seated full-body",
        lighting="moonlight + soft red bounce from roses",
        palette=("#070A08", "#172019", "#4A1723", "#891D34", "#E8E6E0"),
        depth_planes=("moon/clouds", "hedges/arch", "subject", "foreground roses"),
        props=("stone arch", "dark roses", "ivy", "small lanterns", "stone bench"),
        foreground=("rose silhouettes", "petals"),
        atmosphere=("mist", "firefly-like motes", "moon haze"),
        avoid=("bright cheerful garden", "flowers over face"),
    ),
    "throne_chamber": ScenarioProfile(
        id="throne_chamber",
        label="Black Throne Chamber",
        keywords=("throne", "trono", "palace", "palácio", "palacio", "chamber", "salão", "sala do trono"),
        mood="regal_dark",
        composition="central throne, symmetric columns, subject dominant; floor lines lead inward",
        camera="slightly low angle, 50mm equivalent",
        lighting="high backlight behind throne + narrow side keys",
        palette=("#050506", "#17171B", "#34313A", "#761C2D", "#EFECE8"),
        depth_planes=("back wall/drape", "columns/throne", "subject", "reflective floor foreground"),
        props=("ornate black throne", "tall columns", "dark drapes", "small red crystals", "metal details"),
        foreground=("floor reflection", "shadow vignette"),
        atmosphere=("low haze", "subtle particles"),
        avoid=("overly ornate face background", "flat black blob behind hair"),
    ),
    "neon_lab": ScenarioProfile(
        id="neon_lab",
        label="Neon AI Lab",
        keywords=("laboratório", "laboratorio", "lab", "ai lab", "hologram", "holográfico", "holografico", "terminal"),
        mood="clean_tech_dark",
        composition="subject center-right; panels on side thirds; one clean halo panel behind head",
        camera="waist-up, eye level",
        lighting="cool cyan key + magenta/red rim + dark ambient",
        palette=("#06080A", "#111920", "#147A84", "#8A1C3B", "#E8F2F2"),
        depth_planes=("dark lab wall", "side panels", "subject", "foreground console"),
        props=("holographic panels", "cables", "glass cylinders", "small status lights", "black workstation"),
        foreground=("console edge", "soft glass reflections"),
        atmosphere=("thin haze", "tiny particles", "screen bloom"),
        avoid=("dense UI text", "bright white lab", "panels crossing face"),
    ),
    "moon_balcony": ScenarioProfile(
        id="moon_balcony",
        label="Moon Balcony",
        keywords=("balcony", "varanda", "lua", "moon", "night sky", "céu noturno", "ceu noturno"),
        mood="quiet_melancholic",
        composition="large moon offset from head; railing low; curtains frame sides",
        camera="portrait/full-body, slight upward angle optional",
        lighting="strong moon rim + soft face fill",
        palette=("#05060A", "#101522", "#303B55", "#6F1D31", "#ECEEF5"),
        depth_planes=("moon/clouds", "balcony architecture", "subject", "foreground curtains"),
        props=("ornate railing", "tall curtains", "distant skyline", "small roses"),
        foreground=("curtain edge",),
        atmosphere=("slow clouds", "mist", "moon bloom"),
        avoid=("moon directly behind horns with no separation", "busy skyline"),
    ),
    "forest_shrine": ScenarioProfile(
        id="forest_shrine",
        label="Night Forest Shrine",
        keywords=("forest", "floresta", "shrine", "santuário", "santuario", "torii", "templo", "woods"),
        mood="mystic_night",
        composition="path leading to subject; vertical trees on outer thirds; shrine gate behind",
        camera="full-body or 3/4 body, eye level",
        lighting="moon shafts + lantern warm accents",
        palette=("#050806", "#0E1B13", "#233929", "#772033", "#E3E9E2"),
        depth_planes=("distant moon", "trees/shrine gate", "subject", "foreground foliage"),
        props=("dark trees", "stone path", "lanterns", "simple shrine gate", "moss"),
        foreground=("soft foliage silhouettes",),
        atmosphere=("mist", "fireflies", "light shafts"),
        avoid=("dense leaves over face", "bright daytime green"),
    ),
}

DEFAULT_SCENARIO = SCENARIOS["minimal_studio"]


def resolve_scenario(prompt: str, explicit: str | None = None) -> ScenarioProfile:
    raw = (explicit or "auto").strip().lower().replace("-", "_").replace(" ", "_")
    if raw and raw != "auto" and raw in SCENARIOS:
        return SCENARIOS[raw]
    lower = (prompt or "").lower()
    best: ScenarioProfile | None = None
    best_hits = 0
    for profile in SCENARIOS.values():
        hits = sum(1 for kw in profile.keywords if kw in lower)
        if hits > best_hits:
            best = profile
            best_hits = hits
    return best or DEFAULT_SCENARIO


def scenario_catalog() -> Dict[str, Dict[str, Any]]:
    return {k: v.to_dict() for k, v in SCENARIOS.items()}


def scenario_plan(profile: ScenarioProfile, *, character_present: bool = True) -> Dict[str, Any]:
    safe = profile.subject_clearance if character_present else 0.0
    stages: List[Dict[str, Any]] = [
        {
            "id": "S01",
            "name": "composition_grid",
            "goal": "reserve subject zone and place horizon/major perspective lines",
            "tool": "guide",
            "validation": ["subject zone remains clear", "major lines lead toward subject instead of cutting face"],
        },
        {
            "id": "S02",
            "name": "background_value_mass",
            "goal": "establish large dark/light masses before props",
            "tool": "fill",
            "validation": ["background value contrast behind face stays below subject contrast"],
        },
        {
            "id": "S03",
            "name": "architecture_or_nature",
            "goal": "draw the scenario's large structures in background/midground",
            "tool": "shape/curve",
            "validation": ["no tangent collision with horns", "depth planes remain distinct"],
        },
        {
            "id": "S04",
            "name": "lighting",
            "goal": "add key/rim/glow with one dominant direction",
            "tool": "soft_brush",
            "validation": ["face readability increases", "light direction is coherent"],
        },
        {
            "id": "S05",
            "name": "props",
            "goal": "add only identity-supporting props",
            "tool": "shape/detail",
            "validation": ["props cluster on side thirds", "no high-detail object competes with face"],
        },
        {
            "id": "S06",
            "name": "atmosphere",
            "goal": "add mist/rain/particles/bloom sparingly",
            "tool": "spray/soft_brush",
            "validation": ["atmosphere does not erase silhouette", "foreground effect density is controlled"],
        },
        {
            "id": "S07",
            "name": "foreground_frame",
            "goal": "frame the scene at edges and lower corners",
            "tool": "brush/fill",
            "validation": ["foreground does not cover face", "frame guides eye inward"],
        },
        {
            "id": "S08",
            "name": "scene_gate",
            "goal": "verify subject-background separation and beauty hierarchy",
            "tool": "verify",
            "validation": ["face is first focal point", "horn silhouette remains readable", "scene has foreground/midground/background"],
        },
    ]
    return {
        "scenario": profile.to_dict(),
        "character_present": character_present,
        "subject_clearance_ratio": safe,
        "stages": stages,
        "beauty_rules": [
            "one dominant focal point: the face",
            "large masses before micro-detail",
            "use foreground/midground/background depth",
            "avoid equal detail everywhere",
            "keep one coherent lighting direction",
            "use side thirds for props; keep center face zone clean",
            "contrast peaks at face/eyes, not background",
            "foreground may be darker and softer to frame the subject",
        ],
    }
