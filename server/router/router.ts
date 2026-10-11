import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { isGraphInterrupt } from "@langchain/langgraph";
import { appendNodeLog } from "../telemetry/node_log.js";
import { MAX_OUTPUT_TOKENS, assertWithinCap, computeCost, enforceRunCostCap } from "./pricing.js";
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

function parseJson(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // Model text that is not JSON still returns an empty delta.
  }
  return {};
}

export function createRouter(options?: { routing?: RoutingConfig; provider?: Provider }) {
  const routing = options?.routing ?? loadRouting();
  const provider = options?.provider ?? resolveProvider();
  return {
    provider,
    routing,
    async complete(args: CompleteArgs): Promise<ModelCall> {
      const pool = routing.task_types[args.taskType];
      if (!pool?.length) throw new Error(`unknown task type ${args.taskType}`);
      const causes: unknown[] = [];
      let fallbackFrom: string | null = null;
      for (const candidate of pool) {
        try {
          enforceRunCostCap({
            model: candidate.model,
            tokensIn: Math.max(1, Math.ceil(args.prompt.length / 4)),
            maxTokensOut: MAX_OUTPUT_TOKENS,
            spentUsd: args.spentUsd,
            capUsd: args.capUsd,
          });
          const result = await provider.complete({
            model: candidate.model,
            taskType: args.taskType,
            prompt: args.prompt,
            timeoutMs: candidate.timeout_ms,
          });
          const cost = computeCost(candidate.model, result.tokens_in, result.tokens_out);
          assertWithinCap(args.spentUsd, cost, args.capUsd);
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
          appendNodeLog({
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
          });
          return call;
        } catch (error) {
          if (isGraphInterrupt(error)) throw error;
          if (error instanceof Error && (error.name === "PricingRejected" || error.name === "CostCapExceeded")) {
            throw error;
          }
          causes.push(error);
          fallbackFrom = candidate.model;
        }
      }
      throw new RouterPoolExhaustedError(args.taskType, causes);
    },
  };
}

let routerOverride: ReturnType<typeof createRouter> | null = null;

export function useRouterForTests(router: ReturnType<typeof createRouter> | null): void {
  routerOverride = router;
}

export async function complete(args: CompleteArgs): Promise<ModelCall> {
  const router = routerOverride ?? createRouter();
  return router.complete(args);
}
