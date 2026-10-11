import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { createApp } from "../api/app.js";
import { compileCoachGraph } from "../graph/build.js";
import { SessionService } from "../graph/session.js";
import { loadSpecWithHash } from "../graph/spec/load.js";

describe("api", { concurrency: false }, () => {
  test("health_and_spec_version", async () => {
    const checkpointer = new MemorySaver();
    const app = createApp({ service: new SessionService(compileCoachGraph({ checkpointer }), checkpointer) });
    const health = await app.request("/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });
    const spec = await app.request("/graph/spec");
    assert.equal(spec.status, 200);
    const body = (await spec.json()) as { version: string; sha256: string; fixture_id: string };
    const loaded = loadSpecWithHash();
    assert.equal(body.version, "1.0.0");
    assert.equal(body.sha256, loaded.sha256);
    assert.equal(body.fixture_id, "GRAPH-SPEC-coach-graph@1.0.0");
  });
});