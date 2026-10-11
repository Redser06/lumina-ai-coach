import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { detectLoop } from "../graph/guards.js";
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
});
