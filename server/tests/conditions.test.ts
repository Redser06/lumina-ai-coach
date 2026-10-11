import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CONDITIONS } from "../graph/conditions.js";
import { initialLearnerState } from "../graph/state.js";

describe("conditions", { concurrency: false }, () => {
  test("conditions_are_pure", () => {
    const state = initialLearnerState({
      learner_id: "nia",
      session_id: "s",
      goal: "prompt",
      path: ["Assess"],
      fatigue: 0.2,
      step: 4,
      last_assessment: { score: 0.42, error_class: "misconception", confidence: 0.3 },
      diagnosis: { placed: true, tier: "novice" },
      plan: { skill: "prompting", rationale: "start" },
    });
    for (const [id, fn] of Object.entries(CONDITIONS)) {
      assert.equal(fn(state), fn(state), id);
      assert.equal(fn(state), fn({ ...state, path: [...state.path] }), id);
    }
  });
});
