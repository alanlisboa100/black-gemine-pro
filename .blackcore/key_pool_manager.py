#!/usr/bin/env python3
import json, os, time, urllib.request

POOL_FILE = '/data/data/com.termux/files/home/.blackcore/google_key_pool.json'

class KeyPoolManager:
    def __init__(self, pool_file=POOL_FILE):
        self.pool_file = pool_file
        self.keys = []
        self.cooldowns = {}
        self.current_idx = 0
        self.load_keys()

    def load_keys(self):
        if os.path.exists(self.pool_file):
            try:
                with open(self.pool_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.keys = data.get('keys', [])
            except Exception as e:
                pass

    def get_key(self):
        if not self.keys:
            return None
        now = time.time()
        for _ in range(len(self.keys)):
            key = self.keys[self.current_idx]
            self.current_idx = (self.current_idx + 1) % len(self.keys)
            # check if in cooldown
            if key in self.cooldowns and now < self.cooldowns[key]:
                continue
            return key
        # If all in cooldown, return first key
        return self.keys[0]

    def report_error(self, key, status_code=429):
        # Set 60s cooldown on Rate Limit (429)
        if status_code in [429, 403]:
            self.cooldowns[key] = time.time() + 60

if __name__ == '__main__':
    mgr = KeyPoolManager()
    print(f"KeyPoolManager: {len(mgr.keys)} keys loaded.")
    key = mgr.get_key()
    if key:
        print(f"Current active key slot: {key[:8]}...{key[-4:]}")
