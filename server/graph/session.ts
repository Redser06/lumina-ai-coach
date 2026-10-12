import { randomUUID } from "node:crypto";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { Command, isGraphInterrupt } from "@langchain/langgraph";
import { closeCheckpointer, createCheckpointer } from "../checkpoint/index.js";
import { writeSessionCost } from "../checkpoint/cost.js";
import { sessionSpentUsd } from "../router/router.js";
import { runContext } from "../runtime/context.js";
import { logsForSession, stampCheckpoint, type NodeLog } from "../telemetry/node_log.js";
import { compileCoachGraph, type CompiledCoachGraph } from "./build.js";
import type { HitlDecision } from "./hitl.js";
import { applyPatch, LearnerStateSchema, type LearnerState } from "./state.js";

const STEP_CAP = 80;

export interface RunResult {
  status: "done" | "interrupted" | "paused";
  session_id: string;
  thread_id: string;
  checkpoint_id: string | null;
  next: string[];
  resumed_node: string | null;
  state: LearnerState;
  interrupts: unknown[];
  node_logs: NodeLog[];
  edges: string[];
  nodes: string[];
}

interface Snap {
  next: string[];
  checkpoint_id: string | null;
  learner: LearnerState | null;
  interrupts: Array<{ value: unknown }>;
}

export class SessionService {
  readonly graph: CompiledCoachGraph;
  readonly checkpointer: BaseCheckpointSaver;

  constructor(graph?: CompiledCoachGraph, checkpointer?: BaseCheckpointSaver) {
    this.checkpointer = checkpointer ?? createCheckpointer();
    this.graph = graph ?? compileCoachGraph({ checkpointer: this.checkpointer });
  }

  close(): void {
    closeCheckpointer(this.checkpointer);
  }

  private config(threadId: string, checkpointId?: string) {
    return {
      configurable: {
        thread_id: threadId,
        ...(checkpointId ? { checkpoint_id: checkpointId } : {}),
      },
      recursionLimit: 50,
    };
  }

  async readSnap(threadId: string, checkpointId?: string): Promise<Snap> {
    const snap = await this.graph.getState(this.config(threadId, checkpointId));
    const raw = snap.values.learner;
    return {
      next: [...(snap.next ?? [])],
      checkpoint_id: snap.config.configurable?.checkpoint_id ?? null,
      learner: raw ? LearnerStateSchema.parse(raw) : null,
      interrupts: (snap.tasks ?? []).flatMap((task) => task.interrupts ?? []),
    };
  }

  async history(threadId: string) {
    const items = [];
    for await (const item of this.graph.getStateHistory(this.config(threadId))) {
      const learner = item.values.learner ? LearnerStateSchema.parse(item.values.learner) : null;
      items.push({
        checkpoint_id: item.config.configurable?.checkpoint_id ?? null,
        next: [...(item.next ?? [])],
        path: learner?.path ?? [],
        step: learner?.step ?? 0,
        last_edge: learner?.last_edge ?? null,
        last_assessment: learner?.last_assessment ?? null,
        state: learner,
      });
    }
    return items;
  }

  async run(initial: LearnerState, decisions: HitlDecision[] = [], threadId = initial.session_id): Promise<RunResult> {
    const provider = runContext.getStore()?.provider;
    return runContext.run({ runId: randomUUID(), provider }, async () => {
      await this.invoke(threadId, { learner: initial });
      const opened = await this.readSnap(threadId);
      stampCheckpoint(initial.session_id, opened.checkpoint_id ?? "unknown");
      return this.continueUntil(threadId, decisions, null, initial.session_id);
    });
  }

  async continueUntil(
    threadId: string,
    decisions: HitlDecision[],
    resumedNode: string | null,
    sessionId = threadId,
  ): Promise<RunResult> {
    const queue = [...decisions];
    for (let step = 0; step < STEP_CAP; step += 1) {
      const snap = await this.readSnap(threadId);
      if (!snap.learner) throw new Error(`session not found: ${threadId}`);
      if (snap.interrupts.length > 0) {
        const decision = queue.shift();
        if (!decision) return this.toResult(threadId, snap, "interrupted", resumedNode, sessionId);
        await this.invoke(threadId, new Command({ resume: decision }));
        const after = await this.readSnap(threadId);
        stampCheckpoint(sessionId, after.checkpoint_id ?? "unknown");
        continue;
      }
      if (snap.next.length === 0) return this.toResult(threadId, snap, "done", resumedNode, sessionId);
      await this.invoke(threadId, null);
      const after = await this.readSnap(threadId);
      stampCheckpoint(sessionId, after.checkpoint_id ?? "unknown");
    }
    throw new Error("runner step cap exceeded");
  }

  async step(threadId: string): Promise<RunResult> {
    const before = await this.readSnap(threadId);
    if (!before.learner) throw new Error(`session not found: ${threadId}`);
    if (before.interrupts.length > 0) return this.toResult(threadId, before, "interrupted", null, before.learner.session_id);
    if (before.next.length === 0) return this.toResult(threadId, before, "done", null, before.learner.session_id);
    return runContext.run({ runId: randomUUID() }, async () => {
      await this.invoke(threadId, null);
      const after = await this.readSnap(threadId);
      stampCheckpoint(before.learner!.session_id, after.checkpoint_id ?? "unknown");
      const status = after.interrupts.length > 0 ? "interrupted" : after.next.length === 0 ? "done" : "paused";
      return this.toResult(threadId, after, status, null, before.learner!.session_id);
    });
  }

  async hitl(threadId: string, decision: HitlDecision): Promise<RunResult> {
    const before = await this.readSnap(threadId);
    if (!before.learner) throw new Error(`session not found: ${threadId}`);
    if (before.interrupts.length === 0) throw new Error("session is not waiting on a human decision");
    return runContext.run({ runId: randomUUID() }, () =>
      this.continueUntil(threadId, [decision], null, before.learner!.session_id),
    );
  }

  async replay(threadId: string, from: string, decisions: HitlDecision[] = []): Promise<{
    from: string;
    replay_thread_id: string;
    state: LearnerState;
    original_state: LearnerState;
    identical: boolean;
    node_logs: NodeLog[];
    edges: string[];
    path: string[];
  }> {
    const snap = await this.readSnap(threadId, from);
    if (!snap.learner) throw new Error("checkpoint not found");
    const replayThread = `${threadId}-replay-${randomUUID()}`;
    // Spend starts at this checkpoint's cost_usd_session. A finished session's later
    // total is not applied on top, so replaying an early checkpoint cannot trip the cap.
    const result = await runContext.run({ runId: "replay", provider: "recorded" }, () =>
      this.run(snap.learner!, decisions, replayThread),
    );
    const original = await this.readSnap(threadId);
    if (!original.learner) throw new Error(`session not found: ${threadId}`);
    return {
      from,
      replay_thread_id: replayThread,
      state: result.state,
      original_state: original.learner,
      identical: JSON.stringify(result.state) === JSON.stringify(original.learner),
      node_logs: result.node_logs,
      edges: result.edges,
      path: result.state.path,
    };
  }

  async fork(threadId: string, from: string, patch: Record<string, unknown>, _decisions: HitlDecision[] = []): Promise<{
    session_id: string;
    parent_session_id: string;
    forked_from: string;
    patch: Record<string, unknown>;
    routed_to: string | null;
    edge_taken: string | null;
    condition_id: string | null;
    parent_unchanged: boolean;
    parent_checkpoint_id: string | null;
    state: LearnerState;
    next: string[];
    node_logs: NodeLog[];
  }> {
    void _decisions;
    const parentBefore = await this.readSnap(threadId);
    const snap = await this.readSnap(threadId, from);
    if (!snap.learner || !parentBefore.learner) throw new Error("checkpoint not found");
    const childThread = `${threadId}-fork-${randomUUID()}`;
    const seeded = { ...applyPatch(snap.learner, patch), session_id: childThread };
    await runContext.run({ runId: randomUUID() }, async () => {
      await this.invoke(childThread, { learner: seeded });
      const opened = await this.readSnap(childThread);
      stampCheckpoint(seeded.session_id, opened.checkpoint_id ?? "unknown");
    });
    const mid = await this.readSnap(childThread);
    if (!mid.learner) throw new Error("fork did not checkpoint");
    const parentAfter = await this.readSnap(threadId);
    return {
      session_id: childThread,
      parent_session_id: threadId,
      forked_from: from,
      patch,
      routed_to: mid.next[0] ?? null,
      edge_taken: mid.learner.last_edge,
      condition_id: mid.learner.last_condition,
      parent_unchanged:
        JSON.stringify(parentBefore.learner) === JSON.stringify(parentAfter.learner) &&
        parentBefore.checkpoint_id === parentAfter.checkpoint_id,
      parent_checkpoint_id: parentBefore.checkpoint_id,
      state: mid.learner,
      next: mid.next,
      node_logs: logsForSession(seeded.session_id),
    };
  }

  async resume(threadId: string, decisions: HitlDecision[] = []): Promise<RunResult> {
    const before = await this.readSnap(threadId);
    if (!before.learner) throw new Error(`session not found: ${threadId}`);
    if (before.interrupts.length > 0) {
      throw Object.assign(new Error("session is waiting on a human decision"), { status: 409 });
    }
    const resumedNode = before.next[0] ?? null;
    if (!resumedNode) return this.toResult(threadId, before, "done", null, before.learner.session_id);
    const remaining = decisions.slice(before.learner.hitl_log.length);
    return runContext.run({ runId: randomUUID() }, () =>
      this.continueUntil(threadId, remaining, resumedNode, before.learner!.session_id),
    );
  }

  private toResult(
    threadId: string,
    snap: Snap,
    status: "done" | "interrupted" | "paused",
    resumedNode: string | null,
    sessionId: string,
  ): RunResult {
    if (!snap.learner) throw new Error(`session not found: ${threadId}`);
    return {
      status,
      session_id: sessionId,
      thread_id: threadId,
      checkpoint_id: snap.checkpoint_id,
      next: snap.next,
      resumed_node: resumedNode,
      state: snap.learner,
      interrupts: snap.interrupts.map((item) => item.value),
      node_logs: logsForSession(sessionId),
      edges: snap.learner.edges_taken,
      nodes: snap.learner.trace_nodes,
    };
  }

  private async invoke(threadId: string, input: unknown): Promise<void> {
    try {
      await this.graph.invoke(input, this.config(threadId));
    } catch (error) {
      if (!isGraphInterrupt(error)) await this.persistChargedSpend(threadId, error);
      throw error;
    }
  }

  private async persistChargedSpend(threadId: string, error: unknown): Promise<void> {
    const spent = sessionSpentUsd(error);
    if (spent === undefined) return;
    const wrote = await writeSessionCost(this.checkpointer, threadId, spent);
    if (wrote && process.env.CRASH_AFTER_SPEND === "1") {
      process.kill(process.pid, "SIGKILL");
    }
  }
}

export { applyPatch };
