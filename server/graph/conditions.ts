import { FAST_CONFIDENCE, FAST_SCORE, FATIGUE_THRESHOLD, SESSION_STEP_BOUND } from "./limits.js";
import type { LearnerState } from "./state.js";

export type ConditionFn = (state: LearnerState) => boolean;

function last(state: LearnerState): string | null {
  return state.path.at(-1) ?? null;
}

function isFastMastery(state: LearnerState): boolean {
  const assessment = state.last_assessment;
  if (!assessment) return false;
  return (
    assessment.error_class === null &&
    assessment.score >= FAST_SCORE &&
    assessment.confidence >= FAST_CONFIDENCE
  );
}

/**
 * Pure functions of LearnerState. No I/O. Workers never call each other;
 * the Supervisor evaluates these and is the only node that branches.
 */
export const CONDITIONS: Record<string, ConditionFn> = {
  "session.start": (state) => state.session_id.length > 0,
  "worker.return": (state) => state.path.length >= 1,
  "any.loop_detected": (state) =>
    state.loop_detected && !state.loop_cleared && last(state) !== "SafetyEscalation",
  "any.step_limit": (state) =>
    state.step >= SESSION_STEP_BOUND && !state.session_complete && last(state) !== "Reflect",
  "any.fatigue": (state) =>
    state.fatigue >= FATIGUE_THRESHOLD && !state.session_complete && last(state) !== "Reflect",
  "assess.disputed": (state) => state.disputed && last(state) !== "GradeDispute",
  "any.skill_map_edit": (state) => state.skill_map_edit && last(state) !== "SkillMapEdit",
  "assess.misconception": () => false,
  "assess.fast_mastery": (state) =>
    last(state) === "Assess" &&
    !state.disputed &&
    (isFastMastery(state) || state.last_assessment?.error_class === "misconception"),
  "assess.replan": (state) =>
    last(state) === "Assess" &&
    !state.disputed &&
    state.last_assessment?.error_class !== "misconception" &&
    !isFastMastery(state),
  "diagnose.needed": (state) =>
    !state.session_complete && !state.diagnosis?.placed && last(state) !== "Diagnose",
  "diagnose.complete": (state) => last(state) === "Diagnose" && state.diagnosis?.placed === true,
  "plan.ready": (state) => last(state) === "Plan" && Boolean(state.plan?.skill),
  "teach.complete": (state) => last(state) === "Teach",
  "practice.complete": (state) => last(state) === "Practice",
  "remediate.done": (state) => last(state) === "Remediate",
  "stretch.done": (state) => last(state) === "Stretch",
  "dispute.resolved": (state) => last(state) === "GradeDispute",
  "skill_map.resolved": (state) => last(state) === "SkillMapEdit",
  "safety.resolved": (state) => last(state) === "SafetyEscalation",
  "reflect.continue": (state) => last(state) === "Reflect" && !state.session_complete,
  "reflect.done": (state) => last(state) === "Reflect" && state.session_complete,
};

export const CONDITION_IDS = Object.keys(CONDITIONS);
