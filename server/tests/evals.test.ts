import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { judge, loadThresholds, runEval } from "../evals/run.js";
import { CONDITIONS } from "../graph/conditions.js";
import { FAST_CONFIDENCE, FAST_SCORE } from "../graph/limits.js";
import type { LearnerState } from "../graph/state.js";

describe("evals", { concurrency: false }, () => {
  test("gate_fails_below_threshold", () => {
    const thresholds = loadThresholds();
    const report = judge(
      {
        per_node_pass_rate: 0.5,
        per_path_pass_rate: 1,
        node_coverage: 1,
        edge_coverage: 1,
        node_failures: ["NODE-Teach-001: edge mismatch"],
        path_failures: [],
        uncovered: [],
      },
      thresholds,
    );
    assert.equal(report.ok, false);
  });

  test("gate_fails_on_coverage_drop", () => {
    const thresholds = loadThresholds();
    const report = judge(
      {
        per_node_pass_rate: 1,
        per_path_pass_rate: 1,
        node_coverage: 0.9,
        edge_coverage: 0.9,
        node_failures: [],
        path_failures: [],
        uncovered: [{ type: "edge", id: "e-sup-misconception" }],
      },
      thresholds,
    );
    assert.equal(report.ok, false);
    assert.equal(report.uncovered[0]?.id, "e-sup-misconception");
  });

  test("failing_eval_fails_the_gate", async () => {
    const misconception = CONDITIONS["assess.misconception"]!;
    const fast = CONDITIONS["assess.fast_mastery"]!;
    CONDITIONS["assess.misconception"] = () => false;
    CONDITIONS["assess.fast_mastery"] = (state: LearnerState) => {
      const assessment = state.last_assessment;
      if (!assessment || state.path.at(-1) !== "Assess" || state.disputed) return false;
      const fastMastery =
        assessment.error_class === null && assessment.score >= FAST_SCORE && assessment.confidence >= FAST_CONFIDENCE;
      return fastMastery || assessment.error_class === "misconception";
    };
    try {
      const report = await runEval();
      assert.equal(report.ok, false);
      assert.ok(report.path_failures.includes("SCN-0001"));
      assert.ok(report.edge_coverage < 1);
    } finally {
      CONDITIONS["assess.misconception"] = misconception;
      CONDITIONS["assess.fast_mastery"] = fast;
    }
  });
});
