import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { HitlDecision } from "../graph/hitl.js";
import { initialLearnerState, type LearnerState } from "../graph/state.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures/scenarios");

export interface Scenario {
  id: string;
  persona: string;
  title: string;
  learner_id: string;
  goal: string;
  initial?: Partial<LearnerState>;
  hitl?: HitlDecision[];
  script: Record<string, Array<Record<string, unknown>>>;
  expected_path: string[];
  expected_edges: string[];
}

export function loadScenarios(): Scenario[] {
  return readdirSync(DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(DIR, name), "utf8")) as Scenario);
}

export function loadScenario(id: string): Scenario {
  const scenario = loadScenarios().find((item) => item.id === id);
  if (!scenario) throw new Error(`unknown scenario ${id}`);
  return scenario;
}

export function stateFromScenario(scenario: Scenario, sessionId: string): LearnerState {
  return initialLearnerState({
    learner_id: scenario.learner_id,
    session_id: sessionId,
    goal: scenario.goal,
    scenario_id: scenario.id,
    ...scenario.initial,
  });
}
