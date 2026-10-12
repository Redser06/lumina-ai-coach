import { execFileSync } from "node:child_process";
import "../../runtime/network_guard.js";
import { parse } from "yaml";
import { compileCoachGraph } from "../build.js";
import { CONDITIONS } from "../conditions.js";
import { NODE_IMPLS } from "../nodes/registry.js";
import { COACHING_NODES, HITL_NODES } from "./types.js";
import { loadSpecWithHash, validateSpec, versionBumpOk } from "./load.js";
import type { GraphSpec } from "./types.js";

const coaching = new Set<string>(COACHING_NODES);
const hitl = new Set<string>(HITL_NODES);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const loaded = loadSpecWithHash();
const validated = validateSpec(loaded.spec);
if (!validated.ok) fail(validated.errors.join("\n"));
const spec = validated.spec;

for (const id of coaching) {
  if (!spec.nodes.some((node) => node.id === id && node.kind === "worker")) {
    fail(`missing coaching node ${id}`);
  }
}
for (const id of hitl) {
  const node = spec.nodes.find((item) => item.id === id);
  if (!node || node.kind !== "hitl" || node.type !== "interrupt") fail(`missing HITL interrupt ${id}`);
}
if (spec.nodes.some((node) => node.id === "PlanConfirm")) fail("PlanConfirm must stay out of v1");
for (const edge of spec.edges) {
  if (!edge.condition_id || !edge.condition_expr) fail(`edge ${edge.id} missing condition`);
  if (!CONDITIONS[edge.condition_id]) fail(`no condition impl for ${edge.condition_id}`);
}
for (const id of ["Teach", "Practice", "Remediate"]) {
  const node = spec.nodes.find((item) => item.id === id);
  if (!node?.subgraph || node.max_steps !== 1) fail(`${id} must be a single-step subgraph stub`);
}

compileCoachGraph({ implementedNodes: Object.keys(NODE_IMPLS), spec });

const base = readOriginSpec();
if (base && !versionBumpOk(base, spec)) {
  fail(`spec version ${spec.version} was not bumped for an edge or condition change`);
}

console.log(`GRAPH-SPEC-${spec.spec_id}@${spec.version} sha256=${loaded.sha256}`);

function readOriginSpec(): GraphSpec | null {
  try {
    const raw = execFileSync("git", ["show", "origin/main:server/graph/spec/coach-graph.v1.yaml"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return parse(raw) as GraphSpec;
  } catch {
    return null;
  }
}
