import { MemorySaver } from "@langchain/langgraph-checkpoint";
import type { BaseCheckpointSaver, Checkpoint } from "@langchain/langgraph-checkpoint";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { LearnerStateSchema, type LearnerState } from "../graph/state.js";

/**
 * Replace `cost_usd_session` on the current checkpoint row.
 * One write, same checkpoint id, same pending writes. Step, path, edges and `next` stay put,
 * so the node that failed is the node that runs again.
 */
export async function writeSessionCost(
  checkpointer: BaseCheckpointSaver,
  threadId: string,
  spentUsd: number,
): Promise<boolean> {
  const tuple = await checkpointer.getTuple({ configurable: { thread_id: threadId } });
  const checkpointId = tuple?.config.configurable?.checkpoint_id;
  const learner = tuple?.checkpoint.channel_values.learner;
  if (!tuple || !checkpointId || !learner || typeof learner !== "object") return false;
  const current = learner as LearnerState;
  if (current.cost_usd_session === spentUsd) return false;
  const nextLearner = LearnerStateSchema.parse({ ...current, cost_usd_session: spentUsd });
  const checkpoint: Checkpoint = {
    ...tuple.checkpoint,
    channel_values: { ...tuple.checkpoint.channel_values, learner: nextLearner },
  };
  const ns = tuple.config.configurable?.checkpoint_ns ?? "";
  const [, serialized] = await checkpointer.serde.dumpsTyped(checkpoint);
  if (checkpointer instanceof SqliteSaver) {
    const result = checkpointer.db
      .prepare(
        `UPDATE checkpoints SET checkpoint = ? WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?`,
      )
      .run(Buffer.from(serialized), threadId, ns, checkpointId);
    if (result.changes !== 1) {
      throw new Error(`session cost update changed ${result.changes} rows`);
    }
    return true;
  }
  if (checkpointer instanceof MemorySaver) {
    const row = checkpointer.storage[threadId]?.[ns]?.[checkpointId];
    if (!row) throw new Error("session cost update missed the memory checkpoint");
    checkpointer.storage[threadId]![ns]![checkpointId] = [serialized, row[1], row[2]];
    return true;
  }
  throw new Error("session cost update needs a sqlite or memory checkpointer");
}
