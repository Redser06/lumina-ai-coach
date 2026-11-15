import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { createApp } from "../api/app.js";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";
import { compileCoachGraph } from "../graph/build.js";
import { selfPromptStop, subgraphVisits } from "../graph/nodes/self_prompt.js";
import { runWorker } from "../graph/nodes/worker.js";
import { SessionService } from "../graph/session.js";
import { loadSpec, loadSpecWithHash } from "../graph/spec/load.js";
import { initialLearnerState, type LearnerState, type SelfPrompt } from "../graph/state.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import { promptField } from "../router/providers/fake.js";
import type { Provider, ProviderRequest } from "../router/types.js";

function stageOf(request: ProviderRequest): string {
  return promptField(request.prompt, "stage") ?? "execute";
}

function scripted(mutate: (stage: string, request: ProviderRequest) => Record<string, unknown> | "throw"): Provider {
  return {
    id: "fake",
    async complete(request) {
      const stage = stageOf(request);
      const payload = mutate(stage, request);
      if (payload === "throw") throw new Error(`injected failure ${stage}`);
      return { text: JSON.stringify(payload), tokens_in: 8, tokens_out: 4, latency_ms: 1 };
    },
  };
}

function depthOf(request: ProviderRequest): string {
  return promptField(request.prompt, "depth") ?? "1";
}

async function runNode(node: string, provider: Provider): Promise<SelfPrompt[]> {
  useRouterForTests(createRouter({ provider }));
  try {
    const state = initialLearnerState({
      learner_id: "fixture",
      session_id: `self-${node}`,
      goal: "fixture",
      scenario_id: null,
    });
    const update = await runWorker(node, { learner: state });
    return update.learner.self_prompts;
  } finally {
    useRouterForTests(null);
  }
}

describe("self prompting", { concurrency: false }, () => {
  test("rejected_critique_stops_at_each_declared_max_depth", async () => {
    const spec = loadSpec();
    for (const id of ["Teach", "Practice", "Remediate"] as const) {
      const maxDepth = spec.nodes.find((node) => node.id === id)?.max_depth ?? 0;
      const rows = await runNode(
        id,
        scripted((stage, request) => {
          const depth = depthOf(request);
          if (stage === "draft") return { prompt: `${id} draft ${depth}` };
          if (stage === "critique") return { accept: false, critique: `${id} critique ${depth}` };
          if (stage === "revise") return { prompt: `${id} revised ${depth}` };
          if (stage === "check") return { pass: true };
          return { note: "ok" };
        }),
      );
      const drafts = rows.filter((row) => row.stage === "draft");
      assert.equal(drafts.length, maxDepth, id);
      assert.ok(rows.every((row) => row.depth <= maxDepth), id);
      assert.equal(selfPromptStop(rows), "depth_exhausted", id);
      assert.equal(rows.filter((row) => row.stage === "execute").length, 1, id);
      assert.equal(rows.find((row) => row.stage === "execute")?.prompt, `${id} revised ${maxDepth}`, id);
    }
  });

  test("critique_failure_stops_cleanly_and_keeps_the_draft", async () => {
    const rows = await runNode(
      "Practice",
      scripted((stage, request) => {
        if (stage === "critique") return "throw";
        if (stage === "draft") return { prompt: `Practice draft ${depthOf(request)}` };
        if (stage === "revise") return { prompt: "should not revise" };
        return { note: "ok" };
      }),
    );
    assert.equal(selfPromptStop(rows), "critique_failed");
    assert.equal(rows.filter((row) => row.stage === "draft").length, 1);
    assert.equal(rows.filter((row) => row.stage === "revise").length, 0);
    assert.equal(rows.find((row) => row.stage === "execute")?.prompt, "Practice draft 1");
    assert.ok(rows.every((row) => row.depth <= 3));
  });

  test("malformed_revision_stops_cleanly_and_keeps_the_draft", async () => {
    const rows = await runNode(
      "Teach",
      scripted((stage, request) => {
        const depth = depthOf(request);
        if (stage === "draft") return { prompt: `Teach draft ${depth}` };
        if (stage === "critique") return { accept: false, critique: "needs a worked example" };
        if (stage === "revise") return { note: "not a prompt" };
        return { note: "ok" };
      }),
    );
    assert.equal(selfPromptStop(rows), "malformed_revision");
    assert.equal(rows.filter((row) => row.stage === "draft").length, 1);
    assert.equal(rows.filter((row) => row.stage === "revise" && row.prompt.length > 0).length, 0);
    assert.equal(rows.find((row) => row.stage === "execute")?.prompt, "Teach draft 1");
    assert.ok(rows.every((row) => row.depth <= 2));
  });

  test("max_depth_run_checkpoints_every_prompt_and_finishes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ac5-"));
    const checkpointer = SqliteSaver.fromConnString(join(dir, "checkpoints.sqlite"));
    const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
    try {
      const scenario = loadScenario("SCN-0009");
      const sessionId = "ac5-max-depth";
      const result = await service.run(stateFromScenario(scenario, sessionId), scenario.hitl ?? [], sessionId);
      assert.equal(result.status, "done");
      assert.deepEqual(result.state.path, scenario.expected_path);
      const teach = result.state.self_prompts.filter((row) => row.node === "Teach");
      assert.equal(teach.filter((row) => row.stage === "draft").length, 2);
      assert.equal(selfPromptStop(teach), "depth_exhausted");
      assert.ok(teach.every((row) => row.depth <= 2));
      const draft = teach.find((row) => row.stage === "draft" && row.depth === 1)?.prompt ?? "";
      const critique = teach.find((row) => row.stage === "critique" && row.depth === 1)?.prompt ?? "";
      const revised = teach.find((row) => row.stage === "revise" && row.depth === 2)?.prompt ?? "";
      assert.match(draft, /Teach draft 1/);
      assert.match(critique, /no checkable outcome/);
      assert.match(revised, /Teach revised 2/);
      const history = await service.history(sessionId);
      const checkpoint = history.find((item) => item.path.at(-1) === "Teach" && item.state);
      assert.ok(checkpoint?.checkpoint_id);
      assert.deepEqual(
        checkpoint?.state?.self_prompts.filter((row) => row.node === "Teach"),
        teach,
      );
    } finally {
      service.close();
    }
  });

  test("committed_api_proof_matches_a_live_session", async () => {
    const proof = JSON.parse(readFileSync(new URL("../../docs/phase1/proofs/ac5-self-prompt.json", import.meta.url), "utf8")) as {
      spec: { version: string; sha256: string; max_depth: Record<string, number> };
      visits: { status: string; path: string[]; self_prompts: SelfPrompt[]; subgraph_visits: Array<{ node: string; cycles: Array<{ draft: string; critique: string; revised: string }> }> };
      checkpoint: { path: string[]; self_prompts: SelfPrompt[] };
      max_depth_run: {
        status: string;
        draft_count: number;
        depth_exceeded: boolean;
        stop: string;
        self_prompts: SelfPrompt[];
        checkpoint: { self_prompts: SelfPrompt[] };
      };
    };
    const loaded = loadSpecWithHash();
    assert.equal(proof.spec.version, loaded.spec.version);
    assert.equal(proof.spec.sha256, loaded.sha256);
    assert.equal(proof.spec.max_depth.Teach, 2);
    assert.equal(proof.spec.max_depth.Practice, 3);
    assert.equal(proof.spec.max_depth.Remediate, 1);
    const app = createApp();
    const visits = await app.request("/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario_id: "SCN-0001", session_id: "ac5-visits" }),
    });
    assert.equal(visits.status, 200);
    const visitBody = (await visits.json()) as { status: string; state: LearnerState };
    assert.equal(visitBody.status, "done");
    assert.deepEqual(visitBody.state.self_prompts, proof.visits.self_prompts);
    assert.deepEqual(visitBody.state.path, proof.visits.path);
    const maxDepthOf = (node: string) => loaded.spec.nodes.find((item) => item.id === node)?.max_depth ?? 0;
    assert.deepEqual(subgraphVisits(visitBody.state.self_prompts, maxDepthOf), proof.visits.subgraph_visits);
    for (const visit of proof.visits.subgraph_visits) {
      assert.ok(visit.cycles.length > 0, visit.node);
      for (const cycle of visit.cycles) {
        assert.ok(cycle.draft.length > 0, visit.node);
        assert.ok(cycle.critique.length > 0, visit.node);
        assert.ok(cycle.revised.length > 0, visit.node);
      }
    }
    const history = (await (await app.request("/sessions/ac5-visits/checkpoints")).json()) as Array<{
      path: string[];
      state: LearnerState | null;
    }>;
    const checkpoint = history.find((row) => JSON.stringify(row.path) === JSON.stringify(proof.checkpoint.path));
    assert.deepEqual(checkpoint?.state?.self_prompts, proof.checkpoint.self_prompts);
    const capped = await app.request("/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario_id: "SCN-0009", session_id: "ac5-max-depth" }),
    });
    const cappedBody = (await capped.json()) as { status: string; state: LearnerState };
    assert.equal(cappedBody.status, "done");
    assert.deepEqual(cappedBody.state.self_prompts, proof.max_depth_run.self_prompts);
    assert.equal(proof.max_depth_run.draft_count, 2);
    assert.equal(proof.max_depth_run.depth_exceeded, false);
    assert.equal(proof.max_depth_run.stop, "depth_exhausted");
    assert.ok(cappedBody.state.self_prompts.every((row) => row.depth <= (loaded.spec.nodes.find((node) => node.id === row.node)?.max_depth ?? 0)));
    const cappedHistory = (await (await app.request("/sessions/ac5-max-depth/checkpoints")).json()) as Array<{
      state: LearnerState | null;
    }>;
    assert.ok(cappedHistory.some((row) => JSON.stringify(row.state?.self_prompts) === JSON.stringify(proof.max_depth_run.checkpoint.self_prompts)));
  });
});
