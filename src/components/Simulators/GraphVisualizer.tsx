import React, { useState } from 'react';
import { 
  Network, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  UserCheck, 
  ArrowRight, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  FileCode2,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const GraphVisualizer: React.FC = () => {
  const [currentNodeId, setCurrentNodeId] = useState<string>('start');
  const [testResult, setTestResult] = useState<'pass' | 'fail'>('fail');
  const [revisionCount, setRevisionCount] = useState<number>(0);

  const [graphState, setGraphState] = useState({
    userQuery: 'Build an automated Slack billing webhook handler with rate limiting',
    supervisorPlan: '',
    researchNotes: '',
    codeArtifact: '',
    linterStatus: 'Not Run',
    testsPassed: false,
    humanSignoff: false,
    revisionCount: 0
  });

  const handleStepTo = (nodeId: string) => {
    setCurrentNodeId(nodeId);

    if (nodeId === 'supervisor') {
      setGraphState(prev => ({
        ...prev,
        supervisorPlan: '1. Research Stripe signature verification\n2. Implement Express route\n3. Add Redis token bucket limiter'
      }));
    } else if (nodeId === 'researcher') {
      setGraphState(prev => ({
        ...prev,
        researchNotes: 'Found Stripe webhook header `stripe-signature`. Redis `RATELIMIT` sliding window recommended.'
      }));
    } else if (nodeId === 'coder') {
      setGraphState(prev => ({
        ...prev,
        codeArtifact: `app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {\n  const sig = req.headers['stripe-signature'];\n  // Webhook handler logic\n});`,
        revisionCount: prev.revisionCount + 1
      }));
    } else if (nodeId === 'validator') {
      if (revisionCount === 0 && testResult === 'fail') {
        setGraphState(prev => ({
          ...prev,
          linterStatus: 'FAILED: Missing Redis rate-limiting middleware in route handler',
          testsPassed: false
        }));
      } else {
        setGraphState(prev => ({
          ...prev,
          linterStatus: 'PASSED (3/3 tests passed, 0 lint errors)',
          testsPassed: true
        }));
      }
    } else if (nodeId === 'deploy_end') {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  const handleResetGraph = () => {
    setCurrentNodeId('start');
    setRevisionCount(0);
    setTestResult('fail');
    setGraphState({
      userQuery: 'Build an automated Slack billing webhook handler with rate limiting',
      supervisorPlan: '',
      researchNotes: '',
      codeArtifact: '',
      linterStatus: 'Not Run',
      testsPassed: false,
      humanSignoff: false,
      revisionCount: 0
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
            <Network className="w-3.5 h-3.5" />
            <span>StateGraph Architecture Studio</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Multi-Agent State Graph & Cyclic Orchestration
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Experience why linear chains fail on complex work. Watch how state machines route between specialized nodes, loop on test failures, and enforce Human-in-the-Loop checkpoints.
          </p>
        </div>

        <button
          onClick={handleResetGraph}
          className="self-start lg:self-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Graph</span>
        </button>
      </div>

      {/* Interactive Visual Graph Canvas */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>Active Orchestration Graph</span>
          </span>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Current Node:</span>
            <span className="font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {currentNodeId}
            </span>
          </div>
        </div>

        {/* Node Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center text-center">
          
          {/* Node 1: Start / User */}
          <div 
            onClick={() => handleStepTo('supervisor')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentNodeId === 'start'
                ? 'bg-white shadow-md border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-white/80 border-slate-200 opacity-90'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center mx-auto mb-2">
              <Play className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">User Query</h4>
            <p className="text-[10px] text-slate-500">Initial Goal</p>
          </div>

          {/* Node 2: Supervisor */}
          <div 
            onClick={() => handleStepTo('researcher')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentNodeId === 'supervisor'
                ? 'bg-purple-50 shadow-md border-purple-400 ring-2 ring-purple-500/20'
                : 'bg-white/80 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center mx-auto mb-2">
              <Network className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Supervisor</h4>
            <p className="text-[10px] text-purple-600 font-semibold">Router Agent</p>
          </div>

          {/* Node 3: Researcher */}
          <div 
            onClick={() => handleStepTo('coder')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentNodeId === 'researcher'
                ? 'bg-blue-50 shadow-md border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-white/80 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-2">
              <Search className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Researcher</h4>
            <p className="text-[10px] text-blue-600 font-semibold">Context Docs</p>
          </div>

          {/* Node 4: Coder */}
          <div 
            onClick={() => handleStepTo('validator')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentNodeId === 'coder'
                ? 'bg-indigo-50 shadow-md border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-white/80 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2">
              <FileCode2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Coder Agent</h4>
            <p className="text-[10px] text-indigo-600 font-semibold">Generator</p>
          </div>

          {/* Node 5: Validator */}
          <div 
            onClick={() => {
              if (graphState.testsPassed) {
                handleStepTo('human_gate');
              } else {
                handleStepTo('coder'); // Loop back!
              }
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentNodeId === 'validator'
                ? 'bg-amber-50 shadow-md border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-white/80 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Validator</h4>
            <p className="text-[10px] text-amber-700 font-semibold">Tests & Linters</p>
          </div>

          {/* Node 6: Human Gate / Deploy */}
          <div 
            onClick={() => handleStepTo('deploy_end')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentNodeId === 'human_gate' || currentNodeId === 'deploy_end'
                ? 'bg-emerald-50 shadow-md border-emerald-400 ring-2 ring-emerald-500/20'
                : 'bg-white/80 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Human Signoff</h4>
            <p className="text-[10px] text-emerald-700 font-semibold">Approval Gate</p>
          </div>

        </div>

        {/* Action Controls for Current Node */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Next Step Action</span>
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {currentNodeId === 'start' && 'Start graph: Dispatch prompt to Supervisor Router.'}
              {currentNodeId === 'supervisor' && 'Supervisor decomposed task into 2 sub-goals. Dispatching to Researcher.'}
              {currentNodeId === 'researcher' && 'Research notes gathered. Transitioning to Coder Agent.'}
              {currentNodeId === 'coder' && 'Code generated. Forwarding to deterministic Validator Node for compilation.'}
              {currentNodeId === 'validator' && (
                graphState.testsPassed
                  ? 'Tests passed! Conditional Edge routes to Human Signoff Gate.'
                  : 'Tests failed! Conditional Edge routes back to Coder Agent for self-correction with compiler error.'
              )}
              {currentNodeId === 'human_gate' && 'Execution paused at checkpoint. Waiting for Human Operator approval.'}
              {currentNodeId === 'deploy_end' && 'Workflow successfully finished! Changes deployed safely.'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {currentNodeId === 'start' && (
              <button
                onClick={() => handleStepTo('supervisor')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <span>Dispatch to Supervisor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentNodeId === 'supervisor' && (
              <button
                onClick={() => handleStepTo('researcher')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <span>Run Researcher Node</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentNodeId === 'researcher' && (
              <button
                onClick={() => handleStepTo('coder')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <span>Run Coder Node</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentNodeId === 'coder' && (
              <button
                onClick={() => handleStepTo('validator')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <span>Execute Validator Node</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentNodeId === 'validator' && (
              <div className="flex items-center space-x-2">
                {!graphState.testsPassed ? (
                  <button
                    onClick={() => {
                      setTestResult('pass');
                      setRevisionCount(1);
                      handleStepTo('coder');
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Trigger Cyclic Loop-Back to Coder</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStepTo('human_gate')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                  >
                    <span>Pass Validation & Open Human Gate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {currentNodeId === 'human_gate' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleStepTo('deploy_end');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Deploy</span>
                </button>
                <button
                  onClick={() => {
                    handleStepTo('coder');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Reject / Request Changes
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Global State Inspector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Shared Graph State (`AgentState` Object)</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Typed LangGraph Reducer Channel</span>
        </div>

        <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 font-mono text-xs overflow-x-auto shadow-inner space-y-2">
          <div className="text-slate-400">// Persistent state passed across all graph edges:</div>
          <pre className="text-emerald-400">{JSON.stringify(graphState, null, 2)}</pre>
        </div>
      </div>

    </div>
  );
};
