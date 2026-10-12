import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { compileCoachGraph, GraphSpecError } from "../graph/build.js";
import { CONDITIONS } from "../graph/conditions.js";
import { compileConditionExpr, ConditionExprError } from "../graph/expr.js";
import { NODE_IMPLS } from "../graph/nodes/registry.js";
import { COACHING_NODES, HITL_NODES, type GraphSpec } from "../graph/spec/types.js";
import { loadSpec, loadSpecWithHash, validateSpec, versionBumpOk } from "../graph/spec/load.js";

describe("spec", { concurrency: false }, () => {
  test("spec_validates_against_schema", () => {
    const { spec, sha256 } = loadSpecWithHash();
    const validated = validateSpec(spec);
    assert.equal(validated.ok, true);
    assert.equal(spec.spec_id, "coach-graph");
    assert.equal(spec.version, "1.0.0");
    assert.match(sha256, /^[a-f0-9]{64}$/);
    assert.equal(`GRAPH-SPEC-${spec.spec_id}@${spec.version}`, "GRAPH-SPEC-coach-graph@1.0.0");
  });

  test("spec_declares_all_8_coaching_nodes_and_3_hitl", () => {
    const spec = loadSpec();
    for (const id of COACHING_NODES) {
      assert.equal(spec.nodes.find((node) => node.id === id)?.kind, "worker");
    }
    for (const id of HITL_NODES) {
      const node = spec.nodes.find((item) => item.id === id);
      assert.equal(node?.kind, "hitl");
      assert.equal(node?.type, "interrupt");
    }
    assert.equal(spec.nodes.some((node) => node.id === "PlanConfirm"), false);
    assert.equal(spec.nodes.some((node) => node.id === "Supervisor"), true);
  });

  test("every_edge_has_learner_state_condition", () => {
    const spec = loadSpec();
    for (const edge of spec.edges) {
      assert.ok(edge.condition_id);
      assert.ok(edge.condition_expr.trim());
      assert.equal(typeof CONDITIONS[edge.condition_id], "function");
    }
  });

  test("build_rejects_undeclared_edge", () => {
    assert.throws(
      () =>
        compileCoachGraph({
          extraCodeEdges: [
            {
              id: "e-rogue",
              from: "Supervisor",
              to: "Stretch",
              condition_id: "assess.fast_mastery",
              condition_expr: "true",
              priority: 1,
            },
          ],
        }),
      (error: unknown) => error instanceof GraphSpecError && /undeclared edge/.test(error.message),
    );
  });

  test("build_rejects_undeclared_node", () => {
    assert.throws(
      () => compileCoachGraph({ extraCodeNodes: ["RogueNode"] }),
      (error: unknown) => error instanceof GraphSpecError && /undeclared node: RogueNode/.test(error.message),
    );
  });

  test("build_rejects_missing_node_impl", () => {
    const spec = loadSpec();
    const withGhost: GraphSpec = {
      ...spec,
      nodes: [...spec.nodes, { id: "Ghost", kind: "worker", task_type: "tutor-chat", max_steps: 1 }],
    };
    assert.throws(
      () => compileCoachGraph({ spec: withGhost }),
      (error: unknown) => error instanceof GraphSpecError && /missing node implementation: Ghost/.test(error.message),
    );
    assert.throws(
      () => compileCoachGraph({ implementedNodes: Object.keys(NODE_IMPLS).filter((id) => id !== "Teach") }),
      (error: unknown) => error instanceof GraphSpecError && /missing node implementation: Teach/.test(error.message),
    );
  });

  test("build_rejects_missing_edge_impl", () => {
    assert.throws(
      () => compileCoachGraph({ omitEdgeIds: ["e-sup-end"] }),
      (error: unknown) => error instanceof GraphSpecError && /missing edge implementation: e-sup-end/.test(error.message),
    );
  });

  test("allEdges_check_fails_if_skipped", () => {
    const spec = loadSpec();
    assert.throws(
      () => compileCoachGraph({ omitEdgeIds: spec.edges.map((edge) => edge.id) }),
      (error: unknown) => error instanceof GraphSpecError && /allEdges check skipped/.test(error.message),
    );
  });

  test("build_rejects_unused_condition", () => {
    assert.throws(
      () => compileCoachGraph({ conditions: { ...CONDITIONS, "extra.unused": () => false } }),
      (error: unknown) => error instanceof GraphSpecError && /unused condition: extra\.unused/.test(error.message),
    );
  });

  test("build_rejects_condition_expr_that_disagrees_with_code", () => {
    const spec = loadSpec();
    const rewritten: GraphSpec = {
      ...spec,
      edges: spec.edges.map((edge) =>
        edge.condition_id === "assess.misconception" ? { ...edge, condition_expr: "false" } : edge,
      ),
    };
    assert.throws(
      () => compileCoachGraph({ spec: rewritten }),
      (error: unknown) => error instanceof GraphSpecError && /condition_expr does not match code/.test(error.message),
    );
  });

  test("condition_expr_rejects_unknown_state_field", () => {
    assert.throws(
      () => compileConditionExpr("fast_mastery == false"),
      (error: unknown) => error instanceof ConditionExprError && /unknown learner-state field fast_mastery/.test(error.message),
    );
  });

  test("build_rejects_missing_condition_impl", () => {
    const conditions = { ...CONDITIONS };
    delete conditions["assess.misconception"];
    assert.throws(
      () => compileCoachGraph({ conditions }),
      (error: unknown) => error instanceof GraphSpecError && /missing condition implementation/.test(error.message),
    );
  });

  test("spec_version_bumped_when_edges_change", () => {
    const spec = loadSpec();
    const removed: GraphSpec = { ...spec, edges: spec.edges.slice(0, -1) };
    assert.equal(versionBumpOk(spec, removed), false);
    assert.equal(versionBumpOk(spec, { ...removed, version: "1.1.0" }), true);
    const rewritten: GraphSpec = {
      ...spec,
      version: "1.1.0",
      edges: spec.edges.map((edge) =>
        edge.id === "e-sup-misconception" ? { ...edge, condition_expr: "false" } : edge,
      ),
    };
    assert.equal(versionBumpOk(spec, rewritten), false);
    assert.equal(versionBumpOk(spec, { ...rewritten, version: "2.0.0" }), true);
    assert.equal(versionBumpOk(spec, spec), true);
  });
});
