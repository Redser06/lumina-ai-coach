import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
      packages: Record<string, { version?: string }>;
    };
    assert.equal(lock.packages["node_modules/@langchain/langgraph-checkpoint-sqlite"]?.version, PIN);
  });

  test("production_modules_have_no_crash_after_spend_hook", () => {
    const hits = sourceFiles("server").filter((file) => {
      if (file.startsWith("server/tests/")) return false;
      if (file === "server/scripts/spend_crash_child.ts") return false;
      return readFileSync(file, "utf8").includes("CRASH_AFTER_SPEND");
    });
    assert.deepEqual(hits, []);
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

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules") continue;
      found.push(...sourceFiles(path));
    } else if (name.endsWith(".ts")) found.push(path);
  }
  return found;
}
