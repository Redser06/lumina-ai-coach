import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { assertNetworkGuard } from "../runtime/network_guard.js";

const PIN = "1.0.4";
const SQLITE = "@langchain/langgraph-checkpoint-sqlite";

describe("phase 1 hygiene", { concurrency: false }, () => {
  test("checkpoint_sqlite_is_pinned_at_1_0_4", () => {
    const declared = JSON.parse(readFileSync("server/package.json", "utf8")) as {
      dependencies: Record<string, string>;
    };
    assert.equal(declared.dependencies[SQLITE], PIN);
    const installed = JSON.parse(
      readFileSync("node_modules/@langchain/langgraph-checkpoint-sqlite/package.json", "utf8"),
    ) as { version: string };
    assert.equal(installed.version, PIN);
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as unknown;
    const found = lockVersions(lock);
    assert.ok(found.length > 0);
    for (const version of found) assert.equal(version, PIN);
  });

  test("crash_after_spend_hook_is_not_in_session", () => {
    const session = readFileSync("server/graph/session.ts", "utf8");
    assert.equal(session.includes("CRASH_AFTER_SPEND"), false);
    assert.match(readFileSync("server/runtime/crash_after_spend.ts", "utf8"), /CRASH_AFTER_SPEND/);
    assert.match(readFileSync("server/checkpoint/cost.ts", "utf8"), /crashAfterSpend\(/);
  });

  test("ci_runs_proofs_under_the_network_guard", () => {
    assertNetworkGuard();
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const lines = ci.split("\n").filter((line) => line.includes("proofs.ts"));
    assert.equal(lines.length, 2);
    for (const line of lines) {
      assert.match(line, /--import \.\/server\/runtime\/network_guard\.ts/);
      assert.match(line, /server\/scripts\/proofs\.ts/);
    }
    const proofs = readFileSync("server/scripts/proofs.ts", "utf8");
    assert.match(proofs, /assertNetworkGuard\(/);
    assert.match(proofs, /--import", "\.\/server\/runtime\/network_guard\.ts"/);
  });
});

function lockVersions(value: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.name === SQLITE && typeof record.version === "string") found.push(record.version);
    for (const [key, child] of Object.entries(record)) {
      if (key === SQLITE && typeof child === "string") found.push(child);
      else walk(child);
    }
  };
  walk(value);
  return found;
}
