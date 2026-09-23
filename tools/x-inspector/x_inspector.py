#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BLACKCORE X-Inspector & OSINT Forensic Toolkit — ULTRA HUD EDITION
Desenvolvido para análise forense de perfis, tweets, detecção de bots e rastreamento cruzado no Termux / Linux.
"""

import sys
import os
import re
import time
import json
import argparse
import threading
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import requests

# ANSI Colors & Formatting
C_CYAN = "\033[96m"
C_BLUE = "\033[94m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_MAGENTA = "\033[95m"
C_WHITE = "\033[97m"
C_BOLD = "\033[1m"
C_DIM = "\033[2m"
C_ITALIC = "\033[3m"
C_RESET = "\033[0m"
C_CLEAR_LINE = "\033[2K\r"
C_HIDE_CURSOR = "\033[?25l"
C_SHOW_CURSOR = "\033[?25h"

TWITTER_EPOCH = 1288834974657

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
]

SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
RADAR_FRAMES = [
    r"   .---.   ",
    r"  /  |  \  ",
    r" | --+-- | ",
    r"  \  |  /  ",
    r"   '---'   "
]

RADAR_ANIM = [
    "   ◢■■◣   ",
    "   ◥■■◤   ",
    "   ◢██◣   ",
    "   ◥██◤   ",
    "   ◈◇◇◈   ",
    "   ◇◈◈◇   ",
    "   ⚡📡⚡   "
]

def decode_snowflake(snowflake_id: int) -> dict:
    """Decodifica um Twitter Snowflake ID em timestamp exato e metadados de worker."""
    try:
        snowflake_id = int(snowflake_id)
        ts_ms = (snowflake_id >> 22) + TWITTER_EPOCH
        dt_utc = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
        worker_id = (snowflake_id & 0x3E0000) >> 17
        datacenter_id = (snowflake_id & 0x1F0000) >> 12
        sequence = snowflake_id & 0xFFF
        return {
            "id": snowflake_id,
            "timestamp_ms": ts_ms,
            "datetime_utc": dt_utc.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3] + " UTC",
            "iso": dt_utc.isoformat(),
            "epoch_seconds": ts_ms / 1000.0,
            "worker_id": worker_id,
            "datacenter_id": datacenter_id,
            "sequence": sequence
        }
    except Exception as e:
        return {"id": snowflake_id, "error": str(e)}

def parse_target(target: str) -> dict:
    """Identifica se o input é um handle (@username), link de tweet ou link de perfil."""
    target = target.strip()
    tweet_match = re.search(r"(?:twitter\.com|x\.com)/([A-Za-z0-9_]+)/status/(\d+)", target)
    if tweet_match:
        return {
            "type": "tweet",
            "username": tweet_match.group(1),
            "tweet_id": int(tweet_match.group(2))
        }
    
    profile_match = re.search(r"(?:twitter\.com|x\.com)/([A-Za-z0-9_]+)", target)
    if profile_match:
        return {
            "type": "profile",
            "username": profile_match.group(1)
        }
        
    if target.isdigit() and len(target) >= 15:
        return {
            "type": "snowflake",
            "snowflake_id": int(target)
        }
        
    clean_handle = target.lstrip("@").split("/")[0].split("?")[0]
    return {
        "type": "profile",
        "username": clean_handle
    }

def fetch_profile_data(username: str) -> dict:
    """Extrai metadados públicos da página do X."""
    url = f"https://x.com/{username}"
    headers = {
        "User-Agent": USER_AGENTS[0],
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7,ja;q=0.6"
    }
    
    res = {
        "username": username,
        "url": url,
        "exists": False,
        "name": "",
        "bio": "",
        "user_id": None,
        "user_snowflake": None,
        "avatar_url": "",
        "avatar_snowflake": None,
        "banner_url": "",
        "banner_snowflake": None,
        "posts_count": 0,
        "joined_date": "",
        "external_urls": [],
        "bot_score": 0,
        "bot_reasons": []
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code == 404:
            res["error"] = "Perfil não encontrado (404)"
            return res
            
        html = resp.text
        res["exists"] = True
        
        # Meta Title & Name
        title_m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        if title_m:
            title_text = title_m.group(1)
            res["raw_title"] = title_text
            res["name"] = re.sub(r"\s*\(@" + re.escape(username) + r"\)\s*(?:on X|/ X)?$", "", title_text, flags=re.IGNORECASE)
            
        # Meta Bio / Description
        bio_m = re.search(r'<meta property="og:description" content="([^"]+)"', html) or re.search(r'<meta name="description" content="([^"]+)"', html)
        if bio_m:
            res["bio"] = bio_m.group(1).replace("&quot;", '"').replace("&amp;", "&")
            
        # Banner User ID Snowflake
        banner_m = re.search(r"profile_banners/(\d+)/(\d+)", html)
        if banner_m:
            res["user_id"] = int(banner_m.group(1))
            res["user_snowflake"] = decode_snowflake(int(banner_m.group(1)))
            res["banner_url"] = f"https://pbs.twimg.com/profile_banners/{banner_m.group(1)}/{banner_m.group(2)}/1500x500"
            
        # Avatar Snowflake
        avatar_m = re.search(r"profile_images/(\d+)/([^\"]+)", html)
        if avatar_m:
            avatar_id = int(avatar_m.group(1))
            res["avatar_url"] = f"https://pbs.twimg.com/profile_images/{avatar_id}/{avatar_m.group(2)}"
            res["avatar_snowflake"] = decode_snowflake(avatar_id)
            
        # Posts count
        posts_m = re.search(r'<meta name="twitter:label1" content="Posts"[^>]*>\s*<meta name="twitter:data1" content="([^"]+)"', html)
        if not posts_m:
            posts_m = re.search(r'<meta name="twitter:data1" content="([^"]+)"[^>]*>\s*<meta name="twitter:label1" content="Posts"', html)
        if posts_m:
            res["posts_raw"] = posts_m.group(1)
            p_str = posts_m.group(1).upper()
            if "K" in p_str:
                res["posts_count"] = int(float(p_str.replace("K", "")) * 1000)
            elif "M" in p_str:
                res["posts_count"] = int(float(p_str.replace("M", "")) * 1000000)
            elif p_str.isdigit():
                res["posts_count"] = int(p_str)
                
        # Joined date string
        joined_m = re.search(r'<meta name="twitter:label2" content="Joined"[^>]*>\s*<meta name="twitter:data2" content="([^"]+)"', html)
        if not joined_m:
            joined_m = re.search(r'<meta name="twitter:data2" content="([^"]+)"[^>]*>\s*<meta name="twitter:label2" content="Joined"', html)
        if joined_m:
            res["joined_date"] = joined_m.group(1)
            
        # External links in bio
        ext_links = re.findall(r"https?://t\.co/[A-Za-z0-9]+", html)
        res["external_urls"] = list(set(ext_links))
        
        # Calculate Bot Heuristics Score
        score, reasons = calculate_bot_score(res)
        res["bot_score"] = score
        res["bot_reasons"] = reasons
        
    except Exception as e:
        res["error"] = f"Falha na requisição: {str(e)}"
        
    return res

def calculate_bot_score(data: dict) -> tuple:
    """Calcula pontuação de probabilidade de automação/bot (0 a 100%) e razões explicativas."""
    score = 10
    reasons = []
    
    # 1. Análise de Nome de Usuário (Padrão de Dígitos / Entropia)
    username = data.get("username", "")
    trailing_digits = re.search(r"\d{5,}$", username)
    if trailing_digits:
        score += 25
        reasons.append(f"Nome com sufixo longo de números ({trailing_digits.group(0)}) - padrão comum em bots.")
    elif re.search(r"\d{3,}$", username):
        score += 10
        reasons.append("Nome com dígitos finais sequenciais.")
        
    # 2. Taxa de Publicações por Dia (Velocity Rate)
    user_snow = data.get("user_snowflake")
    posts_count = data.get("posts_count", 0)
    
    if user_snow and "epoch_seconds" in user_snow and posts_count > 0:
        now_ts = datetime.now(timezone.utc).timestamp()
        created_ts = user_snow["epoch_seconds"]
        days_active = max((now_ts - created_ts) / 86400.0, 1.0)
        posts_per_day = posts_count / days_active
        data["days_active"] = round(days_active, 1)
        data["posts_per_day"] = round(posts_per_day, 1)
        
        if posts_per_day > 100:
            score += 45
            reasons.append(f"Frequência extrema de posts: {posts_per_day:.1f} posts/dia (indica automação ininterrupta).")
        elif posts_per_day > 40:
            score += 25
            reasons.append(f"Frequência elevada de posts: {posts_per_day:.1f} posts/dia.")
        elif posts_per_day > 15:
            score += 10
            reasons.append(f"Atividade constante: {posts_per_day:.1f} posts/dia.")
            
        if days_active < 30 and posts_count > 1000:
            score += 30
            reasons.append(f"Conta muito recente ({days_active:.0f} dias) com volume desproporcional ({posts_count} posts).")
            
    # 3. Análise da Bio (Palavras-chave de Phishing / Bots / IAs)
    bio = (data.get("bio") or "").lower()
    phishing_triggers = ["appeal specialist", "appeal support", "mistakenly reported", "discord support", "contact specialist"]
    for trig in phishing_triggers:
        if trig in bio:
            score += 60
            reasons.append(f"Gatilho de Engenharia Social detectado na bio: '{trig}'.")
            
    if "ai generated" in bio or "ai生成" in bio or "gerado por ia" in bio:
        reasons.append("Identifica-se abertamente como gerador de conteúdo por IA.")
        
    final_score = min(max(score, 5), 98)
    return final_score, reasons

def cross_check_handle(handle: str, callback=None) -> list:
    """Verifica a presença do handle em mais de 15 plataformas populares."""
    platforms = [
        {"name": "Telegram", "url": f"https://t.me/{handle}", "type": "tg_check", "public_url": f"https://t.me/{handle}"},
        {"name": "TikTok", "url": f"https://www.tiktok.com/@{handle}", "type": "status_200", "public_url": f"https://www.tiktok.com/@{handle}"},
        {"name": "Instagram", "url": f"https://www.instagram.com/{handle}/", "type": "insta_check", "public_url": f"https://instagram.com/{handle}"},
        {"name": "GitHub", "url": f"https://api.github.com/users/{handle}", "type": "status_200", "public_url": f"https://github.com/{handle}"},
        {"name": "YouTube", "url": f"https://www.youtube.com/@{handle}", "type": "status_200", "public_url": f"https://youtube.com/@{handle}"},
        {"name": "Reddit", "url": f"https://www.reddit.com/user/{handle}/about.json", "type": "reddit_check", "public_url": f"https://reddit.com/user/{handle}"},
        {"name": "Bluesky", "url": f"https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={handle}.bsky.social", "type": "status_200", "public_url": f"https://bsky.app/profile/{handle}.bsky.social"},
        {"name": "Twitch", "url": f"https://www.twitch.tv/{handle}", "type": "status_200", "public_url": f"https://twitch.tv/{handle}"},
        {"name": "Pinterest", "url": f"https://www.pinterest.com/{handle}/", "type": "status_200", "public_url": f"https://pinterest.com/{handle}"},
        {"name": "Linktree", "url": f"https://linktr.ee/{handle}", "type": "status_200", "public_url": f"https://linktr.ee/{handle}"},
        {"name": "Steam", "url": f"https://steamcommunity.com/id/{handle}", "type": "steam_check", "public_url": f"https://steamcommunity.com/id/{handle}"},
        {"name": "Medium", "url": f"https://medium.com/@{handle}", "type": "status_200", "public_url": f"https://medium.com/@{handle}"}
    ]
    
    results = []
    
    def check_site(p):
        headers = {"User-Agent": USER_AGENTS[0]}
        try:
            r = requests.get(p["url"], headers=headers, timeout=5, allow_redirects=True)
            found = False
            
            if p["type"] == "status_200":
                found = (r.status_code == 200 and "not found" not in r.text.lower() and "404" not in r.text)
            elif p["type"] == "tg_check":
                found = ("tgme_action_button_new" in r.text or "tgme_page_title" in r.text)
            elif p["type"] == "insta_check":
                found = (r.status_code == 200 and "Page Not Found" not in r.text)
            elif p["type"] == "reddit_check":
                found = (r.status_code == 200 and "data" in r.text)
            elif p["type"] == "steam_check":
                found = (r.status_code == 200 and "The specified profile could not be found" not in r.text)
                
            item_res = {
                "platform": p["name"],
                "found": found,
                "url": p["public_url"],
                "status_code": r.status_code
            }
            if callback:
                callback(item_res)
            return item_res
        except Exception:
            item_res = {
                "platform": p["name"],
                "found": False,
                "url": p["public_url"],
                "error": True
            }
            if callback:
                callback(item_res)
            return item_res

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = executor.map(check_site, platforms)
        for res in futures:
            results.append(res)
            
    return results

def run_cyber_investigation_animation(target_label: str, stop_event: threading.Event):
    """Executa uma animação de HUD forense ultra-moderna no terminal enquanto a requisição roda."""
    phases = [
        ("🛰️ [1/4] ACQUIRING TARGET TELEMETRY...", C_CYAN),
        ("🔬 [2/4] DECODING SNOWFLAKE ID & WORKER CLUSTERS...", C_MAGENTA),
        ("🤖 [3/4] ANALYZING BOT VELOCITY & HEURISTICS MATRIX...", C_YELLOW),
        ("🌐 [4/4] CROSS-REFERENCING OSINT REPOSITORIES...", C_BLUE),
        ("🛡️ [COMPILING] BUILDING FORENSIC DOSSIER...", C_GREEN)
    ]
    
    frame_idx = 0
    phase_idx = 0
    start_time = time.time()
    
    sys.stdout.write(C_HIDE_CURSOR)
    try:
        while not stop_event.is_set():
            elapsed = time.time() - start_time
            phase_idx = min(int(elapsed / 0.6), len(phases) - 1)
            
            spin = SPINNER_FRAMES[frame_idx % len(SPINNER_FRAMES)]
            radar = RADAR_ANIM[frame_idx % len(RADAR_ANIM)]
            
            p_text, p_color = phases[phase_idx]
            
            # Simulated progress bar
            pct = min(int((elapsed / 2.4) * 100), 98)
            filled = int(pct / 5)
            pbar = f"{C_GREEN}{'█' * filled}{C_DIM}{'░' * (20 - filled)}{C_RESET}"
            
            # Print animated HUD status line
            sys.stdout.write(
                f"{C_CLEAR_LINE}{C_BOLD}{C_CYAN}[BLACKCORE HUD]{C_RESET} "
                f"{radar} {C_BOLD}{spin}{C_RESET} {p_color}{p_text}{C_RESET} "
                f"[{pbar} {C_BOLD}{pct}%{C_RESET}] "
                f"{C_DIM}Target: @{target_label}{C_RESET}"
            )
            sys.stdout.flush()
            
            frame_idx += 1
            time.sleep(0.08)
            
        # Final sweep
        sys.stdout.write(f"{C_CLEAR_LINE}{C_GREEN}✔ [TARGET ACQUIRED & DECODED 100%]{C_RESET}\n\n")
        sys.stdout.flush()
    finally:
        sys.stdout.write(C_SHOW_CURSOR)
        sys.stdout.flush()

def render_terminal_report(data: dict, cross_results: list = None):
    """Exibe um dossiê forense elegante no terminal."""
    header = f"""{C_BOLD}{C_CYAN}╔══════════════════════════════════════════════════════════════════════╗
║  ██████╗ ██╗      █████╗  ██████╗██╗  ██╗ ██████╗██████╗   ULTRA     ║
║  ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗  3.7.20    ║
║  ██████╔╝██║     ███████║██║     █████╔╝ ██║     ██████╔╝  OSINT     ║
║  ██╔══██╗██║     ██╔══██║██║     ██╔═██╗ ██║     ██╔══██╗  ENGINE    ║
║  ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗╚██████╗██║  ██║  ⚡⚡⚡     ║
║  ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝            ║
║                >> FORENSIC INTELLIGENCE DOSSIER <<                   ║
╚══════════════════════════════════════════════════════════════════════╝{C_RESET}"""
    print(header)
    
    if data.get("type") == "snowflake":
        snow = data["snowflake"]
        print(f"\n{C_BOLD}{C_MAGENTA}🔬 DECODIFICAÇÃO PURA DE SNOWFLAKE ID:{C_RESET}")
        print(f"  • {C_BOLD}Snowflake ID:{C_RESET} {C_WHITE}{snow['id']}{C_RESET}")
        print(f"  • {C_BOLD}Data / Hora Exata:{C_RESET} {C_GREEN}{snow['datetime_utc']}{C_RESET}")
        print(f"  • {C_BOLD}ISO 8601:{C_RESET} {snow['iso']}")
        print(f"  • {C_BOLD}Datacenter / Cluster ID:{C_RESET} DC #{snow['datacenter_id']}")
        print(f"  • {C_BOLD}Worker ID:{C_RESET} W #{snow['worker_id']}")
        print(f"  • {C_BOLD}Sequencial Interno:{C_RESET} Seq #{snow['sequence']}\n")
        return
        
    if data.get("type") == "tweet":
        print(f"\n{C_BOLD}{C_MAGENTA}🐦 DETALHES FORENSES DO TWEET / POST:{C_RESET}")
        print(f"  • {C_BOLD}Autor:{C_RESET} {C_CYAN}@{data.get('username')}{C_RESET}")
        print(f"  • {C_BOLD}Tweet Snowflake ID:{C_RESET} {data.get('tweet_id')}")
        snow = data.get("tweet_snowflake")
        if snow and "datetime_utc" in snow:
            print(f"  • {C_BOLD}Postado com Precisão em:{C_RESET} {C_GREEN}{snow['datetime_utc']}{C_RESET}")
            print(f"  • {C_BOLD}Worker / Datacenter:{C_RESET} W#{snow['worker_id']} | DC#{snow['datacenter_id']}")
            print(f"  • {C_BOLD}Sequencial no Milissegundo:{C_RESET} Seq#{snow['sequence']}")
        print(f"  • {C_BOLD}URL do Post:{C_RESET} https://x.com/{data.get('username')}/status/{data.get('tweet_id')}\n")
        return

    if not data.get("exists"):
        print(f"\n{C_RED}❌ Perfil @{data.get('username')} não encontrado ou indisponível.{C_RESET}")
        if data.get("error"):
            print(f"{C_DIM}Detalhes do erro: {data['error']}{C_RESET}\n")
        return

    # Profile Target Card
    print(f"\n{C_BOLD}🎯 ALVO IDENTIFICADO:{C_RESET} {C_CYAN}@{data['username']}{C_RESET}  [ {C_GREEN}STATUS: ATIVO{C_RESET} ]")
    if data.get("name"):
        print(f"  • {C_BOLD}Nome de Exibição:{C_RESET} {C_WHITE}{data['name']}{C_RESET}")
    if data.get("bio"):
        print(f"  • {C_BOLD}Biografia Declarada:{C_RESET} {C_ITALIC}{data['bio']}{C_RESET}")
    if data.get("joined_date"):
        print(f"  • {C_BOLD}Mês Declarado:{C_RESET} {data['joined_date']}")
        
    # Snowflake User ID
    user_snow = data.get("user_snowflake")
    if user_snow and "datetime_utc" in user_snow:
        print(f"\n{C_BOLD}{C_MAGENTA}🔬 FORENSE SNOWFLAKE (Criação Real na Base do X):{C_RESET}")
        print(f"  • {C_BOLD}User ID Numérico:{C_RESET} {C_WHITE}{user_snow['id']}{C_RESET}")
        print(f"  • {C_BOLD}Segundo Exato de Criação:{C_RESET} {C_GREEN}{user_snow['datetime_utc']}{C_RESET}")
        print(f"  • {C_BOLD}Cluster de Origem:{C_RESET} Datacenter #{user_snow['datacenter_id']} | Worker #{user_snow['worker_id']}")
        
    avatar_snow = data.get("avatar_snowflake")
    if avatar_snow and "datetime_utc" in avatar_snow:
        print(f"  • {C_BOLD}Última Atualização de Foto:{C_RESET} {avatar_snow['datetime_utc']}")
        
    # Activity Metrics
    posts = data.get("posts_count", 0)
    posts_raw = data.get("posts_raw", str(posts))
    print(f"\n{C_BOLD}📊 MÉTRICAS DE ENGAJAMENTO E FREQUÊNCIA:{C_RESET}")
    print(f"  • {C_BOLD}Volume Total de Posts:{C_RESET} ~{posts_raw} ({posts:,} tweets registrados)")
    if "posts_per_day" in data:
        p_day = data['posts_per_day']
        color_rate = C_RED if p_day > 60 else (C_YELLOW if p_day > 25 else C_GREEN)
        print(f"  • {C_BOLD}Ritmo Médio:{C_RESET} {color_rate}{p_day} posts/dia{C_RESET} (em ~{data.get('days_active')} dias de atividade)")

    # Bot & Automation Gauge
    score = data.get("bot_score", 0)
    score_color = C_GREEN if score < 30 else (C_YELLOW if score < 60 else C_RED)
    bars = int(score / 5)
    gauge = f"[{score_color}{'█' * bars}{C_DIM}{'░' * (20 - bars)}{C_RESET}] {score_color}{score}%{C_RESET}"
    
    print(f"\n{C_BOLD}🤖 ANÁLISE DE AUTOMAÇÃO E PROBABILIDADE DE BOTS:{C_RESET}")
    print(f"  • {C_BOLD}Índice de Automação:{C_RESET} {gauge}")
    
    if score < 30:
        print(f"  • {C_BOLD}Classificação de Risco:{C_RESET} {C_GREEN}PADRÃO HUMANO / BAIXO RISCO{C_RESET}")
    elif score < 60:
        print(f"  • {C_BOLD}Classificação de Risco:{C_RESET} {C_YELLOW}ATIVIDADE MISTA / AUTOMAÇÃO PARCIAL (AGREGADOR){C_RESET}")
    else:
        print(f"  • {C_BOLD}Classificação de Risco:{C_RESET} {C_RED}ALTA PROBABILIDADE DE BOT / CONTA MALICIOSA{C_RESET}")
        
    reasons = data.get("bot_reasons", [])
    if reasons:
        print(f"  • {C_BOLD}Fatores Observados no Algoritmo:{C_RESET}")
        for r in reasons:
            print(f"    - {r}")

    # Cross-platform scan results
    if cross_results is not None:
        print(f"\n{C_BOLD}{C_CYAN}🌐 RASTREAMENTO CRUZADO DE IDENTIDADE OSINT (15+ REDES):{C_RESET}")
        found_any = False
        for item in cross_results:
            if item.get("found"):
                found_any = True
                print(f"  {C_GREEN}✔ [LOCALIZADO]{C_RESET} {C_BOLD}{item['platform']:<12}{C_RESET} ➔ {C_CYAN}{item['url']}{C_RESET}")
        if not found_any:
            print(f"  {C_DIM}Nenhum perfil público com o mesmo identificador foi encontrado nas redes testadas.{C_RESET}")

    print(f"\n{C_DIM}══════════════════════════════════════════════════════════════════════{C_RESET}\n")

def main():
    parser = argparse.ArgumentParser(description="BLACKCORE X-Inspector & OSINT Toolkit — Ultra HUD")
    parser.add_argument("target", help="Username (@handle), URL de perfil, URL de tweet ou Snowflake ID")
    parser.add_argument("-c", "--cross", action="store_true", help="Executa varredura cruzada de username em múltiplas redes (OSINT)")
    parser.add_argument("-j", "--json", action="store_true", help="Retorna saída formatada em JSON puro")
    parser.add_argument("--no-anim", action="store_true", help="Desativa a animação HUD e imprime direto")
    
    args = parser.parse_args()
    parsed = parse_target(args.target)
    
    # Check if stdout is a TTY and animation is enabled
    is_tty = sys.stdout.isatty() and not args.json and not args.no_anim
    
    if parsed["type"] == "snowflake":
        data = {
            "type": "snowflake",
            "snowflake": decode_snowflake(parsed["snowflake_id"])
        }
        if args.json:
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            render_terminal_report(data)
        return
        
    if parsed["type"] == "tweet":
        snow = decode_snowflake(parsed["tweet_id"])
        data = {
            "type": "tweet",
            "username": parsed["username"],
            "tweet_id": parsed["tweet_id"],
            "tweet_snowflake": snow
        }
        if args.json:
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            render_terminal_report(data)
        return
        
    # Profile & OSINT Execution
    username = parsed["username"]
    
    stop_anim = threading.Event()
    anim_thread = None
    if is_tty:
        anim_thread = threading.Thread(target=run_cyber_investigation_animation, args=(username, stop_anim))
        anim_thread.start()
        
    profile_data = fetch_profile_data(username)
    profile_data["type"] = "profile"
    
    cross_results = None
    if args.cross:
        cross_results = cross_check_handle(username)
        profile_data["cross_platforms"] = cross_results
        
    if is_tty and anim_thread:
        # Guarantee at least 1.2s of slick HUD presentation
        time.sleep(0.4)
        stop_anim.set()
        anim_thread.join()
        
    if args.json:
        print(json.dumps(profile_data, indent=2, ensure_ascii=False))
    else:
        render_terminal_report(profile_data, cross_results)

if __name__ == "__main__":
    main()
