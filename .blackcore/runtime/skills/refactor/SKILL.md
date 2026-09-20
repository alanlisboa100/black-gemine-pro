---
name: refactor
description: Safely restructure code while preserving externally observable behavior.
---

# Refactor

Before refactoring:
1. Identify public contracts and tests.
2. Record current behavior with focused tests when coverage is weak.
3. Separate mechanical moves/renames from behavioral changes.
4. Keep patches small enough to review.
5. Preserve formatting/style conventions.
6. Re-run tests after each meaningful stage.

Avoid large rewrites merely for aesthetic consistency.
