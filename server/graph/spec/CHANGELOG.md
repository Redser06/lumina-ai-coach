# coach-graph changelog

Spec id: `coach-graph`. Semver: adding or removing an edge is a minor bump. A change to condition semantics (`condition_expr` or the pure function it names) is a major bump. A spec-field change that does not touch edges or conditions is a patch.

## 5.0.0 - 2026-11-15

- Major. `e-sup-hitl-reject`'s priority moved from 17 to 96. Changing which edge wins changes routing outcomes, the same kind of change as a `condition_expr` edit, so it's major. This supersedes the 4.3.0 minor labelling.

## 4.3.0 - 2026-11-15

- Minor. `e-sup-hitl-reject` priority moves from 17 to 96. It now sits above fatigue (80) and the step bound (90), and below the loop edge (100). A model-set `fatigue` can no longer outrank a human `reject`. The `condition_expr` is unchanged.
- Superseded by 5.0.0: that priority move is major, not minor.

## 4.2.0 - 2026-11-15

- Minor. New edge `e-sup-hitl-reject` (`hitl.rejected`, priority 17). A human `reject` on GradeDispute, SkillMapEdit, or SafetyEscalation ends the session. `accept` still uses the existing return-to-Reflect edges. On GradeDispute, `reject` keeps `last_assessment` and `accept` sets it aside. No existing `condition_expr` changed.

## 4.1.0 - 2026-11-15

- Minor. New edge `e-sup-hitl-repeat` (`any.hitl_repeat`, priority 72) is a backstop for seeded or forked state: a second dispute or skill-map request, once the path is Reflect immediately after that HITL node, ends the session. The live Reflect ↔ GradeDispute cycle is closed because model output cannot set `disputed`, `skill_map_edit`, or `loop_detected`. The edge is not what closes that cycle.

## 4.0.0 - 2026-11-15

- Major, because `reflect.continue`'s `condition_expr` changed. An unfinished Reflect continues to Plan only when the step is under 40, the learner is placed, and the previous node was not a Plan with an empty skill.
- New edge `e-sup-reflect-stop` (`reflect.stop`, priority 55) sends that unfinished Reflect to End, so a dead end cannot bounce Reflect → Plan until the cost cap. `reflect.done` still ends a Reflect that sets `session_complete`.
- Numeric cutoffs are the Phase 0 limits in `server/graph/limits.ts`, not new PRD numbers: fatigue `0.8`, fast mastery score `0.85` and confidence `0.8`, session step bound `40`, loop repeat `3`.

## 3.0.0 - 2026-11-15

- Major, because `assess.replan` no longer matches `error_class == slip`. A slip is not a replan.
- New edge `e-sup-slip` (`assess.slip`, priority 35): after Assess, a slip goes to Practice. It sits below fast mastery and above replan.
- New edge `e-sup-ready` (`session.ready`, priority 12): a placed learner with no plan skill, who is not already on a pipeline node, goes to Plan. Diagnose-complete, reflect-continue, and a middling null-error assessment still go to Plan on their existing edges.
- New edge `e-sup-dead` (`any.dead_end`, priority 1): Diagnose without a placement, Plan without a skill after placement, or an unknown node that already has a plan, goes to Reflect. Loop detection still goes to SafetyEscalation. The step bound and fatigue still go to Reflect at higher priority.
- Teach, Practice and Remediate `max_depth` values are unchanged.

## 2.0.1 - 2026-11-15

- Patch. No edge was added or removed, and no `condition_expr` changed.
- Teach, Practice and Remediate declare `max_depth` and run draft → critique → revise → execute → check inside that bound. `max_steps` stays 1.
- Depths differ on purpose. Teach is 2 (one retry, and the forced API run). Practice is 3 so a hardcoded 2 cannot pass its fixture. Remediate is 1: one revision, then stop even if the critique rejects.
- `npm run spec:check` prints the new sha256 because the spec file changed.
- Learner `self_prompts` defaults to `[]`, so a checkpoint written at 2.0.0 still parses. No edge or condition change.

## 2.0.0 - 2026-10-12

- Major bump for `condition_expr` edits that shipped under 1.0.0. `plan.ready` requires a non-empty `plan.skill`. The replan expression no longer names `fast_mastery`, which is not a learner-state field.
- The version field is the spec version. The file name stays `coach-graph.v1.yaml`.

## 1.0.0 - 2026-10-11

- Initial Phase 0 graph.
- Coaching nodes: Diagnose, Plan, Teach, Practice, Assess, Remediate, Stretch, Reflect.
- HITL interrupt nodes: GradeDispute, SkillMapEdit, SafetyEscalation.
- Supervisor owns every conditional edge. Workers return only to the Supervisor.
- PlanConfirm is not declared. The PRD names the learner confirming a plan as a pause, but it is not in the named HITL list. Adding it later is a minor bump.
- Teach, Practice and Remediate are `subgraph: true` with `max_steps: 1` (single-step stubs). Self-prompting depth is Phase 1 and does not change these edges.
