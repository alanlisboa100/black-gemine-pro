#!/usr/bin/env bash
# ==============================================================================
# BLACKCORE TUNNEL - Instant Public Web Tunnel for Termux / Android
# ==============================================================================

set -e

PORT=""
DIR=""
PROVIDER="pinggy" # pinggy | localhost.run

usage() {
    echo -e "\033[1;36mBLACKCORE INSTANT WEB TUNNEL\033[0m"
    echo "Uso: blackcore-tunnel <porta|diretório> [porta_para_diretório]"
    echo ""
    echo "Exemplos:"
    echo "  blackcore-tunnel 5173              # Abre túnel público para a porta 5173"
    echo "  blackcore-tunnel 3000              # Abre túnel público para a porta 3000"
    echo "  blackcore-tunnel ./meu-site 8080   # Sobe servidor estático da pasta na porta 8080 e abre túnel"
    echo ""
    echo "O link público é copiado automaticamente para a área de transferência do celular."
}

if [ -z "$1" ]; then
    usage
    exit 1
fi

if [ -d "$1" ]; then
    DIR="$1"
    PORT="${2:-8080}"
else
    PORT="$1"
fi

if [ -n "$DIR" ]; then
    echo -e "\033[1;34m[BLACKCORE TUNNEL]\033[0m Iniciando servidor local na pasta \033[1;37m$DIR\033[0m (Porta: $PORT)..."
    python3 -m http.server "$PORT" --directory "$DIR" >/dev/null 2>&1 &
    SERVER_PID=$!
    sleep 1
    echo -e "\033[1;32m[OK] Servidor local ativo (PID: $SERVER_PID)\033[0m"
fi

echo -e "\033[1;36m=========================================================\033[0m"
echo -e "\033[1;33m  BLACKCORE WEB TUNNEL INICIANDO (Porta: $PORT)\033[0m"
echo -e "\033[1;36m=========================================================\033[0m"

TEMP_LOG=$(mktemp)

# Tentar Pinggy primeiro
echo -e "\033[1;34m[Conectando via Pinggy SSH...]...\033[0m"

ssh -p 443 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R0:localhost:"$PORT" a.pinggy.io > "$TEMP_LOG" 2>&1 &
TUNNEL_PID=$!

# Aguardar geração do link
TUNNEL_URL=""
for i in {1..12}; do
    sleep 1
    if grep -qE "https://[a-zA-Z0-9.-]+\.(pinggy\.link|free\.pinggy\.link|a\.pinggy\.io)" "$TEMP_LOG"; then
        TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.(pinggy\.link|free\.pinggy\.link|a\.pinggy\.io)" "$TEMP_LOG" | head -n 1)
        break
    fi
done

# Fallback para Localhost.run se Pinggy falhar
if [ -z "$TUNNEL_URL" ]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
    echo -e "\033[1;33m[Pinggy não respondeu, tentando Localhost.run...]\033[0m"
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:"$PORT" localhost.run > "$TEMP_LOG" 2>&1 &
    TUNNEL_PID=$!
    
    for i in {1..12}; do
        sleep 1
        if grep -qE "https://[a-zA-Z0-9.-]+\.lhr\.life" "$TEMP_LOG"; then
            TUNNEL_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.lhr\.life" "$TEMP_LOG" | head -n 1)
            break
        fi
    done
fi

if [ -n "$TUNNEL_URL" ]; then
    echo -e "\033[1;32m"
    echo "========================================================="
    echo "  🚀 TÚNEL PÚBLICO ATIVO E DISPONÍVEL NA INTERNET!"
    echo "  🌐 URL: $TUNNEL_URL"
    echo "========================================================="
    echo -e "\033[0m"

    # Copiar para o clipboard
    if command -v termux-clipboard-set >/dev/null 2>&1; then
        echo "$TUNNEL_URL" | termux-clipboard-set 2>/dev/null || true
        echo -e "\033[1;36m[Clipboard]: Link copiado para a área de transferência do celular! 📋\033[0m"
    fi

    # Notificação no Android
    if [ -x "$HOME/.local/bin/blackcore-notify" ]; then
        "$HOME/.local/bin/blackcore-notify" \
            -t "Túnel Web Ativo 🌐" \
            -m "$TUNNEL_URL (Copiado para o Clipboard)" \
            -a "termux-open-url $TUNNEL_URL" \
            -s >/dev/null 2>&1 || true
    fi

    echo -e "\033[1;37mPressione Ctrl+C para encerrar o túnel.\033[0m"
    
    cleanup() {
        echo -e "\n\033[1;31m[BLACKCORE TUNNEL] Encerrando túnel e serviços...\033[0m"
        kill "$TUNNEL_PID" 2>/dev/null || true
        if [ -n "$SERVER_PID" ]; then
            kill "$SERVER_PID" 2>/dev/null || true
        fi
        rm -f "$TEMP_LOG" 2>/dev/null || true
        exit 0
    }

    trap cleanup SIGINT SIGTERM
    wait "$TUNNEL_PID"
else
    echo -e "\033[1;31m[Erro]: Não foi possível gerar a URL pública do túnel.\033[0m"
    cat "$TEMP_LOG"
    rm -f "$TEMP_LOG" 2>/dev/null || true
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    exit 1
fi
