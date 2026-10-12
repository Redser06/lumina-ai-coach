import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { runContext } from "../runtime/context.js";
import { appendNodeLog } from "../telemetry/node_log.js";
import { MAX_OUTPUT_TOKENS, CostCapExceeded, PricingRejected, assertWithinCap, computeCost, enforceRunCostCap, roundUsd, type ModelPrice } from "./pricing.js";
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

export function sessionSpentUsd(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as { sessionSpentUsd?: unknown }).sessionSpentUsd;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function chargedNode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as { chargedNode?: unknown }).chargedNode;
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
 * the error carries it. Otherwise charge the input estimate and zero output.
 *
 * That estimate is also used when nothing was sent: a missing recording and
 * RealProviderDisabled fail inside the provider call, after the preflight, and
 * they do not carry usage. Charging the input estimate is the safe default so
 * a later call cannot pretend the attempt was free.
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
      let spent = roundUsd(args.spentUsd);
      let chargedThisCall = false;
      const note = (cost: number): number => {
        spent = roundUsd(spent + cost);
        chargedThisCall = true;
        return spent;
      };
      const bubble = (error: unknown): never => {
        if (chargedThisCall && error && typeof error === "object") {
          Object.assign(error, { sessionSpentUsd: spent });
        }
        throw error;
      };
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
        } catch (error) {
          bubble(error);
        }
        let result: Awaited<ReturnType<Provider["complete"]>>;
        try {
          result = await provider.complete({
            model: candidate.model,
            taskType: args.taskType,
            prompt: args.prompt,
            timeoutMs: candidate.timeout_ms,
          });
        } catch (error) {
          if (error instanceof PricingRejected || error instanceof CostCapExceeded) bubble(error);
          const cost = failureCharge(candidate.model, tokensIn, error, prices);
          note(cost);
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
          continue;
        }
        const cost = computeCost(candidate.model, result.tokens_in, result.tokens_out, prices);
        note(cost);
        const call: ModelCall = {
          provider: provider.id,
          model: candidate.model,
          fallback_from: fallbackFrom,
          text: result.text,
          json: parseJson(result.text),
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          cost_usd: cost,
          session_spent_usd: spent,
          latency_ms: result.latency_ms,
        };
        appendNodeLog(logFrom(args, call));
        try {
          assertWithinCap(spent - cost, cost, args.capUsd);
        } catch (error) {
          bubble(error);
        }
        return call;
      }
      throw new RouterPoolExhaustedError(args.taskType, causes, spent);
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
