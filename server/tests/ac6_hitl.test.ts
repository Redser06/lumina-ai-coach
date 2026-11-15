import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { compileCoachGraph } from "../graph/build.js";
import { assertHitlDecision } from "../graph/hitl.js";
import { supervisorNode } from "../graph/nodes/supervisor.js";
import { SessionService } from "../graph/session.js";
import { initialLearnerState } from "../graph/state.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";

/** A repeated GradeDispute request ends instead of cycling. One visit is the bound. */
export const DISPUTE_VISIT_BOUND = 1;

const routeNote: Provider = {
  id: "fake",
  async complete() {
    return { text: JSON.stringify({ note: "route" }), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
  },
};

function learner(partial: Record<string, unknown>) {
  return initialLearnerState({
    learner_id: "pat",
    session_id: "ac6",
    goal: "dispute a grade",
    diagnosis: { placed: true, tier: "practitioner" },
    plan: { skill: "evals", rationale: "grade the lab" },
    fatigue: 0.1,
    step: 6,
    ...partial,
  });
}

describe("ac6 hitl", { concurrency: false }, () => {
  test("model_output_cannot_open_grade_dispute_or_skill_map_edit", async () => {
    const disputed: Provider = {
      id: "fake",
      async complete() {
        return { text: JSON.stringify({ disputed: true }), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: disputed }));
    try {
      const update = await supervisorNode({
        learner: learner({
          path: ["Assess"],
          disputed: false,
          last_assessment: { score: 0.48, error_class: "misconception", confidence: 0.4 },
        }),
      });
      assert.equal(update.learner.disputed, false);
      assert.equal(update.learner.last_edge, "e-sup-misconception");
    } finally {
      useRouterForTests(null);
    }

    const skill: Provider = {
      id: "fake",
      async complete() {
        return { text: JSON.stringify({ skill_map_edit: true, loop_detected: false }), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: skill }));
    try {
      const seeded = learner({ path: ["Plan"], skill_map_edit: false, loop_detected: true, loop_cleared: false });
      const update = await supervisorNode({ learner: seeded });
      assert.equal(update.learner.skill_map_edit, false);
      assert.equal(update.learner.loop_detected, true);
      assert.equal(update.learner.last_edge, "e-sup-loop");
    } finally {
      useRouterForTests(null);
    }
  });

  test("grade_dispute_and_skill_map_edit_stay_paused_until_a_decision", async () => {
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    try {
      for (const [node, flag] of [
        ["GradeDispute", "disputed"],
        ["SkillMapEdit", "skill_map_edit"],
      ] as const) {
        const sessionId = `ac6-pause-${node}`;
        const initial = learner({
          session_id: sessionId,
          path: ["Assess"],
          [flag]: true,
          fingerprints: ["once"],
        });
        const paused = await service.run(initial, [], sessionId);
        assert.equal(paused.status, "interrupted");
        assert.equal(paused.next[0], node);
        assert.equal(paused.state.path.includes(node), false);
        const again = await service.step(sessionId);
        assert.equal(again.status, "interrupted");
        assert.equal(again.state.path.includes(node), false);
        assert.deepEqual(again.state.path, paused.state.path);
      }
    } finally {
      service.close();
    }
  });

  test("resume_records_actor_decision_and_timestamp_then_continues", async () => {
    const finishing: Provider = {
      id: "fake",
      async complete(request) {
        const payload = request.prompt.includes("node: Reflect")
          ? { session_complete: true, fatigue: 0.2 }
          : { note: "ok" };
        return { text: JSON.stringify(payload), tokens_in: 4, tokens_out: 2, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: finishing }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-resume";
    try {
      const initial = learner({
        session_id: sessionId,
        path: ["Assess"],
        disputed: true,
        fingerprints: ["once"],
      });
      const paused = await service.run(initial, [], sessionId);
      assert.equal(paused.status, "interrupted");
      const done = await service.hitl(sessionId, { decision: "accept", actor: "learner" });
      assert.equal(done.status, "done");
      const entry = done.state.hitl_log.at(-1);
      assert.equal(entry?.node, "GradeDispute");
      assert.equal(entry?.decision, "accept");
      assert.equal(entry?.actor, "learner");
      assert.match(entry?.at ?? "", /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(done.state.path.at(-1), "Reflect");
      assert.equal(done.edges.includes("e-sup-reflect-dispute"), true);
      const history = await service.history(sessionId);
      const recorded = history.map((item) => item.state?.hitl_log.at(-1)).find((row) => row?.decision === "accept");
      assert.equal(recorded?.actor, "learner");
      assert.equal(recorded?.at, entry?.at);
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });

  test("missing_malformed_and_unauthorised_decisions_stay_paused", async () => {
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-reject";
    try {
      const initial = learner({
        session_id: sessionId,
        path: ["Assess"],
        disputed: true,
        fingerprints: ["once"],
      });
      const paused = await service.run(initial, [], sessionId);
      assert.equal(paused.status, "interrupted");
      await assert.rejects(() => service.resume(sessionId, []), /human decision/);
      await assert.rejects(() => service.hitl(sessionId, { decision: "", actor: "learner" }), /decision, actor/);
      await assert.rejects(() => service.hitl(sessionId, { decision: "accept", actor: "stranger" }), /not allowed/);
      assert.throws(() => assertHitlDecision({ decision: "accept" }), /decision, actor/);
      const still = await service.step(sessionId);
      assert.equal(still.status, "interrupted");
      assert.equal(still.state.hitl_log.length, 0);
      assert.equal(still.state.path.includes("GradeDispute"), false);
    } finally {
      service.close();
    }
  });

  test("repeated_dispute_cycle_ends_within_the_bound", async () => {
    const echoing: Provider = {
      id: "fake",
      async complete() {
        return {
          text: JSON.stringify({ disputed: true, session_complete: false, fatigue: 0.1, note: "still disputed" }),
          tokens_in: 8,
          tokens_out: 4,
          latency_ms: 1,
        };
      },
    };
    useRouterForTests(createRouter({ provider: echoing }));
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const sessionId = "ac6-cycle";
    try {
      const initial = learner({
        session_id: sessionId,
        path: ["Assess"],
        disputed: true,
        fingerprints: ["once"],
        step: 38,
      });
      const paused = await service.run(initial, [], sessionId);
      assert.equal(paused.status, "interrupted");
      const done = await service.hitl(sessionId, { decision: "accept", actor: "learner" });
      assert.equal(done.status, "done");
      assert.equal(done.state.path.filter((node) => node === "GradeDispute").length, DISPUTE_VISIT_BOUND);
      assert.ok(done.state.step <= 43);
      assert.equal(done.edges.includes("e-sup-dispute"), true);
      assert.equal(done.edges.filter((edge) => edge === "e-sup-dispute").length, DISPUTE_VISIT_BOUND);
      useRouterForTests(createRouter({ provider: routeNote }));
      const repeat = await supervisorNode({
        learner: learner({
          path: ["GradeDispute", "Reflect"],
          disputed: true,
          fingerprints: ["dispute", "reflect"],
          step: 42,
        }),
      });
      assert.equal(repeat.learner.last_edge, "e-sup-hitl-repeat");
    } finally {
      useRouterForTests(null);
      service.close();
    }
  });
});
