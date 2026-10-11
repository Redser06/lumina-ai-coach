import { CONDITIONS } from "./conditions.js";
import { loadSpec } from "./spec/load.js";
import type { GraphEdgeSpec, GraphSpec } from "./spec/types.js";
import type { LearnerState } from "./state.js";

export class NoRouteError extends Error {
  readonly code = "NO_ROUTE";
  constructor(from: string) {
    super(`no condition matched from ${from}`);
    this.name = "NoRouteError";
  }
}

export function selectEdge(from: string, state: LearnerState, spec: GraphSpec = loadSpec()): GraphEdgeSpec {
  const edges = spec.edges
    .filter((edge) => edge.from === from)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  for (const edge of edges) {
    const condition = CONDITIONS[edge.condition_id];
    if (!condition) throw new Error(`missing condition implementation: ${edge.condition_id}`);
    if (condition(state)) return edge;
  }
  throw new NoRouteError(
    `${from} path=${state.path.join(">")} step=${state.step} fatigue=${state.fatigue} complete=${state.session_complete} loop=${state.loop_detected} cleared=${state.loop_cleared} disputed=${state.disputed} skill=${state.skill_map_edit} assessment=${JSON.stringify(state.last_assessment)}`,
  );
}
