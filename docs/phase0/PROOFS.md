```
To: Eng
From: PM bot for Conor Redmond
Cut: LUMINA-CUT-2026-10-11  Phase: 0
ACs in this handoff: AC-1, AC-3, AC-4, AC-7, AC-8
For each AC:
  - Criterion: <verbatim from cut, do not reword>
  - Proof type required: <screenshot | logged-out share URL | API JSON | SHA | fixture id>
  - Proof location: <link/path once produced>
Constraints: no scope beyond listed ACs; open PRs as drafts, Conor alone merges; out-of-scope list in section 3 is binding.
Blockers / questions: <list or "none">
Done = every listed AC has its proof attached. PR count is not a success metric.
```

## AC-1

- Criterion: Coaching agent graph spec published and versioned: nodes Diagnose, Plan, Teach, Practice, Assess, Remediate, Stretch, Reflect + HITL nodes, with every conditional edge and its learner-state condition declared
- Proof type required: fixture id
- Proof location: fixture id `GRAPH-SPEC-coach-graph@2.0.0` (`server/graph/spec/coach-graph.v1.yaml`). `npm run spec:check` prints `sha256=cd3f0e050383937c5e8e1f17f37573cb054d38b3d52fe04e981f7a5261aeb99e`. Version 2.0.0 is the major bump for the `condition_expr` edits. The file name stays `coach-graph.v1.yaml`.

## AC-3

- Criterion: Branch coverage: 100% of nodes and conditional edges are exercised by at least 1 scenario fixture; the CI coverage report is attached
- Proof type required: SHA
- Proof location: commit `a0e41fae3c8cb8a5e1a827419d20042355065498`, green `ci` run https://github.com/Redser06/lumina-ai-coach/actions/runs/38187828688. Artifact `phase0-reports` (retention 90 days) contains `reports/graph-coverage.md` (`node_coverage` 1, `edge_coverage` 1).

## AC-4

- Criterion: Checkpoint replay: a session checkpointed per node can (a) resume after a forced crash at the same node, (b) replay to an identical path using recorded outputs, (c) fork from a chosen checkpoint
- Proof type required: API JSON
- Proof location: CI artifact `phase0-reports` (`proofs/phase0/ac4-resume.json`, `ac4-replay.json`, `ac4-fork.json`). The JSON is generated in CI and is not committed.

Reproduce:

```bash
CHECKPOINTER=sqlite LLM_PROVIDER=recorded npx tsx server/scripts/crash_drill.ts --scenario SCN-0001 --kill-after Practice
npx tsx server/scripts/proofs.ts --out proofs/phase0
```

## AC-7

- Criterion: Model router picks the model per node task type from config, falls back on a forced failure, and logs model/tokens/cost/latency per node
- Proof type required: API JSON
- Proof location: CI artifact `phase0-reports` (`proofs/phase0/ac7-router.json`). The JSON is generated in CI and is not committed.

Reproduce:

```bash
FAKE_FAIL=primary-tutor LLM_PROVIDER=fake npx tsx server/scripts/proofs.ts --only router --out proofs/phase0
```

## AC-8

- Criterion: CI eval gate blocks a merge when any per-node or per-path eval, or branch coverage, falls below threshold (shown with a deliberately regressed commit)
- Proof type required: SHA
- Proof location: demo branch `cursor/phase0-regression-demo-e8f4` (spec name `phase0/regression-demo`, mapped onto the required `cursor/` prefix). Draft PR https://github.com/Redser06/lumina-ai-coach/pull/3. Do not merge it.
  - Regressed commit `044b66767bac8d7525c68ff9f7ae3d57ac6ccd99` makes `assess.misconception` always false, so a misconception routes to Stretch. Red `ci` run: https://github.com/Redser06/lumina-ai-coach/actions/runs/38184990340. E2 server tests failed, and E3 graph coverage and E6 eval gate both ran and failed. `npm run eval` reported `ok: false`, path failure SCN-0001, and edge coverage below 1.0. The earlier red run https://github.com/Redser06/lumina-ai-coach/actions/runs/38183905209 skipped E3 and E6, so it does not count.
  - Revert commit `4c92c2690d881e5a8580888ecd505e9c960411ad`. Green `ci` run: https://github.com/Redser06/lumina-ai-coach/actions/runs/38185076053. E2, E3, and E6 all succeeded.
- A merge is blocked only after Conor marks the `ci` check required in branch protection. This change does not edit branch protection.

## Blockers / questions

- PlanConfirm is not declared. Adding it is a minor spec bump if Conor wants the learner plan-confirm pause from PRD §5.
- Q2 is still open. Checkpoints are SQLite locally and in CI. The production backend is decided before Phase 1.
- Q4 is still open. CI stays at $0 with no real-model calls and no paid key. The placeholder session cap is $1.00. The real provider stays disabled unless `LLM_PROVIDER=openai_compat`, `OPENAI_COMPAT_API_KEY`, and `OPENAI_COMPAT_BASE_URL` are set. Unknown model ids, zero or non-finite prices, and invalid caps are rejected and do not fall through to another model. That is stricter than the architect note that an unknown model would log `cost_usd: null`. The network guard is not installed by the API server. Tests load it with `node --import`, and the proof and drill scripts import it. `NO_NETWORK=0` is only for a script that must call a non-loopback host.
- Q6 is still open. Eng for this handoff is the Expert Coder. QA sign-off is Conor's. Please confirm.
- The Google Doc `1juArbTb8Y3k0-AYJszA5haCLh0JEIkVtx2TFjtG8_PY` ("Lumina AI Coach PRD cut 2026-10-11 (DRAFT)") matches cut r2 on the Phase 0 ACs. No Phase 0 drift against the box copy.
- The Supervisor node is in the spec and is not in AC-1's node list. PRD §5 has it own routing, so coverage counts its edges.
