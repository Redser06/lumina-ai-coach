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

  test("unfinished_reflect_ends_instead_of_replaying_a_dead_end", () => {
    const firstPlan = routed({ path: ["Reflect"], plan: null, step: 2 });
    const unplaced = routed({
      path: ["Diagnose", "Reflect"],
      diagnosis: { placed: false, tier: "novice" },
      plan: null,
      step: 4,
    });
    const emptySkill = routed({
      path: ["Plan", "Reflect"],
      plan: { skill: "", rationale: "" },
      step: 4,
    });
    const exhausted = routed({ path: ["Reflect"], step: 40 });
    for (const state of [unplaced, emptySkill, exhausted]) {
      assert.equal(CONDITIONS["reflect.continue"]!(state), false);
      assert.equal(CONDITIONS["reflect.stop"]!(state), true);
    }
    assert.equal(CONDITIONS["reflect.continue"]!(firstPlan), true);
    assert.equal(CONDITIONS["reflect.stop"]!(firstPlan), false);
    const finished = routed({ path: ["Reflect"], session_complete: true, step: 40 });
    assert.equal(CONDITIONS["reflect.done"]!(finished), true);
    assert.equal(CONDITIONS["reflect.stop"]!(finished), false);
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
