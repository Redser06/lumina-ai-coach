import "../runtime/network_guard.js";
import { createCheckpointer } from "../checkpoint/index.js";
import { compileCoachGraph } from "../graph/build.js";
import { initialLearnerState } from "../graph/state.js";
import { SessionService } from "../graph/session.js";
import { createRouter, useRouterForTests } from "../router/router.js";
import type { Provider } from "../router/types.js";

const provider: Provider = {
  id: "fake",
  async complete() {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    return Promise.reject(Object.assign(timeout, { tokens_in: 1_000_000, tokens_out: 0 }));
  },
};

useRouterForTests(
  createRouter({
    provider,
    prices: {
      "primary-classifier": { input_per_million: 1, output_per_million: 1 },
      "fallback-classifier": { input_per_million: 1, output_per_million: 1 },
    },
  }),
);

const sessionId = process.env.CRASH_SESSION ?? "spend-crash";
const checkpointer = createCheckpointer();
const service = new SessionService(compileCoachGraph({ checkpointer }), checkpointer);
try {
  await service.run(initialLearnerState({ learner_id: "l", session_id: sessionId, goal: "g" }), [], sessionId);
  console.error("expected a charged failure");
  process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
