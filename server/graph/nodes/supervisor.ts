import { attachEdge } from "../../telemetry/node_log.js";
import { complete } from "../../router/router.js";
import { currentRunId } from "../../runtime/context.js";
import { applyGuards } from "../guards.js";
import { renderPrompt } from "../prompt.js";
import { selectEdge } from "../route.js";
import { loadSpec } from "../spec/load.js";
import { LearnerStateSchema, type LearnerState } from "../state.js";
import { mergeModelOutput, withBookkeeping } from "./merge.js";
import type { GraphUpdate } from "./worker.js";

export async function supervisorNode(state: { learner: LearnerState }): Promise<GraphUpdate> {
  const learner = state.learner;
  const guarded: LearnerState = { ...learner, ...applyGuards(learner) };
  const node = loadSpec().nodes.find((item) => item.id === "Supervisor");
  if (!node) throw new Error("missing Supervisor spec");
  const call = await complete({
    node: "Supervisor",
    taskType: node.task_type,
    prompt: renderPrompt("Supervisor", node.task_type, guarded),
    sessionId: learner.session_id,
    runId: currentRunId(),
    spentUsd: learner.cost_usd_session,
    capUsd: learner.cost_budget_usd,
    edgeTaken: null,
    conditionId: null,
  });
  const drafted = withBookkeeping(guarded, "Supervisor", call, mergeModelOutput(call.json));
  const edge = selectEdge("Supervisor", drafted);
  const finished = LearnerStateSchema.parse({
    ...drafted,
    last_edge: edge.id,
    last_condition: edge.condition_id,
    edges_taken: [...learner.edges_taken, edge.id],
  });
  attachEdge(learner.session_id, "Supervisor", edge.id, edge.condition_id);
  return { learner: finished };
}
