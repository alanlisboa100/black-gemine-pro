#!/usr/bin/env python3
"""
tokenharbor_pool_manager.py - Gerenciador do Enxame Multi-Chave & Dual Fast Pool Token Harbor
Equipado com Rotação Round-Robin entre 8 Chaves e Failover Híbrido entre os 2 Modelos Mais Rápidos:
  1. qwen3.8-flash:free (1.64s TTFT)
  2. mimo-v2.6-flash:free (1.73s TTFT)
  Backup: deepseek-v4-flash:free (2.71s TTFT)
"""

import os
import sys
import time
import json
import requests
import concurrent.futures
from pathlib import Path

POOL_FILE       = Path.home() / ".blackcore" / "tokenharbor_key_pool.json"
COOLDOWNS_FILE  = Path.home() / ".blackcore" / "tokenharbor_cooldowns.json"
BASE_URL        = "https://tokenharbor.ai/v1"
FAST_MODELS = [
    "deepseek-v4.1-flash:free",
    "deepseek-v4-flash:free",
    "mimo-v2.6-flash:free",
    "mimo-v2.5:free"
]

class TokenHarborPoolManager:
    def __init__(self, pool_file=POOL_FILE, base_url=BASE_URL):
        self.pool_file = Path(pool_file)
        self.base_url = base_url.rstrip("/")
        self.keys = []
        self.cooldowns = {}
        self.exhausted_models = {}
        self.current_idx = 0
        self.current_model_idx = 0
        self.load_keys()
        self.load_cooldowns()

    def load_cooldowns(self):
        if COOLDOWNS_FILE.exists():
            try:
                with open(COOLDOWNS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    now = time.time()
                    self.cooldowns = {k: v for k, v in data.get("keys", {}).items() if v > now}
                    self.exhausted_models = {k: v for k, v in data.get("models", {}).items() if v > now}
            except Exception:
                pass

    def save_cooldowns(self):
        try:
            with open(COOLDOWNS_FILE, "w", encoding="utf-8") as f:
                json.dump({"keys": self.cooldowns, "models": self.exhausted_models}, f)
        except Exception:
            pass

    def load_keys(self):
        if self.pool_file.exists():
            try:
                with open(self.pool_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.keys = data.get("keys", [])
            except Exception as e:
                print(f"[!] Erro ao carregar pool de chaves: {e}", file=sys.stderr)

    def get_key(self):
        if not self.keys:
            return None
        now = time.time()
        for _ in range(len(self.keys)):
            key = self.keys[self.current_idx]
            self.current_idx = (self.current_idx + 1) % len(self.keys)
            # Se a chave estiver em cooldown (429/timeout), pula para a próxima
            if key in self.cooldowns and now < self.cooldowns[key]:
                continue
            return key
        return self.keys[0]

    def report_error(self, key, status_code=429, body=""):
        if status_code in [429, 403, 502, 503, 504]:
            is_long = any(s in body.lower() for s in ["rolling 7-day", "allowance", "balance_zero"])
            cooldown_time = 3600 if is_long else 60
            self.cooldowns[key] = time.time() + cooldown_time
            self.save_cooldowns()
            slot = self.keys.index(key) + 1 if key in self.keys else "?"
            label = "1 hora" if is_long else "60s"
            print(f"[⚡ FAILOVER] Slot #{slot} em cooldown por {label} (HTTP {status_code}). Pivotando...", file=sys.stderr)

    def report_success(self, key):
        if key in self.cooldowns:
            del self.cooldowns[key]
            self.save_cooldowns()

    def get_next_fast_model(self):
        """Alterna no Dual Pool entre DeepSeek V4.1 e DeepSeek V4"""
        model = FAST_MODELS[self.current_model_idx % 2]
        self.current_model_idx += 1
        return model

    def fast_chat(self, prompt, max_tokens=350, stream=True, models_priority=None):
        """
        Executa chamada ultra-rápida combinando 8 Chaves x Modelos Rápidos com Failover Inteligente
        """
        if models_priority is None:
            # Prioriza modelos não esgotados
            now = time.time()
            active_models = [m for m in FAST_MODELS if m not in self.exhausted_models or now > self.exhausted_models[m]]
            if not active_models:
                active_models = FAST_MODELS # Reseta se todos esgotaram
            models_priority = active_models

        messages = [{"role": "user", "content": prompt}]
        errors = []

        for model in models_priority:
            for _ in range(2): # Tenta até 2 chaves por modelo antes de trocar
                key = self.get_key()
                if not key:
                    break
                slot = self.keys.index(key) + 1 if key in self.keys else "?"
                headers = {
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "stream": stream
                }

                try:
                    r = requests.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=12,
                        stream=stream
                    )
                    if r.status_code == 200:
                        self.report_success(key)
                        if stream:
                            return r, model, slot
                        return r.json(), model, slot
                    else:
                        body_text = r.text if not stream else r.raw.read().decode("utf-8", errors="ignore")
                        if "this campaign's own allowance" in body_text:
                            print(f"[⚡ SMART FAILOVER] Campanha do modelo {model} esgotada. Isolando modelo...", file=sys.stderr)
                            self.exhausted_models[model] = time.time() + 600 # 10 min de isolamento
                            self.save_cooldowns()
                            break
                        self.report_error(key, r.status_code, body_text)
                        errors.append(f"{model} (Slot #{slot}): HTTP {r.status_code}")
                except Exception as e:
                    self.report_error(key, 504)
                    errors.append(f"{model} (Slot #{slot}): {str(e)}")

        raise RuntimeError(f"Dual Pool esgotado. Erros: {'; '.join(errors)}")

    def benchmark_dual_pool(self):
        print(f"[*] ⚡ Benchmark do Dual Fast Pool (Qwen 3.8 Flash + MiMo 2.6 Flash + DeepSeek V4)...")
        print(f"[*] 8 Chaves x 3 Modelos Gratuitos = 24 Rotas Rápidas no Enxame\n")

        print(f"{'MODELO':<24} | {'SLOT CHAVE':<10} | {'TTFT':<10} | {'STATUS'}")
        print("-" * 62)

        for model in FAST_MODELS:
            key = self.get_key()
            slot = self.keys.index(key) + 1 if key in self.keys else "?"
            start = time.time()
            try:
                r = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": [{"role": "user", "content": "1"}], "max_tokens": 5, "stream": True},
                    timeout=8,
                    stream=True
                )
                if r.status_code == 200:
                    for line in r.iter_lines():
                        if line and b"data: " in line and b"[DONE]" not in line:
                            ttft = time.time() - start
                            print(f"{model:<24} | Slot #{slot:<5} | {ttft:.2f}s     | 🟢 ONLINE (Ultra Rápido)")
                            break
                else:
                    print(f"{model:<24} | Slot #{slot:<5} | -          | 🔴 HTTP {r.status_code}")
            except Exception as e:
                print(f"{model:<24} | Slot #{slot:<5} | -          | ⚠️ Timeout/Busy")

        print("-" * 62)

def main():
    mgr = TokenHarborPoolManager()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"

    if cmd == "test" or cmd == "benchmark":
        mgr.benchmark_dual_pool()
    elif cmd == "status":
        print(f"👑 [BLACKCORE FAST POOL]")
        print(f"  Chaves Ativas: {len(mgr.keys)} chaves em rotação")
        print(f"  Modelos no Dual Fast Pool: Qwen 3.8 Flash ⚡ + MiMo 2.6 Flash 🚀")
        print(f"  Fallback: DeepSeek V4 Flash 💨")
        print(f"  Total de Nós de Contingência: {len(mgr.keys) * 2} combinações simultâneas")
    elif cmd in ["ask", "chat", "run"]:
        prompt = sys.argv[2] if len(sys.argv) > 2 else "Diga apenas: Dual Fast Pool operacional!"
        print(f"[*] Consultando Dual Fast Pool: \"{prompt}\"...\n")
        try:
            r, model_used, slot_used = mgr.fast_chat(prompt, max_tokens=300, stream=True)
            print(f"⚡ [Respondido por: {model_used} | Chave: Slot #{slot_used}]\n")
            for line in r.iter_lines():
                if line:
                    d = line.decode("utf-8")
                    if d.startswith("data: "):
                        raw = d[6:].strip()
                        if raw == "[DONE]": break
                        try:
                            c = json.loads(raw)["choices"][0]["delta"].get("content", "")
                            if c:
                                sys.stdout.write(c)
                                sys.stdout.flush()
                        except: pass
            print("\n")
        except Exception as e:
            print(f"Erro no Fast Pool: {e}")
    else:
        print("Uso: tokenharbor_pool_manager.py [status|test|ask <pergunta>]")

if __name__ == "__main__":
    main()
