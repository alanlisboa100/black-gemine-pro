#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps

from blackcore_visual import VisualEngine


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="black-photo",
        description="Black Core Smart Photo Editor v0.8.0 — análise e melhoria adaptativa local",
    )
    parser.add_argument("input", help="imagem de entrada PNG/JPEG/WebP")
    parser.add_argument("-o", "--output", help="saída PNG; padrão: <nome>_enhanced.png")
    parser.add_argument("--profile", choices=["auto", "natural", "portrait", "artwork", "night"], default="auto")
    parser.add_argument("--strength", type=float, default=1.0, help="0.35 a 1.50")
    parser.add_argument("--analyze-only", action="store_true", help="somente analisar, sem editar")
    args = parser.parse_args()

    src = Path(args.input).expanduser()
    if not src.exists() or not src.is_file():
        raise SystemExit(f"arquivo não encontrado: {src}")
    if src.stat().st_size > 25 * 1024 * 1024:
        raise SystemExit("arquivo maior que 25 MB")

    with Image.open(src) as opened:
        if opened.width * opened.height > 25_000_000:
            raise SystemExit("imagem excede 25 megapixels")
        image = ImageOps.exif_transpose(opened).convert("RGBA")

    engine = VisualEngine()
    if args.analyze_only:
        print(json.dumps(engine.analyze_photo(image), ensure_ascii=False, indent=2))
        return 0

    result = engine.enhance_photo(image, profile=args.profile, strength=max(0.35, min(args.strength, 1.5)))
    output = result.pop("image")
    out = Path(args.output).expanduser() if args.output else src.with_name(src.stem + "_enhanced.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    output.save(out, "PNG", optimize=True)

    summary = {
        "ok": True,
        "output": str(out),
        "quality_delta": result["quality_delta"],
        "event_id": result["event_id"],
        "before": result["before"],
        "after": result["after"],
        "plan": result["plan"],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
