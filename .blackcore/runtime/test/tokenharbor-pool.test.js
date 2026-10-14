import test from "node:test";
import assert from "node:assert/strict";
import {TokenHarborProvider, TOKENHARBOR_FAST_POOL_ID} from "../src/providers/tokenharbor.js";
import {initConfig, loadConfig} from "../src/config/loader.js";

test("TokenHarborProvider loads fast pool and models properly", () => {
  initConfig();
  const cfg = loadConfig();
  assert.ok(cfg.providers.tokenharbor, "tokenharbor provider should be registered in cfg");
  assert.equal(cfg.providers.tokenharbor.models[0].id, TOKENHARBOR_FAST_POOL_ID);

  const provider = new TokenHarborProvider(cfg, "tokenharbor", TOKENHARBOR_FAST_POOL_ID);
  assert.equal(provider.isFastPool(), true);
});
