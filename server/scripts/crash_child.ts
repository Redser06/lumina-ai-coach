import { createCheckpointer } from "../checkpoint/index.js";
import { loadScenario, stateFromScenario } from "../evals/scenarios.js";
import { compileCoachGraph } from "../graph/build.js";
import { SessionService } from "../graph/session.js";

const scenario = loadScenario(process.env.CRASH_SCENARIO ?? "SCN-0001");
const sessionId = process.env.CRASH_SESSION ?? "crash-session";
const checkpointer = createCheckpointer();
const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
await service.run(stateFromScenario(scenario, sessionId), scenario.hitl ?? [], sessionId);
console.error("crash did not fire");
process.exit(1);
