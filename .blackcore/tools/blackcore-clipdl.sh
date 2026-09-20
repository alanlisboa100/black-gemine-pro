#!/usr/bin/env bash
# ==============================================================================
# BLACKCORE CLIPDL - Smart Clipboard Downloader for Android / Termux
# ==============================================================================

set -e

MUSIC_DIR_1="/storage/emulated/0/Music"
MUSIC_DIR_2="/storage/emulated/0/BLACKMusic_Video/musicas"
VIDEO_DIR="/storage/emulated/0/BLACKMusic_Video/videos"

mkdir -p "$MUSIC_DIR_1" "$MUSIC_DIR_2" "$VIDEO_DIR" 2>/dev/null || true

MODE="mp3"
URL=""
WATCH=0

usage() {
    echo -e "\033[1;36mBLACKCORE CLIPBOARD DOWNLOADER\033[0m"
    echo "Uso: blackcore-clipdl [opções] [URL]"
    echo ""
    echo "Opções:"
    echo "  -m, --mode <mp3|mp4|both>  Modo de download (padrão: mp3 em 320kbps)"
    echo "  -v, --video                Atalho para baixar vídeo MP4"
    echo "  -a, --audio                Atalho para baixar áudio MP3"
    echo "  -w, --watch                Modo monitor: baixa automaticamente novos links copiados"
    echo "  -h, --help                 Exibe esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  blackcore-clipdl                  # Baixa a URL que está copiada no celular (MP3)"
    echo "  blackcore-clipdl --video          # Baixa o vídeo copiado em MP4"
    echo "  blackcore-clipdl <URL>            # Baixa a URL informada"
    echo "  blackcore-clipdl --watch          # Fica rodando e baixa tudo que você copiar"
}

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -v|--video)
            MODE="mp4"
            shift
            ;;
        -a|--audio)
            MODE="mp3"
            shift
            ;;
        -w|--watch)
            WATCH=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            if [ -z "$URL" ]; then
                URL="$1"
            fi
            shift
            ;;
    esac
done

is_media_url() {
    local target="$1"
    if [[ "$target" =~ ^https?://.*(youtube\.com|youtu\.be|tiktok\.com|twitter\.com|x\.com|instagram\.com|soundcloud\.com|spotify\.com|facebook\.com|reddit\.com|vimeo\.com|pin\.it).* ]] || [[ "$target" =~ ^https?://.*\.(mp4|mp3|m4a|webm|flac|wav|m3u8).* ]]; then
        return 0
    fi
    return 1
}

download_target() {
    local target_url="$1"
    local dl_mode="$2"

    echo -e "\033[1;33m[BLACKCORE CLIPDL]\033[0m Processando URL: \033[1;37m$target_url\033[0m (Modo: \033[1;32m$dl_mode\033[0m)"

    # Pegar título prévio
    local TITLE="Midia"
    TITLE=$(yt-dlp --get-title "$target_url" 2>/dev/null | head -n 1 || echo "Nova Mídia")
    echo -e "\033[1;36m[Título Detectado]:\033[0m $TITLE"

    if command -v termux-toast >/dev/null 2>&1; then
        termux-toast -b "#111111" -c "#00FFCC" -g bottom "📥 BLACKCORE: Baixando $TITLE..." >/dev/null 2>&1 || true
    fi

    if [ "$dl_mode" = "mp3" ] || [ "$dl_mode" = "both" ]; then
        echo -e "\033[1;34m[Baixando Áudio MP3 320k com Capa e Metadados]...\033[0m"
        
        # Baixa diretamente para a pasta oficial de áudio
        yt-dlp -x --audio-format mp3 --audio-quality 0 \
            --embed-thumbnail --add-metadata \
            --no-playlist \
            -o "$MUSIC_DIR_1/%(title)s.%(ext)s" \
            "$target_url" || {
                # Fallback sem thumbnail se ffmpeg atomicparsley falhar
                yt-dlp -x --audio-format mp3 --audio-quality 0 -o "$MUSIC_DIR_1/%(title)s.%(ext)s" "$target_url"
            }

        # Sincroniza cópia para a pasta secundária
        cp -u "$MUSIC_DIR_1"/*.mp3 "$MUSIC_DIR_2/" 2>/dev/null || true

        # Executa media scan imediato para aparecer no WhatsApp e players Android
        if command -v termux-media-scan >/dev/null 2>&1; then
            termux-media-scan "$MUSIC_DIR_1"/* >/dev/null 2>&1 || true
            termux-media-scan "$MUSIC_DIR_2"/* >/dev/null 2>&1 || true
        fi

        echo -e "\033[1;32m[OK] Áudio salvo em:\033[0m $MUSIC_DIR_1 e $MUSIC_DIR_2"
    fi

    if [ "$dl_mode" = "mp4" ] || [ "$dl_mode" = "both" ]; then
        echo -e "\033[1;34m[Baixando Vídeo MP4 HD]...\033[0m"
        yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" \
            --merge-output-format mp4 \
            --no-playlist \
            -o "$VIDEO_DIR/%(title)s.%(ext)s" \
            "$target_url"

        if command -v termux-media-scan >/dev/null 2>&1; then
            termux-media-scan "$VIDEO_DIR"/* >/dev/null 2>&1 || true
        fi

        echo -e "\033[1;32m[OK] Vídeo salvo em:\033[0m $VIDEO_DIR"
    fi

    # Disparar notificação e fala
    local MSG_FALA="Download concluído: $TITLE"
    if [ -x "$HOME/.local/bin/blackcore-notify" ]; then
        "$HOME/.local/bin/blackcore-notify" -t "Download Finalizado ⚡" -m "$TITLE já está no seu player!" -s >/dev/null 2>&1 || true
    elif command -v termux-tts-speak >/dev/null 2>&1; then
        termux-tts-speak "$MSG_FALA" >/dev/null 2>&1 || true
    fi

    echo -e "\033[1;32m=== ✅ Processo concluído com sucesso! ===\033[0m\n"
}

if [ "$WATCH" -eq 1 ]; then
    echo -e "\033[1;35m=========================================================\033[0m"
    echo -e "\033[1;36m  BLACKCORE CLIPBOARD WATCHER INICIADO (Modo: $MODE)\033[0m"
    echo -e "\033[1;33m  Copie qualquer link no celular que eu baixo na hora!\033[0m"
    echo -e "\033[1;35m=========================================================\033[0m"
    
    LAST_CLIP=""
    while true; do
        CURRENT_CLIP=$(termux-clipboard-get 2>/dev/null | tr -d '\r' | xargs)
        if [ -n "$CURRENT_CLIP" ] && [ "$CURRENT_CLIP" != "$LAST_CLIP" ]; then
            LAST_CLIP="$CURRENT_CLIP"
            if is_media_url "$CURRENT_CLIP"; then
                download_target "$CURRENT_CLIP" "$MODE" || echo "[Erro no download da URL]"
            fi
        fi
        sleep 2
    done
fi

# Modo direto
if [ -z "$URL" ]; then
    if command -v termux-clipboard-get >/dev/null 2>&1; then
        URL=$(termux-clipboard-get 2>/dev/null | tr -d '\r' | xargs)
    fi
fi

if [ -z "$URL" ]; then
    echo -e "\033[1;31m[Erro]\033[0m Nenhuma URL encontrada no argumento nem na área de transferência."
    usage
    exit 1
fi

if ! is_media_url "$URL"; then
    echo -e "\033[1;33m[Aviso]\033[0m A URL não parece ser de mídia conhecida, tentando download mesmo assim: $URL"
fi

download_target "$URL" "$MODE"
