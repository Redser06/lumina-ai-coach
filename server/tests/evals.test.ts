import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { judge, loadThresholds } from "../evals/run.js";

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
});
