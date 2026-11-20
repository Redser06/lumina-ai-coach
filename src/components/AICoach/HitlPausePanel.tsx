import React, { useEffect, useState } from "react";

const API = "/api";
const SESSION_ID = `ac6-panel-${Math.random().toString(36).slice(2, 8)}`;

const PERMITTED_ACTORS: Record<string, readonly string[]> = {
  GradeDispute: ["curator", "grader"],
  SkillMapEdit: ["curator"],
  SafetyEscalation: ["safety-lead"],
};

const DECISIONS = ["accept", "reject"] as const;

function actorsFor(node: string | undefined): readonly string[] {
  return (node && PERMITTED_ACTORS[node]) || [];
}

interface PausedSession {
  status: string;
  session_id: string;
  next: string[];
  state: {
    path: string[];
    step: number;
    disputed: boolean;
    skill_map_edit: boolean;
    goal: string;
  };
}

interface CheckpointEntry {
  node: string;
  decision: string;
  actor: string;
  at: string;
}

interface CheckpointRow {
  checkpoint_id: string | null;
  state: { hitl_log: CheckpointEntry[] } | null;
}

let opening: Promise<PausedSession> | null = null;

function openPausedSession(): Promise<PausedSession> {
  if (!opening) {
    opening = fetch(`${API}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario_id: "SCN-0005", session_id: SESSION_ID, hold: true }),
    }).then(async (response) => {
      const body = (await response.json()) as PausedSession & { error?: string };
      if (!response.ok) throw new Error(body.error ?? `session open failed (${response.status})`);
      return body;
    });
  }
  return opening;
}

export const HitlPausePanel: React.FC = () => {
  const [paused, setPaused] = useState<PausedSession | null>(null);
  const [decision, setDecision] = useState("accept");
  const [actor, setActor] = useState("curator");
  const [entry, setEntry] = useState<CheckpointEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    openPausedSession()
      .then((session) => {
        if (!live) return;
        setPaused(session);
        const allowed = actorsFor(session.next[0]);
        if (allowed[0]) setActor(allowed[0]);
      })
      .catch((reason: unknown) => {
        if (live) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      live = false;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paused || busy) return;
    setBusy(true);
    setError(null);
    try {
      const node = paused.next[0];
      const response = await fetch(`${API}/sessions/${paused.session_id}/hitl`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, actor, node }),
      });
      const body = (await response.json()) as PausedSession & { error?: string };
      if (!response.ok) throw new Error(body.error ?? `decision rejected (${response.status})`);
      setPaused(body);
      const history = (await (await fetch(`${API}/sessions/${paused.session_id}/checkpoints`)).json()) as CheckpointRow[];
      const recorded = history.map((row) => row.state?.hitl_log.at(-1)).find((row) => row?.decision === decision);
      if (!recorded) throw new Error("checkpoint has no decision entry");
      setEntry(recorded);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const waitingOn = paused?.status === "interrupted" ? paused.next[0] : undefined;
  const actorChoices = actorsFor(waitingOn ?? entry?.node ?? paused?.next[0]);

  return (
    <section className="h-full overflow-y-auto bg-surface p-6 md:p-10" data-testid="hitl-panel">
      <header className="mb-6 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Human review</p>
        <h2 className="mt-1 text-2xl font-bold text-on-surface">
          {waitingOn ? `${waitingOn} is paused` : "Session continued"}
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          {waitingOn
            ? `The graph stays here until a ${actorChoices.join(" or ")} records a decision.`
            : "The decision was recorded and the graph continued."}
        </p>
      </header>

      <div className="grid max-w-3xl gap-4">
        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5" data-testid="paused-session">
          <h3 className="text-sm font-bold text-on-surface">{waitingOn ? "Paused session" : "Session"}</h3>
          {paused ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-on-surface-variant">Session</dt>
              <dd className="font-medium text-on-surface">{paused.session_id}</dd>
              <dt className="text-on-surface-variant">Status</dt>
              <dd className="font-medium text-on-surface">{paused.status}</dd>
              <dt className="text-on-surface-variant">Waiting on</dt>
              <dd className="font-medium text-on-surface">{paused.next[0] ?? "none"}</dd>
              <dt className="text-on-surface-variant">Path</dt>
              <dd className="font-medium text-on-surface">{paused.state.path.join(" → ") || "empty"}</dd>
              <dt className="text-on-surface-variant">Goal</dt>
              <dd className="font-medium text-on-surface">{paused.state.goal}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-on-surface-variant">{error ? "Could not open a session." : "Opening a paused session…"}</p>
          )}
        </article>

        <form className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5" data-testid="decision-form" onSubmit={submit}>
          <h3 className="text-sm font-bold text-on-surface">Human decision</h3>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="hitl-actor">
            Actor
          </label>
          <select
            id="hitl-actor"
            className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface"
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            disabled={Boolean(entry)}
          >
            {actorChoices.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="hitl-decision">
            Decision
          </label>
          <select
            id="hitl-decision"
            className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface"
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            disabled={Boolean(entry)}
          >
            {DECISIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
            disabled={!paused || paused.status !== "interrupted" || busy || Boolean(entry)}
          >
            {busy ? "Recording…" : "Record decision"}
          </button>
        </form>

        <article className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5" data-testid="checkpoint-entry">
          <h3 className="text-sm font-bold text-on-surface">Checkpoint entry</h3>
          {entry ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-on-surface-variant">Node</dt>
              <dd className="font-medium text-on-surface">{entry.node}</dd>
              <dt className="text-on-surface-variant">Actor</dt>
              <dd className="font-medium text-on-surface">{entry.actor}</dd>
              <dt className="text-on-surface-variant">Decision</dt>
              <dd className="font-medium text-on-surface">{entry.decision}</dd>
              <dt className="text-on-surface-variant">Recorded</dt>
              <dd className="font-medium text-on-surface">{entry.at}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-on-surface-variant">No decision recorded yet.</p>
          )}
        </article>

        {error && (
          <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
};
