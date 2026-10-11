import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { stringify } from "yaml";
import { CostCapExceeded, PricingRejected, requirePrice, type ModelPrice } from "../router/pricing.js";
import { assertRealProviderEnabled } from "../router/providers/openai_compat.js";
import { complete, createRouter, getSessionSpend, loadRouting, resetSessionSpendForTests, useRouterForTests } from "../router/router.js";
import { RealProviderDisabled, RouterPoolExhaustedError, type CompleteArgs, type Provider } from "../router/types.js";
import { resetLogsForTests, logsForSession } from "../telemetry/node_log.js";

const envKeys = ["FAKE_FAIL", "LLM_PROVIDER", "ROUTING_CONFIG", "RECORDED_DIR", "RECORD_FIXTURES", "OPENAI_COMPAT_API_KEY", "OPENAI_COMPAT_BASE_URL", "CI", "NO_NETWORK"] as const;
const saved = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function restoreEnv(): void {
  for (const key of envKeys) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  useRouterForTests(null);
  resetLogsForTests();
  resetSessionSpendForTests();
}

function args(partial: Partial<CompleteArgs> = {}): CompleteArgs {
  return {
    node: "Teach",
    taskType: "tutor-chat",
    prompt: "node: Teach\ntask_type: tutor-chat\nscenario: none\nvisit: 0\ngoal: g",
    sessionId: "router-session",
    runId: "run-1",
    spentUsd: 0,
    capUsd: 1,
    edgeTaken: null,
    conditionId: null,
    ...partial,
  };
}

function countingProvider(): { provider: Provider; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    provider: {
      id: "fake",
      async complete(request) {
        calls.push(request.model);
        return { text: JSON.stringify({ note: "ok" }), tokens_in: 8, tokens_out: 4, latency_ms: 1 };
      },
    },
  };
}

describe("router", { concurrency: false }, () => {
  afterEach(() => restoreEnv());

  test("routes_per_task_type_from_config", async () => {
    const routing = loadRouting();
    const { provider } = countingProvider();
    const router = createRouter({ routing, provider });
    for (const [taskType, pool] of Object.entries(routing.task_types)) {
      const call = await router.complete(args({ taskType, node: taskType, sessionId: `route-${taskType}` }));
      assert.equal(call.model, pool[0]?.model);
      assert.equal(call.fallback_from, null);
      assert.ok(call.cost_usd > 0);
    }
  });

  test("falls_back_on_forced_failure", async () => {
    process.env.FAKE_FAIL = "primary-tutor";
    process.env.LLM_PROVIDER = "fake";
    const call = await complete(args());
    assert.equal(call.model, "fallback-tutor");
    assert.equal(call.fallback_from, "primary-tutor");
  });

  test("all_pool_failed_raises_typed_error", async () => {
    process.env.FAKE_FAIL = "primary-tutor,fallback-tutor";
    process.env.LLM_PROVIDER = "fake";
    await assert.rejects(() => complete(args({ sessionId: "exhausted" })), RouterPoolExhaustedError);
  });

  test("config_change_changes_model_without_code_change", async () => {
    const dir = mkdtempSync(join(tmpdir(), "routing-"));
    const path = join(dir, "routing.yaml");
    writeFileSync(
      path,
      stringify({
        version: "9.9.9",
        task_types: {
          "tutor-chat": [
            { model: "fallback-tutor", timeout_ms: 50 },
            { model: "primary-tutor", timeout_ms: 50 },
          ],
        },
      }),
    );
    process.env.ROUTING_CONFIG = path;
    process.env.LLM_PROVIDER = "fake";
    const call = await complete(args({ sessionId: "config-swap" }));
    assert.equal(call.model, "fallback-tutor");
    assert.equal(call.fallback_from, null);
  });

  test("node_log_has_model_tokens_cost_latency", async () => {
    process.env.LLM_PROVIDER = "fake";
    const call = await complete(args({ sessionId: "logged" }));
    const [row] = logsForSession("logged");
    assert.ok(row);
    assert.equal(row.model, call.model);
    assert.equal(typeof row.tokens_in, "number");
    assert.equal(typeof row.tokens_out, "number");
    assert.equal(typeof row.cost_usd, "number");
    assert.equal(typeof row.latency_ms, "number");
    assert.ok(row.cost_usd > 0);
    assert.ok(Number.isFinite(row.latency_ms));
  });

  test("recorded_missing_fixture_never_hits_network", async () => {
    const dir = mkdtempSync(join(tmpdir(), "recorded-"));
    process.env.RECORDED_DIR = dir;
    process.env.LLM_PROVIDER = "recorded";
    delete process.env.RECORD_FIXTURES;
    let fetches = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetches += 1;
      throw new Error("network");
    }) as typeof fetch;
    try {
      await assert.rejects(
        () => complete(args({ sessionId: "missing-fixture" })),
        (error: unknown) =>
          error instanceof RouterPoolExhaustedError &&
          error.message.includes("MissingFixtureError") &&
          error.message.includes("recorded fixture missing"),
      );
      assert.equal(fetches, 0);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("unknown model, bad price, and invalid cap fail closed", async () => {
    const { provider, calls } = countingProvider();
    const routing = {
      version: "1.0.0",
      task_types: {
        "tutor-chat": [
          { model: "no-such-model", timeout_ms: 10 },
          { model: "fallback-tutor", timeout_ms: 10 },
        ],
      },
    };
    await assert.rejects(() => createRouter({ routing, provider }).complete(args()), PricingRejected);
    assert.equal(calls.length, 0);
    assert.throws(
      () => requirePrice("free-model", { "free-model": { input_per_million: 0, output_per_million: 1 } }),
      PricingRejected,
    );
    await assert.rejects(
      () => createRouter({ provider }).complete(args({ capUsd: 0, sessionId: "bad-cap" })),
      PricingRejected,
    );
    await assert.rejects(
      () => createRouter({ provider }).complete(args({ capUsd: Number.NaN, sessionId: "nan-cap" })),
      PricingRejected,
    );
    await assert.rejects(
      () => createRouter({ provider }).complete(args({ capUsd: 1e-12, sessionId: "over-cap" })),
      CostCapExceeded,
    );
    assert.equal(calls.length, 0);
  });

  test("cap_amounts_are_exact", async () => {
    const prices: Record<string, ModelPrice> = {
      "m-a": { input_per_million: 1_000_000, output_per_million: 1_000_000 },
      "m-b": { input_per_million: 1_000_000, output_per_million: 1_000_000 },
    };
    const routing = {
      version: "1.0.0",
      task_types: {
        "tutor-chat": [
          { model: "m-a", timeout_ms: 10 },
          { model: "m-b", timeout_ms: 10 },
        ],
      },
    };
    const oneModel = {
      version: "1.0.0",
      task_types: { "tutor-chat": [{ model: "m-a", timeout_ms: 10 }] },
    };
    const prompt = "abcd";
    const ok: Provider = {
      id: "fake",
      async complete() {
        return { text: "{}", tokens_in: 1, tokens_out: 1, latency_ms: 1 };
      },
    };
    const boundary = await createRouter({ routing: oneModel, provider: ok, prices, maxOutputTokens: 1 }).complete(
      args({ prompt, capUsd: 2, sessionId: "cap-boundary" }),
    );
    assert.equal(boundary.cost_usd, 2);
    assert.equal(getSessionSpend("cap-boundary"), 2);

    let overCalls = 0;
    const overProvider: Provider = {
      id: "fake",
      async complete() {
        overCalls += 1;
        return { text: "{}", tokens_in: 1, tokens_out: 2, latency_ms: 1 };
      },
    };
    const over = createRouter({ routing: oneModel, provider: overProvider, prices, maxOutputTokens: 1 });
    await assert.rejects(() => over.complete(args({ prompt, capUsd: 2, sessionId: "cap-over" })), CostCapExceeded);
    assert.equal(getSessionSpend("cap-over"), 3);
    assert.equal(overCalls, 1);
    await assert.rejects(
      () => over.complete(args({ prompt, capUsd: 3, sessionId: "cap-over", spentUsd: 0 })),
      CostCapExceeded,
    );
    assert.equal(overCalls, 1);

    let timeouts = 0;
    const fallbackProvider: Provider = {
      id: "fake",
      async complete(request) {
        if (request.model === "m-a" && timeouts === 0) {
          timeouts += 1;
          const timeout = new Error("timed out");
          timeout.name = "TimeoutError";
          throw timeout;
        }
        return { text: "{}", tokens_in: 1, tokens_out: 1, latency_ms: 1 };
      },
    };
    const fallback = createRouter({ routing, provider: fallbackProvider, prices, maxOutputTokens: 1 });
    const timed = await fallback.complete(args({ prompt, capUsd: 10, sessionId: "cap-timeout" }));
    assert.equal(timed.fallback_from, "m-a");
    assert.equal(timed.model, "m-b");
    assert.equal(timed.cost_usd, 2);
    assert.equal(getSessionSpend("cap-timeout"), 3);
    const again = await fallback.complete(args({ prompt, capUsd: 10, sessionId: "cap-timeout", spentUsd: 0 }));
    assert.equal(again.model, "m-a");
    assert.equal(again.cost_usd, 2);
    assert.equal(getSessionSpend("cap-timeout"), 5);

    let failCalls = 0;
    const failing: Provider = {
      id: "fake",
      async complete() {
        failCalls += 1;
        throw new Error("forced failure");
      },
    };
    const failRouter = createRouter({ routing, provider: failing, prices, maxOutputTokens: 1 });
    await assert.rejects(() => failRouter.complete(args({ prompt, capUsd: 4, sessionId: "cap-fail" })), RouterPoolExhaustedError);
    assert.equal(failCalls, 2);
    assert.equal(getSessionSpend("cap-fail"), 2);
    await assert.rejects(
      () => failRouter.complete(args({ prompt, capUsd: 3, sessionId: "cap-fail", spentUsd: 0 })),
      CostCapExceeded,
    );
    assert.equal(failCalls, 2);
  });

  test("real provider stays disabled unless env is set", () => {
    process.env.LLM_PROVIDER = "fake";
    assert.throws(() => assertRealProviderEnabled(), RealProviderDisabled);
    process.env.LLM_PROVIDER = "openai_compat";
    delete process.env.OPENAI_COMPAT_API_KEY;
    delete process.env.OPENAI_COMPAT_BASE_URL;
    assert.throws(() => assertRealProviderEnabled(), RealProviderDisabled);
  });
});
