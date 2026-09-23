#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import json
import sys
from pathlib import Path
from typing import Any, Dict

from PIL import Image, ImageOps

from blackcore_visual import VisualEngine
from blackcore_visual.presets import load_all_presets


def _read_payload() -> Dict[str, Any]:
    raw = sys.stdin.read()
    return json.loads(raw or "{}")


def _decode_image(data_url: str) -> Image.Image:
    data = str(data_url or "")
    if "," in data:
        data = data.split(",", 1)[1]
    raw = base64.b64decode(data, validate=False)
    if len(raw) > 25 * 1024 * 1024:
        raise ValueError("imagem decodificada excede 25 MB")
    opened = Image.open(io.BytesIO(raw))
    if opened.width * opened.height > 25_000_000:
        raise ValueError("imagem excede 25 megapixels; reduza a resolução para proteger a memória do Termux")
    opened = ImageOps.exif_transpose(opened)
    return opened.convert("RGBA")


def _encode_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> int:
    try:
        payload = _read_payload()
        action = payload.get("action", "generate")
        engine = VisualEngine()
        if action == "generate":
            result = engine.generate(payload)
            print(json.dumps({"ok": True, **result}, ensure_ascii=False))
            return 0
        if action == "analyze":
            image = _decode_image(str(payload.get("imageBase64") or ""))
            report = engine.analyze_image(image, str(payload.get("mode") or "character"))
            print(json.dumps({"ok": True, "critic": report}, ensure_ascii=False))
            return 0
        if action == "photo_analyze":
            image = _decode_image(str(payload.get("imageBase64") or ""))
            report = engine.analyze_photo(image)
            print(json.dumps({"ok": True, "analysis": report}, ensure_ascii=False))
            return 0
        if action == "photo_enhance":
            image = _decode_image(str(payload.get("imageBase64") or ""))
            result = engine.enhance_photo(
                image,
                profile=str(payload.get("profile") or "auto"),
                strength=float(payload.get("strength") or 1.0),
            )
            output = result.pop("image")
            output_dir = payload.get("output_dir")
            if output_dir:
                out_dir = Path(str(output_dir))
                out_dir.mkdir(parents=True, exist_ok=True)
                raw_name = str(payload.get("filename") or "blackcore_photo_enhanced.png")
                filename = "".join(c if c.isalnum() or c in "._-" else "_" for c in raw_name)
                if not filename.lower().endswith(".png"):
                    filename += ".png"
                out_path = out_dir / filename
                output.save(out_path, "PNG", optimize=True)
                print(json.dumps({"ok": True, **result, "path": str(out_path)}, ensure_ascii=False))
            else:
                print(json.dumps({"ok": True, **result, "imageBase64": _encode_png(output)}, ensure_ascii=False))
            return 0
        if action == "memory_status":
            print(json.dumps({"ok": True, "memory": engine.memory_status()}, ensure_ascii=False))
            return 0
        if action == "memory_feedback":
            event = engine.memory_feedback(str(payload.get("event_id") or ""), int(payload.get("rating") or 0))
            print(json.dumps({"ok": True, "event": event, "memory": engine.memory_status()}, ensure_ascii=False))
            return 0
        if action == "presets":
            print(json.dumps({"ok": True, "presets": load_all_presets()}, ensure_ascii=False))
            return 0
        raise ValueError(f"ação desconhecida: {action}")
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
