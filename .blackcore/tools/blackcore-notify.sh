#!/usr/bin/env bash
# ==============================================================================
# BLACKCORE NOTIFY - Android Status Bar Notification Manager for Termux
# ==============================================================================

set -e

TITLE="BLACKCORE ⚡"
CONTENT=""
ID="blackcore-$(date +%s)"
PRIORITY="high"
VIBRATE="100,200,100"
LED_COLOR="00FFCC"
ACTION=""
SPEAK=0
SOUND=1

usage() {
    echo "Uso: blackcore-notify [opções] \"Mensagem da notificação\""
    echo ""
    echo "Opções:"
    echo "  -t, --title <título>    Título da notificação (padrão: 'BLACKCORE ⚡')"
    echo "  -m, --msg <texto>       Mensagem da notificação"
    echo "  -p, --priority <nível>  Prioridade (high, max, low, min, default)"
    echo "  -a, --action <comando>  Ação ao clicar (ex: 'termux-open /sdcard/Music')"
    echo "  -s, --speak             Também fala a mensagem por voz (TTS)"
    echo "  --no-sound              Desativa som/vibração"
    echo "  -h, --help              Exibe esta ajuda"
    echo ""
    echo "Exemplo: blackcore-notify -t \"Download Concluído\" \"Low - Nightcore salvo na pasta Music!\" -s"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--title)
            TITLE="$2"
            shift 2
            ;;
        -m|--msg)
            CONTENT="$2"
            shift 2
            ;;
        -p|--priority)
            PRIORITY="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -s|--speak)
            SPEAK=1
            shift
            ;;
        --no-sound)
            SOUND=0
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            if [ -z "$CONTENT" ]; then
                CONTENT="$1"
            else
                CONTENT="$CONTENT $1"
            fi
            shift
            ;;
    esac
done

if [ -z "$CONTENT" ] && [ ! -t 0 ]; then
    CONTENT=$(cat)
fi

if [ -z "$CONTENT" ]; then
    usage
    exit 1
fi

echo -e "\033[1;35m[BLACKCORE NOTIFY]\033[0m Disparando notificação: \033[1;37m$TITLE\033[0m - $CONTENT"

if command -v termux-notification >/dev/null 2>&1; then
    NOTIF_CMD=(termux-notification --id "$ID" --title "$TITLE" --content "$CONTENT" --priority "$PRIORITY" --led-color "$LED_COLOR")
    
    if [ "$SOUND" -eq 1 ]; then
        NOTIF_CMD+=(--vibrate "$VIBRATE" --sound)
    fi

    if [ -n "$ACTION" ]; then
        NOTIF_CMD+=(--action "$ACTION")
    fi

    "${NOTIF_CMD[@]}" >/dev/null 2>&1 || true
fi

# Also speak if requested
if [ "$SPEAK" -eq 1 ]; then
    if [ -x "$HOME/.local/bin/blackcore-voice" ]; then
        "$HOME/.local/bin/blackcore-voice" "$CONTENT" >/dev/null 2>&1 || true
    elif command -v termux-tts-speak >/dev/null 2>&1; then
        termux-tts-speak "$CONTENT" >/dev/null 2>&1 || true
    fi
fi
