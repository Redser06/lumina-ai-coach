import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  ArrowRight, 
  CheckCircle2, 
  Award, 
  RefreshCw, 
  Play
} from 'lucide-react';
import { CoachMessage, UserProfile } from '../../types.ts';
import { DEFAULT_PROMPT_SUGGESTIONS, generateCoachResponse, ROLE_DISPLAY_NAMES } from '../../data/coachKnowledge';
import confetti from 'canvas-confetti';

interface CoachViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onLaunchSimulator: (labId: string) => void;
  onNavigateTab: (tab: string) => void;
  initialQuery?: string | null;
  onClearInitialQuery?: () => void;
}

export const CoachView: React.FC<CoachViewProps> = ({
  userProfile,
  setUserProfile,
  onLaunchSimulator,
  onNavigateTab,
  initialQuery,
  onClearInitialQuery
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome-1',
      sender: 'coach',
      timestamp: 'Just now',
      content: `### 👋 Welcome to Lumina, your interactive AI Enablement Coach!

I am tailored specifically to empower you as a **${ROLE_DISPLAY_NAMES[userProfile.role]}**.

Instead of passive reading, you can ask me anything about:
* **Frontier Models & Reasoning Tokens**: Claude 3.7, Gemini 2.0 Flash, DeepSeek R1, GPT-4.5.
* **Agent Loops**: How ReAct cycles, tool calls, and self-healing error recovery work in practice.
* **Building State Graphs**: Multi-agent supervisors, cyclic branching, and human-in-the-loop controls.
* **MCP (Model Context Protocol)**: Exposing databases, APIs, and tools to any AI client.
* **Evals & LLM-as-a-Judge**: Replacing subjective "vibe-checks" with automated golden test suites.

*Click any question below or describe a specific problem you are trying to solve:*`,
      suggestedPrompts: DEFAULT_PROMPT_SUGGESTIONS[userProfile.role]
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (initialQuery) {
      handleSendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  const handleSendMessage = (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isThinking) return;

    const userMsg: CoachMessage = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsThinking(true);

    // Simulate coach reasoning and reply
    setTimeout(() => {
      const response = generateCoachResponse(textToSend, userProfile.role, userProfile.level);
      setMessages(prev => [...prev, response]);
      setIsThinking(false);

      // Award 25 XP for active engagement
      setUserProfile(prev => ({ ...prev, xp: prev.xp + 25 }));
    }, 600);
  };

  const handleCompleteMission = (missionId: string) => {
    if (userProfile.completedMissions.includes(missionId)) return;
    setUserProfile(prev => ({
      ...prev,
      completedMissions: [...prev.completedMissions, missionId],
      xp: prev.xp + 100
    }));
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 }
    });
  };

  const missions = [
    {
      id: 'mission-agent-loop',
      title: 'Run an Interactive Agent Loop with Error Self-Healing',
      rewardXp: 100,
      labId: 'agent_loop',
      description: 'Execute a simulated ReAct loop and inspect how reflection corrects tool errors.'
    },
    {
      id: 'mission-mcp-chain',
      title: 'Chain 3 Tools via Model Context Protocol (MCP)',
      rewardXp: 100,
      labId: 'mcp_chaining',
      description: 'Configure an MCP tool chain and inspect raw JSON-RPC 2.0 payloads.'
    },
    {
      id: 'mission-stategraph',
      title: 'Step through a Multi-Agent State Graph',
      rewardXp: 100,
      labId: 'graph_builder',
      description: 'Watch state flow through Supervisor ➔ Worker ➔ Human Approval nodes.'
    },
    {
      id: 'mission-evals',
      title: 'Run LLM-as-a-Judge on a Golden Test Case',
      rewardXp: 100,
      labId: 'evals_matrix',
      description: 'Score prompt variants on Faithfulness, Completeness, and Cost.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Interactive Coach Chat Window */}
        <div className="lg:col-span-2 flex flex-col h-[760px] bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
          
          {/* Coach Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-white to-purple-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">Lumina Interactive AI Coach</h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-xs text-slate-500">
                  Role: <span className="font-semibold text-indigo-600">{ROLE_DISPLAY_NAMES[userProfile.role]}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setMessages([messages[0]])}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xs flex items-center space-x-1"
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${
                  msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-slate-800'
                      : 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200/90 text-slate-800 space-y-3'
                  }`}
                >
                  <div className="prose prose-xs max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Deep-link Action Button if provided */}
                  {msg.actionLink && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          if (msg.actionLink?.tab === 'simulators' && msg.actionLink.subView) {
                            onLaunchSimulator(msg.actionLink.subView);
                          } else {
                            onNavigateTab(msg.actionLink!.tab);
                          }
                        }}
                        className="inline-flex items-center space-x-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                      >
                        <span>{msg.actionLink.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Suggested Prompt Chips */}
                  {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                    <div className="pt-2 space-y-1.5 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        <span>Suggested Exploration Paths:</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedPrompts.map((promptText, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(promptText)}
                            className="text-left px-2.5 py-1.5 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-200/60 transition"
                          >
                            {promptText}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center space-x-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-200" />
                  <span className="font-medium text-slate-600 pl-1">Lumina is synthesizing guidance for {ROLE_DISPLAY_NAMES[userProfile.role]}...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={`Ask Lumina about agent loops, MCP, evals, models, or prompt designs...`}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isThinking}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-md shadow-indigo-500/20 transition"
              >
                <span>Ask Coach</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Right 1 Col: Interactive Missions & Mastery Checklist */}
        <div className="space-y-6">
          
          {/* Mission Progress Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Your AI Missions</h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {userProfile.completedMissions.length}/{missions.length} Complete
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Interactive hands-on milestones to build empirical mastery. Complete them in the live simulators to earn XP and level up.
            </p>

            <div className="space-y-3">
              {missions.map((mission) => {
                const isDone = userProfile.completedMissions.includes(mission.id);
                return (
                  <div
                    key={mission.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
                        : 'bg-slate-50 border-slate-200/90 text-slate-800 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                          )}
                          <h4 className="text-xs font-bold leading-snug">{mission.title}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                          {mission.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100/80 text-indigo-700 shrink-0">
                        +{mission.rewardXp} XP
                      </span>
                    </div>

                    <div className="mt-3 pl-6 flex items-center space-x-2">
                      <button
                        onClick={() => onLaunchSimulator(mission.labId)}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-indigo-600 flex items-center space-x-1 transition shadow-2xs"
                      >
                        <Play className="w-3 h-3" />
                        <span>Launch Lab</span>
                      </button>

                      {!isDone && (
                        <button
                          onClick={() => handleCompleteMission(mission.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition shadow-2xs"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick AI Cheat Sheet Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl p-6 shadow-md space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="font-bold text-base">3 Golden Rules of Enterprise AI</h3>
            </div>
            <ul className="text-xs text-indigo-100 space-y-2 leading-relaxed">
              <li><strong>1. Deterministic over Probabilistic:</strong> Wrap LLM output in compilers, linters, or schema validators.</li>
              <li><strong>2. Use MCP for Tools:</strong> Don't write custom connectors; build one standard MCP server.</li>
              <li><strong>3. Evals over Vibe Checks:</strong> Test prompt changes against 50+ golden cases before shipping to production.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
