import type { TaskType } from "../graph/spec/types.js";

export interface PoolEntry {
  model: string;
  timeout_ms: number;
}

export interface RoutingConfig {
  version: string;
  description?: string;
  task_types: Record<string, PoolEntry[]>;
}

export interface CompleteArgs {
  node: string;
  taskType: TaskType | string;
  prompt: string;
  sessionId: string;
  runId: string;
  spentUsd: number;
  capUsd: number;
  edgeTaken: string | null;
  conditionId: string | null;
}

export interface ModelCall {
  provider: string;
  model: string;
  fallback_from: string | null;
  text: string;
  json: Record<string, unknown>;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  /** Session total after this call, including fallback charges that preceded a success. */
  session_spent_usd: number;
  latency_ms: number;
}

export interface ProviderRequest {
  model: string;
  taskType: string;
  prompt: string;
  timeoutMs: number;
}

export interface ProviderResult {
  text: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
}

export interface Provider {
  id: string;
  complete(request: ProviderRequest): Promise<ProviderResult>;
}

export class RouterPoolExhaustedError extends Error {
  readonly code = "ROUTER_POOL_EXHAUSTED";
  readonly taskType: string;
  readonly sessionSpentUsd: number;
  constructor(taskType: string, causes: unknown[], sessionSpentUsd: number) {
    super(`all models failed for task type ${taskType}: ${causes.map(String).join(" | ")}`);
    this.name = "RouterPoolExhaustedError";
    this.taskType = taskType;
    this.sessionSpentUsd = sessionSpentUsd;
  }
}

export class RealProviderDisabled extends Error {
  readonly code = "REAL_PROVIDER_DISABLED";
  constructor(message = "real provider disabled") {
    super(message);
    this.name = "RealProviderDisabled";
  }
}
