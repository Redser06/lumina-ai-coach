import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export interface NodeLog {
  run_id: string;
  session_id: string;
  checkpoint_id: string | null;
  node: string;
  task_type: string;
  provider: string;
  model: string;
  fallback_from: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  edge_taken: string | null;
  condition_id: string | null;
  ts_utc: string;
}

const memory = new Map<string, NodeLog[]>();
const flushed = new WeakSet<NodeLog>();

export function logPath(): string {
  return process.env.NODE_LOG_PATH ?? "reports/node-log.jsonl";
}

export function appendNodeLog(record: NodeLog): NodeLog {
  const list = memory.get(record.session_id) ?? [];
  list.push(record);
  memory.set(record.session_id, list);
  return record;
}

function recordComplete(record: NodeLog): boolean {
  return (
    record.checkpoint_id !== null &&
    record.edge_taken !== null &&
    record.model.length > 0 &&
    Number.isFinite(record.tokens_in) &&
    Number.isFinite(record.tokens_out) &&
    Number.isFinite(record.cost_usd) &&
    Number.isFinite(record.latency_ms)
  );
}

function flushRecord(record: NodeLog): void {
  if (flushed.has(record) || !recordComplete(record)) return;
  const path = logPath();
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`);
  flushed.add(record);
}

export function attachEdge(sessionId: string, node: string, edgeId: string, conditionId: string): void {
  const list = memory.get(sessionId) ?? [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const record = list[index];
    if (record && record.node === node && record.edge_taken === null) {
      record.edge_taken = edgeId;
      record.condition_id = conditionId;
      return;
    }
  }
}

export function stampCheckpoint(sessionId: string, checkpointId: string): void {
  const list = memory.get(sessionId);
  if (!list) return;
  for (const record of list) {
    if (record.checkpoint_id === null) record.checkpoint_id = checkpointId;
    flushRecord(record);
  }
}

export function logsForSession(sessionId: string): NodeLog[] {
  const inMemory = memory.get(sessionId);
  if (inMemory && inMemory.length > 0) return inMemory.map((record) => ({ ...record }));
  return readLogsFromFile(sessionId);
}

export function readLogsFromFile(sessionId: string): NodeLog[] {
  try {
    const raw = readFileSync(logPath(), "utf8");
    return raw
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as NodeLog)
      .filter((record) => record.session_id === sessionId);
  } catch {
    return [];
  }
}

export function resetLogsForTests(): void {
  memory.clear();
}
