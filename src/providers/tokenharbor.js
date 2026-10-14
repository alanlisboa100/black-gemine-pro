import fs from "node:fs";
import path from "node:path";
import {OpenAIProvider} from "./openai.js";
import {findModel, providerAuthCandidates} from "../config/models.js";
import {BC_HOME} from "../utils/paths.js";

export const TOKENHARBOR_FAST_POOL_ID = "tokenharbor-fast-pool";
export const DEFAULT_FAST_POOL = [
  "deepseek-v4.1-flash:free",
  "deepseek-v4-flash:free",
  "mimo-v2.6-flash:free",
  "mimo-v2.5:free"
];

const POOL_FILE = path.join(BC_HOME, "tokenharbor_key_pool.json");
const cooldowns = new Map();
const modelCooldowns = new Map();
let currentKeySlot = 1;
let sharedPoolIndex = 0;
let sharedActiveModel = null;

function readPoolFileKeys() {
  try {
    if (fs.existsSync(POOL_FILE)) {
      const data = JSON.parse(fs.readFileSync(POOL_FILE, "utf8"));
      const keys = Array.isArray(data) ? data : data.keys;
      if (Array.isArray(keys) && keys.length) return keys;
    }
  } catch {}
  return [];
}

export function getHarborKeys(cfg, provider = "tokenharbor") {
  const candidates = providerAuthCandidates(cfg, provider);
  if (candidates.length) return candidates;
  // Fallback to tokenharbor_key_pool.json
  const fileKeys = readPoolFileKeys();
  return fileKeys.map((k, i) => ({
    key: k,
    source: "tokenharbor_key_pool.json",
    env: `TOKENHARBOR_API_KEY_${i + 1}`,
    slot: i + 1
  }));
}

function mayAdvance(e) {
  const message = String(e?.message || e?.responseBody || e || "");
  const status = Number(e?.status || message.match(/HTTP\s+(\d{3})/)?.[1] || 0);
  if (status === 401 || status === 403 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) return true;
  return /timeout|timed out|fetch failed|network|socket|terminated|connection|econn|enotfound|eai_again|campaign|allowance/i.test(message);
}

export class TokenHarborProvider extends OpenAIProvider {
  constructor(cfg, provider, model) {
    super(cfg, provider, model);
    this.poolIndex = sharedPoolIndex;
    this.poolActiveModel = sharedActiveModel;
  }

  isFastPool() {
    return (
      this.model === TOKENHARBOR_FAST_POOL_ID ||
      this.model === "tokenharbor-free-pool" ||
      this.model === "dual-fast-pool" ||
      this.model === "fast-pool"
    );
  }

  modelInfo() {
    if (this.isFastPool() && (this.poolActiveModel || sharedActiveModel)) {
      return findModel(this.cfg, this.provider, this.poolActiveModel || sharedActiveModel);
    }
    return super.modelInfo();
  }

  async keyedChat(model, opts, cfg = this.cfg) {
    const keys = getHarborKeys(cfg, this.provider);
    if (!keys.length) {
      throw new Error(`Nenhuma chave Token Harbor encontrada para ${this.provider}`);
    }

    const now = Date.now();
    const available = keys.filter(k => {
      const until = cooldowns.get(k.key) || 0;
      return now >= until;
    });

    const activeKeys = available.length ? available : keys;
    let lastErr;

    for (let attempt = 0; attempt < activeKeys.length; attempt++) {
      const idx = (currentKeySlot - 1 + attempt) % activeKeys.length;
      const entry = activeKeys[idx];

      const keyedCfg = {
        ...cfg,
        retry: {maxAttempts: 1, baseDelayMs: 0},
        requestTimeoutMs: Math.min(cfg.requestTimeoutMs || 30000, 20000),
        providers: {
          ...(cfg.providers || {}),
          [this.provider]: {
            ...(cfg.providers?.[this.provider] || {}),
            apiKey: entry.key
          }
        }
      };

      try {
        const delegate = new OpenAIProvider(keyedCfg, this.provider, model);
        const out = await delegate.chat(opts);
        currentKeySlot = entry.slot;
        return {
          ...out,
          tokenHarborSlot: entry.slot,
          tokenHarborKeyEnv: entry.env || null
        };
      } catch (e) {
        lastErr = e;
        if (!mayAdvance(e)) throw e;
        const msg = String(e?.message || e?.responseBody || "");
        const isLongQuota = /rolling\s*7-day|period.*free allowance|balance_zero/i.test(msg);
        cooldowns.set(entry.key, Date.now() + (isLongQuota ? 3600000 : 60000));
      }
    }

    throw lastErr || new Error("Todas as chaves Token Harbor falharam ou estão em cooldown.");
  }

  async fastPoolChat(opts) {
    const pcfg = this.cfg.providers?.[this.provider] || {};
    const configuredPool = (Array.isArray(pcfg.fastPoolModels) && pcfg.fastPoolModels.length)
      ? pcfg.fastPoolModels
      : DEFAULT_FAST_POOL;

    const now = Date.now();
    const activeCandidates = configuredPool.filter(m => (modelCooldowns.get(m) || 0) <= now);
    const pool = activeCandidates.length ? activeCandidates : configuredPool;

    let lastErr;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[(this.poolIndex + i) % pool.length];
      try {
        const out = await this.keyedChat(candidate, opts);
        sharedPoolIndex = (this.poolIndex + i) % pool.length;
        sharedActiveModel = candidate;
        this.poolIndex = sharedPoolIndex;
        this.poolActiveModel = candidate;
        return {
          ...out,
          provider: this.provider,
          model: candidate,
          pool: true,
          poolSelected: candidate,
          poolKeySlot: out.tokenHarborSlot
        };
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || e?.responseBody || "");
        const isCampaignLimit = /campaign|allowance/i.test(msg);
        modelCooldowns.set(candidate, Date.now() + (isCampaignLimit ? 600000 : 60000));

        if (!mayAdvance(e) || i === pool.length - 1) break;
      }
    }
    throw lastErr || new Error("Token Harbor Fast Pool esgotado");
  }

  async chat(opts) {
    if (this.isFastPool()) {
      return this.fastPoolChat(opts);
    }
    return this.keyedChat(this.model, opts);
  }
}
