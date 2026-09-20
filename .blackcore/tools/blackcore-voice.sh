#!/usr/bin/env bash
# ==============================================================================
# BLACKCORE VOICE - Text-To-Speech & Audio Feedback Engine for Termux / Android
# ==============================================================================

set -e

LANG_CODE="pt-BR"
PITCH="1.0"
RATE="1.0"
SHOW_TOAST=0
TEXT=""

usage() {
    echo "Uso: blackcore-voice [opções] \"Texto para falar\""
    echo ""
    echo "Opções:"
    echo "  -l, --lang <código>   Idioma (padrão: pt-BR, ex: ja-JP, en-US)"
    echo "  -p, --pitch <valor>   Tom da voz (padrão: 1.0)"
    echo "  -r, --rate <valor>    Velocidade da voz (padrão: 1.0)"
    echo "  -t, --toast           Também exibe termux-toast na tela"
    echo "  -h, --help            Exibe esta ajuda"
    echo ""
    echo "Exemplo: blackcore-voice \"Download concluído com sucesso!\""
}

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -l|--lang)
            LANG_CODE="$2"
            shift 2
            ;;
        -p|--pitch)
            PITCH="$2"
            shift 2
            ;;
        -r|--rate)
            RATE="$2"
            shift 2
            ;;
        -t|--toast)
            SHOW_TOAST=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            if [ -z "$TEXT" ]; then
                TEXT="$1"
            else
                TEXT="$TEXT $1"
            fi
            shift
            ;;
    esac
done

# Read from stdin if no text argument provided
if [ -z "$TEXT" ] && [ ! -t 0 ]; then
    TEXT=$(cat)
fi

if [ -z "$TEXT" ]; then
    usage
    exit 1
fi

echo -e "\033[1;36m[BLACKCORE VOICE]\033[0m Falando: \033[1;37m$TEXT\033[0m (Lang: $LANG_CODE)"

# Show toast if requested
if [ "$SHOW_TOAST" -eq 1 ] && command -v termux-toast >/dev/null 2>&1; then
    termux-toast -b "#111111" -c "#00FFCC" -g center "🔊 BLACKCORE: $TEXT" >/dev/null 2>&1 || true
fi

# Execute TTS
if command -v termux-tts-speak >/dev/null 2>&1; then
    termux-tts-speak -l "$LANG_CODE" -p "$PITCH" -r "$RATE" "$TEXT" >/dev/null 2>&1 || {
        # Fallback without language flag if engine doesn't support specific code
        termux-tts-speak "$TEXT" >/dev/null 2>&1 || echo "[Aviso: termux-tts-speak falhou]"
    }
else
    echo "[Aviso: termux-tts-speak não encontrado. Instale com 'pkg install termux-api']"
fi
