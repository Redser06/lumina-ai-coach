import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadRouteFixtures, ROUTE_ACCURACY_MIN, ROUTE_SET_ID, scoreRouteFixtures } from "../evals/routing.js";

const REQUIRED_BRANCHES = [
  "misconception",
  "fast_mastery",
  "fatigue",
  "slip",
  "ready",
  "loop",
  "step_bound",
  "dead_end",
];

describe("routing", { concurrency: false }, () => {
  test("route_p1_supervisor_accuracy", async () => {
    const fixtures = loadRouteFixtures();
    const reachable = fixtures.filter((fixture) => fixture.defensive !== true);
    const defensive = fixtures.filter((fixture) => fixture.defensive === true);
    assert.equal(reachable.length, 50, "AC-2 counts reachable fixtures only");
    assert.deepEqual(
      defensive.map((fixture) => fixture.id),
      ["ROUTE-P1-0035", "ROUTE-P1-0036", "ROUTE-P1-0046"],
    );
    for (const fixture of fixtures) {
      assert.equal(fixture.fixture_set, ROUTE_SET_ID);
      assert.ok(fixture.why.length > 0, fixture.id);
    }
    for (const branch of REQUIRED_BRANCHES) {
      assert.ok(
        reachable.some((fixture) => fixture.branch === branch),
        `missing branch ${branch}`,
      );
    }
    assert.equal(reachable.filter((fixture) => fixture.branch === "ready" && fixture.expect_edge === "e-sup-ready").length >= 2, true);
    assert.ok(reachable.some((fixture) => fixture.signal === "loop_detector"));
    assert.ok(reachable.some((fixture) => fixture.signal === "step_bound"));

    const score = await scoreRouteFixtures(reachable);
    const extra = await scoreRouteFixtures(defensive);
    const lines = [
      `${score.fixture_set} reachable ${score.hits}/${score.total} accuracy ${score.accuracy}`,
      ...score.per_branch.map((row) => `${row.branch} ${row.hits}/${row.total} ${row.accuracy}`),
      `defensive ${extra.hits}/${extra.total} accuracy ${extra.accuracy}`,
      ...score.misses.map(
        (miss) =>
          `MISS ${miss.id} ${miss.branch} node ${miss.actual_node ?? "none"} != ${miss.expect_node} edge ${miss.actual_edge ?? "none"} != ${miss.expect_edge}${miss.error ? ` (${miss.error})` : ""}`,
      ),
      ...extra.misses.map(
        (miss) =>
          `DEFENSIVE MISS ${miss.id} ${miss.branch} node ${miss.actual_node ?? "none"} != ${miss.expect_node}`,
      ),
    ];
    console.log(lines.join("\n"));

    const detector = reachable.find((fixture) => fixture.signal === "loop_detector");
    const bound = reachable.find((fixture) => fixture.signal === "step_bound");
    assert.ok(detector);
    assert.ok(bound);
    assert.equal(
      score.misses.some((miss) => miss.id === detector.id),
      false,
      `${detector.id} loop detector missed`,
    );
    assert.equal(
      score.misses.some((miss) => miss.id === bound.id),
      false,
      `${bound.id} step bound missed`,
    );
    const edgeOnly = score.misses.filter((miss) => miss.actual_node === miss.expect_node);
    assert.deepEqual(
      edgeOnly.map((miss) => miss.id),
      [],
      "right node, wrong edge",
    );
    assert.equal(score.accuracy, ROUTE_ACCURACY_MIN);
    assert.equal(score.hits, 50);
    assert.equal(score.total, 50);
    assert.deepEqual(
      score.misses.map((miss) => miss.id),
      [],
    );
    assert.equal(extra.hits, extra.total);
    assert.deepEqual(
      extra.misses.map((miss) => miss.id),
      [],
    );
  });
});
