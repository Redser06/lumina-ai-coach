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
});
