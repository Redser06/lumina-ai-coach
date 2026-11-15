import type { ModelCall } from "../../router/types.js";
import { fingerprintState, type LearnerPatch, type LearnerState } from "../state.js";

/** Learner flags a human or the loop detector owns. Model JSON cannot set these. */
const MODEL_KEYS = [
  "mastery",
  "last_assessment",
  "time_on_task_s",
  "fatigue",
  "goal",
  "diagnosis",
  "plan",
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
    // Only Assess records a grade. A GradeDispute decision sets last_assessment itself;
    // Supervisor and the other workers cannot put that grade back or replace it.
    ...(nodeId === "Assess" ? {} : { last_assessment: state.last_assessment }),
    step: state.step + 1,
    cost_usd_session: call.session_spent_usd,
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
