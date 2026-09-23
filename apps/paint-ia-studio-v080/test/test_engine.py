import hashlib
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from blackcore_visual import VisualEngine
from blackcore_visual.agents.director import DirectorAgent
from blackcore_visual.presets import resolve_preset
from blackcore_visual.agents.photo_analyzer import PhotoAnalyzerAgent
from blackcore_visual.agents.photo_editor import PhotoEditorAgent
from blackcore_visual.memory.visual_memory import VisualMemory

from blackcore_visual.specs.misuki_spec import MisukiRuntimeSpec
from blackcore_visual.agents.stage_critic import StageCritic


class VisualEngineTests(unittest.TestCase):
    def test_preset_values_are_runtime_parameters(self):
        name, cfg = resolve_preset('D')
        self.assertEqual(name, 'gothic_pastel_fusion')
        self.assertIsInstance(cfg['line_weight'], float)
        self.assertGreater(cfg['hair_complexity'], 0.5)

    def test_director_auto_mode(self):
        d = DirectorAgent()
        env = d.analyze({'prompt': 'montanhas floresta caminho ao pôr do sol', 'mode': 'auto', 'preset': 'F'})
        char = d.analyze({'prompt': 'garota anime com chifres e cabelo longo', 'mode': 'auto', 'preset': 'D'})
        self.assertEqual(env.mode, 'environment')
        self.assertEqual(char.mode, 'character')

    def test_same_seed_is_deterministic(self):
        engine = VisualEngine()
        with tempfile.TemporaryDirectory() as td:
            common = {
                'prompt': 'garota gótica anime com cabelo longo',
                'preset': 'D', 'mode': 'character', 'seed': 12345,
                'width': 256, 'height': 256, 'detail_level': 0.55,
                'output_dir': td,
            }
            a = engine.generate({**common, 'filename': 'a.png'})
            b = engine.generate({**common, 'filename': 'b.png'})
            ha = hashlib.sha256(Path(a['path']).read_bytes()).hexdigest()
            hb = hashlib.sha256(Path(b['path']).read_bytes()).hexdigest()
            self.assertEqual(ha, hb)

    def test_environment_generation_and_critic(self):
        engine = VisualEngine()
        with tempfile.TemporaryDirectory() as td:
            result = engine.generate({
                'prompt': 'paisagem com montanhas floresta e cabana',
                'preset': 'F', 'mode': 'environment', 'seed': 9,
                'width': 256, 'height': 256, 'output_dir': td,
                'filename': 'env.png'
            })
            with Image.open(result['path']) as img:
                self.assertEqual(img.size, (256, 256))
            self.assertIn('contrast', result['critic'])
            self.assertIn('edge_density', result['critic'])

    def test_photo_analyzer_and_adaptive_editor(self):
        img = Image.new('RGB', (160, 120), (35, 30, 45))
        analyzer = PhotoAnalyzerAgent()
        before = analyzer.analyze(img)
        self.assertLess(before['luminance'], 80)
        with tempfile.TemporaryDirectory() as td:
            editor = PhotoEditorAgent(VisualMemory(td))
            result = editor.enhance(img, profile='auto', strength=1.0)
            self.assertEqual(result['image'].size, img.size)
            self.assertIn('exposure_ev', result['plan'])
            self.assertGreaterEqual(result['after']['technical_score'], before['technical_score'] - 2.0)
            self.assertTrue(result['event_id'])

    def test_visual_memory_feedback_affects_policy_safely(self):
        with tempfile.TemporaryDirectory() as td:
            memory = VisualMemory(td)
            event = memory.record_event('photo_edit', {
                'quality_delta': 5.0,
                'plan': {'exposure_ev': 0.4, 'contrast_factor': 1.2, 'saturation_factor': 1.1, 'sharpen_percent': 80}
            })
            p1 = memory.photo_policy()
            self.assertGreater(p1['sample_count'], 0)
            memory.feedback(event['event_id'], -1)
            p2 = memory.photo_policy()
            self.assertEqual(p2['sample_count'], 0)

    def test_misuki_spec_is_executable_not_dead_documentation(self):
        spec = MisukiRuntimeSpec.load()
        self.assertGreaterEqual(len(spec.stages), 12)
        self.assertIn("signature", spec.compact_runtime_rules())

    def test_old_failure_pattern_is_rejected_by_stage_critic(self):
        bad = {
            "face_width_height_ratio": 0.9,
            "hair_top_flatness": 0.85,
            "parallel_hair_lines": 42,
            "hair_mass_ratio": 0.10,
            "fringe_major_locks": 12,
            "eye_width_face_ratio": 0.10,
            "eye_spacing_eye_width": 1.8,
            "chin_taper": 0.9,
            "horn_count": 2,
            "horn_root_integration": 0.3,
            "horn_taper_score": 0.4,
            "torso_rectangularity": 0.9,
            "horizontal_outfit_bars": 3,
            "face_negative_space": 0.4,
            "horn_hair_separation": 0.2,
            "has_choker": True,
            "has_gothic_detail": False,
        }
        critic = StageCritic()
        for stage in ("P03", "P04", "P06", "P07", "P12"):
            self.assertFalse(critic.check(stage, bad).passed)

    def test_misuki_generation_returns_checkpoints_and_paint_program(self):
        engine = VisualEngine()
        with tempfile.TemporaryDirectory() as td:
            result = engine.generate({
                "prompt": "Misuki garota gótica anime com cabelo longo e chifres",
                "mode": "character", "preset": "D", "seed": 77,
                "width": 256, "height": 256, "output_dir": td,
                "filename": "misuki.png", "save_stages": False,
            })
            self.assertEqual(result["engine_version"], "0.8.0")
            self.assertGreaterEqual(len(result["checkpoints"]), 12)
            self.assertEqual(result["fidelity"]["score_type"], "structural_geometry_proxy")
            self.assertTrue(Path(result["paint_program_path"]).exists())
            self.assertGreaterEqual(len(result["paint_program"]["operations"]), 12)

    def test_paint_program_v4_is_granular_and_stage_complete(self):
        from blackcore_visual.paint_program import misuki_paint_program
        plan = misuki_paint_program(1000, 1000, scenario_id="gothic_bedroom")
        self.assertEqual(plan["version"], "4.0.0")
        self.assertGreaterEqual(plan["operation_count"], 45)
        self.assertGreaterEqual(plan["scene_operation_count"], 12)
        self.assertGreaterEqual(plan["total_operation_count"], 60)
        self.assertEqual(set(plan["stage_order"]), {f"P{i:02d}" for i in range(1, 15)})
        self.assertEqual({op["stage"] for op in plan["scene_operations"]}, {f"S{i:02d}" for i in range(1, 9)})
        self.assertEqual({op["stage"] for op in plan["operations"]}, {f"P{i:02d}" for i in range(1, 15)})
        for op in plan["operations"]:
            self.assertTrue(op["instruction"])
            self.assertIn("retry", op)
            self.assertIn("validation", op)
        self.assertEqual(plan["scenario_plan"]["scenario"]["id"], "gothic_bedroom")

    def test_director_understands_scene_profiles_without_replacing_misuki(self):
        d = DirectorAgent()
        scene = d.analyze({
            "prompt": "Misuki no quarto gótico, janela alta, luz da lua e velas",
            "mode": "auto", "preset": "D", "scenario": "auto"
        })
        self.assertEqual(scene.mode, "character")
        self.assertEqual(scene.extras["character_profile"], "misuki")
        self.assertEqual(scene.scenario, "gothic_bedroom")
        self.assertGreaterEqual(len(scene.extras["scenario_plan"]["stages"]), 8)

    def test_misuki_runtime_memory_v4_is_actually_exposed(self):
        spec = MisukiRuntimeSpec.load()
        rules = spec.compact_runtime_rules()
        self.assertEqual(rules["runtime_memory_version"], "4.0.0")
        self.assertIn("no roof or pentagon hair top", rules["negative_rules"])
        self.assertEqual(rules["repair_order"][0], "silhouette")
        self.assertIn("allowed_profiles", rules["scene_rules"])
        self.assertIn("do not advance", rules["advance_rule"])

    def test_misuki_telemetry_comes_from_executed_geometry_and_pixels(self):
        engine = VisualEngine()
        with tempfile.TemporaryDirectory() as td:
            result = engine.generate({
                "prompt": "Misuki gótica em studio simples",
                "character_profile": "misuki", "mode": "character", "preset": "D", "seed": 222,
                "scenario": "minimal_studio", "width": 320, "height": 320,
                "output_dir": td, "filename": "telemetry.png", "save_stages": False,
            })
            t = result["telemetry"]
            self.assertEqual(t["telemetry_source"], "executed_geometry_and_pixel_checks")
            self.assertGreater(t["hair_mass_ratio"], 0.0)
            self.assertGreaterEqual(t["face_negative_space"], 0.0)
            self.assertLessEqual(t["face_negative_space"], 1.0)
            self.assertIn("scenario_plan", result)
            self.assertEqual(result["scenario_plan"]["scenario"]["id"], "minimal_studio")

    def test_scenario_render_is_deterministic_for_same_seed(self):
        from blackcore_visual.builders.scenario import ScenarioBuilder
        d = DirectorAgent()
        spec = d.analyze({
            "prompt": "Misuki em cidade cyber na chuva", "character_profile": "misuki",
            "mode": "character", "seed": 909, "scenario": "cyber_rain_city",
            "width": 256, "height": 256
        })
        b = ScenarioBuilder()
        a = b.render(spec, character_present=True).image
        c = b.render(spec, character_present=True).image
        self.assertEqual(hashlib.sha256(a.tobytes()).hexdigest(), hashlib.sha256(c.tobytes()).hexdigest())


    def test_hard_checkpoint_stops_before_later_stages(self):
        from blackcore_visual.agents.stage_critic import StageCheck
        engine = VisualEngine()
        original = engine.misuki_builder.critic.check
        def forced(stage_id, telemetry):
            if stage_id == "P03":
                return StageCheck(stage_id="P03", passed=False, score=40.0, warnings=["forced failure"], repair=["repair hair mass"])
            return original(stage_id, telemetry)
        engine.misuki_builder.critic.check = forced
        with tempfile.TemporaryDirectory() as td:
            result = engine.generate({
                "prompt": "Misuki", "character_profile": "misuki", "mode": "character",
                "seed": 444, "width": 256, "height": 256, "scenario": "minimal_studio",
                "output_dir": td, "filename": "blocked.png", "save_stages": False,
            })
            self.assertTrue(result["export_blocked"])
            self.assertEqual(result["blocked_at"], "P03")
            ids = [x["stage_id"] for x in result["checkpoints"]]
            self.assertIn("P03", ids)
            self.assertNotIn("P04", ids)
            self.assertIn("P14", ids)



if __name__ == '__main__':
    unittest.main()
