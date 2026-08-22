import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types.ts';
import { ROLE_DISPLAY_NAMES, generateCoachResponse } from '../../data/coachKnowledge.ts';
import confetti from 'canvas-confetti';

interface CoachDashboardViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onLaunchSimulator: (labId: string) => void;
  onNavigateTab: (tab: string) => void;
  initialQuery?: string | null;
  onClearInitialQuery?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  timestamp: string;
  text: string;
  outlineItems?: string[];
  actionButtons?: { label: string; action: () => void; isPrimary?: boolean }[];
}

export const CoachDashboardView: React.FC<CoachDashboardViewProps> = ({
  userProfile,
  setUserProfile,
  onLaunchSimulator,
  onNavigateTab,
  initialQuery,
  onClearInitialQuery
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'ai',
      timestamp: 'Just now',
      text: `Good morning. Based on your role as a **${ROLE_DISPLAY_NAMES[userProfile.role]}**, would you like to explore scalable agent architectures, practice tool chaining with MCP, or dive into automated LLM-as-a-judge evals?`,
      actionButtons: [
        { label: 'Explore Agent Loops', action: () => handleSend("Explain how agent loops recover from compiler errors"), isPrimary: true },
        { label: 'Model Context Protocol', action: () => handleSend("How does MCP connect databases to Claude & Cursor?") }
      ]
    },
    {
      id: 'm-2',
      sender: 'user',
      timestamp: '2 min ago',
      text: "Actually, let's explore building autonomous agent loops with self-correction for our microservices."
    },
    {
      id: 'm-3',
      sender: 'ai',
      timestamp: '1 min ago',
      text: "Excellent choice. Self-healing agent loops dramatically boost production reliability by pairing probabilistic LLMs with deterministic test runners. Here is our proposed 3-step mastery outline:",
      outlineItems: [
        "1. The ReAct Pattern: Interleaving Thought, Action, Tool Calling, and Observation.",
        "2. Deterministic Verification: Using compiler stdout/stderr as reflection ground truth.",
        "3. Recursion & Safety Limits: Preventing runaway token consumption."
      ],
      actionButtons: [
        { label: 'Launch Loop Simulator', action: () => onLaunchSimulator('agent_loop'), isPrimary: true },
        { label: 'Refine Framework', action: () => handleSend("Show me TypeScript code for a self-healing agent loop") }
      ]
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
      handleSend(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      const response = generateCoachResponse(query, userProfile.role, userProfile.level);
      
      const newAiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        timestamp: 'Just now',
        text: response.content.replace(/### /g, '').replace(/#### /g, ''),
        actionButtons: response.actionLink ? [
          {
            label: response.actionLink.label,
            action: () => {
              if (response.actionLink?.subView) {
                onLaunchSimulator(response.actionLink.subView);
              } else {
                onNavigateTab(response.actionLink!.tab);
              }
            },
            isPrimary: true
          }
        ] : undefined
      };

      setMessages(prev => [...prev, newAiMsg]);
      setIsThinking(false);
      setUserProfile(prev => ({ ...prev, xp: prev.xp + 25 }));
    }, 600);
  };

  const handleCompleteNextStep = (stepTitle: string) => {
    setUserProfile(prev => ({ ...prev, xp: prev.xp + 50 }));
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    handleSend(`I just completed: ${stepTitle}. What is the next exercise?`);
  };

  return (
    <div className="flex-1 h-screen flex flex-col bg-surface relative overflow-hidden">
      
      {/* Top Header */}
      <header className="p-4 md:px-gutter md:py-4 bg-surface-container-lowest border-b border-outline-variant/10 flex items-center justify-between shadow-2xs">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-0.5 font-bold">
            Collaboration Session
          </h2>
          <p className="font-body-md text-sm text-on-surface-variant">
            Tell me what you need to focus on today. Tailored for <strong className="text-primary">{ROLE_DISPLAY_NAMES[userProfile.role]}</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onNavigateTab('paths')}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="View Training Paths"
          >
            <span className="material-symbols-outlined">route</span>
          </button>
          <button 
            onClick={() => onLaunchSimulator('agent_loop')}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="Launch Simulators"
          >
            <span className="material-symbols-outlined">terminal</span>
          </button>
        </div>
      </header>

      {/* Main Canvas with Chat & Sidebar */}
      <div className="flex-1 overflow-y-auto p-4 md:p-gutter pb-36">
        <div className="max-w-container-max mx-auto flex flex-col lg:flex-row gap-stack-md h-full">
          
          {/* Main Chat Workspace */}
          <section className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-outline-variant/10 overflow-hidden min-h-[500px]">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-stack-md">
              
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 max-w-[90%] ${
                    msg.sender === 'user' ? 'self-end flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  {msg.sender === 'ai' ? (
                    <div className="w-8 h-8 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center text-on-primary-container mt-1 shadow-xs">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        psychology
                      </span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center text-on-surface font-bold text-xs mt-1 border border-outline-variant/30">
                      {userProfile.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Message Bubble */}
                  {msg.sender === 'ai' ? (
                    <div className="ai-border-gradient max-w-full">
                      <div className="bg-surface-container-lowest rounded-[calc(0.75rem-1px)] p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                        <p className="font-body-md text-sm sm:text-base text-on-surface whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>

                        {/* Outline Box if present */}
                        {msg.outlineItems && (
                          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20 space-y-2">
                            <ol className="space-y-1.5 font-body-md text-xs sm:text-sm text-on-surface-variant font-medium">
                              {msg.outlineItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-primary font-bold">•</span>
                                  <span className="text-on-surface">{item}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {msg.actionButtons && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {msg.actionButtons.map((btn, idx) => (
                              <button
                                key={idx}
                                onClick={btn.action}
                                className={`px-4 py-2 rounded-lg font-label-sm text-xs transition-all shadow-xs ${
                                  btn.isPrimary
                                    ? 'bg-primary text-on-primary hover:bg-primary/90 font-bold'
                                    : 'bg-surface-container-high text-on-surface hover:bg-surface-dim font-medium'
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-container p-4 rounded-xl shadow-xs rounded-tr-sm text-on-surface text-sm sm:text-base font-body-md max-w-lg">
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking Indicator */}
              {isThinking && (
                <div className="flex gap-4 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center text-on-primary-container mt-1">
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/20 text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="font-semibold text-primary">Lumina is synthesizing strategic guidance...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          </section>

          {/* Context & Focus Sidebar */}
          <aside className="w-full lg:w-80 flex flex-col gap-stack-md overflow-y-auto pb-6">
            
            {/* Current Focus Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-outline-variant/10 hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)] hover:border-primary/20 transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-secondary text-[20px]">track_changes</span>
                <h3 className="font-label-md text-xs text-on-surface font-bold uppercase tracking-wider">Current Focus</h3>
              </div>
              <h4 className="font-headline-md text-base text-on-surface mb-1 font-bold">
                {userProfile.role === 'software_engineer' ? 'Agentic Loops & Self-Correction' : 'Enterprise AI Tool Chaining'}
              </h4>
              <p className="font-body-md text-xs text-on-surface-variant mb-4 leading-relaxed">
                Empirical ground truth and tool integrations for production reliability.
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between font-label-sm text-xs">
                  <span className="text-on-surface-variant">Skill Mastery</span>
                  <span className="text-secondary font-bold">65%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>

            {/* Recommended Next Steps */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-outline-variant/10 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
                <h3 className="font-label-md text-xs text-on-surface font-bold uppercase tracking-wider">Next Steps</h3>
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => onLaunchSimulator('agent_loop')}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors text-left group border border-transparent hover:border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mt-0.5 text-[20px]">
                    terminal
                  </span>
                  <div>
                    <p className="font-label-md text-xs text-on-surface font-bold group-hover:text-primary transition-colors">
                      Run ReAct Loop Simulation
                    </p>
                    <p className="font-label-sm text-[11px] text-on-surface-variant">5 min interactive exercise</p>
                  </div>
                </button>

                <button
                  onClick={() => onLaunchSimulator('mcp_chaining')}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors text-left group border border-transparent hover:border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mt-0.5 text-[20px]">
                    dns
                  </span>
                  <div>
                    <p className="font-label-md text-xs text-on-surface font-bold group-hover:text-primary transition-colors">
                      Inspect MCP JSON-RPC Wire
                    </p>
                    <p className="font-label-sm text-[11px] text-on-surface-variant">Tool chaining workbench</p>
                  </div>
                </button>

                <button
                  onClick={() => handleCompleteNextStep("Reviewing Evals Matrix on Golden Datasets")}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors text-left group border border-transparent hover:border-outline-variant/20"
                >
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary mt-0.5 text-[20px]">
                    fact_check
                  </span>
                  <div>
                    <p className="font-label-md text-xs text-on-surface font-bold group-hover:text-primary transition-colors">
                      Run LLM-as-a-Judge Eval
                    </p>
                    <p className="font-label-sm text-[11px] text-on-surface-variant">+50 XP Milestone check</p>
                  </div>
                </button>
              </div>
            </div>

          </aside>

        </div>
      </div>

      {/* Floating Input Area (Fixed to bottom of main area) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:px-gutter md:pb-6 bg-gradient-to-t from-surface via-surface/90 to-transparent pt-8 pointer-events-none z-30">
        <div className="max-w-container-max mx-auto flex gap-stack-md pointer-events-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex-1 bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgba(15,23,42,0.1)] border border-outline-variant/20 p-2 flex items-center gap-2 focus-within:border-primary focus-within:shadow-[0_8px_30px_rgba(0,65,200,0.15)] transition-all bg-white/90 backdrop-blur-md"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Tell the solution what you need... (e.g. 'How do I build an agent loop that self-heals?')"
              className="w-full bg-transparent border-none focus:ring-0 font-body-md text-xs sm:text-sm text-on-surface px-3 py-2 outline-none placeholder:text-outline"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="p-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm shrink-0 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>

          {/* Spacer for desktop sidebar */}
          <div className="w-80 hidden lg:block" />
        </div>
      </div>

    </div>
  );
};
