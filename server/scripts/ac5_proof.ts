import "../runtime/network_guard.js";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { selfPromptStop, subgraphVisits } from "../graph/nodes/self_prompt.js";
import { loadSpecWithHash } from "../graph/spec/load.js";
import type { LearnerState, SelfPrompt } from "../graph/state.js";

const CRITERION =
  "Self-prompting subgraphs: Teach/Practice/Remediate generate, critique and revise their own prompts within a declared max depth; the trace shows every self-generated prompt and the depth is never exceeded";

interface SessionBody {
  status: string;
  session_id: string;
  state: LearnerState;
}

interface CheckpointRow {
  checkpoint_id: string | null;
  path: string[];
  state: LearnerState | null;
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

function teachCheckpoint(rows: CheckpointRow[]): CheckpointRow {
  const found = rows.find((row) => {
    const prompts = row.state?.self_prompts ?? [];
    return row.path.at(-1) === "Teach" && prompts.some((item) => item.node === "Teach" && item.stage === "revise");
  });
  if (!found?.checkpoint_id || !found.state) throw new Error("Teach checkpoint missing self-prompts");
  return found;
}

async function main(): Promise<void> {
  const loaded = loadSpecWithHash();
  const maxDepthOf = (node: string): number => loaded.spec.nodes.find((item) => item.id === node)?.max_depth ?? 0;
  const sqlitePath = resolve(".data", "ac5-proof.sqlite");
  mkdirSync(resolve(".data"), { recursive: true });
  const server = await startServer({
    ...process.env,
    CHECKPOINTER: "sqlite",
    SQLITE_PATH: sqlitePath,
    LLM_PROVIDER: "fake",
    PORT: "0",
  });
  try {
    const visits = (await post(server.port, "/sessions", {
      scenario_id: "SCN-0001",
      session_id: "ac5-visits",
    })) as SessionBody;
    const visitHistory = (await get(server.port, "/sessions/ac5-visits/checkpoints")) as CheckpointRow[];
    const visitCheckpoint = teachCheckpoint(visitHistory);
    const maxDepth = (await post(server.port, "/sessions", {
      scenario_id: "SCN-0009",
      session_id: "ac5-max-depth",
    })) as SessionBody;
    const maxHistory = (await get(server.port, "/sessions/ac5-max-depth/checkpoints")) as CheckpointRow[];
    const maxCheckpoint = teachCheckpoint(maxHistory);
    const teachRows = maxDepth.state.self_prompts.filter((row) => row.node === "Teach");
    const proof = {
      ac: "AC-5",
      criterion: CRITERION,
      spec: {
        fixture_id: `GRAPH-SPEC-${loaded.spec.spec_id}@${loaded.spec.version}`,
        version: loaded.spec.version,
        sha256: loaded.sha256,
        max_depth: {
          Teach: maxDepthOf("Teach"),
          Practice: maxDepthOf("Practice"),
          Remediate: maxDepthOf("Remediate"),
        },
      },
      visits: {
        endpoint: "POST /sessions",
        scenario_id: "SCN-0001",
        session_id: visits.session_id,
        status: visits.status,
        path: visits.state.path,
        subgraph_visits: subgraphVisits(visits.state.self_prompts, maxDepthOf),
        self_prompts: visits.state.self_prompts,
      },
      checkpoint: {
        endpoint: "GET /sessions/ac5-visits/checkpoints",
        checkpoint_id: visitCheckpoint.checkpoint_id,
        path: visitCheckpoint.path,
        self_prompts: visitCheckpoint.state?.self_prompts ?? [],
      },
      max_depth_run: {
        endpoint: "POST /sessions",
        scenario_id: "SCN-0009",
        session_id: maxDepth.session_id,
        status: maxDepth.status,
        path: maxDepth.state.path,
        node: "Teach",
        max_depth: maxDepthOf("Teach"),
        draft_count: teachRows.filter((row) => row.stage === "draft").length,
        depth_exceeded: teachRows.some((row) => row.depth > maxDepthOf("Teach")),
        stop: selfPromptStop(teachRows),
        subgraph_visits: subgraphVisits(maxDepth.state.self_prompts, maxDepthOf),
        self_prompts: maxDepth.state.self_prompts,
        checkpoint: {
          endpoint: "GET /sessions/ac5-max-depth/checkpoints",
          checkpoint_id: maxCheckpoint.checkpoint_id,
          path: maxCheckpoint.path,
          self_prompts: maxCheckpoint.state?.self_prompts ?? [],
        },
      },
    };
    assertProof(proof.visits.self_prompts, proof.max_depth_run.self_prompts, maxDepthOf);
    const out = resolve("docs/phase1/proofs/ac5-self-prompt.json");
    mkdirSync(resolve("docs/phase1/proofs"), { recursive: true });
    writeFileSync(out, `${JSON.stringify(proof, null, 2)}\n`);
    console.log(`wrote ${out}`);
  } finally {
    server.proc.kill("SIGTERM");
  }
}

function assertProof(
  visits: SelfPrompt[],
  capped: SelfPrompt[],
  maxDepthOf: (node: string) => number,
): void {
  const seen = new Set(visits.map((row) => row.node));
  for (const node of ["Teach", "Practice", "Remediate"]) {
    if (!seen.has(node)) throw new Error(`visit trace missing ${node}`);
  }
  for (const row of [...visits, ...capped]) {
    if (row.depth > maxDepthOf(row.node)) throw new Error(`${row.node} depth ${row.depth} exceeded`);
  }
  const teach = capped.filter((row) => row.node === "Teach" && row.stage === "draft");
  if (teach.length !== maxDepthOf("Teach")) throw new Error(`max-depth drafts ${teach.length}`);
  if (selfPromptStop(capped.filter((row) => row.node === "Teach")) !== "depth_exhausted") {
    throw new Error("max-depth run did not stop on the cap");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
