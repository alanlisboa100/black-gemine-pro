#!/usr/bin/env python3
"""Command-line front-end for Black Paint Studio."""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

from blackcore_visual import VisualEngine

ROOT = Path(__file__).resolve().parent


def start_server_and_open() -> None:
    print("🎨 Iniciando Black Paint Studio…")
    subprocess.Popen(["node", str(ROOT / "server.js")], cwd=ROOT)
    time.sleep(1)
    url = "http://127.0.0.1:3333"
    print(f"🚀 {url}")
    try:
        subprocess.run(["termux-open-url", url], capture_output=True, check=False)
    except FileNotFoundError:
        pass


def draw_terminal_canvas(width=40, height=18) -> None:
    print("\nBLACK CORE // TERMINAL PREVIEW")
    for y in range(height):
        row=[]
        for x in range(width):
            d=((x-width/2)**2+(y-height/2)**2)**0.5
            row.append("██" if d < height*.30 else "  ")
        print("".join(row))


def main() -> None:
    parser=argparse.ArgumentParser(prog="paint", description="Black Paint Studio CLI v0.8.0")
    parser.add_argument("--open", "-o", action="store_true", help="Inicia o servidor e abre no Android")
    parser.add_argument("--preview", "-p", action="store_true", help="Prévia simples no terminal")
    parser.add_argument("--generate", action="store_true", help="Gera uma imagem pelo Visual Engine")
    parser.add_argument("--prompt", default="garota gótica anime com cabelo longo e chifres")
    parser.add_argument("--mode", choices=["auto","character","environment"], default="auto")
    parser.add_argument("--preset", default="D")
    parser.add_argument("--seed", type=int)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--output")
    args=parser.parse_args()

    if args.generate:
        payload={"prompt":args.prompt,"mode":args.mode,"preset":args.preset,"seed":args.seed,"width":args.size,"height":args.size}
        if args.output:
            out=Path(args.output).expanduser(); payload["output_dir"]=str(out.parent if str(out.parent)!="." else Path.cwd()); payload["filename"]=out.name
        result=VisualEngine().generate(payload)
        print(f"✅ {result['path']}")
        return
    if args.preview:
        draw_terminal_canvas(); return
    start_server_and_open()


if __name__ == "__main__":
    main()
