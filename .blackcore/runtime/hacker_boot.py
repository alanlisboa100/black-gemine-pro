#!/usr/bin/env python3
"""
hacker_boot.py - Animação Hacker Cyberpunk de Inicialização do BLACKCORE
Projetada para Termux e terminais modernos (ANSI 256 cores + UTF-8).
"""

import sys
import time
import random
import shutil

# Paleta Cyberpunk / BlackCore
RESET       = "\033[0m"
BOLD        = "\033[1m"
DIM         = "\033[2m"

# Cores 256
NEON_GREEN  = "\033[38;5;46m"
DARK_GREEN  = "\033[38;5;28m"
BRIGHT_CYAN = "\033[38;5;51m"
DARK_CYAN   = "\033[38;5;30m"
NEON_PURPLE = "\033[38;5;165m"
DARK_PURPLE = "\033[38;5;93m"
HOT_PINK    = "\033[38;5;198m"
WHITE       = "\033[38;5;231m"
DARK_GRAY   = "\033[38;5;238m"

GLYPHS = list("0123456789ABCDEFλ⚡☠⟐◈█░▒▓Ø$#%&*+=~^<>")

def get_width():
    cols, _ = shutil.get_terminal_size((50, 24))
    return max(38, cols)

def hide_cursor():
    sys.stdout.write("\033[?25l")
    sys.stdout.flush()

def show_cursor():
    sys.stdout.write("\033[?25h" + RESET)
    sys.stdout.flush()

def clear():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()

def matrix_rain(duration=0.45):
    """Chuva de decriptação em cascata hexadecimal"""
    width = min(get_width(), 55)
    end_time = time.time() + duration
    while time.time() < end_time:
        line_chars = []
        for _ in range(width - 2):
            r = random.random()
            if r < 0.20:
                color = random.choice([NEON_GREEN, BRIGHT_CYAN, NEON_PURPLE, WHITE])
                char = random.choice(GLYPHS)
                line_chars.append(f"{color}{char}")
            elif r < 0.28:
                line_chars.append(f"{HOT_PINK}{random.choice('0123456789')}")
            else:
                line_chars.append(f"{DARK_GRAY}.")
        sys.stdout.write(" " + "".join(line_chars) + RESET + "\n")
        sys.stdout.flush()
        time.sleep(0.035)

def print_banner():
    width = get_width()
    border = "═" * min(width - 4, 44)
    sys.stdout.write(f"\n{NEON_PURPLE}╔{border}╗{RESET}\n")
    sys.stdout.write(f"{NEON_PURPLE}║{BOLD}{WHITE}  🖤  B L A C K C O R E   H A C K E R   B O O T  🖤  {RESET}{NEON_PURPLE}║{RESET}\n")
    sys.stdout.write(f"{NEON_PURPLE}╚{border}╝{RESET}\n\n")
    sys.stdout.flush()

def progress_bar(label, duration=0.35):
    width = min(get_width() - 15, 26)
    width = max(width, 14)
    steps = 15
    step_time = duration / steps
    for i in range(steps + 1):
        pct = int((i / steps) * 100)
        filled = int((i / steps) * width)
        bar = "█" * filled + "░" * (width - filled)
        hex_addr = f"0x{random.randint(0x1000, 0xFFFF):04X}"
        sys.stdout.write(
            f"\r{BOLD}{NEON_PURPLE}[SYS]{RESET} {label:<21} "
            f"{HOT_PINK}[{bar}]{RESET} "
            f"{NEON_GREEN}{pct:>3}%{RESET} {DARK_GRAY}{hex_addr}{RESET}"
        )
        sys.stdout.flush()
        time.sleep(step_time)
    sys.stdout.write("\n")
    sys.stdout.flush()

def main():
    try:
        hide_cursor()
        clear()

        # Fase 1: Cascata Matrix Criptográfica
        sys.stdout.write(f"{BOLD}{NEON_GREEN}>>> DECRIPTANDO NÚCLEO... {WHITE}[SHA-256 HASH MATCH]{RESET}\n")
        sys.stdout.flush()
        time.sleep(0.08)
        matrix_rain(duration=0.45)

        # Fase 2: Boot dos Módulos Neurais
        clear()
        print_banner()

        boot_logs = [
            f"{BOLD}{NEON_GREEN}[✓] IDENTIDADE:{RESET}       HASH SHA-256 [AUTORIZADO // MISUKI]",
            f"{BOLD}{BRIGHT_CYAN}[⚡] PRIVILÉGIOS:{RESET}      EXECUÇÃO ELEVADA (SOVEREIGN KERNEL)",
            f"{BOLD}{NEON_PURPLE}[🧠] CÉREBRO 2.0:{RESET}      PROTOCOLO COGNITIVO ASTRA ONLINE",
            f"{BOLD}{HOT_PINK}[📚] MEMÓRIA DURÁVEL:{RESET}  RAG SQLITE FTS5 MONTADO (3.9MB VECTOR CACHE)",
            f"{BOLD}{BRIGHT_CYAN}[🔑] POOL MULTI-CHAVE:{RESET} 8/8 SLOTS GOOGLE SINCRONIZADOS",
            f"{BOLD}{NEON_GREEN}[🛡️] BLINDAGEM:{RESET}        ZERO-CHUTE OPERATING POLICY: LOCKED",
        ]

        for log in boot_logs:
            sys.stdout.write(f"  {log}\n")
            sys.stdout.flush()
            time.sleep(0.06)

        sys.stdout.write("\n")

        # Fase 3: Barras de Progresso Cyberpunk
        progress_bar("INJETANDO SINAPSES", duration=0.30)
        progress_bar("CARREGANDO AGENTES", duration=0.30)

        # Fase 4: Logo Final Hacker BlackCore
        time.sleep(0.08)
        clear()

        logo = f"""
{NEON_PURPLE}  █▀▀▄ █   █▀▀█ █▀▀ █ █ █▀▀ █▀▀█ █▀▀█ █▀▀
  █▀▀▄ █   █▄▄█ █   █▀▄ █   █  █ █▄▄▀ █▀▀
  ▀▀▀  ▀▀▀ ▀  ▀ ▀▀▀ ▀ ▀ ▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀{RESET}
{BOLD}{HOT_PINK}  ⚡ B L A C K C O R E   v 2 . 0 // S O V E R E I G N ⚡{RESET}
{DIM}{WHITE}  ──────────────────────────────────────────{RESET}
{BOLD}{NEON_GREEN}  [✓] SISTEMA DESBLOQUEADO // PRONTO PARA OPERAR{RESET}
"""
        sys.stdout.write(logo + "\n")
        sys.stdout.flush()
        time.sleep(0.35)

    except KeyboardInterrupt:
        pass
    finally:
        show_cursor()

if __name__ == "__main__":
    main()
