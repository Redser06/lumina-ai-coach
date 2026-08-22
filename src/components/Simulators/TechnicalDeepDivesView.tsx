import React, { useState } from 'react';
import { AgentLoopSimulator } from './AgentLoopSimulator.tsx';
import { GraphVisualizer } from './GraphVisualizer.tsx';
import { MCPToolChainingLab } from './MCPToolChainingLab.tsx';
import { EvalsMatrixLab } from './EvalsMatrixLab.tsx';

interface TechnicalDeepDivesViewProps {
  activeLabId?: string | null;
  onClearActiveLab?: () => void;
}

export const TechnicalDeepDivesView: React.FC<TechnicalDeepDivesViewProps> = ({
  activeLabId,
  onClearActiveLab
}) => {
  const [selectedLab, setSelectedLab] = useState<string | null>(activeLabId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLabLaunch = (labId: string) => {
    setSelectedLab(labId);
  };

  const handleBackToGrid = () => {
    setSelectedLab(null);
    if (onClearActiveLab) onClearActiveLab();
  };

  // If a simulator is currently active, show the interactive lab header & workbench!
  if (selectedLab) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-gutter max-w-container-max mx-auto w-full pb-stack-lg space-y-6">
        <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-xl shadow-level-1 border border-outline-variant/10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToGrid}
              className="p-2 hover:bg-surface-container rounded-lg text-on-surface transition flex items-center gap-1.5 text-xs font-bold"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>All Deep-Dives</span>
            </button>
            <div className="h-4 w-px bg-outline-variant/30" />
            <div>
              <h2 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">
                {selectedLab === 'agent_loop' && '🔄 ReAct Agent Loop & Self-Healing Simulator'}
                {selectedLab === 'graph_visualizer' && '🕸️ Multi-Agent StateGraph DAG Studio'}
                {selectedLab === 'mcp_chaining' && '🔌 Model Context Protocol (MCP) Wire Lab'}
                {selectedLab === 'evals_matrix' && '📊 LLM-as-a-Judge Benchmarking Matrix'}
              </h2>
              <p className="text-xs text-on-surface-variant">Live Empirical Sandbox • Real-time State & Payloads</p>
            </div>
          </div>

          <div className="flex gap-2">
            {['agent_loop', 'graph_visualizer', 'mcp_chaining', 'evals_matrix'].map((id) => (
              <button
                key={id}
                onClick={() => setSelectedLab(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                  selectedLab === id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {id.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Live Simulator Component */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-level-1 border border-outline-variant/10">
          {selectedLab === 'agent_loop' && <AgentLoopSimulator />}
          {selectedLab === 'graph_visualizer' && <GraphVisualizer />}
          {selectedLab === 'mcp_chaining' && <MCPToolChainingLab />}
          {selectedLab === 'evals_matrix' && <EvalsMatrixLab />}
        </div>
      </div>
    );
  }

  // Otherwise, render the Stitch Bento Grid Layout!
  return (
    <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full pb-stack-lg space-y-stack-lg">
      
      {/* Header Section */}
      <header className="space-y-stack-sm pt-4 md:pt-0">
        <h2 className="font-headline-xl text-headline-lg md:text-headline-xl text-on-surface tracking-tight font-bold">
          Technical Deep-Dives
        </h2>
        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-3xl leading-relaxed">
          Master the architecture of intelligent systems. Comprehensive guides, empirical execution loops, state machines, and wire protocols for building robust AI systems.
        </p>

        <div className="flex items-center gap-4 mt-6">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search architecture patterns, loops, evals..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition text-xs sm:text-sm text-on-surface placeholder:text-outline"
            />
          </div>
        </div>
      </header>

      {/* Bento Grid Layout for Deep Dives */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. AI Agents Node */}
        <div
          onClick={() => handleLabLaunch('agent_loop')}
          className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-level-1 hover:shadow-level-2 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary/10 overflow-hidden cursor-pointer flex flex-col h-full"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-primary-container/10 rounded-lg text-primary">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                smart_toy
              </span>
            </div>
            <span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full font-label-sm text-[11px] font-bold">
              Core Concept
            </span>
          </div>

          <h3 className="font-headline-md text-base sm:text-lg text-on-surface mb-2 font-bold">
            AI Agents Architecture
          </h3>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6 flex-1 leading-relaxed">
            Designing autonomous agents, state management, and memory systems. Learn how to structure agentic workflows for complex reasoning and error recovery.
          </p>

          <div className="mt-auto flex items-center text-primary font-label-md text-xs font-bold group-hover:gap-2 transition-all">
            <span>Explore module</span>
            <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </div>
        </div>

        {/* 2. Running Loops */}
        <div
          onClick={() => handleLabLaunch('agent_loop')}
          className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-level-1 hover:shadow-level-2 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary/10 overflow-hidden cursor-pointer flex flex-col h-full"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-secondary-container/20 rounded-lg text-secondary">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                all_inclusive
              </span>
            </div>
            <span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full font-label-sm text-[11px] font-bold">
              Execution Sandbox
            </span>
          </div>

          <h3 className="font-headline-md text-base sm:text-lg text-on-surface mb-2 font-bold">
            Running Execution Loops
          </h3>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6 flex-1 leading-relaxed">
            Implementing robust ReAct loops, handling interruptions, compiler error reflection, and managing infinite loop contingencies in production environments.
          </p>

          <div className="mt-auto flex items-center text-primary font-label-md text-xs font-bold">
            <span>Launch ReAct Simulator</span>
            <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </div>
        </div>

        {/* 3. System Evals */}
        <div
          onClick={() => handleLabLaunch('evals_matrix')}
          className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-level-1 hover:shadow-level-2 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary/10 overflow-hidden cursor-pointer flex flex-col h-full"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-tertiary-container/10 rounded-lg text-tertiary">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                fact_check
              </span>
            </div>
            <span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full font-label-sm text-[11px] font-bold">
              Automated Testing
            </span>
          </div>

          <h3 className="font-headline-md text-base sm:text-lg text-on-surface mb-2 font-bold">
            System Evaluations
          </h3>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6 flex-1 leading-relaxed">
            Frameworks for benchmarking agent performance, LLM-as-a-judge rubrics, deterministic ground truth assertions, and multi-model cost/latency matrices.
          </p>

          <div className="mt-auto flex items-center text-primary font-label-md text-xs font-bold">
            <span>Open Evals Matrix</span>
            <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </div>
        </div>

        {/* 4. Building Graphs (Spans 2 columns on desktop) */}
        <div
          onClick={() => handleLabLaunch('graph_visualizer')}
          className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-level-1 hover:shadow-level-2 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary/10 overflow-hidden cursor-pointer flex flex-col h-full md:col-span-2 lg:col-span-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex flex-col md:flex-row gap-6 items-start h-full">
            <div className="flex-1 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary-container text-on-primary-container rounded-lg shadow-xs">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    hub
                  </span>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-label-sm text-[11px] font-bold">
                  Advanced State Machine
                </span>
              </div>

              <h3 className="font-headline-md text-base sm:text-lg text-on-surface mb-2 font-bold">
                Building Agentic Graphs
              </h3>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6 flex-1 leading-relaxed">
                Move beyond linear chains. Learn to construct directed cyclic graphs (LangGraph patterns) for complex multi-agent collaborations, shared state spaces, supervisor routing, and human-in-the-loop gates.
              </p>

              <div className="mt-auto flex items-center text-primary font-label-md text-xs font-bold">
                <span>Launch StateGraph Visualizer</span>
                <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Visual decorative graph */}
            <div className="hidden md:flex flex-1 items-center justify-center border border-outline-variant/30 rounded-xl h-full min-h-[180px] relative overflow-hidden bg-surface-container-low p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center bg-surface-container-lowest z-10 shadow-xs">
                  <span className="material-symbols-outlined text-primary text-xs">supervisor_account</span>
                </div>
                <div className="h-0.5 w-10 bg-outline-variant relative">
                  <div className="absolute right-0 -top-1 w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-outline-variant border-b-4 border-b-transparent" />
                </div>
                <div className="flex flex-col space-y-4">
                  <div className="w-12 h-9 rounded-lg border-2 border-secondary flex items-center justify-center bg-surface-container-lowest z-10 shadow-xs">
                    <span className="material-symbols-outlined text-secondary text-xs">code</span>
                  </div>
                  <div className="w-12 h-9 rounded-lg border-2 border-tertiary flex items-center justify-center bg-surface-container-lowest z-10 shadow-xs">
                    <span className="material-symbols-outlined text-tertiary text-xs">verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. MCP Servers */}
        <div
          onClick={() => handleLabLaunch('mcp_chaining')}
          className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-level-1 hover:shadow-level-2 hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary/10 overflow-hidden cursor-pointer flex flex-col h-full lg:col-span-1"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-on-surface text-surface rounded-lg">
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                dns
              </span>
            </div>
            <span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full font-label-sm text-[11px] font-bold">
              Open Protocol
            </span>
          </div>

          <h3 className="font-headline-md text-base sm:text-lg text-on-surface mb-2 font-bold">
            Model Context Protocol (MCP)
          </h3>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6 flex-1 leading-relaxed">
            Implementing the open Anthropic MCP standard. Connect your agents to PostgreSQL, GitHub, and Slack servers securely via JSON-RPC 2.0.
          </p>

          <div className="mt-auto flex items-center text-primary font-label-md text-xs font-bold">
            <span>Inspect Wire & Tools</span>
            <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </div>
        </div>

      </section>

    </div>
  );
};
