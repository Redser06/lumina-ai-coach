import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";
import { compileCoachGraph } from "../graph/build.js";
import { CONDITIONS } from "../graph/conditions.js";
import { FAST_CONFIDENCE, FAST_SCORE, SESSION_STEP_BOUND } from "../graph/limits.js";
import { supervisorNode } from "../graph/nodes/supervisor.js";
import { SessionService } from "../graph/session.js";
import { initialLearnerState, type LearnerState } from "../graph/state.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";

/**
 * These four tests are the kill switches for the off-by-one mutants:
 * `step >=` to `>`, `score >=` to `>`, `confidence >=` to `>`, and dropping
 * the Supervisor's `step + 1`. Each one fails if that one change is applied.
 */
const neutral: Provider = {
  id: "fake",
  async complete() {
    return { text: JSON.stringify({ note: "route" }), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
  },
};

function learner(partial: Partial<LearnerState>): LearnerState {
  return initialLearnerState({
    learner_id: "bound",
    session_id: "bound-session",
    goal: "hold the boundary",
    diagnosis: { placed: true, tier: "novice" },
    plan: { skill: "prompting", rationale: "one skill" },
    fatigue: 0.1,
    ...partial,
  });
}

describe("boundaries", { concurrency: false }, () => {
  test("step_bound_includes_40", async () => {
    useRouterForTests(createRouter({ provider: neutral }));
    try {
      const atBound = await supervisorNode({ learner: learner({ step: 39, path: ["Teach"] }) });
      assert.equal(atBound.learner.step, 40);
      assert.equal(atBound.learner.last_edge, "e-sup-step");
      assert.equal(atBound.learner.last_condition, "any.step_limit");
      const under = await supervisorNode({ learner: learner({ step: 38, path: ["Teach"] }) });
      assert.equal(under.learner.step, 39);
      assert.equal(under.learner.last_edge, "e-sup-practice");
    } finally {
      useRouterForTests(null);
    }
  });

  test("supervisor_counts_its_own_step", async () => {
    useRouterForTests(createRouter({ provider: neutral }));
    try {
      const update = await supervisorNode({ learner: learner({ step: 39, path: ["Teach"] }) });
      assert.equal(update.learner.step, 40);
      assert.equal(CONDITIONS["any.step_limit"]!(update.learner), true);
    } finally {
      useRouterForTests(null);
    }
  });

  test("fast_score_includes_0_85", () => {
    const onBound = learner({
      path: ["Assess"],
      last_assessment: { score: FAST_SCORE, error_class: null, confidence: 0.9 },
    });
    const under = learner({
      path: ["Assess"],
      last_assessment: { score: FAST_SCORE - 0.01, error_class: null, confidence: 0.9 },
    });
    assert.equal(CONDITIONS["assess.fast_mastery"]!(onBound), true);
    assert.equal(CONDITIONS["assess.fast_mastery"]!(under), false);
    assert.equal(FAST_SCORE, 0.85);
  });

  test("fast_confidence_includes_0_8", () => {
    const onBound = learner({
      path: ["Assess"],
      last_assessment: { score: 0.9, error_class: null, confidence: FAST_CONFIDENCE },
    });
    const under = learner({
      path: ["Assess"],
      last_assessment: { score: 0.9, error_class: null, confidence: FAST_CONFIDENCE - 0.01 },
    });
    assert.equal(CONDITIONS["assess.fast_mastery"]!(onBound), true);
    assert.equal(CONDITIONS["assess.fast_mastery"]!(under), false);
    assert.equal(FAST_CONFIDENCE, 0.8);
  });

  test("dead_end_reflect_ends_under_the_session_step_bound", async () => {
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    try {
      for (const id of ["SCN-0013", "SCN-0014"]) {
        const scenario = loadScenario(id);
        const result = await service.run(stateFromScenario(scenario, id), scenario.hitl ?? [], id);
        assert.equal(result.status, "done");
        assert.deepEqual(result.state.path, scenario.expected_path);
        assert.deepEqual(result.edges, scenario.expected_edges);
        assert.equal(result.edges.includes("e-sup-reflect-stop"), true);
        assert.equal(result.edges.includes("e-sup-plan-reflect"), false);
        assert.ok(result.state.step < SESSION_STEP_BOUND, `${id} step ${result.state.step}`);
        assert.ok(result.state.step <= 6, `${id} step ${result.state.step}`);
      }
    } finally {
      service.close();
    }
  });
});
