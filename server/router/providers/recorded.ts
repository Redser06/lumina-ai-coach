import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fakeProvider } from "./fake.js";
import type { Provider, ProviderRequest, ProviderResult } from "../types.js";

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../evals/fixtures/recorded");

export class MissingFixtureError extends Error {
  readonly code = "MISSING_FIXTURE";
  constructor(key: string) {
    super(`recorded fixture missing: ${key}`);
    this.name = "MissingFixtureError";
  }
}

export function recordedKey(model: string, taskType: string, prompt: string): string {
  return createHash("sha256").update(`${model}\n${taskType}\n${prompt}`).digest("hex");
}

export function recordedDir(): string {
  return process.env.RECORDED_DIR ?? DEFAULT_DIR;
}

export const recordedProvider: Provider = {
  id: "recorded",
  async complete(request: ProviderRequest): Promise<ProviderResult> {
    const key = recordedKey(request.model, request.taskType, request.prompt);
    const path = join(recordedDir(), `${key}.json`);
    try {
      const stored = JSON.parse(readFileSync(path, "utf8")) as ProviderResult;
      return { ...stored, latency_ms: 1 };
    } catch (error) {
      if (process.env.RECORD_FIXTURES === "1") {
        const generated = await fakeProvider.complete(request);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, `${JSON.stringify({ ...generated, latency_ms: 1 }, null, 2)}\n`);
        return { ...generated, latency_ms: 1 };
      }
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      throw new MissingFixtureError(key);
    }
  },
};
