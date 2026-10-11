import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { createCheckpointer } from "../checkpoint/index.js";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";
import { assertHitlDecision } from "../graph/hitl.js";
import { SessionService } from "../graph/session.js";
import { loadSpecWithHash } from "../graph/spec/load.js";
import { logsForSession } from "../telemetry/node_log.js";

export interface AppOptions {
  service?: SessionService;
}

function statusOf(error: unknown): number {
  const status = (error as { status?: number }).status;
  if (status === 409) return 409;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("not found") || message.includes("checkpoint not found")) return 404;
  return 400;
}

export function createApp(options: AppOptions = {}): Hono {
  const service =
    options.service ??
    new SessionService(undefined, createCheckpointer());
  const app = new Hono();

  app.onError((error, c) => c.json({ error: error.message }, statusOf(error) as 400));

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/graph/spec", (c) => {
    const { spec, sha256 } = loadSpecWithHash();
    return c.json({
      fixture_id: `GRAPH-SPEC-${spec.spec_id}@${spec.version}`,
      spec_id: spec.spec_id,
      version: spec.version,
      sha256,
      nodes: spec.nodes.map((node) => node.id),
      edges: spec.edges.map((edge) => edge.id),
    });
  });

  app.post("/sessions", async (c) => {
    const body = (await c.req.json()) as { scenario_id?: string; session_id?: string };
    if (!body.scenario_id) return c.json({ error: "scenario_id is required" }, 400);
    const scenario = loadScenario(body.scenario_id);
    const sessionId = body.session_id ?? randomUUID();
    const result = await service.run(stateFromScenario(scenario, sessionId), scenario.hitl ?? [], sessionId);
    return c.json(result);
  });

  app.post("/sessions/:id/step", async (c) => c.json(await service.step(c.req.param("id"))));

  app.get("/sessions/:id/checkpoints", async (c) => c.json(await service.history(c.req.param("id"))));

  app.post("/sessions/:id/resume", async (c) => {
    const body = await readJson(c);
    const decisions = Array.isArray(body.decisions) ? body.decisions.map((item) => assertHitlDecision(item)) : [];
    return c.json(await service.resume(c.req.param("id"), decisions));
  });

  app.post("/sessions/:id/replay", async (c) => {
    const body = await readJson(c);
    if (typeof body.from !== "string" || body.from.length === 0) return c.json({ error: "from is required" }, 400);
    const decisions = Array.isArray(body.decisions) ? body.decisions.map((item) => assertHitlDecision(item)) : [];
    return c.json(await service.replay(c.req.param("id"), body.from, decisions));
  });

  app.post("/sessions/:id/fork", async (c) => {
    const body = await readJson(c);
    if (typeof body.from !== "string" || body.from.length === 0) return c.json({ error: "from is required" }, 400);
    const patch = body.patch && typeof body.patch === "object" && !Array.isArray(body.patch) ? body.patch : {};
    return c.json(await service.fork(c.req.param("id"), body.from, patch as Record<string, unknown>));
  });

  app.post("/sessions/:id/hitl", async (c) => {
    const decision = assertHitlDecision(await c.req.json());
    return c.json(await service.hitl(c.req.param("id"), decision));
  });

  app.get("/sessions/:id/logs", (c) => c.json({ session_id: c.req.param("id"), logs: logsForSession(c.req.param("id")) }));

  return app;
}

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  try {
    const value = await c.req.json();
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    return {};
  }
  return {};
}
