import "../runtime/network_guard.js";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LearnerState } from "../graph/state.js";

interface CheckpointRow {
  checkpoint_id: string | null;
  next: string[];
  path: string[];
  state: LearnerState | null;
  last_assessment: LearnerState["last_assessment"];
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function startServer(env: NodeJS.ProcessEnv): Promise<{ proc: ChildProcess; port: number }> {
  const proc = spawn(process.execPath, ["--import", "tsx", "server/api/node.ts"], {
    env,
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolveReady, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error(`server did not listen\n${buf}`)), 20000);
    proc.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const match = /LISTENING (\d+)/.exec(buf);
      if (!match) return;
      clearTimeout(timer);
      resolveReady({ proc, port: Number(match[1]) });
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
    });
    proc.on("error", reject);
  });
}

async function post(port: number, path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} ${response.status} ${JSON.stringify(json)}`);
  return json;
}

async function get(port: number, path: string): Promise<unknown> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} ${response.status} ${JSON.stringify(json)}`);
  return json;
}

async function main(): Promise<void> {
  const outDir = resolve(arg("--out", "proofs/phase0"));
  const onlyRouter = hasFlag("--only") && arg("--only", "") === "router";
  mkdirSync(outDir, { recursive: true });
  const sqlitePath = resolve(".data", onlyRouter ? "router-proof.sqlite" : "replay-proof.sqlite");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CHECKPOINTER: "sqlite",
    SQLITE_PATH: sqlitePath,
    PORT: "0",
    LLM_PROVIDER: onlyRouter ? (process.env.LLM_PROVIDER ?? "fake") : (process.env.LLM_PROVIDER ?? "recorded"),
  };
  const server = await startServer(env);
  try {
    if (onlyRouter) {
      const sessionId = "router-proof";
      await post(server.port, "/sessions", { scenario_id: "SCN-0001", session_id: sessionId });
      const logs = (await get(server.port, `/sessions/${sessionId}/logs`)) as {
        logs: Array<Record<string, unknown>>;
      };
      const fallback = logs.logs.filter((row) => row.fallback_from != null);
      const priced = logs.logs.every(
        (row) =>
          typeof row.model === "string" &&
          typeof row.tokens_in === "number" &&
          typeof row.tokens_out === "number" &&
          typeof row.cost_usd === "number" &&
          typeof row.latency_ms === "number",
      );
      if (fallback.length === 0 || !priced) {
        throw new Error(`router proof incomplete fallback=${fallback.length} priced=${priced}`);
      }
      writeFileSync(resolve(outDir, "ac7-router.json"), `${JSON.stringify({ session_id: sessionId, ...logs }, null, 2)}\n`);
      console.log(`router logs=${logs.logs.length} fallback=${fallback.length}`);
      return;
    }

    const sessionId = "replay-scn-0001";
    const original = (await post(server.port, "/sessions", { scenario_id: "SCN-0001", session_id: sessionId })) as {
      state: LearnerState;
    };
    const checkpoints = (await get(server.port, `/sessions/${sessionId}/checkpoints`)) as CheckpointRow[];
    const origin = checkpoints.find(
      (row) =>
        row.path.length === 0 &&
        (row.state?.edges_taken.length ?? 1) === 0 &&
        row.next.includes("Supervisor") &&
        row.checkpoint_id,
    );
    if (!origin?.checkpoint_id) throw new Error("input checkpoint not found");
    const replay = (await post(server.port, `/sessions/${sessionId}/replay`, { from: origin.checkpoint_id })) as {
      identical: boolean;
      state: LearnerState;
    };
    if (!replay.identical || JSON.stringify(replay.state) !== JSON.stringify(original.state)) {
      throw new Error("replay diverged from the original session");
    }
    writeFileSync(
      resolve(outDir, "ac4-replay.json"),
      `${JSON.stringify({ session_id: sessionId, from: origin.checkpoint_id, original, replay, checkpoints }, null, 2)}\n`,
    );

    const forkFrom = checkpoints.find(
      (row) =>
        row.path.at(-1) === "Assess" &&
        row.next.includes("Supervisor") &&
        row.last_assessment?.error_class === null &&
        (row.last_assessment?.score ?? 0) >= 0.85 &&
        row.checkpoint_id,
    );
    if (!forkFrom?.checkpoint_id) throw new Error("fast-mastery checkpoint not found");
    const fork = await post(server.port, `/sessions/${sessionId}/fork`, {
      from: forkFrom.checkpoint_id,
      patch: { last_assessment: { error_class: "misconception" } },
    });
    const forkBody = fork as { routed_to: string; edge_taken: string; parent_unchanged: boolean };
    if (forkBody.routed_to !== "Remediate" || forkBody.edge_taken !== "e-sup-misconception" || !forkBody.parent_unchanged) {
      throw new Error(`fork did not route to Remediate: ${JSON.stringify(forkBody)}`);
    }
    writeFileSync(
      resolve(outDir, "ac4-fork.json"),
      `${JSON.stringify({ session_id: sessionId, from: forkFrom.checkpoint_id, fork, parent_checkpoint: forkFrom }, null, 2)}\n`,
    );
    console.log("replay identical; fork routed_to=Remediate");
  } finally {
    server.proc.kill("SIGTERM");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
