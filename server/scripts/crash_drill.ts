import "../runtime/network_guard.js";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface ServerHandle {
  proc: ChildProcess;
  port: number;
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function startServer(env: NodeJS.ProcessEnv): Promise<ServerHandle> {
  const proc = spawn(process.execPath, ["--import", "tsx", "server/api/node.ts"], {
    env,
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveExit) => {
    proc.on("exit", (code, signal) => resolveExit({ code, signal }));
  });
  return new Promise((resolveReady, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error(`server did not listen\n${buf}`)), 20000);
    proc.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
      const match = /LISTENING (\d+)/.exec(buf);
      if (!match) return;
      clearTimeout(timer);
      resolveReady({ proc, port: Number(match[1]), exited });
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      buf += chunk.toString();
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function main(): Promise<void> {
  const scenario = arg("--scenario", "SCN-0001");
  const killAfter = arg("--kill-after", "Practice");
  const outDir = resolve(arg("--out", "proofs/phase0"));
  const sessionId = `crash-${scenario.toLowerCase()}`;
  const sqlitePath = resolve(".data", `crash-${scenario}.sqlite`);
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    CHECKPOINTER: "sqlite",
    SQLITE_PATH: sqlitePath,
    LLM_PROVIDER: process.env.LLM_PROVIDER ?? "recorded",
    PORT: "0",
  };

  const crashed = await startServer({ ...baseEnv, CRASH_ARMED: "1", CRASH_AT: killAfter });
  let requestError: string | null = null;
  try {
    const response = await fetch(`http://127.0.0.1:${crashed.port}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario_id: scenario, session_id: sessionId }),
    });
    requestError = `unexpected response ${response.status}`;
  } catch (error) {
    requestError = error instanceof Error ? error.message : String(error);
  }
  const crash = await crashed.exited;
  if (crash.signal !== "SIGKILL" && crash.code !== 137) {
    throw new Error(`expected SIGKILL, got code=${crash.code} signal=${crash.signal} (${requestError})`);
  }

  const resumed = await startServer(baseEnv);
  try {
    const resumeResponse = await fetch(`http://127.0.0.1:${resumed.port}/sessions/${sessionId}/resume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const resume = (await resumeResponse.json()) as {
      resumed_node?: string;
      status?: string;
      state?: { path?: string[] };
      error?: string;
    };
    const checkpointsResponse = await fetch(`http://127.0.0.1:${resumed.port}/sessions/${sessionId}/checkpoints`);
    const checkpoints = await checkpointsResponse.json();
    if (!resumeResponse.ok) throw new Error(`resume failed ${resumeResponse.status} ${JSON.stringify(resume)}`);
    if (resume.resumed_node !== killAfter) {
      throw new Error(`resumed at ${resume.resumed_node}, expected ${killAfter}`);
    }
    mkdirSync(outDir, { recursive: true });
    const proof = {
      scenario,
      session_id: sessionId,
      kill_after: killAfter,
      crash: { signal: crash.signal, exit_code: crash.code, request_error: requestError },
      resume,
      checkpoints,
    };
    writeFileSync(resolve(outDir, "ac4-resume.json"), `${JSON.stringify(proof, null, 2)}\n`);
    console.log(
      `resume resumed_node=${resume.resumed_node} status=${resume.status} path=${(resume.state?.path ?? []).join(">")}`,
    );
  } finally {
    resumed.proc.kill("SIGTERM");
    await resumed.exited;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
