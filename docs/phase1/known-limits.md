# Phase 1 known limits

In Phase 1 the HITL actor is a self-asserted role string in the request body. `POST /sessions/:id/hitl` does not authenticate the caller. AC-11 will add authentication.

Until then the role is checked against the paused node's allowlist, which is not a login check:

- GradeDispute: `curator` or `grader`
- SkillMapEdit: `curator`
- SafetyEscalation: `safety-lead`

A role that is not on that list is rejected. The decision itself is `accept` or `reject`, and the body must name the paused node.
