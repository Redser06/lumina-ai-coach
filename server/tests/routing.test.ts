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
    assert.equal(fixtures.length, 50);
    assert.deepEqual(
      fixtures.map((fixture) => fixture.id),
      Array.from({ length: 50 }, (_, index) => `ROUTE-P1-${String(index + 1).padStart(4, "0")}`),
    );
    for (const fixture of fixtures) {
      assert.equal(fixture.fixture_set, ROUTE_SET_ID);
      assert.ok(fixture.why.length > 0, fixture.id);
    }
    for (const branch of REQUIRED_BRANCHES) {
      assert.ok(
        fixtures.some((fixture) => fixture.branch === branch),
        `missing branch ${branch}`,
      );
    }
    assert.ok(fixtures.some((fixture) => fixture.signal === "loop_detector"));
    assert.ok(fixtures.some((fixture) => fixture.signal === "step_bound"));

    const score = await scoreRouteFixtures(fixtures);
    const lines = [
      `${score.fixture_set} ${score.hits}/${score.total} accuracy ${score.accuracy}`,
      ...score.per_branch.map((row) => `${row.branch} ${row.hits}/${row.total} ${row.accuracy}`),
      ...score.misses.map(
        (miss) =>
          `MISS ${miss.id} ${miss.branch} node ${miss.actual_node ?? "none"} != ${miss.expect_node} edge ${miss.actual_edge ?? "none"} != ${miss.expect_edge}${miss.error ? ` (${miss.error})` : ""}`,
      ),
    ];
    console.log(lines.join("\n"));

    const detector = fixtures.find((fixture) => fixture.signal === "loop_detector");
    const bound = fixtures.find((fixture) => fixture.signal === "step_bound");
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
    assert.ok(
      score.accuracy >= ROUTE_ACCURACY_MIN,
      `accuracy ${score.accuracy} is below ${ROUTE_ACCURACY_MIN}`,
    );
  });
});
