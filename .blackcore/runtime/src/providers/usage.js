export function normalizeUsage(raw = {}) {
  const input =
    raw.input ??
    raw.prompt_tokens ??
    raw.input_tokens ??
    raw.inputTokens ??
    0;

  const output =
    raw.output ??
    raw.completion_tokens ??
    raw.output_tokens ??
    raw.outputTokens ??
    0;

  const cacheRead =
    raw.cacheRead ??
    raw.prompt_cache_hit_tokens ??
    raw.cache_read_input_tokens ??
    raw.cached_tokens ??
    raw.prompt_tokens_details?.cached_tokens ??
    0;

  const cacheWrite =
    raw.cacheWrite ??
    raw.cache_creation_input_tokens ??
    raw.cache_write_input_tokens ??
    0;

  const reasoning =
    raw.reasoning ??
    raw.completion_tokens_details?.reasoning_tokens ??
    raw.reasoning_tokens ??
    0;

  return {
    input,
    output,
    total: raw.total_tokens ?? input + output,
    cacheRead,
    cacheWrite,
    reasoning,
    raw,
  };
}

export function addUsage(a = {}, b = {}) {
  const x = normalizeUsage(a);
  const y = normalizeUsage(b);

  return {
    input: x.input + y.input,
    output: x.output + y.output,
    total: x.total + y.total,
    cacheRead: x.cacheRead + y.cacheRead,
    cacheWrite: x.cacheWrite + y.cacheWrite,
    reasoning: x.reasoning + y.reasoning,
  };
}

export function estimateCost(usage, modelInfo = {}) {
  const u = normalizeUsage(usage);
  const pricing = modelInfo.pricing;
  if (!pricing) return null;

  const regularInput = Math.max(0, u.input - u.cacheRead);

  const inputCost =
    regularInput / 1_000_000 * (pricing.input ?? 0);

  const cacheReadCost =
    u.cacheRead / 1_000_000 * (
      pricing.cacheRead ??
      pricing.input ??
      0
    );

  const outputCost =
    u.output / 1_000_000 * (pricing.output ?? 0);

  return {
    inputCost,
    cacheReadCost,
    outputCost,
    total: inputCost + cacheReadCost + outputCost,
    currency: pricing.currency || "USD",
  };
}

export function formatUsage(usage = {}) {
  const u = normalizeUsage(usage);
  const parts = [
    `↑${u.input.toLocaleString()}`,
    `↓${u.output.toLocaleString()}`,
  ];

  if (u.cacheRead) parts.push(`R${u.cacheRead.toLocaleString()}`);
  if (u.cacheWrite) parts.push(`W${u.cacheWrite.toLocaleString()}`);
  if (u.reasoning) parts.push(`think=${u.reasoning.toLocaleString()}`);

  return parts.join(" ");
}
