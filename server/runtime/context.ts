import { AsyncLocalStorage } from "node:async_hooks";

export interface RunStore {
  runId: string;
  /** Replay forces the recorded provider and ignores LLM_PROVIDER. */
  provider?: "recorded";
}

export const runContext = new AsyncLocalStorage<RunStore>();

export function currentRunId(): string {
  return runContext.getStore()?.runId ?? "local";
}
