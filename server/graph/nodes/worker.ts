import { attachEdge } from "../../telemetry/node_log.js";
import { complete } from "../../router/router.js";
import { currentRunId } from "../../runtime/context.js";
import { renderPrompt } from "../prompt.js";
import { loadSpec } from "../spec/load.js";
import { selectEdge } from "../route.js";
import { LearnerStateSchema, type LearnerState } from "../state.js";
import { maybeCrash } from "./crash.js";
import { mergeModelOutput, withBookkeeping } from "./merge.js";

export interface GraphUpdate {
  learner: LearnerState;
}

export async function runWorker(nodeId: string, state: { learner: LearnerState }): Promise<GraphUpdate> {
  maybeCrash(nodeId);
  const learner = state.learner;
  const node = loadSpec().nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error(`unknown node ${nodeId}`);
  const prompt = renderPrompt(nodeId, node.task_type, learner);
  const call = await complete({
    node: nodeId,
    taskType: node.task_type,
    prompt,
    sessionId: learner.session_id,
    runId: currentRunId(),
    spentUsd: learner.cost_usd_session,
    capUsd: learner.cost_budget_usd,
    edgeTaken: null,
    conditionId: null,
  });
  const next = withBookkeeping(learner, nodeId, call, mergeModelOutput(call.json));
  const edge = selectEdge(nodeId, next);
  const finished = LearnerStateSchema.parse({
    ...next,
    last_edge: edge.id,
    last_condition: edge.condition_id,
    edges_taken: [...learner.edges_taken, edge.id],
  });
  attachEdge(learner.session_id, nodeId, edge.id, edge.condition_id);
  return { learner: finished };
}

export function makeWorker(nodeId: string) {
  return (state: { learner: LearnerState }) => runWorker(nodeId, state);
}
