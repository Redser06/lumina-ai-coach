import { LOOP_REPEAT_LIMIT } from "./limits.js";
import type { LearnerPatch, LearnerState } from "./state.js";

/**
 * Same node three times with an identical learner-visible fingerprint.
 * `loop_cleared` stays set after SafetyEscalation so the detector does not immediately re-fire.
 */
export function detectLoop(state: LearnerState): boolean {
  if (state.loop_cleared) return false;
  if (state.fingerprints.length !== state.path.length) return false;
  const byNode = new Map<string, string[]>();
  for (let i = 0; i < state.path.length; i += 1) {
    const node = state.path[i]!;
    const list = byNode.get(node) ?? [];
    list.push(state.fingerprints[i]!);
    byNode.set(node, list);
  }
  for (const prints of byNode.values()) {
    if (prints.length < LOOP_REPEAT_LIMIT) continue;
    const last = prints.slice(-LOOP_REPEAT_LIMIT);
    if (last.every((print) => print === last[0])) return true;
  }
  return false;
}

export function applyGuards(state: LearnerState): LearnerPatch {
  if (detectLoop(state)) return { loop_detected: true };
  return {};
}
