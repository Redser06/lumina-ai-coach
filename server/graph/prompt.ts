import type { LearnerState } from "./state.js";

export function renderPrompt(nodeId: string, taskType: string, state: LearnerState): string {
  const visit = state.path.filter((entry) => entry === nodeId).length;
  return [
    `node: ${nodeId}`,
    `task_type: ${taskType}`,
    `scenario: ${state.scenario_id ?? "none"}`,
    `visit: ${visit}`,
    `goal: ${state.goal}`,
    `mastery: ${JSON.stringify(state.mastery)}`,
    `last_assessment: ${JSON.stringify(state.last_assessment)}`,
    `fatigue: ${state.fatigue}`,
    `step: ${state.step}`,
    `path: ${state.path.join(">")}`,
  ].join("\n");
}

/** Header plus the prompt this stage is writing or executing. `target` is last so one-line fields still parse. */
export function renderSelfPrompt(args: {
  nodeId: string;
  taskType: string;
  stage: string;
  state: LearnerState;
  depth: number;
  target: string;
}): string {
  return [
    renderPrompt(args.nodeId, args.taskType, args.state),
    `stage: ${args.stage}`,
    `depth: ${args.depth}`,
    "target:",
    args.target,
  ].join("\n");
}
