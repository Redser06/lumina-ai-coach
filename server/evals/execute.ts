import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { compileCoachGraph } from "../graph/build.js";
import { SessionService, type RunResult } from "../graph/session.js";
import { loadScenarios, stateFromScenario, type Scenario } from "./scenarios.js";

export interface ScenarioRun {
  scenario: Scenario;
  result: RunResult;
  path_pass: boolean;
  edge_pass: boolean;
}

export async function executeScenarios(): Promise<{ runs: ScenarioRun[]; service: SessionService }> {
  const checkpointer = new MemorySaver();
  const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
  const runs: ScenarioRun[] = [];
  for (const scenario of loadScenarios()) {
    const result = await service.run(stateFromScenario(scenario, scenario.id), scenario.hitl ?? []);
    runs.push({
      scenario,
      result,
      path_pass: JSON.stringify(result.state.path) === JSON.stringify(scenario.expected_path),
      edge_pass: JSON.stringify(result.edges) === JSON.stringify(scenario.expected_edges),
    });
  }
  return { runs, service };
}
