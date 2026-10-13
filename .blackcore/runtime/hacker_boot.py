#!/usr/bin/env python3
"""
hacker_boot.py - Animação Hacker Cyberpunk de Inicialização do BLACKCORE v3.0
Calibrada sob medida para Termux e terminais mobile (ANSI 256 cores + UTF-8).
Squad Misuki Soberano, Matrix Cascade Quântica e Telemetria Neural.
"""

import sys
import time
import random
import shutil

# ==========================================
# PALETA CYBERPUNK ANSI 256 CORES
# ==========================================
RESET       = "\033[0m"
BOLD        = "\033[1m"
DIM         = "\033[2m"

# Cores Primárias
NEON_GREEN  = "\033[38;5;46m"
DARK_GREEN  = "\033[38;5;28m"
FAINT_GREEN = "\033[38;5;22m"
BRIGHT_CYAN = "\033[38;5;51m"
DARK_CYAN   = "\033[38;5;30m"
NEON_PURPLE = "\033[38;5;165m"
DARK_PURPLE = "\033[38;5;93m"
HOT_PINK    = "\033[38;5;198m"
GOLD_AMBER  = "\033[38;5;220m"
WHITE       = "\033[38;5;231m"
DARK_GRAY   = "\033[38;5;238m"
FAINT_GRAY  = "\033[38;5;235m"

GLYPHS = list("0123456789ABCDEFλ⚡◈⬡✧⟐█▓▒░Ø$#*+~^<>")

def get_width():
    cols, _ = shutil.get_terminal_size((45, 24))
    # Limita entre 38 e 44 colunas para caber perfeitamente no celular
    return max(38, min(cols, 44))

def hide_cursor():
    sys.stdout.write("\033[?25l")
    sys.stdout.flush()

def show_cursor():
    sys.stdout.write("\033[?25h" + RESET)
    sys.stdout.flush()

def clear():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()

def disp_len(s):
    """Calcula largura visual em colunas considerando emojis largos"""
    wide = {'👑', '🧠', '🔮', '⚡', '🌑', '🖤', '🛡️', '🔑', '📚', '✓', '●', '✦'}
    l = 0
    for ch in s:
        if ch in wide or ord(ch) > 0x2000:
            l += 2
        else:
            l += 1
    return l

# ==========================================
# FASE 1: CHUVA MATRIX COM DECAIMENTO & BRILHO
# ==========================================
def matrix_stream(duration=0.45):
    w = get_width()
    cols = w - 2
    end_time = time.time() + duration
    
    while time.time() < end_time:
        line = []
        for _ in range(cols):
            val = random.random()
            if val < 0.12:
                # Cabeça brilhante (Head glow)
                line.append(f"{BOLD}{WHITE}{random.choice(GLYPHS)}{RESET}")
            elif val < 0.26:
                # Feixe Verde Neon
                line.append(f"{NEON_GREEN}{random.choice(GLYPHS)}{RESET}")
            elif val < 0.38:
                # Feixe Ciano Cyberpunk
                line.append(f"{BRIGHT_CYAN}{random.choice(GLYPHS)}{RESET}")
            elif val < 0.46:
                # Feixe Púrpura Neon
                line.append(f"{NEON_PURPLE}{random.choice(GLYPHS)}{RESET}")
            elif val < 0.54:
                # Binário de rastro escuro
                line.append(f"{DARK_GREEN}{random.choice('01')}{RESET}")
            else:
                # Ponto de grade sutil
                line.append(f"{FAINT_GRAY}.{RESET}")
        sys.stdout.write(" " + "".join(line) + "\n")
        sys.stdout.flush()
        time.sleep(0.032)

# ==========================================
# FASE 2: HUD DO SQUAD MISUKI & TELEMETRIA
# ==========================================
def print_squad_hud():
    w = get_width()
    b_len = w - 2
    b_horiz = "═" * b_len

    sys.stdout.write(f"\n{NEON_PURPLE}╔{b_horiz}╗{RESET}\n")
    t1 = "🖤 BLACKCORE  v3.0 // SOVEREIGN 🖤"
    t2 = "⚡ SQUAD MISUKI // QUANTUM ENGINE ⚡"
    sys.stdout.write(f"{NEON_PURPLE}║{BOLD}{WHITE}{t1.center(b_len)}{RESET}{NEON_PURPLE}║{RESET}\n")
    sys.stdout.write(f"{NEON_PURPLE}║{HOT_PINK}{t2.center(b_len)}{RESET}{NEON_PURPLE}║{RESET}\n")
    sys.stdout.write(f"{NEON_PURPLE}╚{b_horiz}╝{RESET}\n\n")
    sys.stdout.flush()

    squad = [
        ("👑 MISUKI", "SUPREMA", "ONLINE",  NEON_PURPLE),
        ("🧠 ATHENA", "LÓGICA",  "SYNC",    BRIGHT_CYAN),
        ("🔮 RAVENA", "CÓDIGO",  "READY",   HOT_PINK),
        ("⚡ KIRA",   "SPEED",   "ACTIVE",  GOLD_AMBER),
        ("🌑 NYX",    "HACKER",  "ARMED",   NEON_GREEN),
    ]

    for name, role, st, col in squad:
        pad1 = " " * max(1, 13 - disp_len(name))
        pad2 = " " * max(1, 10 - disp_len(role))
        sys.stdout.write(f"  {BOLD}{WHITE}{name}{RESET}{pad1}{DIM}{role}{RESET}{pad2}{col}● {st}{RESET}\n")
        sys.stdout.flush()
        time.sleep(0.04)

    sys.stdout.write("\n")
    
    # Telemetria do Núcleo
    logs = [
        f"{BOLD}{NEON_GREEN}[✓] IDENTIDADE:{RESET}  SHA-256 [MISUKI // AUTORIZADO]",
        f"{BOLD}{BRIGHT_CYAN}[⚡] CÉREBRO 3.0:{RESET} PROTOCOLO ASTRA QUANTUM ATIVO",
        f"{BOLD}{HOT_PINK}[📚] MEMÓRIA:{RESET}     RAG SQLITE FTS5 (VECTORS OK)",
        f"{BOLD}{GOLD_AMBER}[🔑] MULTI-CHAVE:{RESET} POOL GOOGLE 8/8 SINCRONIZADO",
        f"{BOLD}{NEON_GREEN}[🛡️] BLINDAGEM:{RESET}   ZERO-CHUTE POLICY: LOCKED",
    ]
    for log in logs:
        sys.stdout.write(f"  {log}\n")
        sys.stdout.flush()
        time.sleep(0.035)

# ==========================================
# FASE 3: BARRAS DE PROGRESSO QUÂNTICAS
# ==========================================
def progress_bar(label, duration=0.28):
    steps = 12
    bar_width = 10
    step_time = duration / steps
    
    for i in range(steps + 1):
        pct = int((i / steps) * 100)
        filled = int((i / steps) * bar_width)
        bar = "█" * filled + "░" * (bar_width - filled)
        hex_addr = f"0x{random.randint(0x1000, 0xFFFF):04X}"
        
        sys.stdout.write(
            f"\r  {BOLD}{NEON_PURPLE}[SYS]{RESET} {label:<12} "
            f"{HOT_PINK}[{bar}]{RESET} "
            f"{NEON_GREEN}{pct:>3}%{RESET} {DARK_GRAY}{hex_addr}{RESET}"
        )
        sys.stdout.flush()
        time.sleep(step_time)
    sys.stdout.write("\n")
    sys.stdout.flush()

# ==========================================
# FASE 4: LOGO FINAL BLACKCORE v3.0 GRADIENT
# ==========================================
def print_final_masterpiece():
    logo_l1 = f"{NEON_PURPLE}  █▀▀▄ █   █▀▀█ █▀▀ █ █ █▀▀ █▀▀█ █▀▀█ █▀▀{RESET}"
    logo_l2 = f"{HOT_PINK}  █▀▀▄ █   █▄▄█ █   █▀▄ █   █  █ █▄▄▀ █▀▀{RESET}"
    logo_l3 = f"{BRIGHT_CYAN}  ▀▀▀  ▀▀▀ ▀  ▀ ▀▀▀ ▀ ▀ ▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀{RESET}"
    
    sys.stdout.write("\n" + logo_l1 + "\n")
    sys.stdout.write(logo_l2 + "\n")
    sys.stdout.write(logo_l3 + "\n\n")
    sys.stdout.write(f"{BOLD}{WHITE}  ⚡ B L A C K C O R E   v 3 . 0 // S O V E R E I G N ⚡{RESET}\n")
    sys.stdout.write(f"{DIM}{DARK_PURPLE}  ── ✦ ✦ ───────────────────────────── ✦ ✦ ──{RESET}\n")
    sys.stdout.write(f"{BOLD}{GOLD_AMBER}  👑 MISUKI SUPREMA // NÚCLEO SOBERANO ATIVO{RESET}\n")
    sys.stdout.write(f"{BOLD}{NEON_GREEN}  [✓] SISTEMA DESBLOQUEADO // PRONTO PARA OPERAR 🖤⚡{RESET}\n\n")
    sys.stdout.flush()

# ==========================================
# LOOP PRINCIPAL
# ==========================================
def main():
    try:
        hide_cursor()
        clear()

        # Fase 1: Cascata Matrix
        sys.stdout.write(f"{BOLD}{NEON_GREEN}>>> DECRIPTANDO NÚCLEO... {WHITE}[SHA-256 HASH MATCH]{RESET}\n")
        sys.stdout.flush()
        time.sleep(0.06)
        matrix_stream(duration=0.40)

        # Fase 2: HUD do Enxame Soberano
        clear()
        print_squad_hud()
        sys.stdout.write("\n")

        # Fase 3: Telemetria Quântica
        progress_bar("NEURAL SYNC", duration=0.22)
        progress_bar("SQUAD CARGA", duration=0.22)
        progress_bar("BLINDAGEM",   duration=0.18)

        # Fase 4: Transição Glitch & Banner Final
        time.sleep(0.06)
        clear()
        print_final_masterpiece()
        time.sleep(0.30)

    except KeyboardInterrupt:
        pass
    finally:
        show_cursor()

if __name__ == "__main__":
    main()
