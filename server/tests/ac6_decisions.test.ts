import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { compileCoachGraph } from "../graph/build.js";
import { SessionService } from "../graph/session.js";
import { initialLearnerState } from "../graph/state.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";

const ORIGINAL_GRADE = { score: 0.48, error_class: "misconception" as const, confidence: 0.4 };

const finishing: Provider = {
  id: "fake",
  async complete(request) {
    const payload = request.prompt.includes("node: Reflect") ? { session_complete: true, fatigue: 0.2 } : { note: "ok" };
    return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
  },
};

function learner(partial: Record<string, unknown>) {
  return initialLearnerState({
    learner_id: "pat",
    session_id: "ac6-decision",
    goal: "dispute a grade",
    diagnosis: { placed: true, tier: "practitioner" },
    plan: { skill: "evals", rationale: "grade the lab" },
    fatigue: 0.1,
    step: 6,
    last_assessment: ORIGINAL_GRADE,
    ...partial,
  });
}

async function pausedDispute(sessionId: string, service: SessionService) {
  const paused = await service.run(
    learner({ session_id: sessionId, path: ["Assess"], disputed: true, fingerprints: ["once"] }),
    [],
    sessionId,
  );
  assert.equal(paused.status, "interrupted");
  assert.equal(paused.next[0], "GradeDispute");
  return paused;
}

describe("ac6 decisions", { concurrency: false }, () => {
  for (const node of ["GradeDispute", "SkillMapEdit", "SafetyEscalation"] as const) {
    test(`learner_is_rejected_on_${node}`, async () => {
      const checkpointer = new MemorySaver();
      const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
      const sessionId = `ac6-learner-${node}`;
      try {
        const paused = await service.run(
          learner({
            session_id: sessionId,
            path: ["Assess"],
            fingerprints: ["once"],
            ...(node === "GradeDispute" ? { disputed: true } : {}),
            ...(node === "SkillMapEdit" ? { skill_map_edit: true } : {}),
            ...(node === "SafetyEscalation" ? { loop_detected: true, loop_cleared: false } : {}),
          }),
          [],
          sessionId,
        );
        assert.equal(paused.next[0], node);
        await assert.rejects(
          () => service.hitl(sessionId, { decision: "accept", actor: "learner", node }),
          new RegExp(`not allowed for ${node}`),
        );
        const still = await service.step(sessionId);
        assert.equal(still.status, "interrupted");
        assert.equal(still.state.hitl_log.length, 0);
      } finally {
        service.close();
      }
    });
  }

  test("grader_is_accepted_on_grade_dispute", async () => {
    useRouterForTests(createRouter({ provider: finishing }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-grader-ok";
    try {
      await pausedDispute(sessionId, service);
      const done = await service.hitl(sessionId, { decision: "accept", actor: "grader", node: "GradeDispute" });
      assert.notEqual(done.status, "interrupted");
      assert.equal(done.state.hitl_log.at(-1)?.actor, "grader");
      assert.equal(done.state.path.includes("GradeDispute"), true);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  for (const node of ["SkillMapEdit", "SafetyEscalation"] as const) {
    test(`grader_is_rejected_on_${node}`, async () => {
      const checkpointer = new MemorySaver();
      const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
      const sessionId = `ac6-grader-${node}`;
      try {
        const paused = await service.run(
          learner({
            session_id: sessionId,
            path: ["Assess"],
            fingerprints: ["once"],
            ...(node === "SkillMapEdit" ? { skill_map_edit: true } : { loop_detected: true, loop_cleared: false }),
          }),
          [],
          sessionId,
        );
        assert.equal(paused.next[0], node);
        await assert.rejects(
          () => service.hitl(sessionId, { decision: "accept", actor: "grader", node }),
          new RegExp(`not allowed for ${node}`),
        );
        const still = await service.step(sessionId);
        assert.equal(still.status, "interrupted");
        assert.equal(still.state.hitl_log.length, 0);
      } finally {
        service.close();
      }
    });
  }

  test("accept_sets_the_disputed_grade_aside_and_continues", async () => {
    useRouterForTests(createRouter({ provider: finishing }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-accept";
    try {
      await pausedDispute(sessionId, service);
      const done = await service.hitl(sessionId, { decision: "accept", actor: "curator", node: "GradeDispute" });
      assert.equal(done.status, "done");
      assert.equal(done.state.last_assessment, null);
      assert.equal(done.edges.includes("e-sup-reflect-dispute"), true);
      assert.equal(done.edges.includes("e-sup-hitl-reject"), false);
      assert.equal(done.state.path.at(-1), "Reflect");
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("reject_keeps_the_original_grade_and_ends", async () => {
    useRouterForTests(createRouter({ provider: finishing }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-reject";
    try {
      await pausedDispute(sessionId, service);
      const done = await service.hitl(sessionId, { decision: "reject", actor: "curator", node: "GradeDispute" });
      assert.equal(done.status, "done");
      assert.deepEqual(done.state.last_assessment, ORIGINAL_GRADE);
      assert.equal(done.edges.includes("e-sup-hitl-reject"), true);
      assert.equal(done.edges.includes("e-sup-reflect-dispute"), false);
      assert.equal(done.state.path.includes("Reflect"), false);
      assert.equal(done.state.disputed, false);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("reject_with_model_fatigue_still_ends", async () => {
    const tired: Provider = {
      id: "fake",
      async complete(request) {
        const payload = request.prompt.includes("node: GradeDispute") ? { fatigue: 0.9, note: "tired" } : { note: "ok" };
        return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: tired }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-reject-fatigue";
    try {
      await pausedDispute(sessionId, service);
      const done = await service.hitl(sessionId, { decision: "reject", actor: "curator", node: "GradeDispute" });
      assert.equal(done.status, "done");
      assert.equal(done.edges.at(-1), "e-sup-hitl-reject");
      assert.equal(done.edges.includes("e-sup-fatigue"), false);
      assert.equal(done.state.path.includes("Reflect"), false);
      assert.equal(done.state.fatigue, 0.1);
      assert.ok(done.state.step < 20);
      assert.deepEqual(done.state.last_assessment, ORIGINAL_GRADE);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("reject_keeps_the_grade_when_the_supervisor_model_rewrites_it", async () => {
    const rewriting: Provider = {
      id: "fake",
      async complete(request) {
        const rewriting = request.prompt.includes("node: Supervisor") && request.prompt.endsWith("path: Assess>GradeDispute");
        const payload = rewriting
          ? { last_assessment: { score: 0.95, error_class: null, confidence: 0.9 }, fatigue: 0.9 }
          : { note: "ok" };
        return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: rewriting }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-reject-rewrite";
    try {
      await pausedDispute(sessionId, service);
      const done = await service.hitl(sessionId, { decision: "reject", actor: "curator", node: "GradeDispute" });
      assert.equal(done.edges.at(-1), "e-sup-hitl-reject");
      assert.equal(done.state.path.includes("Reflect"), false);
      assert.deepEqual(done.state.last_assessment, ORIGINAL_GRADE);
      assert.equal(done.state.fatigue, 0.9);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("accept_keeps_the_grade_set_aside_when_the_supervisor_model_rewrites_it", async () => {
    const rewriting: Provider = {
      id: "fake",
      async complete(request) {
        if (request.prompt.includes("node: Supervisor") && request.prompt.endsWith("path: Assess>GradeDispute")) {
          return {
            text: JSON.stringify({ last_assessment: { score: 0.95, error_class: null, confidence: 0.9 } }),
            tokens_in: 4,
            tokens_out: 2,
            latency_ms: 1,
          };
        }
        const payload = request.prompt.includes("node: Reflect") ? { session_complete: true } : { note: "ok" };
        return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: rewriting }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-accept-rewrite";
    try {
      await pausedDispute(sessionId, service);
      const done = await service.hitl(sessionId, { decision: "accept", actor: "curator", node: "GradeDispute" });
      assert.equal(done.status, "done");
      assert.equal(done.state.last_assessment, null);
      assert.equal(done.edges.includes("e-sup-reflect-dispute"), true);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("invalid_decision_stays_paused", async () => {
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-bad-decision";
    try {
      await pausedDispute(sessionId, service);
      await assert.rejects(
        () => service.hitl(sessionId, { decision: "nope", actor: "curator", node: "GradeDispute" }),
        /accept or reject/,
      );
      const still = await service.step(sessionId);
      assert.equal(still.status, "interrupted");
      assert.equal(still.next[0], "GradeDispute");
      assert.equal(still.state.hitl_log.length, 0);
    } finally {
      service.close();
    }
  });

  test("decision_node_must_match_the_paused_node", async () => {
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-node-mismatch";
    try {
      await pausedDispute(sessionId, service);
      await assert.rejects(
        () => service.hitl(sessionId, { decision: "accept", actor: "curator", node: "SkillMapEdit" }),
        /does not match the paused node/,
      );
      const still = await service.step(sessionId);
      assert.equal(still.status, "interrupted");
      assert.equal(still.next[0], "GradeDispute");
      assert.equal(still.state.hitl_log.length, 0);
    } finally {
      service.close();
    }
  });

  test("stale_decision_for_an_earlier_pause_cannot_settle_the_next_one", async () => {
    const quiet: Provider = {
      id: "fake",
      async complete() {
        return { text: JSON.stringify({ note: "ok" }), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: quiet }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-stale";
    try {
      const first = await service.run(
        learner({
          session_id: sessionId,
          path: ["Assess"],
          disputed: true,
          skill_map_edit: true,
          fingerprints: ["once"],
        }),
        [],
        sessionId,
      );
      assert.equal(first.next[0], "GradeDispute");
      const mid = await service.hitl(sessionId, { decision: "accept", actor: "curator", node: "GradeDispute" });
      assert.equal(mid.status, "interrupted");
      assert.equal(mid.next[0], "SkillMapEdit");
      await assert.rejects(
        () => service.hitl(sessionId, { decision: "accept", actor: "curator", node: "GradeDispute" }),
        /does not match the paused node/,
      );
      const still = await service.step(sessionId);
      assert.equal(still.status, "interrupted");
      assert.equal(still.next[0], "SkillMapEdit");
      assert.equal(still.state.path.includes("SkillMapEdit"), false);
      assert.equal(still.state.hitl_log.length, 1);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("reject_near_the_step_bound_with_fatigue_ends_on_the_reject_edge", async () => {
    const tired: Provider = {
      id: "fake",
      async complete(request) {
        const deciding = request.prompt.includes("node: Supervisor") && request.prompt.endsWith("path: Assess>GradeDispute");
        const payload = deciding || request.prompt.includes("node: GradeDispute") ? { fatigue: 0.9, note: "tired" } : { note: "ok" };
        return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: tired }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-reject-bound";
    try {
      const paused = await service.run(
        learner({ session_id: sessionId, path: ["Assess"], disputed: true, fingerprints: ["once"], step: 37 }),
        [],
        sessionId,
      );
      assert.equal(paused.next[0], "GradeDispute");
      const done = await service.hitl(sessionId, { decision: "reject", actor: "curator", node: "GradeDispute" });
      assert.equal(done.status, "done");
      assert.equal(done.edges.at(-1), "e-sup-hitl-reject");
      assert.equal(done.edges.includes("e-sup-fatigue"), false);
      assert.equal(done.edges.includes("e-sup-step"), false);
      assert.deepEqual(done.state.path, ["Assess", "GradeDispute"]);
      assert.equal(done.state.step, 40);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("hitl_worker_result_does_not_apply_model_fields", async () => {
    const noisy: Provider = {
      id: "fake",
      async complete(request) {
        if (request.prompt.includes("node: SkillMapEdit")) {
          return {
            text: JSON.stringify({
              fatigue: 0.9,
              last_assessment: { score: 0.99, error_class: null, confidence: 0.9 },
              disputed: true,
              plan: { skill: "hijacked", rationale: "from the model" },
            }),
            tokens_in: 4,
            tokens_out: 2,
            latency_ms: 1,
          };
        }
        const payload = request.prompt.includes("node: Reflect") ? { session_complete: true } : { note: "ok" };
        return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: noisy }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-bookkeeping";
    try {
      const paused = await service.run(
        learner({ session_id: sessionId, path: ["Assess"], skill_map_edit: true, fingerprints: ["once"] }),
        [],
        sessionId,
      );
      assert.equal(paused.next[0], "SkillMapEdit");
      const done = await service.hitl(sessionId, { decision: "accept", actor: "curator", node: "SkillMapEdit" });
      assert.equal(done.state.fatigue, 0.1);
      assert.deepEqual(done.state.last_assessment, ORIGINAL_GRADE);
      assert.equal(done.state.disputed, false);
      assert.deepEqual(done.state.plan, { skill: "evals", rationale: "grade the lab" });
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("grade_stays_pinned_after_accept_and_reject", async () => {
    const rewritten = { score: 0.95, error_class: null, confidence: 0.9 };
    const later: Provider = {
      id: "fake",
      async complete(request) {
        const afterDecision =
          request.prompt.includes("node: Reflect") ||
          request.prompt.includes("node: Plan") ||
          (request.prompt.includes("node: Supervisor") && request.prompt.includes("GradeDispute"));
        if (!afterDecision) {
          return { text: JSON.stringify({ note: "ok" }), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
        }
        const payload: Record<string, unknown> = { last_assessment: rewritten };
        if (request.prompt.includes("node: Reflect")) payload.session_complete = true;
        if (request.prompt.includes("node: Supervisor") && request.prompt.endsWith("path: Assess>GradeDispute")) payload.fatigue = 0.9;
        return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: later }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    try {
      const rejectedId = "ac6-pin-reject";
      await service.run(
        learner({ session_id: rejectedId, path: ["Assess"], disputed: true, fingerprints: ["once"] }),
        [],
        rejectedId,
      );
      const rejected = await service.hitl(rejectedId, { decision: "reject", actor: "curator", node: "GradeDispute" });
      assert.equal(rejected.edges.at(-1), "e-sup-hitl-reject");
      assert.deepEqual(rejected.state.last_assessment, ORIGINAL_GRADE);

      const acceptedId = "ac6-pin-accept";
      await service.run(
        learner({ session_id: acceptedId, path: ["Assess"], disputed: true, fingerprints: ["once"] }),
        [],
        acceptedId,
      );
      const accepted = await service.hitl(acceptedId, { decision: "accept", actor: "grader", node: "GradeDispute" });
      assert.equal(accepted.status, "done");
      assert.equal(accepted.state.path.includes("Reflect"), true);
      assert.equal(accepted.state.last_assessment, null);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });
});
