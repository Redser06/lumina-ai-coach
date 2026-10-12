import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { detectLoop } from "../graph/guards.js";
import { costBudgetFromConfig } from "../graph/limits.js";
import { supervisorNode } from "../graph/nodes/supervisor.js";
import { fingerprintState, initialLearnerState, type LearnerState } from "../graph/state.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";

function scripted(): Provider {
  return {
    id: "fake",
    async complete() {
      return { text: JSON.stringify({ note: "ok" }), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
    },
  };
}

function base(partial: Partial<LearnerState>): LearnerState {
  return initialLearnerState({
    learner_id: "guard",
    session_id: "guard-session",
    goal: "stay in bounds",
    diagnosis: { placed: true, tier: "novice" },
    plan: { skill: "prompting", rationale: "one skill" },
    ...partial,
  });
}

describe("guards", { concurrency: false }, () => {
  test("step_bound_routes_to_reflect", async () => {
    useRouterForTests(createRouter({ provider: scripted() }));
    const update = await supervisorNode({ learner: base({ step: 40, path: ["Plan"], fatigue: 0.1 }) });
    assert.equal(update.learner.last_edge, "e-sup-step");
    assert.equal(update.learner.last_condition, "any.step_limit");
    useRouterForTests(null);
  });

  test("loop_detector_routes_to_safety_escalation", async () => {
    const seed = base({ path: ["Teach", "Teach", "Teach"] });
    const print = fingerprintState(seed);
    const state = base({
      path: ["Teach", "Teach", "Teach"],
      fingerprints: [print, print, print],
    });
    assert.equal(detectLoop(state), true);
    useRouterForTests(createRouter({ provider: scripted() }));
    const update = await supervisorNode({ learner: state });
    assert.equal(update.learner.loop_detected, true);
    assert.equal(update.learner.last_edge, "e-sup-loop");
    assert.equal(update.learner.last_condition, "any.loop_detected");
    useRouterForTests(null);
  });

  test("supervisor_records_the_start_edge_only_on_an_empty_trace", async () => {
    useRouterForTests(createRouter({ provider: scripted() }));
    try {
      const first = await supervisorNode({
        learner: base({ path: [], edges_taken: [], trace_nodes: [], diagnosis: null, plan: null }),
      });
      assert.equal(first.learner.edges_taken[0], "e-start");
      assert.equal(first.learner.trace_nodes.includes("__start__"), false);
      assert.equal(first.learner.trace_nodes.includes("End"), false);
      const later = await supervisorNode({
        learner: base({
          path: ["Reflect"],
          session_complete: true,
          edges_taken: ["e-start", "e-sup-fatigue", "e-ret-reflect"],
          trace_nodes: ["Supervisor", "Reflect"],
        }),
      });
      assert.equal(later.learner.last_edge, "e-sup-end");
      assert.equal(later.learner.trace_nodes.includes("__start__"), false);
      assert.equal(later.learner.trace_nodes.includes("End"), false);
      assert.equal(later.learner.edges_taken.filter((id) => id === "e-start").length, 1);
    } finally {
      useRouterForTests(null);
    }
  });

  test("cost_budget_comes_from_config_and_rejects_a_raise", () => {
    const state = initialLearnerState({
      learner_id: "l",
      session_id: "s",
      goal: "g",
      cost_budget_usd: 50,
    });
    assert.equal(state.cost_budget_usd, 1);
    const previous = process.env.COST_BUDGET_USD;
    process.env.COST_BUDGET_USD = "50";
    try {
      assert.throws(() => costBudgetFromConfig(), /outside \(0, 1\]/);
    } finally {
      if (previous === undefined) delete process.env.COST_BUDGET_USD;
      else process.env.COST_BUDGET_USD = previous;
    }
  });
});
