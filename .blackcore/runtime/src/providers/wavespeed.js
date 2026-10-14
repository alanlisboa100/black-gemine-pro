import {OpenAIProvider} from "./openai.js";
import {findModel} from "../config/models.js";

export const WAVESPEED_ECO_POOL_ID = "wavespeed-eco-pool";
export const DEFAULT_ECO_POOL = [
  "qwen/qwen3.7-flash",
  "mistralai/mistral-nemo",
  "deepseek/deepseek-v4-flash-0731"
];

function errorStatus(e) {
  return Number(e?.status || String(e?.message || "").match(/HTTP\s+(\d{3})/)?.[1] || 0);
}

function mayAdvance(e) {
  const status = errorStatus(e);
  return status === 429 || status === 404 || status >= 500 || String(e?.message || "").includes("timeout");
}

export class WaveSpeedProvider extends OpenAIProvider {
  constructor(cfg, provider, model) {
    super(cfg, provider, model);
    this.poolIndex = 0;
    this.poolActiveModel = null;
  }

  isEcoPool() {
    return (
      this.model === WAVESPEED_ECO_POOL_ID ||
      this.model === "wavespeed-cheap-pool" ||
      this.model === "wavespeed-supremo-pool"
    );
  }

  modelInfo() {
    if (this.isEcoPool() && this.poolActiveModel) {
      return findModel(this.cfg, this.provider, this.poolActiveModel);
    }
    return super.modelInfo();
  }

  async chat(opts) {
    if (!this.isEcoPool()) {
      return super.chat(opts);
    }
    return this.ecoPoolChat(opts);
  }

  async ecoPoolChat(opts) {
    const pcfg = this.cfg.providers?.[this.provider] || {};
    const pool = (Array.isArray(pcfg.ecoPoolModels) && pcfg.ecoPoolModels.length)
      ? pcfg.ecoPoolModels
      : DEFAULT_ECO_POOL;

    let lastErr;
    for (let i = this.poolIndex; i < pool.length; i++) {
      const candidate = pool[i];
      try {
        const delegateProvider = new OpenAIProvider(this.cfg, this.provider, candidate);
        const out = await delegateProvider.chat(opts);
        this.poolIndex = i;
        this.poolActiveModel = candidate;
        return {
          ...out,
          provider: this.provider,
          model: candidate,
          pool: true,
          poolSelected: candidate
        };
      } catch (e) {
        lastErr = e;
        if (!mayAdvance(e) || i === pool.length - 1) {
          throw e;
        }
        this.poolIndex = i + 1;
        this.poolActiveModel = pool[i + 1] || null;
      }
    }
    throw lastErr || new Error("WaveSpeed Eco Pool exhausted");
  }
}
