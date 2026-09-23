import unittest
from bn_language import compile_bn, parse_bn, _safe_expr
GOOD='''node Core : diamond {\n x: 0.5\n y: 0.5\n r: 36\n fill: lime\n}\nrelate Pulse : time -> Core.r {\n via: 36 + sin(t * 0.0024) * 10\n}\nscreen Main {\n root: Core\n bg: ink\n}'''
class CoreTests(unittest.TestCase):
 def test_compile_good(self): self.assertTrue(compile_bn(GOOD).ok)
 def test_score_good(self): self.assertEqual(compile_bn(GOOD).score,1.0)
 def test_missing_root(self): self.assertFalse(compile_bn('node A : rect { x: 0.5 }\nscreen S { root: X }').ok)
 def test_blocks_js(self): self.assertFalse(compile_bn('js X { alert(1) }').ok)
 def test_invalid_expr(self): self.assertFalse(compile_bn('node A : rect { x: 0.5 }\nrelate R : time -> A.x { via: __import__(x) }\nscreen S { root: A }').ok)
 def test_safe_math(self): self.assertAlmostEqual(_safe_expr('36 + sin(t * 0.0024) * 10',0),36)
 def test_abs_math(self): self.assertGreaterEqual(_safe_expr('0.4 + abs(sin(t * 0.01)) * 0.5',100),0.4)
 def test_duplicate_node(self): self.assertFalse(compile_bn('node A : rect { x: 0.5 }\nnode A : circle { r: 5 }\nscreen S { root: A }').ok)
 def test_unknown_kind(self): self.assertFalse(compile_bn('node A : spaceship { x: 0.5 }\nscreen S { root: A }').ok)
 def test_no_blocks(self): self.assertFalse(compile_bn('hello world').ok)
if __name__=='__main__':unittest.main()
