import { roundUsd } from "../../router/pricing.js";
import type { ModelCall } from "../../router/types.js";
import { fingerprintState, type LearnerPatch, type LearnerState } from "../state.js";

const MODEL_KEYS = [
  "mastery",
  "last_assessment",
  "time_on_task_s",
  "fatigue",
  "goal",
  "diagnosis",
  "plan",
  "disputed",
  "skill_map_edit",
  "loop_detected",
  "session_complete",
  "hitl_pending",
] as const;

export function mergeModelOutput(json: Record<string, unknown>): LearnerPatch {
  const patch: Record<string, unknown> = {};
  for (const key of MODEL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(json, key)) patch[key] = json[key];
  }
  return patch as LearnerPatch;
}

export function withBookkeeping(state: LearnerState, nodeId: string, call: ModelCall, patch: LearnerPatch): LearnerState {
  const merged: LearnerState = {
    ...state,
    ...patch,
    step: state.step + 1,
    cost_usd_session: roundUsd(state.cost_usd_session + call.cost_usd),
    trace_nodes: [...state.trace_nodes, nodeId],
    last_edge: state.last_edge,
    last_condition: state.last_condition,
  };
  if (nodeId !== "Supervisor") {
    merged.path = [...state.path, nodeId];
    merged.fingerprints = [...state.fingerprints, fingerprintState(merged)];
  }
  return merged;
}
