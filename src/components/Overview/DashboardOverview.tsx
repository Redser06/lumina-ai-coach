import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  RotateCw, 
  Network, 
  Cpu, 
  BarChart3, 
  Award, 
  Send, 
  Flame,
  UserCheck
} from 'lucide-react';
import { UserProfile } from '../../types.ts';
import { ROLE_DISPLAY_NAMES, DEFAULT_PROMPT_SUGGESTIONS } from '../../data/coachKnowledge';
import { AI_NEWS_ITEMS } from '../../data/newsData';

interface DashboardOverviewProps {
  userProfile: UserProfile;
  onNavigateTab: (tab: string) => void;
  onLaunchSimulator: (labId: string) => void;
  onOpenDiagnostic: () => void;
  onQuickCoachQuery: (query: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  userProfile,
  onNavigateTab,
  onLaunchSimulator,
  onOpenDiagnostic,
  onQuickCoachQuery
}) => {
  const [quickQuery, setQuickQuery] = useState('');

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    onQuickCoachQuery(quickQuery);
  };

  const levelProgress = {
    novice: { title: 'AI Explorer', targetXp: 300, pct: Math.min(100, Math.round((userProfile.xp / 300) * 100)) },
    prompt_practitioner: { title: 'Prompt Practitioner', targetXp: 600, pct: Math.min(100, Math.round((userProfile.xp / 600) * 100)) },
    agent_builder: { title: 'Agent Builder', targetXp: 1000, pct: Math.min(100, Math.round((userProfile.xp / 1000) * 100)) },
    systems_architect: { title: 'Systems Architect', targetXp: 2000, pct: 100 },
  }[userProfile.level];

  const breakingNews = AI_NEWS_ITEMS[0];

  const labs = [
    {
      id: 'agent_loop',
      title: 'Agent Loop & Self-Healing Lab',
      desc: 'Step through ReAct reasoning, tool calling, and compiler error reflection.',
      icon: RotateCw,
      color: 'from-blue-500 to-indigo-600',
      tag: 'Core Concept'
    },
    {
      id: 'graph_builder',
      title: 'Multi-Agent StateGraph Studio',
      desc: 'Design cyclic state machines, supervisor routers, and human gates.',
      icon: Network,
      color: 'from-purple-500 to-indigo-600',
      tag: 'Architecture'
    },
    {
      id: 'mcp_chaining',
      title: 'MCP Protocol & Tool Chaining',
      desc: 'Connect databases, GitHub, and Slack via open JSON-RPC standard.',
      icon: Cpu,
      color: 'from-teal-500 to-emerald-600',
      tag: 'Open Standard'
    },
    {
      id: 'evals_matrix',
      title: 'LLM-as-a-Judge & Evals Matrix',
      desc: 'Replace vibe-checks with automated golden dataset scoring.',
      icon: BarChart3,
      color: 'from-amber-500 to-orange-600',
      tag: 'Quality Gate'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Welcome & Interactive Coach Input */}
      <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-[450px] h-[450px] bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Empowerment Companion</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Empowering Your AI Journey
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
              Welcome! You are currently exploring as a <strong className="text-white underline decoration-teal-300 font-bold">{ROLE_DISPLAY_NAMES[userProfile.role]}</strong>. Lumina provides interactive simulators, empirical evals, and a personalized AI Coach to help you build real mastery.
            </p>
          </div>

          {/* Natural Language Prompt Bar */}
          <form
            onSubmit={handleQuickSubmit}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2 border border-white/40"
          >
            <div className="pl-3 text-indigo-600">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Tell Lumina what you need (e.g. How do I build an MCP server for Slack?)"
              className="flex-1 bg-transparent border-none text-slate-800 text-xs sm:text-sm font-medium focus:outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition shrink-0"
            >
              <span>Ask Coach</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Prompt Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-indigo-200">Recommended for your role:</span>
            {DEFAULT_PROMPT_SUGGESTIONS[userProfile.role].slice(0, 2).map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => onQuickCoachQuery(promptText)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium rounded-lg backdrop-blur-xs transition border border-white/15"
              >
                "{promptText.slice(0, 50)}..."
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Progress & Radar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: User Skill Progress */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Ability Tier</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {levelProgress.title}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-2xl font-extrabold text-slate-900">{userProfile.xp} XP</h3>
              <span className="text-xs text-slate-400">/ {levelProgress.targetXp} XP to Next Tier</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${levelProgress.pct}%` }}
              />
            </div>
          </div>

          <button
            onClick={onOpenDiagnostic}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Retake AI Baseline Diagnostic</span>
          </button>
        </div>

        {/* Card 2: Breaking AI Radar Highlight */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
                <span>Trending AI Breakthrough</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                {breakingNews.badgeText}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 line-clamp-2">
              {breakingNews.title}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-2">
              {breakingNews.summary}
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('news')}
            className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <span>Read Role Impact & Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Interactive Mission Quick Tracker */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mission Roadmap</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5" />
                <span>{userProfile.completedMissions.length} / 4 Done</span>
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              {userProfile.completedMissions.length === 4 ? 'All Missions Completed!' : 'Active: Run Agent Loop & Self-Healing'}
            </h4>
            <p className="text-xs text-slate-500">
              Interactive hands-on sandbox missions earn XP and badges.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('coach')}
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <span>Open Coach Mission Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 4 Interactive Simulators Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Interactive AI Engineering Sandboxes</h2>
            <p className="text-xs text-slate-500">Learn by doing: test real agent loops, graphs, MCP tool chains, and evals.</p>
          </div>
          <button
            onClick={() => onNavigateTab('simulators')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
          >
            <span>View All Labs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {labs.map((lab) => {
            const Icon = lab.icon;
            return (
              <div
                key={lab.id}
                onClick={() => onLaunchSimulator(lab.id)}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-card-hover hover:border-indigo-300 transition-all duration-200 p-6 flex flex-col justify-between space-y-4 cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${lab.color} text-white flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {lab.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                    {lab.title}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {lab.desc}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition">
                  <span>Launch Simulator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
