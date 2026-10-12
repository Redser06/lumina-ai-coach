import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { compileCoachGraph } from "../graph/build.js";
import { SessionService } from "../graph/session.js";
import { initialLearnerState } from "../graph/state.js";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";
import { CostCapExceeded, type ModelPrice } from "../router/pricing.js";
import { createRouter, sessionSpentUsd, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";
import { logsForSession } from "../telemetry/node_log.js";

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
    const nodeRuns = result.state.trace_nodes.filter((id) => id !== "__start__" && id !== "End").length;
    const realCount = (nodes: string[] | undefined) =>
      (nodes ?? []).filter((id) => id !== "__start__" && id !== "End").length;
    const seen = new Set(history.map((item) => realCount(item.state?.trace_nodes)));
    for (let count = 0; count <= nodeRuns; count += 1) {
      assert.equal(seen.has(count), true, `missing checkpoint at node count ${count}`);
    }
    assert.equal(Math.max(...seen), nodeRuns);
    assert.ok(history.length > nodeRuns);
    assert.ok(result.state.trace_nodes[0] === "__start__");
    assert.equal(result.state.trace_nodes.at(-1), "End");
    assert.equal(result.edges[0], "e-start");
    assert.ok(result.edges.includes("e-sup-end"));
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
    assert.equal(forked.state.session_id, forked.session_id);
    assert.equal(forked.routed_to, "Reflect");
    assert.equal(forked.edge_taken, "e-sup-fatigue");
    assert.ok(forked.state.fatigue >= 0.8);
    assert.ok(forked.node_logs.length > 0);
    assert.ok(forked.node_logs.every((row) => row.session_id === forked.session_id));
    const parentLogs = logsForSession(sessionId);
    assert.ok(parentLogs.every((row) => row.session_id === sessionId));
    assert.equal(parentLogs.some((row) => row.session_id === forked.session_id), false);
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

  test("fork_allowlist_rejects_bookkeeping_and_accepts_learner_fields", async () => {
    const { service } = serviceAt("ckpt-cost-");
    const scenario = loadScenario("SCN-0002");
    const sessionId = "ckpt-cost";
    await service.run(stateFromScenario(scenario, sessionId), [], sessionId);
    const history = await service.history(sessionId);
    const from = history.find((item) => (item.state?.cost_usd_session ?? 0) > 0 && item.checkpoint_id);
    assert.ok(from?.checkpoint_id && from.state);
    const parentBefore = JSON.stringify((await service.readSnap(sessionId)).learner);
    const rejected: Record<string, unknown> = {
      step: 0,
      session_id: "other-session",
      path: [],
      edges_taken: [],
      hitl_log: [],
      trace_nodes: [],
      fingerprints: [],
      learner_id: "other",
      loop_cleared: true,
      cost_usd_session: 0,
      cost_budget_usd: 50,
      time_on_task_s: 0,
      scenario_id: null,
      hitl_pending: null,
      loop_detected: false,
      session_complete: false,
      diagnosis: null,
      plan: null,
      last_edge: null,
      last_condition: null,
    };
    for (const [field, value] of Object.entries(rejected)) {
      await assert.rejects(
        () => service.fork(sessionId, from.checkpoint_id!, { [field]: value }),
        new RegExp(`fork cannot patch ${field}`),
      );
    }
    assert.equal(JSON.stringify((await service.readSnap(sessionId)).learner), parentBefore);
    const allowed = await service.fork(sessionId, from.checkpoint_id, {
      fatigue: 0.1,
      last_assessment: { score: 0.4, error_class: null, confidence: 0.4 },
      mastery: { loops: 0.2 },
      disputed: false,
      skill_map_edit: false,
      goal: "forked goal",
    });
    assert.equal(allowed.state.goal, "forked goal");
    assert.equal(allowed.state.mastery.loops, 0.2);
    assert.equal(allowed.state.fatigue, 0.1);
    assert.equal(allowed.state.session_id, allowed.session_id);
    assert.notEqual(allowed.state.session_id, sessionId);
    assert.equal(allowed.state.cost_budget_usd, from.state.cost_budget_usd);
    assert.ok(allowed.state.cost_usd_session >= from.state.cost_usd_session);
    assert.notEqual(allowed.state.step, 0);
    service.close();
  });

  test("replay_forces_recorded_provider", async () => {
    const { service } = serviceAt("ckpt-force-");
    const scenario = loadScenario("SCN-0002");
    const sessionId = "ckpt-force";
    await service.run(stateFromScenario(scenario, sessionId), [], sessionId);
    const history = await service.history(sessionId);
    const origin = history.find(
      (item) => item.path.length === 0 && (item.state?.edges_taken.length ?? 1) === 0 && item.next.includes("Supervisor"),
    );
    assert.ok(origin?.checkpoint_id);
    let fakeCalls = 0;
    const fake: Provider = {
      id: "fake",
      async complete() {
        fakeCalls += 1;
        return { text: "{}", tokens_in: 1, tokens_out: 1, latency_ms: 1 };
      },
    };
    useRouterForTests(createRouter({ provider: fake }));
    const previousProvider = process.env.LLM_PROVIDER;
    const previousRecord = process.env.RECORD_FIXTURES;
    const previousDir = process.env.RECORDED_DIR;
    process.env.LLM_PROVIDER = "fake";
    process.env.RECORD_FIXTURES = "1";
    try {
      const before = logsForSession(sessionId).length;
      const replay = await service.replay(sessionId, origin.checkpoint_id);
      const added = logsForSession(sessionId).slice(before);
      assert.equal(replay.identical, true);
      assert.equal(fakeCalls, 0);
      assert.ok(added.length > 0);
      assert.ok(added.every((row) => row.provider === "recorded"));

      const empty = mkdtempSync(join(tmpdir(), "recorded-empty-"));
      process.env.RECORDED_DIR = empty;
      await assert.rejects(() => service.replay(sessionId, origin.checkpoint_id!), /recorded fixture missing/);
      assert.equal(fakeCalls, 0);
      assert.equal(readdirSync(empty).length, 0);
    } finally {
      useRouterForTests(null);
      if (previousProvider === undefined) delete process.env.LLM_PROVIDER;
      else process.env.LLM_PROVIDER = previousProvider;
      if (previousRecord === undefined) delete process.env.RECORD_FIXTURES;
      else process.env.RECORD_FIXTURES = previousRecord;
      if (previousDir === undefined) delete process.env.RECORDED_DIR;
      else process.env.RECORDED_DIR = previousDir;
      service.close();
    }
  });

  test("failure_spend_survives_crash_and_resume_hits_cap", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ckpt-spend-"));
    const sqlite = join(dir, "checkpoints.sqlite");
    let calls = 0;
    const provider: Provider = {
      id: "fake",
      async complete() {
        calls += 1;
        const timeout = new Error("timed out");
        timeout.name = "TimeoutError";
        return Promise.reject(Object.assign(timeout, { tokens_in: 1_000_000, tokens_out: 0 }));
      },
    };
    const prices: Record<string, ModelPrice> = {
      "primary-classifier": { input_per_million: 1, output_per_million: 1 },
      "fallback-classifier": { input_per_million: 1, output_per_million: 1 },
    };
    useRouterForTests(createRouter({ provider, prices }));
    const first = SqliteSaver.fromConnString(sqlite);
    const service = new SessionService(compileCoachGraph({ checkpointer: first }), first);
    const sessionId = "spend-crash";
    try {
      await assert.rejects(
        () => service.run(initialLearnerState({ learner_id: "l", session_id: sessionId, goal: "g" }), [], sessionId),
        (error: unknown) => sessionSpentUsd(error) === 1,
      );
      assert.equal(calls, 1);
    } finally {
      service.close();
      useRouterForTests(null);
    }
    const second = SqliteSaver.fromConnString(sqlite);
    const resumed = new SessionService(compileCoachGraph({ checkpointer: second }), second);
    useRouterForTests(createRouter({ provider, prices }));
    try {
      const snap = await resumed.readSnap(sessionId);
      assert.equal(snap.learner?.cost_usd_session, 1);
      const callsAtResume = calls;
      await assert.rejects(() => resumed.resume(sessionId), CostCapExceeded);
      assert.equal(calls, callsAtResume);
    } finally {
      useRouterForTests(null);
      resumed.close();
    }
  });
});
