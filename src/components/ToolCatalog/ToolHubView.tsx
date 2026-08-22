import React, { useState } from 'react';
import { UserProfile, ToolEntry } from '../../types.ts';
import { AI_TOOLS_CATALOG } from '../../data/toolsData.ts';

interface ToolHubViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onLaunchSimulator: (labId: string) => void;
}

export const ToolHubView: React.FC<ToolHubViewProps> = ({
  userProfile,
  setUserProfile,
  onLaunchSimulator
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalTool, setActiveModalTool] = useState<ToolEntry | null>(null);

  const toggleBookmark = (toolId: string) => {
    setUserProfile(prev => {
      const isBookmarked = prev.bookmarkedTools.includes(toolId);
      return {
        ...prev,
        bookmarkedTools: isBookmarked
          ? prev.bookmarkedTools.filter(id => id !== toolId)
          : [...prev.bookmarkedTools, toolId]
      };
    });
  };

  const filteredTools = AI_TOOLS_CATALOG.filter((t) => {
    const matchesFilter =
      selectedFilter === 'all' ||
      t.category === selectedFilter ||
      (selectedFilter === 'development' && (t.category === 'ide_extension' || t.category === 'orchestration')) ||
      (selectedFilter === 'analysis' && t.category === 'eval_observability') ||
      (selectedFilter === 'models' && t.category === 'model');

    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bestUsedFor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vendor.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full pb-stack-lg space-y-stack-lg">
      
      {/* Page Header */}
      <header className="mb-stack-lg pt-4 md:pt-0">
        <h1 className="font-headline-xl text-headline-lg md:text-headline-xl text-on-surface mb-2 font-bold tracking-tight">
          Lumina Tool Hub
        </h1>
        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
          A curated directory of high-precision AI tools, frontier models, and developer frameworks designed to enhance your cognitive workspace. Filter, explore, and integrate.
        </p>

        {/* Search Bar */}
        <div className="mt-6 max-w-md relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models, IDEs, frameworks, MCP tools..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition text-xs sm:text-sm text-on-surface placeholder:text-outline"
          />
        </div>
      </header>

      {/* Filters (Stitch Pills) */}
      <section className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Tools' },
          { id: 'models', label: 'Frontier Models' },
          { id: 'development', label: 'Development & IDEs' },
          { id: 'protocol', label: 'MCP Connectors' },
          { id: 'analysis', label: 'Evals & Observability' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFilter(f.id)}
            className={`px-4 py-2 rounded-full font-label-md text-xs transition font-semibold ${
              selectedFilter === f.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* Tool Grid (Bento/Card layout) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md">
        {filteredTools.map((tool) => {
          const isBookmarked = userProfile.bookmarkedTools.includes(tool.id);
          return (
            <div
              key={tool.id}
              className="bg-surface-container-lowest rounded-xl p-6 shadow-level-1 hover:shadow-level-2 hover:-translate-y-1 transition-all duration-200 flex flex-col h-full border border-outline-variant/10 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors shadow-xs">
                  <span className="material-symbols-outlined text-[26px]">
                    {tool.category === 'model' ? 'psychology' : tool.category === 'ide_extension' ? 'code_blocks' : tool.category === 'protocol' ? 'dns' : 'query_stats'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                    {tool.status}
                  </span>
                  <button
                    onClick={() => toggleBookmark(tool.id)}
                    className={`p-1 rounded-full transition ${isBookmarked ? 'text-primary' : 'text-outline hover:text-primary'}`}
                    title={isBookmarked ? 'Bookmarked' : 'Bookmark tool'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isBookmarked ? 'bookmark' : 'bookmark_border'}
                    </span>
                  </button>
                </div>
              </div>

              <h3 className="font-headline-md text-base sm:text-lg text-on-surface mb-0.5 font-bold group-hover:text-primary transition-colors">
                {tool.name}
              </h3>
              <p className="text-xs text-outline font-medium mb-3">{tool.vendor} • {tool.pricingTier}</p>
              
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant flex-1 mb-4 leading-relaxed line-clamp-3">
                {tool.description}
              </p>

              <div className="p-2.5 bg-surface-container-low rounded-lg mb-4 text-xs border border-outline-variant/10">
                <span className="font-bold text-on-surface">Best for: </span>
                <span className="text-on-surface-variant">{tool.bestUsedFor}</span>
              </div>

              <div className="mt-auto pt-3 border-t border-outline-variant/20 flex justify-between items-center">
                <span className="font-label-sm text-xs text-outline capitalize">
                  {tool.category.replace('_', ' ')}
                </span>
                <div className="flex gap-2">
                  {tool.category === 'protocol' && (
                    <button
                      onClick={() => onLaunchSimulator('mcp_chaining')}
                      className="bg-primary/10 text-primary font-label-md text-xs px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition font-bold"
                    >
                      Test Wire
                    </button>
                  )}
                  <button
                    onClick={() => setActiveModalTool(tool)}
                    className="bg-surface-container text-primary font-label-md text-xs px-3.5 py-1.5 rounded-lg hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1.5 font-bold"
                  >
                    <span>Details</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Tool Detail Modal */}
      {activeModalTool && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-2xl p-6 sm:p-8 shadow-level-3 border border-outline-variant/20 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <span className="material-symbols-outlined text-2xl">handyman</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-lg sm:text-xl font-bold text-on-surface">
                    {activeModalTool.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant">{activeModalTool.vendor} • {activeModalTool.pricingTier}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalTool(null)}
                className="p-1 rounded-full hover:bg-surface-container transition text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <p className="text-sm text-on-surface leading-relaxed">
              {activeModalTool.description}
            </p>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                Core Strengths & Capabilities
              </h4>
              <ul className="space-y-1.5 text-xs text-on-surface">
                {activeModalTool.keyStrengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-secondary font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {activeModalTool.cheatsheetTips && activeModalTool.cheatsheetTips.length > 0 && (
              <div className="space-y-2 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  💡 Cheatsheet Tips
                </h4>
                <ul className="space-y-1 text-xs text-on-surface-variant">
                  {activeModalTool.cheatsheetTips.map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <button
                onClick={() => setActiveModalTool(null)}
                className="px-4 py-2 bg-surface-container text-on-surface font-label-sm text-xs rounded-lg hover:bg-surface-container-high transition font-semibold"
              >
                Close
              </button>
              <a
                href={activeModalTool.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-on-primary font-label-md text-xs rounded-lg hover:bg-primary/90 transition shadow-xs font-bold flex items-center gap-1"
              >
                <span>Documentation</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
