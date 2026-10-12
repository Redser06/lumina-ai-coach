export class PricingRejected extends Error {
  readonly code = "PRICING_REJECTED";
  constructor(message: string) {
    super(message);
    this.name = "PricingRejected";
  }
}

export class CostCapExceeded extends Error {
  readonly code = "COST_CAP_EXCEEDED";
  constructor(message: string) {
    super(message);
    this.name = "CostCapExceeded";
  }
}

export interface ModelPrice {
  input_per_million: number;
  output_per_million: number;
}

/** USD per 1M tokens. Every id the router can select is listed. Zero prices are absent on purpose. */
export const PRICE_PER_MILLION: Record<string, ModelPrice> = {
  "primary-tutor": { input_per_million: 0.15, output_per_million: 0.6 },
  "fallback-tutor": { input_per_million: 0.1, output_per_million: 0.4 },
  "primary-reasoner": { input_per_million: 1.25, output_per_million: 5 },
  "fallback-reasoner": { input_per_million: 0.8, output_per_million: 3.2 },
  "primary-grader": { input_per_million: 0.2, output_per_million: 0.8 },
  "fallback-grader": { input_per_million: 0.1, output_per_million: 0.4 },
  "primary-critic": { input_per_million: 0.3, output_per_million: 1.2 },
  "fallback-critic": { input_per_million: 0.15, output_per_million: 0.6 },
  "primary-classifier": { input_per_million: 0.05, output_per_million: 0.2 },
  "fallback-classifier": { input_per_million: 0.04, output_per_million: 0.16 },
  "primary-embed": { input_per_million: 0.02, output_per_million: 0.02 },
  "fallback-embed": { input_per_million: 0.01, output_per_million: 0.01 },
};

export function assertCap(cap: number): void {
  if (!Number.isFinite(cap) || cap <= 0) {
    throw new PricingRejected("invalid cost cap");
  }
}

export function requirePrice(model: string, table: Record<string, ModelPrice> = PRICE_PER_MILLION): ModelPrice {
  const row = table[model];
  if (!row) throw new PricingRejected(`unknown model id: ${model}`);
  if (!isPositiveFinite(row.input_per_million) || !isPositiveFinite(row.output_per_million)) {
    throw new PricingRejected(`zero or non-finite price for ${model}`);
  }
  return row;
}

export function computeCost(model: string, tokensIn: number, tokensOut: number, table?: Record<string, ModelPrice>): number {
  const row = requirePrice(model, table);
  if (!Number.isFinite(tokensIn) || !Number.isFinite(tokensOut) || tokensIn < 0 || tokensOut < 0) {
    throw new PricingRejected("invalid token counts");
  }
  const cost = (tokensIn * row.input_per_million + tokensOut * row.output_per_million) / 1_000_000;
  if (!Number.isFinite(cost) || cost < 0) throw new PricingRejected("non-finite cost");
  return roundUsd(cost);
}

/**
 * Fail closed before a provider call. Unknown models, bad prices, invalid caps,
 * and a worst-case estimate over the remaining budget are rejected. This does not
 * fall through to a cheaper model (that behaviour is AC-16, Phase 2).
 */
export function enforceRunCostCap(args: {
  model: string;
  tokensIn: number;
  maxTokensOut: number;
  spentUsd: number;
  capUsd: number;
  table?: Record<string, ModelPrice>;
}): number {
  assertCap(args.capUsd);
  if (!Number.isFinite(args.spentUsd) || args.spentUsd < 0) {
    throw new PricingRejected("invalid spent amount");
  }
  const estimate = computeCost(args.model, args.tokensIn, args.maxTokensOut, args.table);
  if (args.spentUsd + estimate > args.capUsd) {
    throw new CostCapExceeded(
      `per-run cost cap exceeded: spent ${args.spentUsd} + estimate ${estimate} > cap ${args.capUsd}`,
    );
  }
  return estimate;
}

export function assertWithinCap(spentUsd: number, costUsd: number, capUsd: number): void {
  assertCap(capUsd);
  if (!Number.isFinite(spentUsd) || spentUsd < 0 || !Number.isFinite(costUsd) || costUsd < 0) {
    throw new PricingRejected("invalid cost accounting");
  }
  if (spentUsd + costUsd > capUsd) {
    throw new CostCapExceeded(`per-run cost cap exceeded: spent ${spentUsd} + cost ${costUsd} > cap ${capUsd}`);
  }
}

export function roundUsd(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export const MAX_OUTPUT_TOKENS = 1024;
