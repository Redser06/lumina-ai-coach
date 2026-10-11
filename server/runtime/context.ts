import { AsyncLocalStorage } from "node:async_hooks";

export const runContext = new AsyncLocalStorage<{ runId: string }>();

export function currentRunId(): string {
  return runContext.getStore()?.runId ?? "local";
}
