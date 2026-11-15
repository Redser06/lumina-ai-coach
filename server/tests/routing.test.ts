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
    const ranked = [...fixtures].sort((a, b) => a.id.localeCompare(b.id));
    const ac = ranked.filter((fixture) => fixture.id <= "ROUTE-P1-0050");
    const belowLimit = ranked.find((fixture) => fixture.id === "ROUTE-P1-0051");
    assert.equal(ac.length, 50);
    assert.deepEqual(
      ac.map((fixture) => fixture.id),
      Array.from({ length: 50 }, (_, index) => `ROUTE-P1-${String(index + 1).padStart(4, "0")}`),
    );
    assert.ok(belowLimit);
    assert.equal(belowLimit.expect_node === "SafetyEscalation", false);
    for (const fixture of ac) {
      assert.equal(fixture.fixture_set, ROUTE_SET_ID);
      assert.ok(fixture.why.length > 0, fixture.id);
    }
    for (const id of ["ROUTE-P1-0035", "ROUTE-P1-0036", "ROUTE-P1-0046"]) {
      assert.equal(ac.find((fixture) => fixture.id === id)?.defensive, true, id);
    }
    for (const branch of REQUIRED_BRANCHES) {
      assert.ok(
        ac.some((fixture) => fixture.branch === branch),
        `missing branch ${branch}`,
      );
    }
    assert.ok(ac.some((fixture) => fixture.signal === "loop_detector"));
    assert.ok(ac.some((fixture) => fixture.signal === "step_bound"));

    const score = await scoreRouteFixtures(ac);
    const extra = await scoreRouteFixtures([belowLimit]);
    const lines = [
      `${score.fixture_set} ${score.hits}/${score.total} accuracy ${score.accuracy}`,
      ...score.per_branch.map((row) => `${row.branch} ${row.hits}/${row.total} ${row.accuracy}`),
      ...score.misses.map(
        (miss) =>
          `MISS ${miss.id} ${miss.branch} node ${miss.actual_node ?? "none"} != ${miss.expect_node} edge ${miss.actual_edge ?? "none"} != ${miss.expect_edge}${miss.error ? ` (${miss.error})` : ""}`,
      ),
    ];
    console.log(lines.join("\n"));

    const detector = ac.find((fixture) => fixture.signal === "loop_detector");
    const bound = ac.find((fixture) => fixture.signal === "step_bound");
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
    assert.equal(score.hits, ac.length);
    assert.deepEqual(
      score.misses.map((miss) => miss.id),
      [],
    );
    assert.equal(extra.hits, 1);
    assert.deepEqual(extra.misses, []);
  });
});
