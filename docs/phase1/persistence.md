# JSONL node log and replay/fork spend

Phase 0 behaviour, written down for P1-H3. The code is `server/telemetry/node_log.ts`, `server/graph/session.ts`, and `server/checkpoint/cost.ts`.

## JSONL loss window

A node log is appended in memory first. It is written to `reports/node-log.jsonl` (or `NODE_LOG_PATH`) only from `stampCheckpoint`, and only when the row is complete: a checkpoint id, an edge, a model name, and finite tokens, cost, and latency.

`stampCheckpoint` runs after the node has returned and the session has read that checkpoint. Until then the row lives in the process. A crash in that window drops it. `logsForSession` prefers memory, so a live process can still return rows that were never flushed. After a restart, only flushed lines remain.

`attachEdge` fills the latest open row for that node. An earlier row for the same node, such as a failed model attempt that fell through to the next model, never receives an edge. That row is never flushed. It is visible on the API only while the process is alive.

## Replay spend

Replay reads the learner at the chosen checkpoint, including `cost_usd_session` as it was then, and runs that state on a new thread. It does not add spend that happened on the parent after that checkpoint. Replaying an early checkpoint cannot trip the cap because of later spend. Replay forces the recorded provider, so it does not call a live model and it does not use a test router override.

## Fork spend

A fork copies the checkpoint's learner onto a new thread. The patch allowlist is `fatigue`, `last_assessment`, `mastery`, `disputed`, `skill_map_edit`, and `goal`. Spend, the budget, step, path, and edges are rejected. The child keeps the checkpoint's `cost_usd_session` and spends onward from there. The parent thread and its checkpoint id stay as they were. The fork runs one step, until the next interrupt.

## Charged failure

If a model call throws after it has been charged, the session writes that `sessionSpentUsd` onto the current checkpoint's `cost_usd_session`. Step, path, edges, and `next` stay put, so the same node runs again. Resume sees the written spend. A later call can hit the cap before another model request.
