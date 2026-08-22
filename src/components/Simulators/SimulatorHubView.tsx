import React, { useState } from 'react';
import { 
  RotateCw, 
  Network, 
  Cpu, 
  BarChart3
} from 'lucide-react';
import { AgentLoopSimulator } from './AgentLoopSimulator';
import { GraphVisualizer } from './GraphVisualizer';
import { MCPToolChainingLab } from './MCPToolChainingLab';
import { EvalsMatrixLab } from './EvalsMatrixLab';

interface SimulatorHubViewProps {
  initialLab?: string;
}

export const SimulatorHubView: React.FC<SimulatorHubViewProps> = ({ initialLab = 'agent_loop' }) => {
  const [activeLab, setActiveLab] = useState<string>(initialLab);

  const labTabs = [
    { id: 'agent_loop', label: 'Agent Loop & Self-Healing', icon: RotateCw, badge: 'ReAct Cycle' },
    { id: 'graph_builder', label: 'Multi-Agent StateGraph', icon: Network, badge: 'LangGraph' },
    { id: 'mcp_chaining', label: 'MCP Protocol & Tool Chaining', icon: Cpu, badge: 'JSON-RPC' },
    { id: 'evals_matrix', label: 'LLM-as-a-Judge & Evals', icon: BarChart3, badge: 'CI/CD Evals' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Tab Selector Header */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        {labTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeLab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveLab(tab.id)}
              className={`flex-1 min-w-[200px] flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
              }`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Lab Component */}
      <div className="animate-in fade-in duration-200">
        {activeLab === 'agent_loop' && <AgentLoopSimulator />}
        {activeLab === 'graph_builder' && <GraphVisualizer />}
        {activeLab === 'mcp_chaining' && <MCPToolChainingLab />}
        {activeLab === 'evals_matrix' && <EvalsMatrixLab />}
      </div>

    </div>
  );
};
