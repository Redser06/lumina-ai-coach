import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { compileCoachGraph } from "../graph/build.js";
import { assertHitlDecision } from "../graph/hitl.js";
import { SessionService } from "../graph/session.js";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";

describe("hitl", { concurrency: false }, () => {
  test("graph_pauses_at_interrupt_and_resumes_only_with_decision", async () => {
    assert.throws(() => assertHitlDecision({}), /decision, actor/);
    const checkpointer = new MemorySaver();
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const scenario = loadScenario("SCN-0005");
    const sessionId = "hitl-scn-0005";
    const paused = await service.run(stateFromScenario(scenario, sessionId), [], sessionId);
    assert.equal(paused.status, "interrupted");
    assert.ok(paused.interrupts.length > 0);
    assert.equal(paused.state.path.includes("GradeDispute"), false);

    const still = await service.step(sessionId);
    assert.equal(still.status, "interrupted");
    assert.equal(still.state.path.includes("GradeDispute"), false);

    await assert.rejects(() => service.resume(sessionId), /human decision/);

    const done = await service.hitl(sessionId, { decision: "accept", actor: "learner" });
    assert.equal(done.status, "done");
    assert.deepEqual(done.state.path, scenario.expected_path);
    assert.equal(done.state.hitl_log.at(-1)?.decision, "accept");
    assert.equal(done.state.disputed, false);
    service.close();
  });
});
