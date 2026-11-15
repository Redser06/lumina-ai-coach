import "../runtime/network_guard.js";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { GraphSpecError } from "../graph/build.js";
import { assertHitlDecision } from "../graph/hitl.js";
import { NODE_IMPLS } from "../graph/nodes/registry.js";
import { supervisorNode } from "../graph/nodes/supervisor.js";
import { runWorker } from "../graph/nodes/worker.js";
import { loadSpec } from "../graph/spec/load.js";
import { selfPromptStop } from "../graph/nodes/self_prompt.js";
import { initialLearnerState, type LearnerState, type SelfPrompt } from "../graph/state.js";
import { promptField } from "../router/providers/fake.js";
import { loadScenarios } from "./scenarios.js";
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
  expect_decision?: { decision: string; actor: string; node: string };
  stages?: Record<string, Record<string, unknown>>;
  fail_stages?: string[];
  expect_error?: string;
  expect_self_prompt?: {
    stop?: "accepted" | "depth_exhausted" | "critique_failed" | "malformed_revision";
    draft_count?: number;
    revise_count?: number;
  };
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

function stagePayload(fixture: NodeFixture, stage: string, prompt: string): Record<string, unknown> {
  if (fixture.stages?.[stage]) return fixture.stages[stage];
  const depth = promptField(prompt, "depth") ?? "1";
  if (stage === "draft") return { prompt: `${fixture.node} draft ${depth} for the learner goal.` };
  if (stage === "critique") return { accept: true, critique: `${fixture.node} draft ${depth} names a checkable outcome.` };
  if (stage === "revise") return { prompt: `${fixture.node} revised ${depth} with a worked example.` };
  if (stage === "check") return { pass: true };
  return fixture.model_output ?? { note: "ok" };
}

function assertSubgraph(spec: ReturnType<typeof loadSpec>, fixture: NodeFixture, before: LearnerState, after: LearnerState): void {
  const node = spec.nodes.find((item) => item.id === fixture.node);
  if (!node?.subgraph) return;
  const visit = (before.path ?? []).filter((id) => id === fixture.node).length;
  const rows = after.self_prompts.filter((row) => row.node === fixture.node && row.visit === visit);
  const maxDepth = node.max_depth ?? 0;
  if (rows.some((row) => row.depth > maxDepth)) throw new Error(`depth exceeded ${maxDepth}`);
  if (rows.filter((row) => row.stage === "draft").length > maxDepth) throw new Error(`draft cycles exceeded ${maxDepth}`);
  const executed = rows.find((row) => row.stage === "execute")?.prompt ?? "";
  const stop = selfPromptStop(rows);
  if (stop === "accepted" || stop === "depth_exhausted") {
    const revised = [...rows].reverse().find((row) => row.stage === "revise" && row.prompt.length > 0)?.prompt;
    if (!revised || executed !== revised) throw new Error("execute did not use the revised prompt");
  }
  if (stop === "critique_failed" || stop === "malformed_revision") {
    const draft = rows.find((row) => row.stage === "draft" && row.status === "ok")?.prompt;
    if (!draft || executed !== draft) throw new Error("execute did not keep the draft");
  }
  const expect = fixture.expect_self_prompt;
  if (!expect) return;
  if (expect.stop && stop !== expect.stop) throw new Error(`stop ${stop} != ${expect.stop}`);
  if (expect.draft_count !== undefined && countPrompts(rows, "draft") !== expect.draft_count) {
    throw new Error(`drafts ${countPrompts(rows, "draft")} != ${expect.draft_count}`);
  }
  if (expect.revise_count !== undefined && countPrompts(rows, "revise") !== expect.revise_count) {
    throw new Error(`revisions ${countPrompts(rows, "revise")} != ${expect.revise_count}`);
  }
}

function countPrompts(rows: SelfPrompt[], stage: "draft" | "revise"): number {
  return rows.filter((row) => row.stage === stage && row.prompt.length > 0 && row.status !== "malformed_revision" && row.status !== "critique_failed").length;
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
        if (fixture.expect_decision) assertHitlDecision(fixture.expect_decision, fixture.node);
        continue;
      }
      const provider: Provider = {
        id: "fake",
        async complete(request) {
          const stage = promptField(request.prompt, "stage");
          if (stage && fixture.fail_stages?.includes(stage)) throw new Error(`injected failure ${stage}`);
          const payload = stage ? stagePayload(fixture, stage, request.prompt) : (fixture.model_output ?? { note: "ok" });
          const text = JSON.stringify(payload);
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
      if (fixture.expect_error) {
        let thrown: unknown;
        try {
          await runWorker(fixture.node, { learner: state });
        } catch (error) {
          thrown = error;
        }
        if (!(thrown instanceof Error) || thrown.name !== fixture.expect_error) {
          throw new Error(`error ${thrown instanceof Error ? thrown.name : "none"} != ${fixture.expect_error}`);
        }
        const prompts = (thrown as { selfPrompts?: SelfPrompt[] }).selfPrompts ?? [];
        if (!prompts.some((row) => row.status === "malformed_draft")) throw new Error("trace missing malformed_draft");
        if (prompts.some((row) => row.stage === "execute")) throw new Error("executed a malformed draft");
        continue;
      }
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
      assertSubgraph(spec, fixture, state, update.learner);
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
  try {
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
  } catch (error) {
    if (!(error instanceof GraphSpecError)) throw error;
    const perNode = node.total === 0 ? 0 : (node.total - node.failures.length) / node.total;
    return judge(
      {
        per_node_pass_rate: perNode,
        per_path_pass_rate: 0,
        node_coverage: 0,
        edge_coverage: 0,
        node_failures: [...node.failures, error.message],
        path_failures: loadScenarios().map((scenario) => scenario.id),
        uncovered: [],
      },
      thresholds,
    );
  }
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
