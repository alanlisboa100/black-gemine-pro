from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List


@dataclass
class StageCheck:
    stage_id: str
    passed: bool
    score: float
    warnings: List[str]
    repair: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class StageCritic:
    """Geometry-aware checkpoint critic for the Misuki procedural pipeline.

    The previous critic only measured whole-image contrast/symmetry/edge density.
    That was able to rate a visually poor Misuki render ~98/100 because it did not
    know what Misuki was. This critic consumes builder telemetry and enforces
    canonical structural constraints before the next stage is allowed to pass.
    """

    def check(self, stage_id: str, telemetry: Dict[str, Any]) -> StageCheck:
        warnings: List[str] = []
        repair: List[str] = []
        score = 100.0

        def penalize(points: float, warning: str, action: str) -> None:
            nonlocal score
            score -= points
            warnings.append(warning)
            repair.append(action)

        if stage_id in {"P01", "P02"}:
            face_ratio = float(telemetry.get("face_width_height_ratio", 0.72))
            if not 0.62 <= face_ratio <= 0.82:
                penalize(35, "proporção do rosto fora da faixa canônica", "reconstruir cabeça com oval/curvas suaves antes de continuar")
            top_flatness = float(telemetry.get("hair_top_flatness", 0.0))
            if top_flatness > 0.20:
                penalize(45, "topo do cabelo/cabeça excessivamente reto", "remover telhado/polígono e reconstruir o topo com arco contínuo")

        if stage_id in {"P03", "P08", "P09", "P12", "P13"}:
            strands = int(telemetry.get("parallel_hair_lines", 0))
            if strands > 16:
                penalize(35, "cabelo com linhas paralelas demais", "reduzir fios; usar massas preenchidas + poucas mechas estruturais")
            hair_mass = float(telemetry.get("hair_mass_ratio", 0.0))
            if hair_mass < 0.20:
                penalize(25, "massa de cabelo insuficiente", "aumentar massa lateral e traseira do cabelo")
            if stage_id in {"P08", "P12", "P13"}:
                fringe_count = int(telemetry.get("fringe_major_locks", 0))
                if not 3 <= fringe_count <= 7:
                    penalize(18, "franja fora de 3-7 mechas principais", "reconstruir franja em grupos maiores e menos numerosos")

        if stage_id in {"P04", "P12", "P13"}:
            eye_ratio = float(telemetry.get("eye_width_face_ratio", 0.0))
            if not 0.18 <= eye_ratio <= 0.29:
                penalize(24, "olhos fora da faixa anime canônica", "redimensionar olhos antes de detalhes")
            eye_spacing = float(telemetry.get("eye_spacing_eye_width", 0.0))
            if not 0.65 <= eye_spacing <= 1.35:
                penalize(18, "espaçamento dos olhos inconsistente", "reposicionar olhos com cerca de 1 largura de olho entre eles")
            chin = float(telemetry.get("chin_taper", 0.0))
            if not 0.55 <= chin <= 0.82:
                penalize(18, "queixo/mandíbula fora da faixa delicada", "afinar mandíbula sem criar queixo longo")

        if stage_id in {"P02", "P07", "P12", "P13"}:
            horn_count = int(telemetry.get("horn_count", 0))
            if horn_count != 2:
                penalize(60, "quantidade de chifres inválida", "usar exatamente dois chifres por padrão")
            # P02 only validates count/placement intent. Volume/taper do not exist yet.
            if stage_id in {"P07", "P12", "P13"}:
                horn_root = float(telemetry.get("horn_root_integration", 0.0))
                if horn_root < 0.75:
                    penalize(30, "chifres parecem desconectados do crânio", "integrar raízes dos chifres ao cabelo/cabeça")
                horn_taper = float(telemetry.get("horn_taper_score", 0.0))
                if horn_taper < 0.75:
                    penalize(22, "chifres sem afunilamento suficiente", "engrossar base e afinar ponta progressivamente")

        if stage_id in {"P05", "P06", "P12", "P13"}:
            torso_rect = float(telemetry.get("torso_rectangularity", 0.0))
            if torso_rect > 0.35:
                penalize(32, "torso/roupa excessivamente retangular", "criar ombros, cintura e decote; remover bloco retangular")
            bar_count = int(telemetry.get("horizontal_outfit_bars", 0))
            if bar_count > 1:
                penalize(28, "roupa representada por barras horizontais", "trocar barras por choker, costuras, renda, tiras e fivelas anatômicas")

        if stage_id in {"P10", "P12", "P13"}:
            face_space = float(telemetry.get("face_negative_space", 0.0))
            if face_space < 0.65:
                penalize(25, "rosto sem espaço negativo suficiente", "limpar mechas/pretos que invadem a leitura facial")
            horn_sep = float(telemetry.get("horn_hair_separation", 0.0))
            if horn_sep < 0.55:
                penalize(18, "chifres se fundem com cabelo", "adicionar contorno/rim light/corte de espaço negativo")

        score = max(0.0, min(100.0, score))
        # Structural stages are stricter than decorative stages.
        threshold = 82.0 if stage_id not in {"P11", "P14"} else 75.0
        return StageCheck(stage_id=stage_id, passed=score >= threshold, score=round(score, 1), warnings=warnings, repair=repair)

    def final_fidelity(self, telemetry: Dict[str, Any], stage_checks: List[Dict[str, Any]]) -> Dict[str, Any]:
        weights = {
            "silhouette": 20,
            "horns": 20,
            "hair": 20,
            "face_eyes": 15,
            "outfit": 10,
            "tonal": 5,
            "accessories": 5,
            "expression": 5,
        }

        # Start at 100 for each component and reduce only on observable telemetry failures.
        comp = {k: 100.0 for k in weights}
        if float(telemetry.get("hair_top_flatness", 0)) > 0.20:
            comp["silhouette"] -= 45
        if float(telemetry.get("torso_rectangularity", 0)) > 0.35:
            comp["silhouette"] -= 25
        if int(telemetry.get("horn_count", 0)) != 2:
            comp["horns"] = 0
        comp["horns"] -= max(0, 0.80 - float(telemetry.get("horn_root_integration", 0))) * 100
        comp["horns"] -= max(0, 0.82 - float(telemetry.get("horn_taper_score", 0))) * 80
        if int(telemetry.get("parallel_hair_lines", 0)) > 16:
            comp["hair"] -= 45
        if float(telemetry.get("hair_mass_ratio", 0)) < 0.20:
            comp["hair"] -= 35
        if not 3 <= int(telemetry.get("fringe_major_locks", 0)) <= 7:
            comp["hair"] -= 25
        eye_ratio = float(telemetry.get("eye_width_face_ratio", 0))
        if not 0.18 <= eye_ratio <= 0.29:
            comp["face_eyes"] -= 40
        if float(telemetry.get("torso_rectangularity", 0)) > 0.35:
            comp["outfit"] -= 45
        if int(telemetry.get("horizontal_outfit_bars", 0)) > 1:
            comp["outfit"] -= 35
        if float(telemetry.get("face_negative_space", 0)) < 0.65:
            comp["tonal"] -= 45
        if float(telemetry.get("horn_hair_separation", 0)) < 0.55:
            comp["tonal"] -= 25
        if not telemetry.get("has_choker", False):
            comp["accessories"] -= 40
        if not telemetry.get("has_gothic_detail", False):
            comp["accessories"] -= 35

        for k in comp:
            comp[k] = max(0.0, min(100.0, comp[k]))
        raw_total = sum(comp[k] * weights[k] / 100.0 for k in weights)
        # This score is a structural proxy, not semantic image similarity. Cap it at 90
        # until a true reference-aware visual model is connected. This avoids the old
        # false-confidence bug where crude renders were reported as ~98/100.
        total = min(90.0, raw_total)
        critical_fail = any((not x.get("passed", True)) and x.get("stage_id") in {"P02","P03","P04","P06","P07","P12","P13"} for x in stage_checks)
        approved = total >= 82.0 and not critical_fail
        return {
            "score": round(total, 1),
            "approved": approved,
            "score_type": "structural_geometry_proxy",
            "reference_similarity": None,
            "reference_similarity_status": "requires_reference_aware_visual_model",
            "components": {k: round(v, 1) for k, v in comp.items()},
            "threshold": 82.0,
            "critical_failure": critical_fail,
        }
