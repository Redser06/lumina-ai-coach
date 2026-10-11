import { interrupt } from "@langchain/langgraph";
import { LearnerStateSchema, type LearnerState } from "./state.js";
import { runWorker, type GraphUpdate } from "./nodes/worker.js";

export interface HitlDecision {
  decision: string;
  actor: string;
}

export function assertHitlDecision(value: unknown): HitlDecision {
  if (!value || typeof value !== "object") {
    throw new Error("HITL resume requires {decision, actor}");
  }
  const record = value as { decision?: unknown; actor?: unknown };
  if (typeof record.decision !== "string" || record.decision.length === 0) {
    throw new Error("HITL resume requires {decision, actor}");
  }
  if (typeof record.actor !== "string" || record.actor.length === 0) {
    throw new Error("HITL resume requires {decision, actor}");
  }
  return { decision: record.decision, actor: record.actor };
}

export function makeHitl(nodeId: "GradeDispute" | "SkillMapEdit" | "SafetyEscalation") {
  return async (state: { learner: LearnerState }): Promise<GraphUpdate> => {
    const raw = interrupt({
      node: nodeId,
      session_id: state.learner.session_id,
      reason: nodeId,
    });
    const decision = assertHitlDecision(raw);
    const update = await runWorker(nodeId, state);
    const learner = LearnerStateSchema.parse({
      ...update.learner,
      hitl_pending: null,
      hitl_log: [...state.learner.hitl_log, { node: nodeId, decision: decision.decision, actor: decision.actor }],
      disputed: nodeId === "GradeDispute" ? false : update.learner.disputed,
      skill_map_edit: nodeId === "SkillMapEdit" ? false : update.learner.skill_map_edit,
      loop_detected: nodeId === "SafetyEscalation" ? false : update.learner.loop_detected,
      loop_cleared: nodeId === "SafetyEscalation" ? true : update.learner.loop_cleared,
    });
    return { learner };
  };
}

export const gradeDisputeNode = makeHitl("GradeDispute");
export const skillMapEditNode = makeHitl("SkillMapEdit");
export const safetyEscalationNode = makeHitl("SafetyEscalation");
