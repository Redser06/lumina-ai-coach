import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { assertHitlDecision } from "../graph/hitl.js";
import { NODE_IMPLS } from "../graph/nodes/registry.js";
import { supervisorNode } from "../graph/nodes/supervisor.js";
import { runWorker } from "../graph/nodes/worker.js";
import { loadSpec } from "../graph/spec/load.js";
import { initialLearnerState, type LearnerState } from "../graph/state.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";
import { collectCoverage, type CoverageReport } from "./coverage.js";
import { executeScenarios } from "./execute.js";

const NODES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures/nodes");
const THRESHOLDS_PATH = join(dirname(fileURLToPath(import.meta.url)), "thresholds.yaml");

export interface Thresholds {
  per_node_pass_rate: number;
  per_path_pass_rate: number;
  node_coverage: number;
  edge_coverage: number;
}

export interface EvalReport {
  per_node_pass_rate: number;
  per_path_pass_rate: number;
  node_coverage: number;
  edge_coverage: number;
  node_failures: string[];
  path_failures: string[];
  uncovered: CoverageReport["uncovered"];
  ok: boolean;
}

interface NodeFixture {
  id: string;
  node: string;
  kind?: string;
  state?: Partial<LearnerState>;
  model_output?: Record<string, unknown>;
  expect_edge?: string;
  expect_path_tail?: string;
  expect?: Record<string, unknown>;
  expect_decision?: { decision: string; actor: string };
}

export function loadThresholds(path = THRESHOLDS_PATH): Thresholds {
  return parse(readFileSync(path, "utf8")) as Thresholds;
}

export function judge(
  metrics: Omit<EvalReport, "ok" | "node_failures" | "path_failures" | "uncovered"> & {
    node_failures?: string[];
    path_failures?: string[];
    uncovered?: CoverageReport["uncovered"];
  },
  thresholds: Thresholds,
): EvalReport {
  const node_failures = metrics.node_failures ?? [];
  const path_failures = metrics.path_failures ?? [];
  const uncovered = metrics.uncovered ?? [];
  const ok =
    metrics.per_node_pass_rate >= thresholds.per_node_pass_rate &&
    metrics.per_path_pass_rate >= thresholds.per_path_pass_rate &&
    metrics.node_coverage >= thresholds.node_coverage &&
    metrics.edge_coverage >= thresholds.edge_coverage &&
    node_failures.length === 0 &&
    path_failures.length === 0 &&
    (thresholds.node_coverage < 1 || uncovered.length === 0);
  return { ...metrics, node_failures, path_failures, uncovered, ok };
}

function loadNodeFixtures(): NodeFixture[] {
  return readdirSync(NODES_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(NODES_DIR, name), "utf8")) as NodeFixture);
}

async function runNodeFixtures(): Promise<{ pass: number; total: number; failures: string[] }> {
  const spec = loadSpec();
  const fixtures = loadNodeFixtures();
  const failures: string[] = [];
  const seen = new Set<string>();
  for (const fixture of fixtures) {
    seen.add(fixture.node);
    try {
      if (fixture.kind === "terminal" || fixture.node === "End" || fixture.node === "__start__") {
        const node = spec.nodes.find((item) => item.id === fixture.node);
        if (!node || node.kind !== "terminal") throw new Error(`${fixture.node} is not terminal`);
        if (NODE_IMPLS[fixture.node]) throw new Error(`${fixture.node} must not have a worker implementation`);
        continue;
      }
      if (fixture.kind === "hitl") {
        const node = spec.nodes.find((item) => item.id === fixture.node);
        if (!node || node.kind !== "hitl" || node.type !== "interrupt") throw new Error(`${fixture.node} is not an interrupt`);
        if (!NODE_IMPLS[fixture.node]) throw new Error(`missing impl ${fixture.node}`);
        if (fixture.expect_decision) assertHitlDecision(fixture.expect_decision);
        continue;
      }
      const provider: Provider = {
        id: "fake",
        async complete() {
          const text = JSON.stringify(fixture.model_output ?? { note: "ok" });
          return { text, tokens_in: 8, tokens_out: 4, latency_ms: 1 };
        },
      };
      useRouterForTests(createRouter({ provider }));
      const state = initialLearnerState({
        learner_id: "fixture",
        session_id: `node-${fixture.id}`,
        goal: "fixture",
        ...fixture.state,
      });
      const update =
        fixture.node === "Supervisor"
          ? await supervisorNode({ learner: state })
          : await runWorker(fixture.node, { learner: state });
      if (fixture.expect_edge && update.learner.last_edge !== fixture.expect_edge) {
        throw new Error(`edge ${update.learner.last_edge} != ${fixture.expect_edge}`);
      }
      if (fixture.expect_path_tail && update.learner.path.at(-1) !== fixture.expect_path_tail) {
        throw new Error(`path tail ${update.learner.path.at(-1)}`);
      }
      if (fixture.expect) {
        for (const [key, value] of Object.entries(fixture.expect)) {
          if (JSON.stringify((update.learner as unknown as Record<string, unknown>)[key]) !== JSON.stringify(value)) {
            throw new Error(`${key} mismatch`);
          }
        }
      }
    } catch (error) {
      failures.push(`${fixture.id}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      useRouterForTests(null);
    }
  }
  for (const node of spec.nodes) {
    if (!seen.has(node.id)) failures.push(`missing fixture for ${node.id}`);
  }
  const total = fixtures.length;
  return { pass: total - failures.filter((item) => item.startsWith("NODE-")).length, total, failures };
}

export async function runEval(thresholds = loadThresholds()): Promise<EvalReport> {
  const node = await runNodeFixtures();
  const { runs, service } = await executeScenarios();
  service.close();
  const pathFailures = runs.filter((run) => !run.path_pass || !run.edge_pass).map((run) => run.scenario.id);
  const coverage = await collectCoverage();
  const perNode = node.total === 0 ? 0 : (node.total - node.failures.length) / node.total;
  const perPath = runs.length === 0 ? 0 : (runs.length - pathFailures.length) / runs.length;
  return judge(
    {
      per_node_pass_rate: perNode,
      per_path_pass_rate: perPath,
      node_coverage: coverage.node_coverage,
      edge_coverage: coverage.edge_coverage,
      node_failures: node.failures,
      path_failures: pathFailures,
      uncovered: coverage.uncovered,
    },
    thresholds,
  );
}

async function main(): Promise<void> {
  const report = await runEval();
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/eval-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, per_node_pass_rate: report.per_node_pass_rate, per_path_pass_rate: report.per_path_pass_rate, node_coverage: report.node_coverage, edge_coverage: report.edge_coverage }));
  if (!report.ok) {
    console.error(report.node_failures, report.path_failures, report.uncovered);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("run.ts")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
