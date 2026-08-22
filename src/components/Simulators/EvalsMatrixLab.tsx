import React, { useState } from 'react';
import { 
  BarChart3, 
  Play, 
  Sparkles, 
  Scale, 
  DollarSign, 
  Clock, 
  ShieldCheck,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CandidateModel {
  id: string;
  name: string;
  strategy: string;
  outputSample: string;
  scores: {
    faithfulness: number;
    completeness: number;
    actionability: number;
    hallucinationRisk: 'None' | 'Low' | 'High';
  };
  metrics: {
    latencySec: number;
    costPer1kRuns: number;
    tokenCount: number;
  };
  judgeCritique: string;
}

export const EvalsMatrixLab: React.FC = () => {
  const [isRunningEval, setIsRunningEval] = useState(false);

  const candidates: CandidateModel[] = [
    {
      id: 'cand-gemini-standard',
      name: 'Gemini 2.0 Flash (Standard 1-Shot)',
      strategy: 'Direct prompt without thinking tokens or strict validation rubric',
      outputSample: 'Q3 revenue rose 14% to $88.2B, driven by Cloud growth of 29%. Operating margin expanded by 300bps. Guidance for Q4 is strong with expected double-digit CapEx investments.',
      scores: {
        faithfulness: 4.2,
        completeness: 4.0,
        actionability: 3.8,
        hallucinationRisk: 'Low'
      },
      metrics: {
        latencySec: 0.65,
        costPer1kRuns: 0.12,
        tokenCount: 420
      },
      judgeCritique: 'Fast and concise. Accurately captured headline figures, but omitted specific segment margin breakdowns.'
    },
    {
      id: 'cand-claude-reasoning',
      name: 'Claude 3.7 Sonnet (Reasoning Mode 8k)',
      strategy: 'Hybrid thinking tokens with strict zero-hallucination XML grounding constraints',
      outputSample: '1. Revenue: $88.27B (+15.1% YoY vs $76.69B in Q3 prior).\n2. Google Cloud: $11.35B (+34.9% YoY) with Operating Income of $1.95B (vs $266M prior).\n3. CapEx: $13.0B driven by technical infrastructure.\n4. Risk Factors: Foreign currency headwind estimated at ~120bps.',
      scores: {
        faithfulness: 5.0,
        completeness: 4.9,
        actionability: 4.8,
        hallucinationRisk: 'None'
      },
      metrics: {
        latencySec: 3.2,
        costPer1kRuns: 3.40,
        tokenCount: 3200
      },
      judgeCritique: 'Flawless mathematical verification. Zero hallucinated claims. Thinking tokens successfully reconciled currency headwind notes.'
    },
    {
      id: 'cand-naive-prompt',
      name: 'Generic 7B Open Model (Naive Prompt)',
      strategy: 'Basic prompt without system instructions or grounding',
      outputSample: 'The company had an amazing quarter making almost 90 billion dollars! They expect to double their AI profit next quarter and beat all competitors.',
      scores: {
        faithfulness: 2.1,
        completeness: 2.5,
        actionability: 1.8,
        hallucinationRisk: 'High'
      },
      metrics: {
        latencySec: 1.1,
        costPer1kRuns: 0.08,
        tokenCount: 280
      },
      judgeCritique: 'Severe hallucination: "double AI profit" is not in the source transcript. Subjective language violates corporate reporting standards.'
    }
  ];

  const handleRunEvalSuite = () => {
    setIsRunningEval(true);

    setTimeout(() => {
      setIsRunningEval(false);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }, 1200);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Automated AI Quality Assurance</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            LLM-as-a-Judge & Evals Matrix Playground
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Replace subjective "vibe-checks" with empirical benchmarks. Score models and prompt variations on Faithfulness, Completeness, Latency, and Cost across golden test datasets.
          </p>
        </div>

        <button
          onClick={handleRunEvalSuite}
          disabled={isRunningEval}
          className="self-start lg:self-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition"
        >
          {isRunningEval ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{isRunningEval ? 'Evaluating Test Cases...' : 'Run Automated Eval Suite'}</span>
        </button>
      </div>

      {/* Golden Dataset Test Case Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>Golden Test Case #48: Complex Financial Earnings Release Extraction</span>
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
            Judge Model: Claude 3.7 Sonnet (Impartial)
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Ground Truth Context:</strong> "Alphabet Inc. announced Q3 consolidated revenue of $88,268M (+15.1% YoY). Google Cloud revenue was $11,353M with operating income of $1,947M. CapEx was $13,061M. Currency headwinds impacted revenue by approximately 1.2%."
        </p>
      </div>

      {/* Comparative Model Matrix Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {candidates.map((cand) => (
          <div
            key={cand.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-card-hover transition p-5 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{cand.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cand.scores.hallucinationRisk === 'None' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    cand.scores.hallucinationRisk === 'Low' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {cand.scores.hallucinationRisk} Hallucination
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{cand.strategy}</p>
              </div>

              {/* Output snippet */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                {cand.outputSample}
              </div>

              {/* Metric Bars */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Faithfulness Score</span>
                    <span className="font-bold text-slate-900">{cand.scores.faithfulness} / 5.0</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cand.scores.faithfulness >= 4.5 ? 'bg-emerald-500' :
                        cand.scores.faithfulness >= 3.5 ? 'bg-blue-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${(cand.scores.faithfulness / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Completeness Score</span>
                    <span className="font-bold text-slate-900">{cand.scores.completeness} / 5.0</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(cand.scores.completeness / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Judge Feedback */}
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                <span className="font-bold uppercase text-[10px] text-amber-700 flex items-center space-x-1">
                  <Award className="w-3 h-3" />
                  <span>LLM Judge Verdict</span>
                </span>
                <p>{cand.judgeCritique}</p>
              </div>

            </div>

            {/* Cost & Latency Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{cand.metrics.latencySec}s</span>
              </span>
              <span className="flex items-center space-x-1 font-semibold text-slate-700">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>${cand.metrics.costPer1kRuns} / 1k</span>
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* Production CI/CD Recommendation */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 space-y-4 shadow-md">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm sm:text-base font-bold">Enterprise Best Practice: The Hybrid Evals Tier</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Notice the clear trade-off: **Claude 3.7 Reasoning Mode** achieved 100% mathematical accuracy on complex currency edge cases with zero hallucination, but has higher latency. **Gemini 2.0 Flash** executed at 0.65s and 1/25th the cost.
          <br /><br />
          <strong>Optimal Architecture:</strong> Use fast models (Gemini 2.0 Flash) for standard worker loops, and invoke Reasoning Models (Claude 3.7) for complex supervisor planning, multi-file code synthesis, and the LLM-as-a-Judge evaluation gate in CI/CD.
        </p>
      </div>

    </div>
  );
};
