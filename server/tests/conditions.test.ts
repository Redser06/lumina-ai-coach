import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CONDITIONS } from "../graph/conditions.js";
import { initialLearnerState, type LearnerState } from "../graph/state.js";

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

  test("slip_is_practice_and_not_a_replan", () => {
    const slip = routed({
      path: ["Assess"],
      last_assessment: { score: 0.95, error_class: "slip", confidence: 0.95 },
    });
    assert.equal(CONDITIONS["assess.slip"]!(slip), true);
    assert.equal(CONDITIONS["assess.replan"]!(slip), false);
    assert.equal(CONDITIONS["assess.fast_mastery"]!(slip), false);
  });

  test("ready_and_dead_end_are_disjoint", () => {
    const ready = routed({ path: [], plan: null, diagnosis: { placed: true, tier: "novice" } });
    const unplaced = routed({ path: ["Diagnose"], diagnosis: { placed: false, tier: "novice" }, plan: null });
    const emptyPlan = routed({ path: ["Plan"], plan: { skill: "", rationale: "" } });
    const unknown = routed({ path: ["Mystery"] });
    assert.equal(CONDITIONS["session.ready"]!(ready), true);
    assert.equal(CONDITIONS["any.dead_end"]!(ready), false);
    assert.equal(CONDITIONS["any.dead_end"]!(unplaced), true);
    assert.equal(CONDITIONS["session.ready"]!(unplaced), false);
    assert.equal(CONDITIONS["any.dead_end"]!(emptyPlan), true);
    assert.equal(CONDITIONS["any.dead_end"]!(unknown), true);
    assert.equal(CONDITIONS["session.ready"]!(unknown), false);
  });
});

function routed(partial: Partial<LearnerState>): LearnerState {
  return initialLearnerState({
    learner_id: "nia",
    session_id: "s",
    goal: "prompt",
    diagnosis: { placed: true, tier: "novice" },
    plan: { skill: "prompting", rationale: "start" },
    ...partial,
  });
}
