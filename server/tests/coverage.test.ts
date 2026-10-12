import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { collectCoverage, coverageFromVisits } from "../evals/coverage.js";
import { loadSpec } from "../graph/spec/load.js";

describe("coverage", { concurrency: false }, () => {
  test("coverage_is_100_nodes_and_edges", async () => {
    const report = await collectCoverage();
    assert.equal(report.node_coverage, 1);
    assert.equal(report.edge_coverage, 1);
    assert.deepEqual(report.uncovered, []);
  });

  test("coverage_lists_uncovered_on_failure", () => {
    const spec = loadSpec();
    const report = coverageFromVisits(["Supervisor"], ["e-start"]);
    const missingNodes = report.uncovered.filter((item) => item.type === "node").map((item) => item.id);
    const missingEdges = report.uncovered.filter((item) => item.type === "edge").map((item) => item.id);
    assert.ok(missingNodes.includes("Diagnose"));
    assert.ok(missingNodes.includes("End"));
    assert.ok(!missingNodes.includes("__start__"));
    assert.ok(!missingNodes.includes("Supervisor"));
    assert.ok(missingEdges.includes("e-sup-diagnose"));
    assert.equal(missingNodes.length, spec.nodes.length - 2);
    assert.ok(report.node_coverage < 1);
    assert.ok(report.edge_coverage < 1);
  });
});
