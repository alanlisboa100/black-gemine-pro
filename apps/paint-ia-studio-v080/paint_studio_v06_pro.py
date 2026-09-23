#!/usr/bin/env python3
"""Compatibility CLI for the v0.8.0 EnvironmentBuilder.

The previous landscape prototype is archived in
`legacy_prototypes/paint_studio_v06_original.py`.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from blackcore_visual import VisualEngine


def main() -> None:
    parser = argparse.ArgumentParser(prog="paint_studio_v06_pro", description="BLACKCORE environment engine v0.8.0")
    parser.add_argument("--generate-landscape", action="store_true", help="Mantido por compatibilidade")
    parser.add_argument("--prompt", default="paisagem cinematográfica com montanhas, floresta, caminho e cabana ao pôr do sol")
    parser.add_argument("--preset", "-p", default="F")
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--output", "-o", help="Nome/path de saída")
    args = parser.parse_args()

    output = Path(args.output).expanduser() if args.output else None
    payload = {
        "prompt": args.prompt,
        "preset": args.preset,
        "mode": "environment",
        "seed": args.seed,
        "width": args.size,
        "height": args.size,
        "auto_refine": True,
    }
    if output:
        payload["output_dir"] = str(output.parent if str(output.parent) != "." else Path.cwd())
        payload["filename"] = output.name
    result = VisualEngine().generate(payload)
    print(f"✅ {result['path']}")
    print(f"Seed: {result['scene']['seed']} | Preset: {result['scene']['preset']} | Score técnico: {result['critic']['technical_score']}")


if __name__ == "__main__":
    main()
