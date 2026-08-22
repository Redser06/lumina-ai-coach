import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Bug, 
  Sparkles, 
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AgentStep {
  turn: number;
  type: 'thought' | 'action' | 'observation' | 'reflection' | 'final_answer';
  title: string;
  detail: string;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
    output: string;
    status: 'success' | 'error';
  };
  durationMs: number;
}

interface Scenario {
  id: string;
  name: string;
  goal: string;
  description: string;
  steps: AgentStep[];
}

export const AgentLoopSimulator: React.FC = () => {
  const scenarios: Scenario[] = [
    {
      id: 'self-heal-code',
      name: 'Autonomous Code Bugfix & Reflection',
      goal: 'Fix broken TypeScript payment calculation and verify with unit tests',
      description: 'Demonstrates how an agent encounters a compiler/test failure, reflects on the error output, and self-corrects without human intervention.',
      steps: [
        {
          turn: 1,
          type: 'thought',
          title: 'Initial Task Analysis & Planning',
          detail: 'I need to locate the broken tax calculation in `calcPaymentTotal` and run tests to verify the baseline failure.',
          durationMs: 800
        },
        {
          turn: 1,
          type: 'action',
          title: 'Tool Call: `read_file` & `run_tests`',
          detail: 'Inspecting `packages/payments/calculator.ts` and executing test runner.',
          toolCall: {
            name: 'run_tests',
            args: { testFile: 'calculator.test.ts' },
            output: 'FAIL calculator.test.ts: expected total $120.00, received $100.00 (VAT missing)',
            status: 'error'
          },
          durationMs: 1200
        },
        {
          turn: 2,
          type: 'reflection',
          title: 'Reflection on Test Failure Output',
          detail: 'The test failed because the 20% VAT modifier was omitted on EU orders. I need to edit line 42 to add `amount * (1 + vatRate)` before returning.',
          durationMs: 900
        },
        {
          turn: 2,
          type: 'action',
          title: 'Tool Call: `replace_file_content`',
          detail: 'Applying patch to `packages/payments/calculator.ts:42` with VAT multiplier.',
          toolCall: {
            name: 'replace_file_content',
            args: { path: 'calculator.ts', startLine: 42, endLine: 44 },
            output: 'SUCCESS: Modified 1 file (+3 lines, -1 line)',
            status: 'success'
          },
          durationMs: 1100
        },
        {
          turn: 3,
          type: 'action',
          title: 'Tool Call: `run_tests` (Verification)',
          detail: 'Re-running test suite to deterministically verify the patch.',
          toolCall: {
            name: 'run_tests',
            args: { testFile: 'calculator.test.ts' },
            output: 'PASS calculator.test.ts (14 tests passed, 0 failures, 100% assertions)',
            status: 'success'
          },
          durationMs: 950
        },
        {
          turn: 3,
          type: 'final_answer',
          title: 'Final Verified Resolution',
          detail: 'Bug resolved. VAT multiplier added to EU calculation. All 14 unit tests pass deterministically.',
          durationMs: 400
        }
      ]
    },
    {
      id: 'incident-triage',
      name: 'Incident Response & Multi-Tool Triage',
      goal: 'Investigate 500 error spike, check database locks, and page on-call',
      description: 'Demonstrates an autonomous agent looping between observability logs, SQL queries, and notification dispatch.',
      steps: [
        {
          turn: 1,
          type: 'thought',
          title: 'Triage Goal Decomposition',
          detail: 'Analyzing Datadog alert: 500 errors spiked on `/api/v2/checkout`. Querying Postgres locks.',
          durationMs: 700
        },
        {
          turn: 1,
          type: 'action',
          title: 'Tool Call: `postgres_query`',
          detail: 'Checking active locks on `orders` table.',
          toolCall: {
            name: 'postgres_query',
            args: { sql: 'SELECT pid, query, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state = "active";' },
            output: '1 unindexed migration lock holding table lock on `orders` (PID: 48192, Age: 4m12s)',
            status: 'success'
          },
          durationMs: 1300
        },
        {
          turn: 2,
          type: 'reflection',
          title: 'Root Cause Identified',
          detail: 'PID 48192 is blocking checkout transactions. Need to safely terminate blocking PID and notify `#incident-war-room`.',
          durationMs: 800
        },
        {
          turn: 2,
          type: 'action',
          title: 'Tool Call: `terminate_pid` & `slack_alert`',
          detail: 'Terminating lock and dispatching summary to Slack.',
          toolCall: {
            name: 'slack_post_message',
            args: { channel: '#incident-war-room', message: 'Triage Complete: Terminated blocking PID 48192. Error rate recovered to 0.01%.' },
            output: 'Message dispatched successfully (ts: 1718920192.001)',
            status: 'success'
          },
          durationMs: 1100
        },
        {
          turn: 3,
          type: 'final_answer',
          title: 'Incident Mitigated',
          detail: 'Root cause: Unindexed lock removed. Error rates returned to baseline. Incident logged in post-mortem board.',
          durationMs: 500
        }
      ]
    }
  ];

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [injectError, setInjectError] = useState(false);

  const activeScenario = scenarios[selectedScenarioIndex];
  const isFinished = currentStepIndex >= activeScenario.steps.length - 1;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && !isFinished) {
      const nextStep = activeScenario.steps[currentStepIndex + 1];
      const delay = nextStep ? nextStep.durationMs : 1000;
      timer = setTimeout(() => {
        setCurrentStepIndex(prev => {
          const next = prev + 1;
          if (next >= activeScenario.steps.length - 1) {
            setIsPlaying(false);
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
          }
          return next;
        });
      }, delay);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, isFinished, activeScenario]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
  };

  const handleStepForward = () => {
    if (!isFinished) {
      setCurrentStepIndex(prev => {
        const next = prev + 1;
        if (next >= activeScenario.steps.length - 1) {
          setIsPlaying(false);
          confetti({ particleCount: 50, spread: 50 });
        }
        return next;
      });
    }
  };

  const currentVisibleSteps = activeScenario.steps.slice(0, currentStepIndex + 1);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-8">
      
      {/* Header & Scenario Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Interactive Execution Lab</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Agent Loop & Self-Healing Simulator
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Observe the inner workings of autonomous LLM execution. Step through reasoning, tool invocation, environment feedback, and reflection cycles.
          </p>
        </div>

        {/* Scenario Switcher */}
        <div className="flex items-center space-x-2">
          {scenarios.map((sc, idx) => (
            <button
              key={sc.id}
              onClick={() => {
                setSelectedScenarioIndex(idx);
                handleReset();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                selectedScenarioIndex === idx
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Goal & Telemetry Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Agent Objective</span>
          <p className="text-xs sm:text-sm font-bold text-slate-900">{activeScenario.goal}</p>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium">Turn: </span>
            <span className="font-bold text-slate-800">
              {currentStepIndex >= 0 ? activeScenario.steps[currentStepIndex].turn : 0} / 3
            </span>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium">Tokens: </span>
            <span className="font-bold text-indigo-600">
              {currentStepIndex >= 0 ? (currentStepIndex + 1) * 340 : 0}
            </span>
          </div>
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-medium">Status: </span>
            <span className={`font-bold ${isFinished ? 'text-emerald-600' : isPlaying ? 'text-blue-600 animate-pulse' : 'text-slate-600'}`}>
              {isFinished ? 'Resolved' : isPlaying ? 'Executing Loop' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {!isPlaying ? (
            <button
              onClick={() => setIsPlaying(true)}
              disabled={isFinished}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{currentStepIndex === -1 ? 'Start Loop' : 'Resume'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsPlaying(false)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={handleStepForward}
            disabled={isPlaying || isFinished}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Step (1 Action)</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium flex items-center space-x-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Error injection toggle */}
        <label className="flex items-center space-x-2 text-xs font-medium text-slate-600 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            checked={injectError}
            onChange={(e) => setInjectError(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <Bug className="w-3.5 h-3.5 text-rose-500" />
          <span>Simulate Unexpected Environment Failure</span>
        </label>
      </div>

      {/* Live Timeline & Scratchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Step-by-Step Cycle Visualization */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>ReAct Execution Timeline</span>
          </h3>

          {currentStepIndex === -1 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Play className="w-6 h-6 ml-0.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Agent is waiting for start trigger</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click <strong>"Start Loop"</strong> or <strong>"Step (1 Action)"</strong> to watch the LLM reason, call tools, inspect observations, and self-heal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentVisibleSteps.map((step, idx) => {
                const isLatest = idx === currentStepIndex;
                const typeColors = {
                  thought: 'bg-purple-50 text-purple-700 border-purple-200',
                  action: 'bg-blue-50 text-blue-700 border-blue-200',
                  observation: 'bg-slate-100 text-slate-700 border-slate-200',
                  reflection: 'bg-amber-50 text-amber-800 border-amber-200',
                  final_answer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                };

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isLatest
                        ? 'bg-white shadow-md border-indigo-300 ring-2 ring-indigo-500/10'
                        : 'bg-slate-50/70 border-slate-200 opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${typeColors[step.type]}`}>
                          {step.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{step.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Turn {step.turn}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed pl-1">
                      {step.detail}
                    </p>

                    {/* Tool Call Payload Details if present */}
                    {step.toolCall && (
                      <div className="mt-3 bg-slate-900 text-slate-200 rounded-xl p-3 text-[11px] font-mono space-y-1.5 overflow-x-auto">
                        <div className="flex items-center justify-between text-indigo-400 font-semibold">
                          <span>$ {step.toolCall.name}</span>
                          <span className={step.toolCall.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                            {step.toolCall.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-slate-400">args: {JSON.stringify(step.toolCall.args)}</div>
                        <div className="text-slate-100 pt-1 border-t border-slate-800">➔ {step.toolCall.output}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Key Learning Takeaway */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Why This Architecture Works</span>
          </h3>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 space-y-4 shadow-md text-xs leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-bold text-amber-400 text-sm">Deterministic Ground Truth</h4>
              <p className="text-slate-300">
                Notice how the agent does not guess if its code works. It executes the real test suite (<code className="text-indigo-300">run_tests</code>) to get deterministic compiler feedback.
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800">
              <h4 className="font-bold text-teal-300 text-sm">The Reflection Superpower</h4>
              <p className="text-slate-300">
                When the test returns an error, the agent feeds that back into context. Instead of hallucinating, it adapts its strategy and fixes the specific syntax defect.
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-800">
              <h4 className="font-bold text-indigo-300 text-sm">Recursion Guardrail</h4>
              <p className="text-slate-300">
                Always enforce a hard iteration bound (e.g. <code className="text-indigo-300">maxTurns = 5</code>) to prevent runaway costs if external APIs fail permanently.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
