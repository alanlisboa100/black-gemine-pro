#!/usr/bin/env python3
"""Compatibility launcher for the OPTIONAL external Flux/Pollinations provider.

This provider uses the network and is deliberately isolated from the local engine.
"""
from pathlib import Path
import runpy

TARGET = Path(__file__).resolve().parent / "providers" / "external_flux_pollinations.py"
if __name__ == "__main__":
    runpy.run_path(str(TARGET), run_name="__main__")
