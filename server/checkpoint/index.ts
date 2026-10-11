import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";

export function createCheckpointer(kind = process.env.CHECKPOINTER ?? "memory"): BaseCheckpointSaver {
  if (kind === "memory") return new MemorySaver();
  if (kind === "sqlite") {
    const path = process.env.SQLITE_PATH ?? ".data/checkpoints.sqlite";
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    return SqliteSaver.fromConnString(path);
  }
  throw new Error(`unknown CHECKPOINTER ${kind}`);
}

export function closeCheckpointer(saver: BaseCheckpointSaver): void {
  const db = (saver as { db?: { close?: () => void } }).db;
  db?.close?.();
}
