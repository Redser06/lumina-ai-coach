# Phase 0 proof summary

Artifact `phase0-reports` is kept for 90 days (`retention-days: 90` on the upload step). This table is the copy that stays in git.

| AC | SHA | Run | Key fields |
| --- | --- | --- | --- |
| AC-1 | `a0e41fae3c8cb8a5e1a827419d20042355065498` | https://github.com/Redser06/lumina-ai-coach/actions/runs/38187828688 | fixture `GRAPH-SPEC-coach-graph@2.0.0`, sha256 `cd3f0e050383937c5e8e1f17f37573cb054d38b3d52fe04e981f7a5261aeb99e` |
| AC-3 | `a0e41fae3c8cb8a5e1a827419d20042355065498` | https://github.com/Redser06/lumina-ai-coach/actions/runs/38187828688 | `node_coverage` 1, `edge_coverage` 1 |
| AC-4 | `a0e41fae3c8cb8a5e1a827419d20042355065498` | https://github.com/Redser06/lumina-ai-coach/actions/runs/38187828688 | `resumed_node` Practice, `identical` true, `routed_to` Remediate, `edge_taken` e-sup-misconception |
| AC-7 | `a0e41fae3c8cb8a5e1a827419d20042355065498` | https://github.com/Redser06/lumina-ai-coach/actions/runs/38187828688 | 25 log lines, 4 with `fallback_from` `primary-tutor` (Teach, Practice, Remediate, Practice). Each line has `model`, `tokens_in`, `tokens_out`, `cost_usd`, `latency_ms` |
| AC-8 | red `044b66767bac8d7525c68ff9f7ae3d57ac6ccd99`, green `4c92c2690d881e5a8580888ecd505e9c960411ad` | red https://github.com/Redser06/lumina-ai-coach/actions/runs/38184990340, green https://github.com/Redser06/lumina-ai-coach/actions/runs/38185076053 | Red: E3 and E6 both ran and failed (node coverage 0.929, edge coverage 0.906, eval `ok: false`, path failure SCN-0001). Green: E2, E3, and E6 succeeded |

Demo PR https://github.com/Redser06/lumina-ai-coach/pull/3 stays open.
