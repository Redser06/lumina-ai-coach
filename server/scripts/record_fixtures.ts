import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { executeScenarios } from "../evals/execute.js";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";
import { compileCoachGraph } from "../graph/build.js";
import { SessionService } from "../graph/session.js";

process.env.LLM_PROVIDER = "recorded";
process.env.RECORD_FIXTURES = "1";

const { runs, service } = await executeScenarios();
service.close();
const failed = runs.filter((run) => !run.path_pass || !run.edge_pass).map((run) => run.scenario.id);
if (failed.length > 0) {
  console.error(`recording diverged: ${failed.join(",")}`);
  process.exit(1);
}

const checkpointer = new MemorySaver();
const forkService = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
const scenario = loadScenario("SCN-0001");
const sessionId = "record-fork";
await forkService.run(stateFromScenario(scenario, sessionId), [], sessionId);
const history = await forkService.history(sessionId);
const from = history.find(
  (item) =>
    item.path.at(-1) === "Assess" &&
    item.next.includes("Supervisor") &&
    item.last_assessment?.error_class === null &&
    (item.last_assessment?.score ?? 0) >= 0.85 &&
    item.checkpoint_id,
);
if (!from?.checkpoint_id) throw new Error("fast-mastery checkpoint not found while recording");
const forked = await forkService.fork(sessionId, from.checkpoint_id, {
  last_assessment: { error_class: "misconception" },
});
forkService.close();
if (forked.routed_to !== "Remediate") throw new Error(`fork recording routed to ${forked.routed_to}`);
console.log(`recorded ${runs.length} scenarios and the fork prompt`);
