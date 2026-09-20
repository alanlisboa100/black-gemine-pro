#!/usr/bin/env python3
# ==============================================================================
# BLACKCORE LYRIC VIDEO - Automatic Audio Visualizer & Lyric Video Generator
# ==============================================================================

import os
import sys
import argparse
import subprocess
import json
import shutil

VIDEO_OUT_DIR = "/storage/emulated/0/BLACKMusic_Video/videos"
os.makedirs(VIDEO_OUT_DIR, exist_ok=True)

def run_cmd(cmd):
    print(f"\033[1;30m[CMD]\033[0m {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"\033[1;31m[Erro FFmpeg]:\033[0m\n{res.stderr[-500:]}")
        sys.exit(res.returncode)
    return res.stdout

def get_audio_info(audio_path):
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", audio_path
    ]
    out = run_cmd(cmd)
    data = json.loads(out)
    fmt = data.get("format", {})
    duration = float(fmt.get("duration", 0))
    tags = fmt.get("tags", {})
    title = tags.get("title") or tags.get("TITLE") or os.path.splitext(os.path.basename(audio_path))[0]
    artist = tags.get("artist") or tags.get("ARTIST") or "BLACKCORE Studio"
    return duration, title, artist

def main():
    parser = argparse.ArgumentParser(description="BLACKCORE Lyric Video & Visualizer Generator")
    parser.add_argument("audio", help="Caminho do arquivo de áudio (MP3, WAV, M4A, etc)")
    parser.add_argument("-i", "--image", help="Caminho da imagem de fundo (JPG, PNG)")
    parser.add_argument("-l", "--lyrics", help="Caminho do arquivo de legenda/letra (.srt ou .lrc)")
    parser.add_argument("-s", "--style", choices=["spectrum", "waveform", "cqt", "circle"], default="spectrum", help="Estilo visualizador (padrão: spectrum)")
    parser.add_argument("-a", "--aspect", choices=["9:16", "16:9", "1:1"], default="9:16", help="Proporção da tela (padrão: 9:16 para Reels/Shorts/Status)")
    parser.add_argument("-t", "--title", help="Título da música para exibir na tela")
    parser.add_argument("-r", "--artist", help="Nome do artista para exibir na tela")
    parser.add_argument("-o", "--output", help="Nome do arquivo de saída MP4")
    parser.add_argument("--fps", type=int, default=30, help="Frames por segundo (padrão: 30)")

    args = parser.parse_args()

    if not os.path.exists(args.audio):
        print(f"\033[1;31m[Erro]:\033[0m Arquivo de áudio não encontrado: {args.audio}")
        sys.exit(1)

    duration, auto_title, auto_artist = get_audio_info(args.audio)
    song_title = args.title or auto_title
    song_artist = args.artist or auto_artist

    # Resoluções
    if args.aspect == "9:16":
        width, height = 720, 1280
    elif args.aspect == "16:9":
        width, height = 1280, 720
    else: # 1:1
        width, height = 720, 720

    print("\033[1;36m=========================================================\033[0m")
    print(f"\033[1;33m  BLACKCORE LYRIC VIDEO GENERATOR\033[0m")
    print(f"  Música: \033[1;37m{song_title}\033[0m - \033[1;37m{song_artist}\033[0m")
    print(f"  Duração: \033[1;32m{duration:.2f}s\033[0m | Resolução: \033[1;32m{width}x{height} ({args.aspect})\033[0m")
    print(f"  Estilo: \033[1;32m{args.style}\033[0m | FPS: \033[1;32m{args.fps}\033[0m")
    print("\033[1;36m=========================================================\033[0m")

    # Definir nome do arquivo de saída
    safe_title = "".join(c for c in song_title if c.isalnum() or c in (" ", "_", "-")).strip()
    out_filename = args.output or f"{safe_title}_Visualizer.mp4"
    if not out_filename.endswith(".mp4"):
        out_filename += ".mp4"
    out_path = os.path.join(VIDEO_OUT_DIR, out_filename)

    # Construção do Filtergraph do FFmpeg
    inputs = []
    filter_chains = []

    # Entrada 0: Áudio
    inputs.extend(["-i", args.audio])

    # Se houver imagem de fundo
    bg_stream = "[bg_src]"
    if args.image and os.path.exists(args.image):
        inputs.extend(["-loop", "1", "-i", args.image])
        # Imagem ajustada para o tamanho da tela com zoom dinâmico sutil
        filter_chains.append(
            f"[1:v]scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},"
            f"zoompan=z='min(zoom+0.0015,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(duration*args.fps)}:s={width}x{height},"
            f"format=yuv420p{bg_stream}"
        )
    else:
        # Fundo dinâmico degradê Cyberpunk escuro
        filter_chains.append(
            f"color=c=0x0a0a16:s={width}x{height}:d={duration},fps={args.fps}{bg_stream}"
        )

    # Estilos de Visualizador de Áudio (FFmpeg filters)
    vis_stream = "[vis]"
    vis_w = int(width * 0.85)
    vis_h = int(height * 0.22) if args.aspect == "9:16" else int(height * 0.3)

    if args.style == "spectrum":
        # Frequency spectrum bars com cores neon vibrantes
        filter_chains.append(
            f"[0:a]showfreqs=s={vis_w}x{vis_h}:mode=bar:ascale=log:fscale=log:colors=0x00FFCC|0xFF00AA:cmode=separate{vis_stream}"
        )
    elif args.style == "waveform":
        # Laser wave oscillogram
        filter_chains.append(
            f"[0:a]showwaves=s={vis_w}x{vis_h}:mode=line:colors=0x00FFCC:rate={args.fps}{vis_stream}"
        )
    elif args.style == "cqt":
        # Chromatic pitch visualizer
        filter_chains.append(
            f"[0:a]showcqt=s={vis_w}x{vis_h}:bar_g=2:timeclamp=0.1:tc=0x00FFCC{vis_stream}"
        )
    else: # circle
        filter_chains.append(
            f"[0:a]avectorscope=s={vis_h}x{vis_h}:zoom=2:rc=0:gc=255:bc=204{vis_stream}"
        )

    # Overlay do visualizador sobre o fundo
    vis_x = f"(W-w)/2"
    vis_y = f"H*0.62" if args.aspect == "9:16" else f"H*0.55"
    filter_chains.append(f"{bg_stream}{vis_stream}overlay=x='{vis_x}':y='{vis_y}':shortest=1[base_vis]")

    # Texto de Título e Artista (drawtext)
    header_text = f"drawtext=text='{song_title}':fontcolor=white:fontsize={int(width*0.055)}:x=(w-text_w)/2:y=H*0.18:shadowcolor=0x000000@0.8:shadowx=3:shadowy=3," \
                  f"drawtext=text='{song_artist}':fontcolor=0x00FFCC:fontsize={int(width*0.038)}:x=(w-text_w)/2:y=H*0.24:shadowcolor=0x000000@0.8:shadowx=2:shadowy=2"
    
    current_stream = "[video_text]"
    filter_chains.append(f"[base_vis]{header_text}{current_stream}")

    # Adicionar Legendas (SRT / LRC) se existirem
    if args.lyrics and os.path.exists(args.lyrics):
        sub_path = os.path.abspath(args.lyrics).replace(":", "\\:")
        subtitle_filter = f"subtitles='{sub_path}':force_style='FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2'"
        filter_chains.append(f"{current_stream}{subtitle_filter}[final_out]")
        final_stream = "[final_out]"
    else:
        final_stream = current_stream

    filter_graph = ";".join(filter_chains)

    # Comando FFmpeg final
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_graph,
        "-map", final_stream,
        "-map", "0:a",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        out_path
    ]

    print("\033[1;34m[FFmpeg] Renderizando vídeo em alta velocidade...\033[0m")
    run_cmd(ffmpeg_cmd)

    print(f"\033[1;32m[SUCESSO] Vídeo gerado em:\033[0m {out_path}")

    # Atualizar galeria do Android
    if shutil.which("termux-media-scan"):
        subprocess.run(["termux-media-scan", out_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Disparar notificação e fala
    msg = f"Lyric video de '{song_title}' pronto no seu celular!"
    if os.path.exists(os.path.expanduser("~/.local/bin/blackcore-notify")):
        subprocess.run([
            os.path.expanduser("~/.local/bin/blackcore-notify"),
            "-t", "Lyric Video Gerado 🎬",
            "-m", msg,
            "-s"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    main()
