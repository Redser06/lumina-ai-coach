import { z } from "zod";
import { MAX_COST_BUDGET_USD, costBudgetFromConfig } from "./limits.js";

export const ERROR_CLASSES = ["misconception", "slip"] as const;
export const GOAL_MAX_CHARS = 2000;

export const LastAssessmentSchema = z.object({
  score: z.number().finite().min(0).max(1),
  error_class: z.enum(ERROR_CLASSES).nullable(),
  confidence: z.number().finite().min(0).max(1),
});

export const DiagnosisSchema = z.object({
  placed: z.boolean(),
  tier: z.string(),
});

export const PlanSchema = z.object({
  skill: z.string(),
  rationale: z.string(),
});

export const HitlPendingSchema = z.object({
  node: z.string(),
  reason: z.string(),
});

export const HitlRecordSchema = z.object({
  node: z.string(),
  decision: z.string(),
  actor: z.string(),
});

export const LearnerStateSchema = z.object({
  learner_id: z.string().min(1),
  session_id: z.string().min(1),
  scenario_id: z.string().nullable(),
  goal: z.string().max(GOAL_MAX_CHARS),
  mastery: z.record(z.string().min(1).max(64), z.number().finite().min(0).max(1)),
  last_assessment: LastAssessmentSchema.nullable(),
  time_on_task_s: z.number().finite().nonnegative(),
  fatigue: z.number().finite().nonnegative(),
  step: z.number().int().nonnegative(),
  cost_usd_session: z.number().finite().nonnegative(),
  cost_budget_usd: z.number().finite().positive().max(MAX_COST_BUDGET_USD),
  path: z.array(z.string()),
  edges_taken: z.array(z.string()),
  trace_nodes: z.array(z.string()),
  fingerprints: z.array(z.string()),
  hitl_pending: HitlPendingSchema.nullable(),
  hitl_log: z.array(HitlRecordSchema),
  loop_detected: z.boolean(),
  loop_cleared: z.boolean(),
  disputed: z.boolean(),
  skill_map_edit: z.boolean(),
  session_complete: z.boolean(),
  diagnosis: DiagnosisSchema.nullable(),
  plan: PlanSchema.nullable(),
  last_edge: z.string().nullable(),
  last_condition: z.string().nullable(),
});

export type LearnerState = z.infer<typeof LearnerStateSchema>;
export type LearnerPatch = Partial<LearnerState>;

export function initialLearnerState(partial: Partial<LearnerState> & Pick<LearnerState, "learner_id" | "session_id" | "goal">): LearnerState {
  const base: LearnerState = {
    learner_id: partial.learner_id,
    session_id: partial.session_id,
    scenario_id: partial.scenario_id ?? null,
    goal: partial.goal,
    mastery: partial.mastery ?? {},
    last_assessment: partial.last_assessment ?? null,
    time_on_task_s: partial.time_on_task_s ?? 0,
    fatigue: partial.fatigue ?? 0,
    step: partial.step ?? 0,
    cost_usd_session: partial.cost_usd_session ?? 0,
    cost_budget_usd: costBudgetFromConfig(),
    path: partial.path ?? [],
    edges_taken: partial.edges_taken ?? [],
    trace_nodes: partial.trace_nodes ?? [],
    fingerprints: partial.fingerprints ?? [],
    hitl_pending: partial.hitl_pending ?? null,
    hitl_log: partial.hitl_log ?? [],
    loop_detected: partial.loop_detected ?? false,
    loop_cleared: partial.loop_cleared ?? false,
    disputed: partial.disputed ?? false,
    skill_map_edit: partial.skill_map_edit ?? false,
    session_complete: partial.session_complete ?? false,
    diagnosis: partial.diagnosis ?? null,
    plan: partial.plan ?? null,
    last_edge: partial.last_edge ?? null,
    last_condition: partial.last_condition ?? null,
  };
  return LearnerStateSchema.parse(base);
}

/** Learner-visible fields only. Routing bookkeeping is excluded so the loop detector means "no learning change". */
export function fingerprintState(state: LearnerState): string {
  return JSON.stringify({
    mastery: state.mastery,
    last_assessment: state.last_assessment,
    fatigue: state.fatigue,
    goal: state.goal,
    diagnosis: state.diagnosis,
    plan: state.plan,
    disputed: state.disputed,
    skill_map_edit: state.skill_map_edit,
    session_complete: state.session_complete,
  });
}

/** Learner-visible fields a fork may change. Everything else, including spend and bookkeeping, is rejected. */
export const FORK_PATCH_FIELDS = ["fatigue", "last_assessment", "mastery", "disputed", "skill_map_edit", "goal"] as const;

export class ForkPatchRejected extends Error {
  readonly code = "FORK_PATCH_REJECTED";
  constructor(field: string) {
    super(`fork cannot patch ${field}`);
    this.name = "ForkPatchRejected";
  }
}

export function applyPatch(state: LearnerState, patch: Record<string, unknown>): LearnerState {
  const allowed = new Set<string>(FORK_PATCH_FIELDS);
  for (const field of Object.keys(patch)) {
    if (!allowed.has(field)) throw new ForkPatchRejected(field);
  }
  const next: Record<string, unknown> = { ...state };
  for (const [key, value] of Object.entries(patch)) {
    const current = next[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      next[key] = { ...(current as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      next[key] = value;
    }
  }
  return LearnerStateSchema.parse(next);
}
