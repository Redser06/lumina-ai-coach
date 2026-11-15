import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { supervisorNode } from "../graph/nodes/supervisor.js";
import { loadSpec } from "../graph/spec/load.js";
import { initialLearnerState, type LearnerState } from "../graph/state.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures/routing");

export const ROUTE_SET_ID = "ROUTE-P1";
/** AC-2 bar. Do not lower it. */
export const ROUTE_ACCURACY_MIN = 0.95;

export interface RouteFixture {
  id: string;
  fixture_set: string;
  branch: string;
  expect_node: string;
  expect_edge: string;
  signal?: string;
  why: string;
  state: Partial<LearnerState>;
}

export interface RouteMiss {
  id: string;
  branch: string;
  expect_node: string;
  actual_node: string | null;
  expect_edge: string;
  actual_edge: string | null;
  error?: string;
}

export interface RouteScore {
  fixture_set: string;
  total: number;
  hits: number;
  accuracy: number;
  per_branch: Array<{ branch: string; hits: number; total: number; accuracy: number }>;
  misses: RouteMiss[];
}

export function loadRouteFixtures(dir = DIR): RouteFixture[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")) as RouteFixture);
}

const neutral: Provider = {
  id: "fake",
  async complete() {
    const text = JSON.stringify({ note: "route" });
    return { text, tokens_in: 8, tokens_out: 4, latency_ms: 1 };
  },
};

export async function scoreRouteFixtures(fixtures = loadRouteFixtures()): Promise<RouteScore> {
  const spec = loadSpec();
  const byEdge = new Map(spec.edges.map((edge) => [edge.id, edge.to]));
  const misses: RouteMiss[] = [];
  const branches = new Map<string, { hits: number; total: number }>();
  useRouterForTests(createRouter({ provider: neutral }));
  try {
    for (const fixture of fixtures) {
      const bucket = branches.get(fixture.branch) ?? { hits: 0, total: 0 };
      bucket.total += 1;
      let actualNode: string | null = null;
      let actualEdge: string | null = null;
      let error: string | undefined;
      try {
        const state = initialLearnerState({
          learner_id: "route",
          session_id: fixture.id,
          goal: "route from learner state",
          ...fixture.state,
        });
        const update = await supervisorNode({ learner: state });
        actualEdge = update.learner.last_edge;
        actualNode = actualEdge ? (byEdge.get(actualEdge) ?? null) : null;
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
      }
      const nodeHit = actualNode === fixture.expect_node;
      const edgeHit = actualEdge === fixture.expect_edge;
      if (nodeHit) bucket.hits += 1;
      if (!nodeHit || !edgeHit) {
        misses.push({
          id: fixture.id,
          branch: fixture.branch,
          expect_node: fixture.expect_node,
          actual_node: actualNode,
          expect_edge: fixture.expect_edge,
          actual_edge: actualEdge,
          ...(error ? { error } : {}),
        });
      }
      branches.set(fixture.branch, bucket);
    }
  } finally {
    useRouterForTests(null);
  }
  const hits = [...branches.values()].reduce((sum, bucket) => sum + bucket.hits, 0);
  return {
    fixture_set: ROUTE_SET_ID,
    total: fixtures.length,
    hits,
    accuracy: fixtures.length === 0 ? 0 : hits / fixtures.length,
    per_branch: [...branches.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([branch, bucket]) => ({
        branch,
        hits: bucket.hits,
        total: bucket.total,
        accuracy: bucket.total === 0 ? 0 : bucket.hits / bucket.total,
      })),
    misses,
  };
}
