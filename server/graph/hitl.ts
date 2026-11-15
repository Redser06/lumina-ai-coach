import { interrupt } from "@langchain/langgraph";
import { LearnerStateSchema, type LearnerState } from "./state.js";
import { runWorker, type GraphUpdate } from "./nodes/worker.js";

/** The PRD names who may speak, not the words. accept sets a disputed grade aside. reject keeps it. */
export const HITL_DECISIONS = ["accept", "reject"] as const;
export type HitlDecisionValue = (typeof HITL_DECISIONS)[number];

export interface HitlDecision {
  decision: HitlDecisionValue;
  actor: string;
  node: string;
}

/** PRD r2 §5: a curator, a grader, or the learner confirming a plan. The learner does not decide a grade. */
export const HITL_ACTORS_BY_NODE: Record<string, readonly string[]> = {
  GradeDispute: ["curator", "grader"],
  SkillMapEdit: ["curator"],
  SafetyEscalation: ["safety-lead"],
};

export function parseHitlDecision(value: unknown): HitlDecision {
  if (!value || typeof value !== "object") {
    throw new Error("HITL resume requires {decision, actor, node}");
  }
  const record = value as { decision?: unknown; actor?: unknown; node?: unknown };
  if (typeof record.decision !== "string" || record.decision.length === 0) {
    throw new Error("HITL resume requires {decision, actor, node}");
  }
  if (typeof record.actor !== "string" || record.actor.length === 0) {
    throw new Error("HITL resume requires {decision, actor, node}");
  }
  if (typeof record.node !== "string" || record.node.length === 0) {
    throw new Error("HITL resume requires {decision, actor, node}");
  }
  if (!HITL_DECISIONS.includes(record.decision as HitlDecisionValue)) {
    throw new Error("HITL decision must be accept or reject");
  }
  return { decision: record.decision as HitlDecisionValue, actor: record.actor, node: record.node };
}

export function assertHitlDecision(value: unknown, nodeId: string): HitlDecision {
  const decision = parseHitlDecision(value);
  if (decision.node !== nodeId) {
    throw new Error(`HITL decision node does not match the paused node: ${decision.node}`);
  }
  const allowed = HITL_ACTORS_BY_NODE[nodeId] ?? [];
  if (!allowed.includes(decision.actor)) {
    throw new Error(`HITL actor is not allowed for ${nodeId}: ${decision.actor}`);
  }
  return decision;
}

export function makeHitl(nodeId: "GradeDispute" | "SkillMapEdit" | "SafetyEscalation") {
  return async (state: { learner: LearnerState }): Promise<GraphUpdate> => {
    const raw = interrupt({
      node: nodeId,
      session_id: state.learner.session_id,
      reason: nodeId,
    });
    const decision = assertHitlDecision(raw, nodeId);
    const before = state.learner;
    const update = await runWorker(nodeId, state);
    const booked = update.learner;
    const learner = LearnerStateSchema.parse({
      ...before,
      step: booked.step,
      cost_usd_session: booked.cost_usd_session,
      trace_nodes: booked.trace_nodes,
      path: booked.path,
      fingerprints: booked.fingerprints,
      self_prompts: booked.self_prompts,
      last_edge: booked.last_edge,
      last_condition: booked.last_condition,
      edges_taken: booked.edges_taken,
      hitl_pending: null,
      hitl_log: [
        ...before.hitl_log,
        { node: nodeId, decision: decision.decision, actor: decision.actor, at: new Date().toISOString() },
      ],
      last_assessment: nodeId === "GradeDispute" ? (decision.decision === "reject" ? before.last_assessment : null) : before.last_assessment,
      disputed: nodeId === "GradeDispute" ? false : before.disputed,
      skill_map_edit: nodeId === "SkillMapEdit" ? false : before.skill_map_edit,
      loop_detected: nodeId === "SafetyEscalation" ? false : before.loop_detected,
      loop_cleared: nodeId === "SafetyEscalation" ? true : before.loop_cleared,
    });
    return { learner };
  };
}

export const gradeDisputeNode = makeHitl("GradeDispute");
export const skillMapEditNode = makeHitl("SkillMapEdit");
export const safetyEscalationNode = makeHitl("SafetyEscalation");
