import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { isGraphInterrupt } from "@langchain/langgraph";
import { runContext } from "../runtime/context.js";
import { appendNodeLog } from "../telemetry/node_log.js";
import { MAX_OUTPUT_TOKENS, assertWithinCap, computeCost, enforceRunCostCap, roundUsd, type ModelPrice } from "./pricing.js";
import { fakeProvider } from "./providers/fake.js";
import { openaiCompatProvider } from "./providers/openai_compat.js";
import { recordedProvider } from "./providers/recorded.js";
import {
  RealProviderDisabled,
  RouterPoolExhaustedError,
  type CompleteArgs,
  type ModelCall,
  type Provider,
  type RoutingConfig,
} from "./types.js";

const DEFAULT_ROUTING = join(dirname(fileURLToPath(import.meta.url)), "routing.v1.yaml");

export function loadRouting(path = process.env.ROUTING_CONFIG ?? DEFAULT_ROUTING): RoutingConfig {
  return parse(readFileSync(path, "utf8")) as RoutingConfig;
}

export function resolveProvider(kind = process.env.LLM_PROVIDER ?? "fake"): Provider {
  if (kind === "fake") return fakeProvider;
  if (kind === "recorded") return recordedProvider;
  if (kind === "openai_compat") return openaiCompatProvider;
  throw new RealProviderDisabled(`unknown LLM_PROVIDER ${kind}`);
}

const spentBySession = new Map<string, number>();

export function getSessionSpend(sessionId: string): number {
  return spentBySession.get(sessionId) ?? 0;
}

export function resetSessionSpendForTests(): void {
  spentBySession.clear();
}

function spentSoFar(sessionId: string, stateSpend: number): number {
  return roundUsd(Math.max(stateSpend, spentBySession.get(sessionId) ?? 0));
}

function noteSpend(sessionId: string, total: number): number {
  const next = roundUsd(total);
  spentBySession.set(sessionId, next);
  return next;
}

function usageFrom(error: unknown): { tokens_in: number; tokens_out: number } | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { tokens_in?: unknown; tokens_out?: unknown };
  if (typeof record.tokens_in === "number" && typeof record.tokens_out === "number") {
    return { tokens_in: record.tokens_in, tokens_out: record.tokens_out };
  }
  return null;
}

/**
 * A failed or timed-out call still costs money. Use provider-reported usage when
 * the error carries it; otherwise charge the input estimate (output was not produced).
 */
export function failureCharge(
  model: string,
  estimatedTokensIn: number,
  error: unknown,
  table?: Record<string, ModelPrice>,
): number {
  const usage = usageFrom(error);
  return computeCost(model, usage?.tokens_in ?? estimatedTokensIn, usage?.tokens_out ?? 0, table);
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // Model text that is not JSON still returns an empty delta.
  }
  return {};
}

export function createRouter(options?: {
  routing?: RoutingConfig;
  provider?: Provider;
  prices?: Record<string, ModelPrice>;
  maxOutputTokens?: number;
}) {
  const routing = options?.routing ?? loadRouting();
  const provider = options?.provider ?? resolveProvider();
  const prices = options?.prices;
  const maxOutputTokens = options?.maxOutputTokens ?? MAX_OUTPUT_TOKENS;
  return {
    provider,
    routing,
    async complete(args: CompleteArgs): Promise<ModelCall> {
      const pool = routing.task_types[args.taskType];
      if (!pool?.length) throw new Error(`unknown task type ${args.taskType}`);
      const causes: unknown[] = [];
      let fallbackFrom: string | null = null;
      let spent = spentSoFar(args.sessionId, args.spentUsd);
      for (const candidate of pool) {
        const tokensIn = Math.max(1, Math.ceil(args.prompt.length / 4));
        try {
          enforceRunCostCap({
            model: candidate.model,
            tokensIn,
            maxTokensOut: maxOutputTokens,
            spentUsd: spent,
            capUsd: args.capUsd,
            table: prices,
          });
          const result = await provider.complete({
            model: candidate.model,
            taskType: args.taskType,
            prompt: args.prompt,
            timeoutMs: candidate.timeout_ms,
          });
          const cost = computeCost(candidate.model, result.tokens_in, result.tokens_out, prices);
          spent = noteSpend(args.sessionId, spent + cost);
          const call: ModelCall = {
            provider: provider.id,
            model: candidate.model,
            fallback_from: fallbackFrom,
            text: result.text,
            json: parseJson(result.text),
            tokens_in: result.tokens_in,
            tokens_out: result.tokens_out,
            cost_usd: cost,
            latency_ms: result.latency_ms,
          };
          appendNodeLog(logFrom(args, call));
          assertWithinCap(spent - cost, cost, args.capUsd);
          return call;
        } catch (error) {
          if (isGraphInterrupt(error)) throw error;
          if (error instanceof Error && error.name === "PricingRejected") throw error;
          if (error instanceof Error && error.name === "CostCapExceeded") throw error;
          const cost = failureCharge(candidate.model, tokensIn, error, prices);
          spent = noteSpend(args.sessionId, spent + cost);
          appendNodeLog({
            run_id: args.runId,
            session_id: args.sessionId,
            checkpoint_id: null,
            node: args.node,
            task_type: args.taskType,
            provider: provider.id,
            model: candidate.model,
            fallback_from: fallbackFrom,
            tokens_in: usageFrom(error)?.tokens_in ?? tokensIn,
            tokens_out: usageFrom(error)?.tokens_out ?? 0,
            cost_usd: cost,
            latency_ms: 0,
            edge_taken: args.edgeTaken,
            condition_id: args.conditionId,
            ts_utc: new Date().toISOString(),
          });
          causes.push(error);
          fallbackFrom = candidate.model;
        }
      }
      throw new RouterPoolExhaustedError(args.taskType, causes);
    },
  };
}

function logFrom(args: CompleteArgs, call: ModelCall) {
  return {
    run_id: args.runId,
    session_id: args.sessionId,
    checkpoint_id: null,
    node: args.node,
    task_type: args.taskType,
    provider: call.provider,
    model: call.model,
    fallback_from: call.fallback_from,
    tokens_in: call.tokens_in,
    tokens_out: call.tokens_out,
    cost_usd: call.cost_usd,
    latency_ms: call.latency_ms,
    edge_taken: args.edgeTaken,
    condition_id: args.conditionId,
    ts_utc: new Date().toISOString(),
  };
}

let routerOverride: ReturnType<typeof createRouter> | null = null;

export function useRouterForTests(router: ReturnType<typeof createRouter> | null): void {
  routerOverride = router;
}

export async function complete(args: CompleteArgs): Promise<ModelCall> {
  if (runContext.getStore()?.provider === "recorded") {
    return createRouter({ provider: recordedProvider }).complete(args);
  }
  const router = routerOverride ?? createRouter();
  return router.complete(args);
}
