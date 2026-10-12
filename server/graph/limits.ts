/** Session-wide step bound. Per-node max_steps in the spec is the Phase 1 subgraph depth. */
export const SESSION_STEP_BOUND = 40;
export const LOOP_REPEAT_LIMIT = 3;
export const FATIGUE_THRESHOLD = 0.8;
export const FAST_SCORE = 0.85;
export const FAST_CONFIDENCE = 0.8;
/** Placeholder until Q4 (monthly model budget) is answered. CI never spends a paid key. */
export const DEFAULT_COST_BUDGET_USD = 1;
/** Hard ceiling. A session budget comes from config and cannot exceed this, even via env. */
export const MAX_COST_BUDGET_USD = 1;

export class CostBudgetRejected extends Error {
  readonly code = "COST_BUDGET_REJECTED";
  constructor(message: string) {
    super(message);
    this.name = "CostBudgetRejected";
  }
}

/** Session cap from config. Never taken from a fork patch or a caller-supplied field. */
export function costBudgetFromConfig(): number {
  const raw = process.env.COST_BUDGET_USD;
  const value = raw === undefined || raw === "" ? DEFAULT_COST_BUDGET_USD : Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_COST_BUDGET_USD) {
    throw new CostBudgetRejected(`cost budget ${raw ?? value} is outside (0, ${MAX_COST_BUDGET_USD}]`);
  }
  return value;
}
