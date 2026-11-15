# Phase 1 known limits

In Phase 1 the HITL actor is a self-asserted role string in the request body. `POST /sessions/:id/hitl` does not authenticate the caller. AC-11 will add authentication.

Until then the role is checked against the paused node's allowlist, which is not a login check:

- GradeDispute: `curator` or `grader`
- SkillMapEdit: `curator`
- SafetyEscalation: `safety-lead`

A role that is not on that list is rejected. The decision itself is `accept` or `reject`, and the body must name the paused node.

The PRD does not say what those two words do. This is a fail-closed default, and the product decision is still pending with PM. `reject` ends the session on GradeDispute, SkillMapEdit, and SafetyEscalation. An accepted GradeDispute clears `last_assessment` to null. It does not re-grade the work. There is no declared non-model reassessment after that, so the grade stays pinned for the rest of the session and later model merges cannot change it.
