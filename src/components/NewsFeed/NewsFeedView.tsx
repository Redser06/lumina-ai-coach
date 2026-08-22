import React, { useState } from 'react';
import { UserRole, NewsItem } from '../../types.ts';
import { AI_NEWS_ITEMS } from '../../data/newsData.ts';
import { ROLE_DISPLAY_NAMES } from '../../data/coachKnowledge.ts';

interface NewsFeedViewProps {
  userRole: UserRole;
  onSelectActionLink?: (tab: string, subView?: string) => void;
}

export const NewsFeedView: React.FC<NewsFeedViewProps> = ({
  userRole,
  onSelectActionLink
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredNews = selectedCategory === 'all'
    ? AI_NEWS_ITEMS
    : AI_NEWS_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <div className="flex-1 overflow-y-auto pt-4 md:pt-margin-desktop px-margin-mobile md:px-gutter max-w-container-max mx-auto w-full pb-stack-lg">
      
      {/* Header */}
      <header className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-headline-xl text-headline-lg md:text-headline-xl text-on-surface mb-2 font-bold tracking-tight">
            Latest in AI
          </h1>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant max-w-2xl">
            Curated insights, breakthroughs, and analysis from the frontier of artificial intelligence, tailored for <strong className="text-primary">{ROLE_DISPLAY_NAMES[userRole]}</strong>.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {['all', 'models', 'agents', 'mcp', 'evals'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-label-sm text-xs capitalize transition ${
                selectedCategory === cat
                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {cat === 'all' ? 'All Intelligence' : cat}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        
        {/* Main News Feed Column */}
        <div className="lg:col-span-8 flex flex-col gap-stack-md">
          
          {/* Featured Bento Article */}
          <article className="bg-surface-container-lowest rounded-xl shadow-level-1 p-6 md:p-8 card-hover-effect flex flex-col gap-4 relative overflow-hidden group border border-outline-variant/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary-container to-secondary" />
            
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                <span className="chip px-3 py-1 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider">
                  Breakthrough
                </span>
                <span className="chip px-3 py-1 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider">
                  Reasoning LLMs
                </span>
              </div>
              <span className="font-label-sm text-xs text-on-surface-variant">2h ago</span>
            </div>

            <div className="grid md:grid-cols-5 gap-6 mt-1">
              <div className="md:col-span-3 flex flex-col justify-between">
                <div>
                  <h2 
                    onClick={() => setSelectedArticle(AI_NEWS_ITEMS[0])}
                    className="font-headline-md text-lg sm:text-xl text-on-surface mb-3 group-hover:text-primary transition-colors cursor-pointer font-bold leading-snug"
                  >
                    Claude 3.7 Sonnet & Hybrid Reasoning: Granular Thinking Budgets
                  </h2>
                  <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-3 leading-relaxed">
                    Anthropic introduces dynamic reasoning controls allowing developers to allocate exact reasoning token budgets (1k to 64k tokens) or stream instantaneous Flash-speed responses.
                  </p>
                </div>

                {/* Role Impact Callout */}
                <div className="mt-4 p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                  <p className="text-xs font-bold text-primary mb-1">
                    🎯 Impact on {ROLE_DISPLAY_NAMES[userRole]}:
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {AI_NEWS_ITEMS[0].roleImpacts[userRole]}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      ER
                    </div>
                    <span className="font-label-md text-xs text-on-surface font-semibold">Dr. Elena Rostova</span>
                  </div>
                  <button
                    onClick={() => setSelectedArticle(AI_NEWS_ITEMS[0])}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    Read Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 relative h-44 md:h-full min-h-[160px] rounded-lg overflow-hidden bg-surface-container flex items-center justify-center p-4 border border-outline-variant/20">
                <div className="text-center space-y-2">
                  <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    psychology_alt
                  </span>
                  <p className="text-[11px] font-bold text-on-surface">Hybrid Reasoning Engine</p>
                  <p className="text-[10px] text-on-surface-variant">Token Budget Allocation</p>
                </div>
              </div>
            </div>
          </article>

          {/* Grid of Standard Articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
            {filteredNews.slice(1).map((item) => {
              const isBookmarked = bookmarkedIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  onClick={() => setSelectedArticle(item)}
                  className="bg-surface-container-lowest rounded-xl shadow-level-1 p-6 card-hover-effect flex flex-col gap-4 border border-outline-variant/10 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="chip px-3 py-1 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="font-label-sm text-xs text-on-surface-variant">{item.readTime}</span>
                  </div>

                  <h3 className="font-headline-md text-base text-on-surface font-bold hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="font-body-md text-xs text-on-surface-variant line-clamp-3 leading-relaxed flex-1">
                    {item.summary}
                  </p>

                  {/* Role summary pill */}
                  <div className="p-2.5 bg-surface-container-low rounded-lg text-xs text-on-surface-variant border border-outline-variant/10">
                    <span className="font-bold text-primary text-[11px]">For You: </span>
                    <span className="text-[11px]">{item.roleImpacts[userRole]}</span>
                  </div>

                  <div className="flex justify-between items-center mt-auto border-t border-outline-variant/10 pt-3">
                    <span className="font-label-sm text-xs text-outline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">schedule</span> {item.readTime}
                    </span>
                    <button
                      onClick={(e) => toggleBookmark(item.id, e)}
                      className={`p-1.5 rounded-full transition ${
                        isBookmarked ? 'text-primary bg-primary/10' : 'text-outline hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isBookmarked ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Lumina Weekly Market Synthesis (Full width block) */}
            <article className="bg-surface-container-lowest rounded-xl shadow-level-1 p-[1px] card-hover-effect flex flex-col relative overflow-hidden md:col-span-2 border border-outline-variant/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/15 opacity-60" />
              <div className="bg-surface-container-lowest h-full w-full rounded-[11px] p-6 flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome
                  </span>
                  <span className="font-label-sm text-xs text-primary uppercase tracking-wider font-bold">
                    Lumina Strategic Synthesis
                  </span>
                </div>

                <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">
                  Enterprise AI Synthesis: Moving from Static RAG to Autonomous State Graphs
                </h3>
                
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  Based on Q1 enterprise telemetry, simple vector similarity search (RAG) is reaching diminishing returns for complex business workflows. Teams achieving &gt;90% benchmark accuracy are combining deterministic compiler feedback loops, Model Context Protocol (MCP) tool chaining, and LLM-as-a-judge evals.
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (onSelectActionLink) onSelectActionLink('deep_dives', 'agent_loop');
                    }}
                    className="bg-primary text-on-primary font-label-md text-xs px-4 py-2 rounded-lg hover:bg-primary/90 transition shadow-xs font-bold"
                  >
                    Test State Graph Simulator
                  </button>
                  <button
                    onClick={() => {
                      if (onSelectActionLink) onSelectActionLink('deep_dives', 'mcp_chaining');
                    }}
                    className="bg-surface-container-high text-on-surface font-label-md text-xs px-4 py-2 rounded-lg hover:bg-surface-dim transition font-medium"
                  >
                    Inspect MCP Protocol
                  </button>
                </div>
              </div>
            </article>

          </div>
        </div>

        {/* Sidebar: Trending Topics & Briefing */}
        <aside className="lg:col-span-4 flex flex-col gap-stack-md">
          
          {/* Trending Topics Widget */}
          <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-6 border border-outline-variant/10">
            <h3 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">trending_up</span>
              <span>Trending AI Topics</span>
            </h3>
            
            <div className="flex flex-col gap-2.5">
              {[
                { tag: '#AgenticWorkflows', count: '12k discussions', tab: 'deep_dives', subView: 'agent_loop' },
                { tag: '#ModelContextProtocol', count: '9.4k discussions', tab: 'deep_dives', subView: 'mcp_chaining' },
                { tag: '#LLMAsAJudge', count: '8.1k discussions', tab: 'deep_dives', subView: 'evals_matrix' },
                { tag: '#HybridReasoning', count: '6.5k discussions', tab: 'news' },
                { tag: '#MultiAgentStateGraphs', count: '5.2k discussions', tab: 'deep_dives', subView: 'graph_visualizer' },
              ].map((topic, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (onSelectActionLink && topic.subView) {
                      onSelectActionLink(topic.tab, topic.subView);
                    }
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs text-on-surface font-bold group-hover:text-primary transition-colors">
                      {topic.tag}
                    </span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      {topic.count}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-[16px] group-hover:translate-x-1 transition-transform group-hover:text-primary">
                    arrow_forward
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Curated Briefing Widget */}
          <div className="bg-surface-container-lowest rounded-xl shadow-level-1 p-6 border border-outline-variant/20 relative overflow-hidden">
            <h3 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold mb-1">
              Curated Daily Briefing
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant mb-4 leading-relaxed">
              Get the most critical AI developments synthesized and delivered directly for {ROLE_DISPLAY_NAMES[userRole]}.
            </p>

            {emailSubscribed ? (
              <div className="p-3 bg-secondary-container/20 text-secondary rounded-lg text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Subscribed! You'll receive tomorrow's AI radar.</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (emailInput.trim()) setEmailSubscribed(true);
                }}
                className="flex flex-col gap-2.5"
              >
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg py-2 px-3 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
                <button
                  type="submit"
                  className="bg-primary text-on-primary font-label-md text-xs py-2.5 rounded-lg hover:bg-primary/90 transition shadow-xs font-bold"
                >
                  Subscribe to Radar
                </button>
              </form>
            )}
          </div>

        </aside>

      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl p-6 sm:p-8 shadow-level-3 border border-outline-variant/20 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <span className="chip px-3 py-1 rounded-full font-label-sm text-xs font-bold uppercase">
                {selectedArticle.category}
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 rounded-full hover:bg-surface-container transition text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div>
              <h2 className="font-headline-md text-xl sm:text-2xl font-bold text-on-surface mb-2">
                {selectedArticle.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span>By {selectedArticle.source}</span>
                <span>•</span>
                <span>{selectedArticle.readTime}</span>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                Executive Summary
              </h4>
              <p className="text-sm text-on-surface leading-relaxed">
                {selectedArticle.summary}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-on-surface">
                Impact Breakdown for All Roles:
              </h4>
              <div className="space-y-2">
                {(Object.entries(selectedArticle.roleImpacts) as [UserRole, string][]).map(([role, impact]) => (
                  <div
                    key={role}
                    className={`p-3 rounded-lg text-xs border ${
                      role === userRole
                        ? 'bg-secondary/5 border-secondary/20 font-medium'
                        : 'bg-surface-container-low border-outline-variant/10'
                    }`}
                  >
                    <span className="font-bold text-on-surface capitalize">
                      {ROLE_DISPLAY_NAMES[role]}:{' '}
                    </span>
                    <span className="text-on-surface-variant">{impact}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-surface-container text-on-surface font-label-sm text-xs rounded-lg hover:bg-surface-container-high transition font-semibold"
              >
                Close
              </button>
              {selectedArticle.relatedLabId && (
                <button
                  onClick={() => {
                    const labId = selectedArticle.relatedLabId!;
                    setSelectedArticle(null);
                    if (onSelectActionLink) onSelectActionLink('deep_dives', labId);
                  }}
                  className="px-4 py-2 bg-primary text-on-primary font-label-md text-xs rounded-lg hover:bg-primary/90 transition shadow-xs font-bold"
                >
                  Open Simulator Lab
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
