import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Provider, ProviderRequest, ProviderResult } from "../types.js";

const SCENARIO_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../evals/fixtures/scenarios");

export function tokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function forcedFailures(): Set<string> {
  return new Set(
    (process.env.FAKE_FAIL ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

export function promptField(prompt: string, key: string): string | null {
  const match = new RegExp(`^${key}: (.*)$`, "m").exec(prompt);
  return match?.[1] ?? null;
}

function scriptedOutput(prompt: string): string {
  const stage = promptField(prompt, "stage");
  const scenarioId = promptField(prompt, "scenario");
  const node = promptField(prompt, "node");
  const visit = Number(promptField(prompt, "visit") ?? "0");
  const depth = promptField(prompt, "depth") ?? "1";
  const goal = promptField(prompt, "goal") ?? "";
  if (stage === "draft" || stage === "critique" || stage === "revise" || stage === "check") {
    return stagedOutput(stage, node ?? "node", depth, goal, scenarioId);
  }
  if (!scenarioId || scenarioId === "none" || !node) {
    return JSON.stringify({ note: "ok" });
  }
  let files: string[] = [];
  try {
    files = readdirSync(SCENARIO_DIR).filter((name) => name.endsWith(".json"));
  } catch {
    return JSON.stringify({ note: "ok" });
  }
  for (const file of files) {
    const scenario = JSON.parse(readFileSync(join(SCENARIO_DIR, file), "utf8")) as {
      id: string;
      script?: Record<string, Array<Record<string, unknown>>>;
    };
    if (scenario.id !== scenarioId) continue;
    const steps = scenario.script?.[node] ?? [];
    const output = steps[visit] ?? { note: "ok" };
    return JSON.stringify(output);
  }
  return JSON.stringify({ note: "ok" });
}

function stagedOutput(stage: string, node: string, depth: string, goal: string, scenarioId: string | null): string {
  if (stage === "draft") {
    return JSON.stringify({ prompt: `${node} draft ${depth}: coach the learner toward ${goal} with one checkable step.` });
  }
  if (stage === "revise") {
    return JSON.stringify({ prompt: `${node} revised ${depth}: coach the learner toward ${goal} with one worked example and a check.` });
  }
  if (stage === "check") return JSON.stringify({ pass: true, note: "checked" });
  const accept = critiqueAccepts(scenarioId, node);
  return JSON.stringify({
    accept,
    critique: accept ? `${node} draft ${depth} names a checkable step.` : `${node} draft ${depth} has no checkable outcome.`,
  });
}

function critiqueAccepts(scenarioId: string | null, node: string): boolean {
  if (!scenarioId || scenarioId === "none") return true;
  let files: string[] = [];
  try {
    files = readdirSync(SCENARIO_DIR).filter((name) => name.endsWith(".json"));
  } catch {
    return true;
  }
  for (const file of files) {
    const scenario = JSON.parse(readFileSync(join(SCENARIO_DIR, file), "utf8")) as {
      id: string;
      self_prompt?: Record<string, { accept?: boolean }>;
    };
    if (scenario.id !== scenarioId) continue;
    return scenario.self_prompt?.[node]?.accept !== false;
  }
  return true;
}

export const fakeProvider: Provider = {
  id: "fake",
  async complete(request: ProviderRequest): Promise<ProviderResult> {
    if (forcedFailures().has(request.model)) {
      throw new Error(`forced failure ${request.model}`);
    }
    const text = scriptedOutput(request.prompt);
    return {
      text,
      tokens_in: tokenCount(request.prompt),
      tokens_out: tokenCount(text),
      latency_ms: 1,
    };
  },
};
