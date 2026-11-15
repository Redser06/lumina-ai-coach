import { attachEdge } from "../../telemetry/node_log.js";
import { currentRunId } from "../../runtime/context.js";
import { CostCapExceeded, PricingRejected } from "../../router/pricing.js";
import { complete, sessionSpentUsd } from "../../router/router.js";
import type { CompleteArgs, ModelCall } from "../../router/types.js";
import { renderSelfPrompt } from "../prompt.js";
import { selectEdge } from "../route.js";
import type { GraphNodeSpec } from "../spec/types.js";
import { LearnerStateSchema, type LearnerState, type SelfPrompt } from "../state.js";
import { mergeModelOutput, withBookkeeping } from "./merge.js";

const LOOP = new Set<SelfPrompt["stage"]>(["draft", "critique", "revise"]);

export function selfPromptStop(
  rows: SelfPrompt[],
): "accepted" | "depth_exhausted" | "critique_failed" | "malformed_revision" | "incomplete" {
  const last = [...rows].reverse().find((row) => LOOP.has(row.stage));
  if (!last) return "incomplete";
  if (last.status === "critique_failed" || last.status === "malformed_revision" || last.status === "depth_exhausted") {
    return last.status;
  }
  if (last.stage === "revise" && last.status === "ok") return "accepted";
  return "incomplete";
}

export interface SubgraphCycle {
  depth: number;
  draft: string;
  critique: string;
  revised: string;
}

export interface SubgraphVisit {
  node: string;
  visit: number;
  max_depth: number;
  depth_used: number;
  depth_exceeded: boolean;
  stop: ReturnType<typeof selfPromptStop>;
  executed: string;
  cycles: SubgraphCycle[];
}

export function subgraphVisits(prompts: SelfPrompt[], maxDepthOf: (node: string) => number): SubgraphVisit[] {
  const order: string[] = [];
  const groups = new Map<string, SelfPrompt[]>();
  for (const row of prompts) {
    const key = `${row.node}:${row.visit}`;
    if (!groups.has(key)) order.push(key);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return order.map((key) => {
    const rows = groups.get(key) ?? [];
    const node = rows[0]?.node ?? "";
    const visit = rows[0]?.visit ?? 0;
    const maxDepth = maxDepthOf(node);
    const depthUsed = rows.reduce((max, row) => Math.max(max, row.depth), 0);
    const cycles: SubgraphCycle[] = [];
    for (let depth = 1; depth <= depthUsed; depth += 1) {
      const at = rows.filter((row) => row.depth === depth);
      const draft = at.find((row) => row.stage === "draft");
      const critique = at.find((row) => row.stage === "critique");
      const revised = at.find((row) => row.stage === "revise");
      if (!draft && !critique && !revised) continue;
      cycles.push({
        depth,
        draft: draft?.prompt ?? "",
        critique: critique?.prompt ?? "",
        revised: revised?.prompt ?? "",
      });
    }
    return {
      node,
      visit,
      max_depth: maxDepth,
      depth_used: depthUsed,
      depth_exceeded: depthUsed > maxDepth,
      stop: selfPromptStop(rows),
      executed: rows.find((row) => row.stage === "execute")?.prompt ?? "",
      cycles,
    };
  });
}

/**
 * Draft, critique, revise, then execute and check.
 * A cycle counts as one depth. The loop stops on accept, a failed critique,
 * a revision that is not a prompt, or when depth reaches max_depth.
 * Execute keeps the last good prompt (revised, otherwise the draft).
 */
export async function runSelfPrompt(node: GraphNodeSpec, learner: LearnerState): Promise<{ learner: LearnerState }> {
  const maxDepth = node.max_depth;
  if (!Number.isInteger(maxDepth) || (maxDepth ?? 0) < 1) throw new Error(`${node.id} missing max_depth`);
  const bound = maxDepth as number;
  const visit = learner.path.filter((entry) => entry === node.id).length;
  const prompts: SelfPrompt[] = [...learner.self_prompts];
  let spent = learner.cost_usd_session;
  let instruction = "";

  const push = (entry: SelfPrompt): void => {
    if (entry.depth > bound) throw new Error(`${node.id} depth ${entry.depth} exceeded max_depth ${bound}`);
    prompts.push(entry);
  };

  const call = async (stage: SelfPrompt["stage"], taskType: string, depth: number, target: string): Promise<ModelCall> => {
    const result = await completeCharged(node.id, {
      node: node.id,
      taskType,
      prompt: renderSelfPrompt({ nodeId: node.id, taskType, stage, state: learner, depth, target }),
      sessionId: learner.session_id,
      runId: currentRunId(),
      spentUsd: spent,
      capUsd: learner.cost_budget_usd,
      edgeTaken: null,
      conditionId: null,
    });
    spent = result.session_spent_usd;
    return result;
  };

  for (let depth = 1; depth <= bound; depth += 1) {
    const draftCall = await call("draft", node.task_type, depth, instruction);
    const drafted = readField(draftCall.json, "prompt");
    if (!drafted) {
      push(entry(node.id, visit, depth, "draft", "", draftCall.text, "malformed_revision"));
      break;
    }
    push(entry(node.id, visit, depth, "draft", drafted, draftCall.text, "ok"));
    instruction = drafted;

    let critiqueCall: ModelCall;
    try {
      critiqueCall = await call("critique", "self-critique", depth, instruction);
    } catch (error) {
      if (!stoppable(error)) throw error;
      spent = spentAfter(error, spent);
      push(entry(node.id, visit, depth, "critique", "", errorText(error), "critique_failed"));
      break;
    }
    const accepted = critiqueCall.json.accept === true;
    push(
      entry(
        node.id,
        visit,
        depth,
        "critique",
        readField(critiqueCall.json, "critique") ?? critiqueCall.text,
        critiqueCall.text,
        "ok",
      ),
    );

    let reviseCall: ModelCall;
    try {
      reviseCall = await call("revise", node.task_type, depth, instruction);
    } catch (error) {
      if (!stoppable(error)) throw error;
      spent = spentAfter(error, spent);
      push(entry(node.id, visit, depth, "revise", "", errorText(error), "malformed_revision"));
      break;
    }
    const revised = readField(reviseCall.json, "prompt");
    if (!revised) {
      push(entry(node.id, visit, depth, "revise", "", reviseCall.text, "malformed_revision"));
      break;
    }
    const capped = !accepted && depth === bound;
    push(entry(node.id, visit, depth, "revise", revised, reviseCall.text, capped ? "depth_exhausted" : "ok"));
    instruction = revised;
    if (accepted || depth === bound) break;
  }

  const mine = prompts.filter((row) => row.node === node.id && row.visit === visit);
  const depthUsed = mine.reduce((max, row) => Math.max(max, row.depth), 1);
  const executeCall = await call("execute", node.task_type, depthUsed, instruction);
  push(entry(node.id, visit, depthUsed, "execute", instruction, executeCall.text, "ok"));
  const checkCall = await call("check", "self-critique", depthUsed, instruction);
  push(entry(node.id, visit, depthUsed, "check", instruction, checkCall.text, "ok"));

  const patched = withBookkeeping(
    { ...learner, self_prompts: prompts },
    node.id,
    checkCall,
    mergeModelOutput(executeCall.json),
  );
  const edge = selectEdge(node.id, patched);
  const finished = LearnerStateSchema.parse({
    ...patched,
    self_prompts: prompts,
    last_edge: edge.id,
    last_condition: edge.condition_id,
    edges_taken: [...learner.edges_taken, edge.id],
  });
  attachEdge(learner.session_id, node.id, edge.id, edge.condition_id);
  return { learner: finished };
}

function entry(
  node: string,
  visit: number,
  depth: number,
  stage: SelfPrompt["stage"],
  prompt: string,
  output: string,
  status: SelfPrompt["status"],
): SelfPrompt {
  return { node, visit, depth, stage, prompt, output, status };
}

function readField(json: Record<string, unknown>, key: string): string | null {
  const value = json[key];
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function stoppable(error: unknown): boolean {
  if (error instanceof CostCapExceeded || error instanceof PricingRejected) return false;
  const text = errorText(error);
  if (text.includes("recorded fixture missing")) return false;
  return true;
}

function spentAfter(error: unknown, current: number): number {
  return sessionSpentUsd(error) ?? current;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function completeCharged(nodeId: string, args: CompleteArgs): Promise<ModelCall> {
  try {
    return await complete(args);
  } catch (error) {
    if (error && typeof error === "object" && sessionSpentUsd(error) !== undefined) {
      Object.assign(error, { chargedNode: nodeId });
    }
    throw error;
  }
}
