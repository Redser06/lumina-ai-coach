import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { compileCoachGraph } from "../graph/build.js";
import { SessionService } from "../graph/session.js";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";

function serviceAt(name: string): { service: SessionService; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), name));
  const checkpointer = SqliteSaver.fromConnString(join(dir, "checkpoints.sqlite"));
  return { service: new SessionService(compileCoachGraph({ checkpointer }), checkpointer), dir };
}

describe("checkpoint", { concurrency: false }, () => {
  test("checkpoint_written_after_every_node", async () => {
    const { service } = serviceAt("ckpt-every-");
    const scenario = loadScenario("SCN-0002");
    const sessionId = "ckpt-every";
    const result = await service.run(stateFromScenario(scenario, sessionId), [], sessionId);
    const history = await service.history(sessionId);
    assert.equal(result.status, "done");
    assert.ok(history.length >= result.state.trace_nodes.length);
    const checkpointIds = new Set(history.map((item) => item.checkpoint_id));
    assert.equal(checkpointIds.size, history.length);
    service.close();
  });

  test("replay_with_recorded_outputs_yields_identical_path_and_state", async () => {
    const previous = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "recorded";
    const { service } = serviceAt("ckpt-replay-");
    try {
      const scenario = loadScenario("SCN-0001");
      const sessionId = "ckpt-replay";
      const original = await service.run(stateFromScenario(scenario, sessionId), [], sessionId);
      const history = await service.history(sessionId);
      const origin = history.find(
        (item) => item.path.length === 0 && (item.state?.edges_taken.length ?? 1) === 0 && item.next.includes("Supervisor"),
      );
      assert.ok(origin?.checkpoint_id);
      const replay = await service.replay(sessionId, origin.checkpoint_id);
      assert.equal(replay.identical, true);
      assert.deepEqual(replay.state.path, original.state.path);
      assert.deepEqual(replay.state, original.state);
    } finally {
      service.close();
      if (previous === undefined) delete process.env.LLM_PROVIDER;
      else process.env.LLM_PROVIDER = previous;
    }
  });

  test("fork_from_checkpoint_creates_new_thread_parent_untouched", async () => {
    const { service } = serviceAt("ckpt-fork-");
    const scenario = loadScenario("SCN-0002");
    const sessionId = "ckpt-fork";
    await service.run(stateFromScenario(scenario, sessionId), [], sessionId);
    const history = await service.history(sessionId);
    const from = history.find((item) => item.path.length === 0 && item.next.includes("Supervisor") && item.checkpoint_id);
    assert.ok(from?.checkpoint_id);
    const parentBefore = JSON.stringify((await service.readSnap(sessionId)).learner);
    const forked = await service.fork(sessionId, from.checkpoint_id, { fatigue: 0.91 });
    const parentAfter = JSON.stringify((await service.readSnap(sessionId)).learner);
    assert.equal(forked.parent_unchanged, true);
    assert.equal(parentBefore, parentAfter);
    assert.notEqual(forked.session_id, sessionId);
    const child = await service.readSnap(forked.session_id);
    assert.ok(child.learner);
    service.close();
  });

  test("fork_with_patch_changes_route", async () => {
    const { service } = serviceAt("ckpt-patch-");
    const scenario = loadScenario("SCN-0001");
    const sessionId = "ckpt-patch";
    await service.run(stateFromScenario(scenario, sessionId), [], sessionId);
    const history = await service.history(sessionId);
    const from = history.find(
      (item) =>
        item.path.at(-1) === "Assess" &&
        item.next.includes("Supervisor") &&
        item.last_assessment?.error_class === null &&
        (item.last_assessment?.score ?? 0) >= 0.85,
    );
    assert.ok(from?.checkpoint_id);
    const forked = await service.fork(sessionId, from.checkpoint_id, {
      last_assessment: { error_class: "misconception" },
    });
    assert.equal(forked.routed_to, "Remediate");
    assert.equal(forked.edge_taken, "e-sup-misconception");
    assert.equal(forked.condition_id, "assess.misconception");
    assert.equal(forked.parent_unchanged, true);
    service.close();
  });

  test("resume_after_forced_crash_continues_at_same_node", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ckpt-crash-"));
    const sqlite = join(dir, "checkpoints.sqlite");
    const scenario = loadScenario("SCN-0001");
    const sessionId = "ckpt-crash";
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "server/scripts/crash_child.ts"], {
        env: {
          ...process.env,
          CHECKPOINTER: "sqlite",
          SQLITE_PATH: sqlite,
          LLM_PROVIDER: "fake",
          CRASH_ARMED: "1",
          CRASH_AT: "Practice",
          CRASH_SESSION: sessionId,
          CRASH_SCENARIO: "SCN-0001",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let err = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        err += chunk.toString();
      });
      child.on("exit", (code, signal) => {
        if (signal === "SIGKILL" || code === 137) resolve();
        else reject(new Error(`expected SIGKILL, got code=${code} signal=${signal} ${err}`));
      });
    });
    const checkpointer = SqliteSaver.fromConnString(sqlite);
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    const before = await service.readSnap(sessionId);
    assert.equal(before.next[0], "Practice");
    const result = await service.resume(sessionId);
    assert.equal(result.resumed_node, "Practice");
    assert.equal(result.status, "done");
    assert.deepEqual(result.state.path, scenario.expected_path);
    service.close();
  });
});
