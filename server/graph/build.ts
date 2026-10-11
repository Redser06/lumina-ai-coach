import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { CONDITIONS, type ConditionFn } from "./conditions.js";
import { NODE_IMPLS } from "./nodes/registry.js";
import { selectEdge } from "./route.js";
import { loadSpec } from "./spec/load.js";
import type { GraphEdgeSpec, GraphSpec } from "./spec/types.js";
import type { LearnerState } from "./state.js";

export class GraphSpecError extends Error {
  readonly code = "GRAPH_SPEC";
  constructor(message: string) {
    super(message);
    this.name = "GraphSpecError";
  }
}

const GraphAnnotation = Annotation.Root({
  learner: Annotation<LearnerState>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => emptyLearner(),
  }),
});

function emptyLearner(): LearnerState {
  return {
    learner_id: "unset",
    session_id: "unset",
    scenario_id: null,
    goal: "",
    mastery: {},
    last_assessment: null,
    time_on_task_s: 0,
    fatigue: 0,
    step: 0,
    cost_usd_session: 0,
    cost_budget_usd: 1,
    path: [],
    edges_taken: [],
    trace_nodes: [],
    fingerprints: [],
    hitl_pending: null,
    hitl_log: [],
    loop_detected: false,
    loop_cleared: false,
    disputed: false,
    skill_map_edit: false,
    session_complete: false,
    diagnosis: null,
    plan: null,
    last_edge: null,
    last_condition: null,
  };
}

export function assertSpecClosed(args: {
  spec: GraphSpec;
  implementedNodes: string[];
  conditions: Record<string, ConditionFn>;
  codeEdges: GraphEdgeSpec[];
  extraCodeNodes?: string[];
}): void {
  const specIds = new Set(args.spec.nodes.map((node) => node.id));
  if (specIds.size !== args.spec.nodes.length) throw new GraphSpecError("duplicate node id");
  const edgeIds = new Set(args.spec.edges.map((edge) => edge.id));
  if (edgeIds.size !== args.spec.edges.length) throw new GraphSpecError("duplicate edge id");

  for (const nodeId of [...args.implementedNodes, ...(args.extraCodeNodes ?? [])]) {
    if (!specIds.has(nodeId)) throw new GraphSpecError(`undeclared node: ${nodeId}`);
  }
  for (const node of args.spec.nodes) {
    if (node.id === "__start__" || node.id === "End") continue;
    if (!args.implementedNodes.includes(node.id)) {
      throw new GraphSpecError(`missing node implementation: ${node.id}`);
    }
    if (node.kind === "hitl" && node.type !== "interrupt") {
      throw new GraphSpecError(`${node.id} must be type interrupt`);
    }
  }
  for (const edge of args.spec.edges) {
    if (!specIds.has(edge.from) || !specIds.has(edge.to)) {
      throw new GraphSpecError(`edge ${edge.id} references an unknown node`);
    }
    if (!edge.condition_expr.trim()) throw new GraphSpecError(`missing condition_expr on ${edge.id}`);
    if (!args.conditions[edge.condition_id]) {
      throw new GraphSpecError(`missing condition implementation: ${edge.condition_id}`);
    }
  }
  const declared = new Map(args.spec.edges.map((edge) => [edge.id, edge]));
  for (const edge of args.codeEdges) {
    const match = declared.get(edge.id);
    if (!match || match.from !== edge.from || match.to !== edge.to || match.condition_id !== edge.condition_id) {
      throw new GraphSpecError(`undeclared edge: ${edge.id} ${edge.from} -> ${edge.to}`);
    }
  }
}

export interface CompileOptions {
  checkpointer?: BaseCheckpointSaver;
  spec?: GraphSpec;
  implementedNodes?: string[];
  extraCodeNodes?: string[];
  extraCodeEdges?: GraphEdgeSpec[];
  /** Test hook: spec edges the code fails to draw. */
  omitEdgeIds?: string[];
  conditions?: Record<string, ConditionFn>;
}

type GraphBuilder = {
  addNode: (id: string, fn: unknown) => GraphBuilder;
  addConditionalEdges: (
    from: string,
    route: (state: { learner: LearnerState }) => string,
    pathMap: Record<string, string>,
  ) => GraphBuilder;
  compile: (args: { checkpointer?: BaseCheckpointSaver; interruptAfter?: string[] }) => CompiledCoachGraph;
  allEdges?: Set<[string, string]>;
  branches?: Record<string, Record<string, { ends?: Record<string, string> | null }>>;
};

export function collectDrawnPairs(builder: {
  allEdges?: Iterable<[string, string]>;
  branches?: Record<string, Record<string, { ends?: Record<string, string> | null }>>;
}): string[] {
  const keys = new Set<string>();
  for (const [from, to] of builder.allEdges ?? []) {
    keys.add(pair(from === START ? "__start__" : String(from), String(to)));
  }
  for (const [from, branches] of Object.entries(builder.branches ?? {})) {
    for (const branch of Object.values(branches)) {
      for (const to of Object.values(branch.ends ?? {})) {
        keys.add(pair(from === START ? "__start__" : String(from), String(to)));
      }
    }
  }
  return [...keys];
}

/** Throws when the builder recorded no edges, so a skipped allEdges check cannot pass. */
export function assertEdgesWereDrawn(drawnPairs: string[]): void {
  if (drawnPairs.length === 0) throw new GraphSpecError("allEdges check skipped");
}

export function assertEdgeSet(spec: GraphSpec, drawnIds: string[], drawnPairs: string[]): void {
  assertEdgesWereDrawn(drawnPairs);
  const specIds = new Set(spec.edges.map((edge) => edge.id));
  const actualIds = new Set(drawnIds);
  for (const id of actualIds) {
    if (!specIds.has(id)) throw new GraphSpecError(`undeclared edge: ${id}`);
  }
  for (const id of specIds) {
    if (!actualIds.has(id)) throw new GraphSpecError(`missing edge implementation: ${id}`);
  }
  const expectedPairs = new Set(spec.edges.map((edge) => pair(edge.from, edge.to === "End" ? END : edge.to)));
  const actualPairs = new Set(drawnPairs);
  for (const key of actualPairs) {
    if (!expectedPairs.has(key)) throw new GraphSpecError(`undeclared edge: ${key}`);
  }
  for (const key of expectedPairs) {
    if (!actualPairs.has(key)) throw new GraphSpecError(`missing edge implementation: ${key}`);
  }
}

export function compileCoachGraph(options: CompileOptions = {}) {
  const spec = options.spec ?? loadSpec();
  const implementedNodes = options.implementedNodes ?? Object.keys(NODE_IMPLS);
  const conditions = options.conditions ?? CONDITIONS;
  const omit = new Set(options.omitEdgeIds ?? []);
  const drawnEdgeList = [
    ...spec.edges.filter((edge) => !omit.has(edge.id)),
    ...(options.extraCodeEdges ?? []),
  ];
  assertSpecClosed({
    spec,
    implementedNodes,
    conditions,
    codeEdges: options.extraCodeEdges ?? [],
    extraCodeNodes: options.extraCodeNodes,
  });

  let graph = new StateGraph(GraphAnnotation) as GraphBuilder;

  for (const node of spec.nodes) {
    if (node.id === "__start__" || node.id === "End") continue;
    const impl = NODE_IMPLS[node.id];
    if (!impl) throw new GraphSpecError(`missing node implementation: ${node.id}`);
    graph = graph.addNode(node.id, impl);
  }

  const byFrom = new Map<string, GraphEdgeSpec[]>();
  for (const edge of drawnEdgeList) {
    const list = byFrom.get(edge.from) ?? [];
    list.push(edge);
    byFrom.set(edge.from, list);
  }
  for (const [from, edges] of byFrom) {
    const pathMap: Record<string, string> = {};
    for (const edge of edges) {
      const dest = edge.to === "End" ? END : edge.to;
      pathMap[dest] = dest;
    }
    graph = graph.addConditionalEdges(
      from === "__start__" ? START : from,
      (state) => {
        const chosen = selectEdge(from, state.learner, spec);
        if (!conditions[chosen.condition_id]) {
          throw new GraphSpecError(`missing condition implementation: ${chosen.condition_id}`);
        }
        return chosen.to === "End" ? END : chosen.to;
      },
      pathMap,
    );
  }

  assertEdgeSet(
    spec,
    drawnEdgeList.map((edge) => edge.id),
    collectDrawnPairs(graph),
  );

  return graph.compile({
    checkpointer: options.checkpointer,
    interruptAfter: spec.nodes.map((node) => node.id).filter((id) => id !== "__start__" && id !== "End"),
  });
}

function pair(from: string, to: string): string {
  return `${from}->${to}`;
}

export interface CompiledCoachGraph {
  invoke(input: unknown, config: unknown): Promise<unknown>;
  getState(config: unknown): Promise<{
    next: string[];
    values: { learner?: LearnerState };
    tasks?: Array<{ interrupts?: Array<{ value: unknown }> }>;
    config: { configurable?: { checkpoint_id?: string } };
  }>;
  getStateHistory(config: unknown): AsyncIterable<{
    next: string[];
    values: { learner?: LearnerState };
    config: { configurable?: { checkpoint_id?: string } };
  }>;
}
