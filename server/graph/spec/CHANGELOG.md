# coach-graph changelog

Spec id: `coach-graph`. Semver: adding or removing an edge is a minor bump. A change to condition semantics (`condition_expr` or the pure function it names) is a major bump.

## 1.0.0 - 2026-10-11

- Initial Phase 0 graph.
- Coaching nodes: Diagnose, Plan, Teach, Practice, Assess, Remediate, Stretch, Reflect.
- HITL interrupt nodes: GradeDispute, SkillMapEdit, SafetyEscalation.
- Supervisor owns every conditional edge. Workers return only to the Supervisor.
- PlanConfirm is not declared. The PRD names the learner confirming a plan as a pause, but it is not in the named HITL list. Adding it later is a minor bump.
- Teach, Practice and Remediate are `subgraph: true` with `max_steps: 1` (single-step stubs). Self-prompting depth is Phase 1 and does not change these edges.
