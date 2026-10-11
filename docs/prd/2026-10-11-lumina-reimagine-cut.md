Decision needed: Bossman (Conor Redmond) approves this cut to rebuild Lumina from a static, hardcoded React demo into a live coach built on agent graph engineering. The coach runs as a branching coaching agent graph (diagnose, plan, teach, practice, assess, remediate, stretch, reflect) that routes by learner state, uses self-prompting subgraphs, and supports checkpoint/replay and human-in-the-loop nodes. It is backed by a skill map (knowledge graph) as supporting data, with Phase 0 to 1 unlocked for Eng and QA. Approve / amend / reject by 2026-10-16.

# Lumina AI Coach: Reimagine PRD cut

- Cut ID: LUMINA-CUT-2026-10-11
- Status: DRAFT (not shipped, not binding until Conor approves)
- Owner: Conor Redmond
- Date of cut: 2026-10-11 (Europe/Dublin)
- Repo: https://github.com/Redser06/lumina-ai-coach
- Eng: not set yet. QA: not set yet.
- Revision: r2 2026-10-11 (corrects 'graph engineering' to mean agent graph engineering, not knowledge graphs).
- Human gate: Conor alone merges. No bot, Eng or QA merges this cut or any PR under it.
- Success measure: learner mastery gain and proof-backed ACs. Not PR count.

## 1. Current state (as of main, 2026-10-11)

- Front-end only: React 18 + Vite 6 + Tailwind + TypeScript, deployed to a Firebase Hosting preview channel. No backend, no auth, no database.
- No live AI. The "coach" picks answers from static content in `src/data/coachKnowledge.ts`. There are no model SDKs in `package.json`.
- Content is hardcoded TS files (curriculum, diagnostic questions, news, tools). The news and model directory are already stale (Claude 3.7, Gemini 2.0, DeepSeek R1).
- 4 scripted simulators (ReAct loop, StateGraph, MCP wire inspector, evals matrix). They are animations, not real executions.
- Progress, XP and badges live in `localStorage`. There is a 4-tier x 5-role diagnostic. Tests are one `node --test` file. There are 0 open issues.

## 2. Target state

Lumina becomes a curated coaching platform that takes a learner from total novice to world expert in a chosen domain (launch domain: applied AI / agent engineering). The core technique is **agent graph engineering**. The coach does not run a single prompt-response loop. It runs a graph: branching nodes, conditional edges and many possible outcomes. At each node the agent writes its own next prompt from the current learner state.

1. **A coaching agent graph (core):** nodes Diagnose, Plan, Teach, Practice, Assess, Remediate, Stretch, Reflect, plus human-in-the-loop (HITL) nodes. Conditional edges route on learner state (mastery, confidence, error type, fatigue, goal).
2. **Self-prompting subgraphs:** Teach, Practice and Remediate are subgraphs. Each one generates, critiques and revises its own prompts within bounded depth.
3. **Checkpointing and replay:** state is saved after every node. Any session can be resumed, replayed or forked from any checkpoint.
4. **A model router:** each node or task goes to the best current model by cost, latency and quality. The routing table is config.
5. **Evals as product:** per-node and per-path evals, plus branch-coverage fixtures. Regressions block release.
6. **Skill map (knowledge graph), supporting data only:** a curated prerequisite map of skills. The agent graph reads it to decide routes. It is not the coach's architecture.

| Dimension | Current | Target |
|---|---|---|
| Coach | Static keyword answers | Coaching agent graph with conditional routing and self-prompting subgraphs |
| Control flow | Linear scripted UI | Branching graph, many outcomes, checkpoint/replay, HITL |
| Content | Hardcoded TS | Skill map (knowledge graph) + curated content store |
| Personalisation | 4 tiers x 5 roles | Graph routes by live learner state; spaced review |
| Labs | Scripted animations | Learners build and run real agent graphs in a sandbox |
| Models | None | Router across frontier, reasoning and small/open models |
| Persistence | localStorage | Auth + server-side learner state and graph checkpoints |
| Quality | 1 test file | Per-node evals, branch coverage, CI gate |

## 3. In scope / out of scope

**In scope (this cut)**
- Coaching agent graph (core): 8 coaching nodes + HITL nodes, conditional routing on learner state, self-prompting subgraphs, checkpoint/replay
- Learner state: diagnostic, mastery tracking, spaced repetition, memory (session + long-term profile)
- Skill map (knowledge graph) schema plus a seed map for applied AI (at least 150 skills), as supporting data
- Model router with a config-driven routing table and fallback
- Real sandboxed labs: agent graph lab (replaces the scripted StateGraph and loop sims) and evals lab
- Eval harness, golden fixtures and CI gate
- Auth and server-side persistence; logged-out shareable progress/credential pages
- Curator workflow: a human approves agent-proposed skill map edits

**Out of scope (this cut)**
- Domains other than applied AI (the graph schema must stay domain-agnostic)
- Native mobile apps, payments/billing, enterprise SSO/SCIM
- Fine-tuning or training our own models
- Formal accredited certification
- Voice/video tutoring (revisit in the next cut)

## 4. Personas and the novice-to-expert journey

**Personas**
- **P1 Novice Nia:** non-technical professional who has never written a prompt. Needs confidence and quick wins.
- **P2 Practitioner Pat:** uses chat AI daily and wants to build agents/automations.
- **P3 Builder Ben:** engineer shipping LLM features. Needs evals, orchestration and production patterns.
- **P4 Expert-track Eva:** wants frontier-level depth (research reading, novel system design, teaching others).
- **P5 Curator Cara:** domain expert who approves graph and content changes.
- **P6 Sponsor Sam:** team lead who views cohort progress via share links.

**Journey stages (mapped to graph depth)**
1. **Diagnose** (10 min): adaptive diagnostic places the learner on the skill map.
2. **Foundations** (Novice): guided lessons with spaced review. Mastery is gated per node.
3. **Practice** (Practitioner): real labs with Assessor feedback.
4. **Build** (Builder): multi-step projects; evals the learner writes are graded.
5. **Mastery** (Expert): open-ended capstones, research synthesis, teaching-back (learner explains, the agent probes), and peer/curator review.
6. **Frontier** (World expert): live-frontier nodes fed by the curated news pipeline. The learner contributes skill map edits that curators approve.

The coaching agent graph moves learners through these stages. Each stage exit is evidence-based (mastery at or above threshold on all prerequisite skills in the skill map plus a passing artefact), not time-based. Inside every session the graph branches: for example, Assess goes to Remediate on misconception, to Stretch on fast mastery, and to Reflect on fatigue.

## 5. Architecture direction (no code; direction only)

- **Coaching agent graph (core, agent graph engineering):**
  - Nodes: Diagnose -> Plan -> Teach -> Practice -> Assess, then a conditional branch to Remediate, Stretch, Reflect, or back to Plan. HITL nodes: GradeDispute, SkillMapEdit, SafetyEscalation.
  - Conditional edges are pure functions of learner state (mastery delta, error class, confidence, time-on-task, goal, cost budget). Every edge is declared in a versioned graph spec, so routing is inspectable and testable.
  - A Supervisor node owns routing. Worker nodes never call each other directly.
  - Recursion and step bounds per session. A dead-end or loop detector routes to Reflect or HITL.
- **Self-prompting subgraphs:** Teach, Practice and Remediate are subgraphs (draft prompt -> self-critique -> revise -> execute -> check). The agent writes its own next prompt from state rather than following a fixed script. There's a maximum depth, and every self-generated prompt is logged.
- **Checkpointing and replay:** state is persisted after every node (inputs, chosen edge, model, outputs). A session can resume after a crash, replay deterministically with recorded model outputs, or fork from any checkpoint ("what if the learner had answered X"). This powers debugging, evals and the learner's "rewind" feature.
- **Human-in-the-loop nodes:** the graph pauses at interrupt nodes and resumes only on human input (a curator, a grader, or the learner confirming a plan).
- **Model router:** each node declares a task type (tutor-chat, deep-reasoning, grading, self-critique, cheap-classify, embedding) that maps to a model pool across current frontier, mid-tier and small/open models. Driven by config plus eval scores, with fallback. Logs model, tokens, cost and latency per node.
- **Skill map (knowledge graph), supporting data only:** typed prerequisite map (Skill, Concept, Lab, Assessment, Resource, FrontierUpdate). Plan and Assess nodes read it for prerequisites and grounding. Versioned, with provenance. Teach-node citations come only from skill map entries actually retrieved.
- **Memory:** session state (lives in the graph checkpoints), plus a long-term learner profile (mastery vector, misconceptions, goals), plus an episodic evidence log. The learner can view and delete it.
- **Adaptive learning:** per-skill knowledge tracing and an FSRS-style spaced-repetition scheduler. Both feed the routing state.
- **Evals:** per-node golden fixtures, per-path scenario fixtures (scripted learner personas driving the graph end to end), branch-coverage reporting, and LLM-as-judge calibrated against human labels. Online metrics: mastery gain/hour, retention at 30 days, stage completion. CI blocks a merge on regression.
- **Safety:** prompt-injection defence on lab tools and self-generated prompts, sandbox isolation, PII minimisation, per-user cost caps.

## 6. Acceptance criteria

Every AC must ship with its named proof. An AC without proof is not done.

| ID | Criterion | Proof type |
|---|---|---|
| AC-1 | Coaching agent graph spec published and versioned: nodes Diagnose, Plan, Teach, Practice, Assess, Remediate, Stretch, Reflect + HITL nodes, with every conditional edge and its learner-state condition declared | fixture id |
| AC-2 | Graph routing: on 50 learner-state fixtures, the Supervisor picks the expected next node in at least 95% of cases (e.g. misconception -> Remediate, fast mastery -> Stretch) | fixture id |
| AC-3 | Branch coverage: 100% of nodes and conditional edges are exercised by at least 1 scenario fixture; the CI coverage report is attached | SHA |
| AC-4 | Checkpoint replay: a session checkpointed per node can (a) resume after a forced crash at the same node, (b) replay to an identical path using recorded outputs, (c) fork from a chosen checkpoint | API JSON |
| AC-5 | Self-prompting subgraphs: Teach/Practice/Remediate generate, critique and revise their own prompts within a declared max depth; the trace shows every self-generated prompt and the depth is never exceeded | API JSON |
| AC-6 | HITL nodes: GradeDispute and SkillMapEdit pause the graph; it resumes only after a human decision, and the decision is recorded in the checkpoint | screenshot |
| AC-7 | Model router picks the model per node task type from config, falls back on a forced failure, and logs model/tokens/cost/latency per node | API JSON |
| AC-8 | CI eval gate blocks a merge when any per-node or per-path eval, or branch coverage, falls below threshold (shown with a deliberately regressed commit) | SHA |
| AC-9 | Skill map (knowledge graph) schema plus seed map of at least 150 skills, acyclic prerequisites, provenance on 100% of entries | fixture id |
| AC-10 | Diagnose node places a learner on the skill map in 15 items or fewer; placement matches expert labels in at least 80% of 30 fixture learners | fixture id |
| AC-11 | Learner state (mastery, profile) persists server-side; survives logout and a device switch | API JSON |
| AC-12 | Plan node returns a next skill that is unmastered with all prerequisites mastered, plus a rationale | API JSON |
| AC-13 | Spaced-repetition reviews appear on the dashboard on the scheduled day and enter the graph via the Plan node | screenshot |
| AC-14 | Teach node cites only skill map entries it retrieved; groundedness at least 0.9 on the Teach golden set | fixture id |
| AC-15 | Assess node grading agrees with human graders at Cohen's kappa of 0.7 or higher | fixture id |
| AC-16 | Per-user cost cap enforced; over-cap nodes route to a cheaper model, not an error | API JSON |
| AC-17 | Agent graph lab: a learner builds and runs a real branching agent graph (at least 1 conditional edge) in a sandbox and sees a replayable trace | screenshot |
| AC-18 | Evals lab: a learner authors a fixture set, runs it against their graph and sees scored results | screenshot |
| AC-19 | An agent-proposed skill map edit is not live until a curator approves it via the HITL node; approval creates a versioned snapshot | SHA |
| AC-20 | Logged-out share URL shows a learner's verified progress and path through the graph without PII | logged-out share URL |
| AC-21 | Learner can view and delete long-term memory; deletion is reflected in the API | API JSON |
| AC-22 | A curated news item becomes a FrontierUpdate entry in the skill map, linked to at least 1 skill within 72h of approval | fixture id |

## 7. Unlock order (phased)

- **Phase 0 Agent graph core:** AC-1, AC-3, AC-4, AC-7, AC-8. Graph spec, coverage, checkpoints, router and eval gate come first.
- **Phase 1 Routing and control:** AC-2, AC-5, AC-6, AC-9, AC-10, AC-11.
- **Phase 2 Coaching quality:** AC-12, AC-13, AC-14, AC-15, AC-16, AC-21.
- **Phase 3 Real labs:** AC-17, AC-18.
- **Phase 4 Expert and frontier loop:** AC-19, AC-20, AC-22.

A phase is unlocked only by QA sign-off on all proofs of the previous phase. Only Conor merges.

## 8. Risks

- **R1** Routing explosion: many branches become untestable. Mitigation: declared edges, 100% branch-coverage gate, step bounds.
- **R1b** Self-prompting drift or loops. Mitigation: max depth, loop detector, logged prompts, per-node evals.
- **R1c** Skill map curation cost. Mitigation: agent-proposed edits plus HITL approval; one domain first.
- **R2** Hallucinated tutoring. Mitigation: retrieved-only citation rule, groundedness evals.
- **R3** Model churn and cost. Mitigation: config-driven router, monthly eval-based review, cost caps.
- **R4** Sandbox security for real labs. Mitigation: isolated runtime, network policy, injection tests.
- **R5** "World expert" overclaim. Mitigation: define expert as evidence-backed mastery of the top skill-map tier plus curator-reviewed capstone.
- **R6** Rebuild vs. evolve: the current codebase has no backend. Mitigation: keep the UI/design system, replace the data layer.

## 9. Open questions (for Conor)

- **Q1** Audience: internal employee enablement (as the README states) or public learners? This changes auth, privacy and pricing.
- **Q2** Backend platform: stay on Firebase, or move to Supabase/Vercel (both are connected)?
- **Q3** Launch domain confirmed as applied AI, or something else?
- **Q4** Model budget ceiling per learner per month?
- **Q5** Who are the human curators for P5?
- **Q6** Eng and QA owners (currently not set)?

## 10. Locked Eng handoff template

```
To: Eng
From: PM bot for Conor Redmond
Cut: LUMINA-CUT-2026-10-11  Phase: <n>
ACs in this handoff: <AC ids>
For each AC:
  - Criterion: <verbatim from cut, do not reword>
  - Proof type required: <screenshot | logged-out share URL | API JSON | SHA | fixture id>
  - Proof location: <link/path once produced>
Constraints: no scope beyond listed ACs; open PRs as drafts, Conor alone merges; out-of-scope list in section 3 is binding.
Blockers / questions: <list or "none">
Done = every listed AC has its proof attached. PR count is not a success metric.
```

## 11. Locked QA handoff template

```
To: QA
From: PM bot for Conor Redmond
Cut: LUMINA-CUT-2026-10-11  Phase: <n>
Verify each AC:
  - AC id: <id>
  - Expected (verbatim): <criterion>
  - Proof submitted: <type + link/SHA/fixture id>
  - Result: PASS | FAIL | BLOCKED
  - Evidence of verification: <screenshot/API JSON/etc.>
Phase sign-off: <all PASS? yes/no>. Next phase unlocks only on yes. QA does not merge; Conor alone merges.
Defects: <list with AC id>
```
