#!/usr/bin/env python3
"""Compatibility wrapper. Original implementation is archived in legacy_prototypes/."""
from pathlib import Path
import runpy

TARGET = Path(__file__).resolve().parent / "legacy_prototypes" / "render_anime_art.py"
if __name__ == "__main__":
    runpy.run_path(str(TARGET), run_name="__main__")
